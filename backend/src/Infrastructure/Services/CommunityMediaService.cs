using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace AccessMapVN.Infrastructure.Services;

public sealed class CommunityMediaService : ICommunityMediaService
{
    private const long MaxBytes = 25 * 1024 * 1024;
    private static readonly HashSet<string> SupportedMimeTypes = new(StringComparer.Ordinal)
    {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
        "video/mp4", "video/quicktime", "video/x-m4v", "video/webm",
    };
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
    private readonly ApplicationDbContext _db;
    private readonly IAmazonS3 _s3;
    private readonly CommunityValidationOptions _options;
    private readonly TimeProvider _clock;
    private readonly string _bucket;
    private readonly Protocol _preSignedProtocol;

    public CommunityMediaService(
        ApplicationDbContext db,
        IAmazonS3 s3,
        IOptions<CommunityValidationOptions> options,
        IConfiguration configuration,
        TimeProvider clock)
    {
        _db = db;
        _s3 = s3;
        _options = options.Value;
        _clock = clock;
        _bucket = configuration["ObjectStorage:Bucket"] ?? "accessmapvn-media";
        var serviceUrl = configuration["ObjectStorage:ServiceUrl"];
        _preSignedProtocol = Uri.TryCreate(serviceUrl, UriKind.Absolute, out var endpoint) &&
                             endpoint.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            ? Protocol.HTTP
            : Protocol.HTTPS;
    }

    public async Task<CreateUploadIntentResponse> CreateIntentAsync(
        Guid actorId,
        Guid locationId,
        string idempotencyKey,
        CreateUploadIntentRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateKey(idempotencyKey);
        var mime = request.MimeType.Trim().ToLowerInvariant();
        if (!SupportedMimeTypes.Contains(mime) ||
            request.SizeBytes is <= 0 or > MaxBytes || request.Sha256.Length != 64 ||
            !request.Sha256.All(Uri.IsHexDigit))
        {
            throw new CommunityValidationException("INVALID_MEDIA", "Only image/video media up to 25 MB with a SHA-256 digest is accepted.", 422);
        }
        var endpoint = $"/api/v1/locations/{locationId:D}/media/upload-intents";
        var hash = Hash(request);
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await CommunityIdempotencyLock.AcquireAsync(_db, actorId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"actor:{actorId:D}", cancellationToken);
        await EnsureUserAsync(actorId, cancellationToken);
        var replay = await ReplayAsync<CreateUploadIntentResponse>(actorId, endpoint, idempotencyKey, hash, now, cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }
        var locationValid = await _db.Places.AnyAsync(
            item => item.Id == locationId && item.Status == LocationStatus.Active && item.MergedIntoLocationId == null,
            cancellationToken);
        if (!locationValid) throw new CommunityValidationException("LOCATION_NOT_ACTIVE", "The location is not active or canonical.", 409);

        await EnsureBucketAsync(cancellationToken);
        var media = new OwnedMedia
        {
            OwnerId = actorId,
            LocationId = locationId,
            MimeType = mime,
            SizeBytes = request.SizeBytes,
            Sha256 = request.Sha256.ToUpperInvariant(),
            Status = OwnedMediaStatus.Staged,
            ExpiresAt = now.AddHours(1),
        };
        media.StorageKey = $"community/{locationId:D}/{actorId:D}/{media.Id:D}";
        var intent = new UploadIntent
        {
            OwnerId = actorId,
            LocationId = locationId,
            OwnedMediaId = media.Id,
            Status = UploadIntentStatus.Issued,
            UploadTokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{intentToken(media.Id)}:{idempotencyKey}"))),
            ExpiresAt = now.AddMinutes(20),
        };
        _db.OwnedMedia.Add(media);
        _db.UploadIntents.Add(intent);

        var uploadUrl = await _s3.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = media.StorageKey,
            Verb = HttpVerb.PUT,
            Expires = intent.ExpiresAt.UtcDateTime,
            ContentType = media.MimeType,
            Protocol = _preSignedProtocol,
        });
        var response = new CreateUploadIntentResponse(
            intent.Id, media.Id, uploadUrl,
            new Dictionary<string, string> { ["Content-Type"] = media.MimeType }, intent.ExpiresAt);
        Store(actorId, endpoint, idempotencyKey, hash, 201, response, now);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public async Task<CompleteUploadIntentResponse> CompleteIntentAsync(
        Guid actorId,
        Guid uploadIntentId,
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        ValidateKey(idempotencyKey);
        var endpoint = $"/api/v1/upload-intents/{uploadIntentId:D}/complete";
        var hash = Hash(new { uploadIntentId });
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await CommunityIdempotencyLock.AcquireAsync(_db, actorId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"upload-intent:{uploadIntentId:D}", cancellationToken);
        var replay = await ReplayAsync<CompleteUploadIntentResponse>(actorId, endpoint, idempotencyKey, hash, now, cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }
        var intent = await _db.UploadIntents.SingleOrDefaultAsync(
            item => item.Id == uploadIntentId && item.OwnerId == actorId, cancellationToken)
            ?? throw new CommunityValidationException("UPLOAD_INTENT_NOT_FOUND", "The upload intent was not found.", 404);
        var media = await _db.OwnedMedia.SingleAsync(item => item.Id == intent.OwnedMediaId, cancellationToken);
        if (intent.ExpiresAt <= now || intent.Status != UploadIntentStatus.Issued)
            throw new CommunityValidationException("UPLOAD_INTENT_EXPIRED", "The upload intent is no longer active.", 409);

        GetObjectMetadataResponse metadata;
        try
        {
            metadata = await _s3.GetObjectMetadataAsync(new GetObjectMetadataRequest
            {
                BucketName = _bucket,
                Key = media.StorageKey,
            }, cancellationToken);
        }
        catch (AmazonS3Exception)
        {
            throw new CommunityValidationException("UPLOAD_NOT_FOUND", "The uploaded object is not available.", 409);
        }
        if (metadata.ContentLength != media.SizeBytes)
            throw new CommunityValidationException("MEDIA_SIZE_MISMATCH", "The uploaded object size does not match the intent.", 409);
        if (!string.Equals(metadata.Headers.ContentType, media.MimeType, StringComparison.OrdinalIgnoreCase))
            throw new CommunityValidationException("MEDIA_TYPE_MISMATCH", "The uploaded object content type does not match the intent.", 409);

        await ValidateObjectContentAsync(media, cancellationToken);

        intent.Status = UploadIntentStatus.Uploaded;
        intent.ConsumedAt = now;
        intent.UpdatedAtUtc = now.UtcDateTime;
        media.Status = OwnedMediaStatus.Ready;
        media.ExpiresAt = now.AddDays(7);
        media.UpdatedAtUtc = now.UtcDateTime;
        var response = new CompleteUploadIntentResponse(intent.Id, media.Id, media.Status.ToString(), now);
        Store(actorId, endpoint, idempotencyKey, hash, 200, response, now);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public async Task<AdminEvidenceAccessResponse> CreateAdminEvidenceAccessAsync(
        Guid reportId,
        Guid evidenceId,
        CancellationToken cancellationToken = default)
    {
        var evidence = await _db.ReportEvidence.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == evidenceId && item.ReportId == reportId,
                cancellationToken);
        if (evidence?.OwnedMediaId is not Guid mediaId)
        {
            throw new CommunityValidationException("EVIDENCE_MEDIA_NOT_FOUND", "Private media was not found for this evidence item.", 404);
        }

        var media = await _db.OwnedMedia.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == mediaId, cancellationToken);
        if (media is null || media.Status is not (OwnedMediaStatus.Ready or OwnedMediaStatus.Consumed))
        {
            throw new CommunityValidationException("EVIDENCE_MEDIA_UNAVAILABLE", "Private media is not available.", 409);
        }

        var expiresAt = _clock.GetUtcNow().AddMinutes(5);
        var accessUrl = await _s3.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = media.StorageKey,
            Verb = HttpVerb.GET,
            Expires = expiresAt.UtcDateTime,
            Protocol = _preSignedProtocol,
        });
        return new AdminEvidenceAccessResponse(evidence.Id, accessUrl, media.MimeType, expiresAt);
    }

    private async Task ValidateObjectContentAsync(OwnedMedia media, CancellationToken cancellationToken)
    {
        GetObjectResponse response;
        try
        {
            response = await _s3.GetObjectAsync(new GetObjectRequest
            {
                BucketName = _bucket,
                Key = media.StorageKey,
            }, cancellationToken);
        }
        catch (AmazonS3Exception)
        {
            throw new CommunityValidationException("UPLOAD_NOT_FOUND", "The uploaded object is not available.", 409);
        }

        using (response)
        using (var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
        {
            var prefix = new byte[16];
            var prefixLength = 0;
            var buffer = new byte[81920];
            long totalBytes = 0;
            int bytesRead;
            while ((bytesRead = await response.ResponseStream.ReadAsync(buffer, cancellationToken)) > 0)
            {
                hasher.AppendData(buffer, 0, bytesRead);
                if (prefixLength < prefix.Length)
                {
                    var copyLength = Math.Min(prefix.Length - prefixLength, bytesRead);
                    Buffer.BlockCopy(buffer, 0, prefix, prefixLength, copyLength);
                    prefixLength += copyLength;
                }
                totalBytes += bytesRead;
                if (totalBytes > MaxBytes)
                    throw new CommunityValidationException("MEDIA_SIZE_MISMATCH", "The uploaded object exceeds the allowed size.", 409);
            }

            if (totalBytes != media.SizeBytes)
                throw new CommunityValidationException("MEDIA_SIZE_MISMATCH", "The uploaded object size does not match the intent.", 409);

            var actualHash = hasher.GetHashAndReset();
            var expectedHash = Convert.FromHexString(media.Sha256);
            if (!CryptographicOperations.FixedTimeEquals(actualHash, expectedHash))
                throw new CommunityValidationException("MEDIA_HASH_MISMATCH", "The uploaded object digest does not match the intent.", 409);

            if (!MatchesDeclaredContent(media.MimeType, prefix.AsSpan(0, prefixLength)))
                throw new CommunityValidationException("MEDIA_CONTENT_MISMATCH", "The uploaded bytes do not match the declared media type.", 409);
        }
    }

    internal static bool MatchesDeclaredContent(string mimeType, ReadOnlySpan<byte> bytes)
    {
        static bool StartsWith(ReadOnlySpan<byte> value, params byte[] signature) => value.StartsWith(signature);
        static bool IsIsoBaseMedia(ReadOnlySpan<byte> value) =>
            value.Length >= 12 && value[4] == (byte)'f' && value[5] == (byte)'t' &&
            value[6] == (byte)'y' && value[7] == (byte)'p';

        return mimeType switch
        {
            "image/jpeg" or "image/jpg" => StartsWith(bytes, 0xFF, 0xD8, 0xFF),
            "image/png" => StartsWith(bytes, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
            "image/gif" => bytes.Length >= 6 &&
                           (Encoding.ASCII.GetString(bytes[..6]) is "GIF87a" or "GIF89a"),
            "image/webp" => bytes.Length >= 12 &&
                            Encoding.ASCII.GetString(bytes[..4]) == "RIFF" &&
                            Encoding.ASCII.GetString(bytes.Slice(8, 4)) == "WEBP",
            "image/heic" or "image/heif" => IsIsoBaseMedia(bytes),
            "video/mp4" or "video/quicktime" or "video/x-m4v" => IsIsoBaseMedia(bytes),
            "video/webm" => StartsWith(bytes, 0x1A, 0x45, 0xDF, 0xA3),
            _ => false,
        };
    }

    private async Task EnsureBucketAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _s3.GetBucketLocationAsync(new GetBucketLocationRequest { BucketName = _bucket }, cancellationToken);
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            await _s3.PutBucketAsync(new PutBucketRequest { BucketName = _bucket }, cancellationToken);
        }
    }

    private async Task EnsureUserAsync(Guid actorId, CancellationToken cancellationToken)
    {
        if (!await _db.AppUsers.AnyAsync(item => item.Id == actorId, cancellationToken))
        {
            _db.AppUsers.Add(new AppUser
            {
                Id = actorId,
                ReputationScore = _options.Reputation.DefaultReputationScore,
                ReputationPolicyVersion = _options.Reputation.PolicyVersion,
            });
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<T?> ReplayAsync<T>(Guid actorId, string endpoint, string key, string hash, DateTimeOffset now, CancellationToken cancellationToken) where T : class
    {
        var row = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            item => item.ActorId == actorId && item.Endpoint == endpoint && item.Key == key, cancellationToken);
        if (row is null) return null;
        if (row.ExpiresAt <= now) { _db.IdempotencyRecords.Remove(row); return null; }
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(row.RequestHash), Encoding.UTF8.GetBytes(hash)))
            throw new CommunityValidationException("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used with a different request.", 409);
        return JsonSerializer.Deserialize<T>(row.ResponseBody, JsonOptions)
               ?? throw new InvalidOperationException("Stored idempotency response is invalid.");
    }

    private void Store<T>(Guid actorId, string endpoint, string key, string hash, int status, T response, DateTimeOffset now) =>
        _db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            ActorId = actorId, Endpoint = endpoint, Key = key, RequestHash = hash,
            ResponseStatusCode = status, ResponseBody = JsonSerializer.Serialize(response, JsonOptions),
            ExpiresAt = now.AddHours(_options.Votes.IdempotencyTtlHours),
        });
    private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, JsonOptions))));
    private static string intentToken(Guid mediaId) => mediaId.ToString("N");
    private static void ValidateKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 200)
            throw new CommunityValidationException("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.", 400);
    }
}
