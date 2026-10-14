using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AccessMapVN.Infrastructure.Services;

public sealed class Wf02TimelineCommentService : IWf02TimelineCommentService
{
    private const int CommentPreviewLimit = 3;
    private const int CommentHalfLifeDays = 30;
    private const decimal MinimumPreviewWeight = 0.25m;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly ApplicationDbContext _db;
    private readonly Wf02Options _options;
    private readonly TimeProvider _clock;

    public Wf02TimelineCommentService(ApplicationDbContext db, IOptions<Wf02Options> options, TimeProvider clock)
    {
        _db = db;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<PublicTimelinePage> GetTimelineAsync(
        Guid locationId,
        int pageSize,
        string? cursor,
        CancellationToken cancellationToken = default)
    {
        if (pageSize is < 1 or > 100)
        {
            throw new Wf02Exception("INVALID_PAGINATION", "pageSize must be between 1 and 100.", 422);
        }
        locationId = await ResolvePublicLocationAsync(locationId, cancellationToken);
        var before = string.IsNullOrWhiteSpace(cursor)
            ? new CursorPosition(DateTimeOffset.MaxValue, Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"))
            : DecodeCursor(cursor);

        var metadata = await _db.LocationMetadataHistories.AsNoTracking()
            .Where(item => item.LocationId == locationId &&
                           (item.EffectiveAt < before.OccurredAt ||
                            (item.EffectiveAt == before.OccurredAt && item.Id.CompareTo(before.Id) < 0)))
            .OrderByDescending(item => item.EffectiveAt)
            .Take(pageSize + 1)
            .Select(item => new PublicTimelineItemDto(
                item.Id, "MetadataUpdated", item.EffectiveAt, null, null, null,
                item.MetadataVersion, "Location details were updated after review."))
            .ToListAsync(cancellationToken);
        var features = await (from history in _db.LocationFeatureHistories.AsNoTracking()
                              join feature in _db.LocationFeatures.AsNoTracking() on history.LocationFeatureId equals feature.Id
                              where feature.LocationId == locationId &&
                                    (history.EffectiveAt < before.OccurredAt ||
                                     (history.EffectiveAt == before.OccurredAt && history.Id.CompareTo(before.Id) < 0))
                              orderby history.EffectiveAt descending
                              select new PublicTimelineItemDto(
                                  history.Id, "FeaturePublished", history.EffectiveAt, feature.FeatureType,
                                  history.Status, history.FeatureVersion, null,
                                  $"{feature.FeatureType} information was verified and published."))
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);

        var merged = metadata.Concat(features)
            .OrderByDescending(item => item.OccurredAt)
            .ThenByDescending(item => item.Id)
            .Take(pageSize + 1)
            .ToArray();
        var hasMore = merged.Length > pageSize;
        var items = merged.Take(pageSize).ToArray();
        return new PublicTimelinePage(
            items,
            hasMore && items.Length > 0 ? EncodeCursor(items[^1].OccurredAt, items[^1].Id) : null);
    }

    public async Task<PublicCommunityCommentPage> GetCommentsAsync(
        Guid locationId,
        int pageSize,
        string? cursor,
        CancellationToken cancellationToken = default)
    {
        if (pageSize is < 1 or > 100)
        {
            throw new Wf02Exception("INVALID_PAGINATION", "pageSize must be between 1 and 100.", 422);
        }
        locationId = await ResolvePublicLocationAsync(locationId, cancellationToken);
        var now = _clock.GetUtcNow();
        var before = string.IsNullOrWhiteSpace(cursor)
            ? new CursorPosition(DateTimeOffset.MaxValue, Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"))
            : DecodeCursor(cursor);
        var beforeUtc = before.OccurredAt.UtcDateTime;
        var comments = await _db.CommunityComments.AsNoTracking()
            .Where(item => item.LocationId == locationId &&
                           item.Status == CommunityCommentStatus.Approved &&
                           (item.CreatedAtUtc < beforeUtc ||
                            (item.CreatedAtUtc == beforeUtc && item.Id.CompareTo(before.Id) < 0)))
            .OrderByDescending(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.Id)
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);
        var pageRows = comments.Take(pageSize).ToArray();
        var remainingPreviewSlots = string.IsNullOrWhiteSpace(cursor) ? CommentPreviewLimit : 0;
        var items = pageRows.Select(item =>
        {
            var ageDays = Math.Max(0, (now - ToOffset(item.CreatedAtUtc)).TotalDays);
            var weight = (decimal)Math.Pow(2, -ageDays / CommentHalfLifeDays);
            var isRecentContext = weight >= MinimumPreviewWeight && remainingPreviewSlots > 0;
            if (isRecentContext) remainingPreviewSlots -= 1;
            return new PublicCommunityCommentDto(
                item.Id, item.Body, "Community member", ToOffset(item.CreatedAtUtc),
                Math.Round(weight, 4), isRecentContext);
        }).ToArray();
        var last = pageRows.LastOrDefault();
        return new PublicCommunityCommentPage(
            items,
            comments.Count > pageSize && last is not null
                ? EncodeCursor(ToOffset(last.CreatedAtUtc), last.Id)
                : null);
    }

    public async Task<CreateCommunityCommentResponse> CreateCommentAsync(
        Guid actorId,
        Guid locationId,
        string idempotencyKey,
        CreateCommunityCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        if (string.IsNullOrWhiteSpace(request.Body) || request.Body.Trim().Length > 2000)
        {
            throw new Wf02Exception("INVALID_COMMENT", "A comment of at most 2000 characters is required.", 422);
        }
        var endpoint = $"/api/v1/locations/{locationId:D}/comments";
        var hash = Hash(request);
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await Wf02IdempotencyLock.AcquireAsync(_db, actorId, endpoint, idempotencyKey, cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(_db, $"actor:{actorId:D}", cancellationToken);
        await EnsureUserAsync(actorId, cancellationToken);
        locationId = await ResolvePublicLocationAsync(locationId, cancellationToken);

        var replay = await TryReplayAsync<CreateCommunityCommentResponse>(actorId, endpoint, idempotencyKey, hash, now, cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }
        if (request.ScopeId is Guid scopeId && !await _db.AccessScopes.AnyAsync(
                item => item.Id == scopeId && item.LocationId == locationId && item.IsActive, cancellationToken))
        {
            throw new Wf02Exception("SCOPE_MISMATCH", "The scope does not belong to this location.", 422);
        }

        var comment = new CommunityComment
        {
            LocationId = locationId,
            ScopeId = request.ScopeId,
            AuthorId = actorId,
            Body = request.Body.Trim(),
            Status = CommunityCommentStatus.PendingReview,
        };
        _db.CommunityComments.Add(comment);
        _db.CommunityCommentStatusHistories.Add(new CommunityCommentStatusHistory
        {
            CommunityCommentId = comment.Id,
            FromStatus = null,
            ToStatus = comment.Status,
            ActorId = actorId,
            Reason = "Submitted for moderation.",
            OccurredAt = now,
        });
        var response = new CreateCommunityCommentResponse(comment.Id, comment.Status, comment.Version, now);
        StoreIdempotency(actorId, endpoint, idempotencyKey, hash, 201, response, now);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public async Task<AdminCommentQueuePage> GetAdminCommentsAsync(
        CommunityCommentStatus? status,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        ValidatePagination(page, pageSize);
        var query = from comment in _db.CommunityComments.AsNoTracking()
                    join location in _db.Places.AsNoTracking() on comment.LocationId equals location.Id
                    join author in _db.AppUsers.AsNoTracking() on comment.AuthorId equals author.Id
                    select new { comment, location, author };
        if (status is not null) query = query.Where(item => item.comment.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(item => EF.Functions.ILike(item.location.Name, $"%{term}%") ||
                                        EF.Functions.ILike(item.comment.Body, $"%{term}%"));
        }
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderBy(item => item.comment.Status)
            .ThenByDescending(item => item.comment.CreatedAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);
        var items = rows.Select(item => ToAdminDto(item.comment, item.location.Name, item.author.DisplayName)).ToArray();
        return new AdminCommentQueuePage(items, total, page, pageSize, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
    }

    public async Task<AdminCommentQueueItemDto> ModerateCommentAsync(
        Guid moderatorId,
        Guid locationId,
        Guid commentId,
        string idempotencyKey,
        ModerateCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        if (!Enum.IsDefined(request.Decision) || request.ExpectedVersion <= 0 ||
            string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 1500)
        {
            throw new Wf02Exception("INVALID_COMMENT_DECISION", "A decision, reason and expectedVersion are required.", 422);
        }
        var endpoint = $"/api/v1/admin/locations/{locationId:D}/comments/{commentId:D}/moderation";
        var hash = Hash(request);
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await Wf02IdempotencyLock.AcquireAsync(_db, moderatorId, endpoint, idempotencyKey, cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(_db, $"comment:{commentId:D}", cancellationToken);
        var moderator = await _db.AppUsers.SingleOrDefaultAsync(
            item => item.Id == moderatorId && item.IsActive && item.Role == AppUserRole.Admin, cancellationToken);
        if (moderator is null) throw new Wf02Exception("MODERATION_FORBIDDEN", "The moderator is not authorized.", 403);

        var replay = await TryReplayAsync<AdminCommentQueueItemDto>(moderatorId, endpoint, idempotencyKey, hash, now, cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }
        var comment = await _db.CommunityComments.SingleOrDefaultAsync(
            item => item.Id == commentId && item.LocationId == locationId, cancellationToken)
            ?? throw new Wf02Exception("COMMENT_NOT_FOUND", "The comment was not found.", 404);
        if (comment.Version != request.ExpectedVersion)
        {
            throw new Wf02Exception("COMMENT_VERSION_CHANGED", "The comment changed; reload it before retrying.", 409,
                new { commentId, status = comment.Status.ToString(), version = comment.Version });
        }
        var previous = comment.Status;
        comment.Status = request.Decision == CommentModerationDecision.Approve
            ? CommunityCommentStatus.Approved
            : CommunityCommentStatus.Hidden;
        comment.ModeratedById = moderatorId;
        comment.ModeratedAt = now;
        comment.ModerationReason = request.Reason.Trim();
        comment.Version += 1;
        comment.UpdatedAtUtc = now.UtcDateTime;
        _db.CommunityCommentStatusHistories.Add(new CommunityCommentStatusHistory
        {
            CommunityCommentId = comment.Id,
            FromStatus = previous,
            ToStatus = comment.Status,
            ActorId = moderatorId,
            Reason = request.Reason.Trim(),
            OccurredAt = now,
        });
        var locationName = await _db.Places.Where(item => item.Id == locationId).Select(item => item.Name).SingleAsync(cancellationToken);
        var authorName = await _db.AppUsers.Where(item => item.Id == comment.AuthorId).Select(item => item.DisplayName).SingleAsync(cancellationToken);
        var response = ToAdminDto(comment, locationName, authorName);
        StoreIdempotency(moderatorId, endpoint, idempotencyKey, hash, 200, response, now);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    private async Task<Guid> ResolvePublicLocationAsync(Guid locationId, CancellationToken cancellationToken)
    {
        var visited = new HashSet<Guid>();
        var currentId = locationId;
        for (var depth = 0; depth < 8; depth++)
        {
            if (!visited.Add(currentId)) break;

            var location = await _db.Places.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == currentId, cancellationToken)
                ?? throw new Wf02Exception("LOCATION_NOT_FOUND", "The location was not found.", 404);
            if (location.Status == LocationStatus.Active && location.MergedIntoLocationId is null)
            {
                return location.Id;
            }
            if (location.Status == LocationStatus.Merged && location.MergedIntoLocationId is Guid canonicalId)
            {
                currentId = canonicalId;
                continue;
            }

            throw new Wf02Exception("LOCATION_NOT_ACTIVE", "The location is not active.", 404);
        }

        throw new Wf02Exception("INVALID_LOCATION_MERGE", "The location merge chain is invalid.", 409);
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

    private async Task<T?> TryReplayAsync<T>(Guid actorId, string endpoint, string key, string hash, DateTimeOffset now, CancellationToken cancellationToken)
        where T : class
    {
        var record = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            item => item.ActorId == actorId && item.Endpoint == endpoint && item.Key == key, cancellationToken);
        if (record is null) return null;
        if (record.ExpiresAt <= now)
        {
            _db.IdempotencyRecords.Remove(record);
            return null;
        }
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(record.RequestHash), Encoding.UTF8.GetBytes(hash)))
        {
            throw new Wf02Exception("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used with a different request.", 409);
        }
        return JsonSerializer.Deserialize<T>(record.ResponseBody, JsonOptions)
               ?? throw new InvalidOperationException("Stored idempotency response is invalid.");
    }

    private void StoreIdempotency<T>(Guid actorId, string endpoint, string key, string hash, int status, T response, DateTimeOffset now)
    {
        _db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            ActorId = actorId,
            Endpoint = endpoint,
            Key = key,
            RequestHash = hash,
            ResponseStatusCode = status,
            ResponseBody = JsonSerializer.Serialize(response, JsonOptions),
            ExpiresAt = now.AddHours(_options.Votes.IdempotencyTtlHours),
        });
    }

    private static AdminCommentQueueItemDto ToAdminDto(CommunityComment comment, string? locationName, string? authorName) =>
        new(comment.Id, comment.LocationId, locationName, comment.ScopeId, authorName, comment.Body,
            comment.Status, ToOffset(comment.CreatedAtUtc), comment.ModeratedAt,
            comment.ModerationReason, comment.Version, $"\"{comment.Version}\"");

    private static void ValidatePagination(int page, int pageSize)
    {
        if (page < 1 || pageSize is < 1 or > 100)
            throw new Wf02Exception("INVALID_PAGINATION", "page must be positive and pageSize must be between 1 and 100.", 422);
    }

    private static void ValidateIdempotencyKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 200)
            throw new Wf02Exception("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.", 400);
    }

    private static string Hash<T>(T value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, JsonOptions))));
    private sealed record CursorPosition(DateTimeOffset OccurredAt, Guid Id);
    private static string EncodeCursor(DateTimeOffset occurredAt, Guid id) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes($"{occurredAt.ToUniversalTime().Ticks}:{id:D}"));
    private static CursorPosition DecodeCursor(string cursor)
    {
        try
        {
            var value = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            var pieces = value.Split(':', 2);
            if (pieces.Length == 2 && long.TryParse(pieces[0], out var ticks) && Guid.TryParse(pieces[1], out var id))
                return new CursorPosition(new DateTimeOffset(ticks, TimeSpan.Zero), id);
        }
        catch (FormatException) { }
        throw new Wf02Exception("INVALID_CURSOR", "The pagination cursor is invalid.", 422);
    }
    private static DateTimeOffset ToOffset(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
