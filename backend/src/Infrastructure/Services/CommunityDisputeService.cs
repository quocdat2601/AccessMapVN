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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AccessMapVN.Infrastructure.Services;

public sealed class CommunityDisputeService : ICommunityDisputeService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly ApplicationDbContext _db;
    private readonly CommunityValidationOptions _options;
    private readonly TimeProvider _clock;

    public CommunityDisputeService(ApplicationDbContext db, IOptions<CommunityValidationOptions> options, TimeProvider clock)
    {
        _db = db;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<DisputeQueuePage> GetQueueAsync(
        DisputeStatus? status,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        ValidatePagination(page, pageSize);
        var query = from dispute in _db.DisputeCases.AsNoTracking()
                    join feature in _db.LocationFeatures.AsNoTracking() on dispute.LocationFeatureId equals feature.Id
                    join location in _db.Places.AsNoTracking() on feature.LocationId equals location.Id
                    select new { dispute, feature, location };

        if (status is not null)
        {
            query = query.Where(item => item.dispute.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(item => EF.Functions.ILike(item.location.Name, $"%{term}%") ||
                                        (item.location.Address != null && EF.Functions.ILike(item.location.Address, $"%{term}%")));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(item => item.dispute.Status)
            .ThenBy(item => item.dispute.OpenedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        var ids = rows.Select(item => item.dispute.Id).ToArray();
        var voteCounts = await _db.DisputeCaseVotes.AsNoTracking()
            .Where(item => ids.Contains(item.DisputeCaseId))
            .GroupBy(item => item.DisputeCaseId)
            .Select(group => new { Id = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Id, item => item.Count, cancellationToken);

        var items = rows.Select(item => new DisputeQueueItemDto(
            item.dispute.Id,
            item.location.Id,
            item.location.Name,
            item.location.Address,
            item.feature.FeatureType,
            item.dispute.FeatureVersion,
            item.feature.CurrentStatus,
            item.dispute.Status,
            item.dispute.OpenReason,
            item.dispute.OpenedAt,
            ToOffset(item.dispute.UpdatedAtUtc ?? item.dispute.CreatedAtUtc),
            voteCounts.GetValueOrDefault(item.dispute.Id))).ToArray();

        var now = _clock.GetUtcNow();
        foreach (var row in rows)
        {
            CommunityMetrics.DisputeAgeHours.Record(
                Math.Max(0, (now - row.dispute.OpenedAt).TotalHours),
                new KeyValuePair<string, object?>("case.status", row.dispute.Status.ToString()));
        }

        return new DisputeQueuePage(items, total, page, pageSize, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
    }

    public Task<DisputeDetailDto> GetByIdAsync(Guid disputeId, CancellationToken cancellationToken = default) =>
        BuildDetailAsync(disputeId, cancellationToken);

    public async Task<DisputeDetailDto> DecideAsync(
        Guid moderatorId,
        Guid disputeId,
        int expectedVersion,
        string idempotencyKey,
        DecideDisputeRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        if (expectedVersion <= 0 || !Enum.IsDefined(request.Decision) ||
            string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 2000)
        {
            throw new CommunityValidationException("INVALID_DISPUTE_DECISION", "A valid decision, reason and ETag are required.", 422);
        }

        var endpoint = $"/api/v1/admin/community-disputes/{disputeId:D}";
        var requestHash = Hash(new { expectedVersion, request });
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await CommunityIdempotencyLock.AcquireAsync(_db, moderatorId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"dispute:{disputeId:D}", cancellationToken);

        var moderator = await _db.AppUsers.SingleOrDefaultAsync(
            item => item.Id == moderatorId && item.IsActive && item.Role == AppUserRole.Admin,
            cancellationToken);
        if (moderator is null)
        {
            throw new CommunityValidationException("MODERATION_FORBIDDEN", "The moderator is not authorized.", 403);
        }

        var stored = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            item => item.ActorId == moderatorId && item.Endpoint == endpoint && item.Key == idempotencyKey,
            cancellationToken);
        if (stored is not null && stored.ExpiresAt > now)
        {
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(stored.RequestHash),
                    Encoding.UTF8.GetBytes(requestHash)))
            {
                throw new CommunityValidationException("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used with a different request.", 409);
            }

            var replay = JsonSerializer.Deserialize<DisputeDetailDto>(stored.ResponseBody, JsonOptions)
                         ?? throw new InvalidOperationException("Stored idempotency response is invalid.");
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }

        if (stored is not null)
        {
            _db.IdempotencyRecords.Remove(stored);
        }

        var dispute = await _db.DisputeCases.SingleOrDefaultAsync(item => item.Id == disputeId, cancellationToken)
                      ?? throw new CommunityValidationException("DISPUTE_NOT_FOUND", "The dispute was not found.", 404);
        if (dispute.Version != expectedVersion)
        {
            throw new CommunityValidationException("DISPUTE_VERSION_CHANGED", "The dispute changed; reload it before retrying.", 409,
                new { disputeId = dispute.Id, status = dispute.Status.ToString(), version = dispute.Version });
        }

        var feature = await _db.LocationFeatures.SingleAsync(item => item.Id == dispute.LocationFeatureId, cancellationToken);
        EnsureActive(dispute);
        Guid? advisoryId = null;
        switch (request.Decision)
        {
            case DisputeDecisionType.RequestEvidence:
                dispute.Status = DisputeStatus.AwaitingMoreInfo;
                break;

            case DisputeDecisionType.RetainBaseline:
                dispute.Status = DisputeStatus.ResolvedBaseline;
                dispute.ResolvedAt = now;
                break;

            case DisputeDecisionType.LinkCorrection:
                if (request.CorrectionSubmissionId is not Guid correctionId)
                {
                    throw new CommunityValidationException("CORRECTION_REQUIRED", "correctionSubmissionId is required.", 422);
                }
                await ValidateCorrectionAsync(correctionId, feature, false, cancellationToken);
                dispute.CorrectionSubmissionId = correctionId;
                dispute.Status = DisputeStatus.CorrectionPending;
                break;

            case DisputeDecisionType.RecordPublication:
                var publicationId = request.CorrectionSubmissionId ?? dispute.CorrectionSubmissionId;
                if (publicationId is not Guid publishedId)
                {
                    throw new CommunityValidationException("PUBLICATION_REQUIRED", "A linked correction publication is required.", 409);
                }
                await ValidateCorrectionAsync(publishedId, feature, true, cancellationToken);
                if (feature.Version <= dispute.FeatureVersion || feature.SourceSubmissionId != publishedId)
                {
                    throw new CommunityValidationException("PUBLICATION_REQUIRED", "The linked correction has not published a newer feature version.", 409);
                }
                dispute.CorrectionSubmissionId = publishedId;
                dispute.Status = DisputeStatus.ResolvedUpdated;
                dispute.ResolvedAt = now;
                break;

            case DisputeDecisionType.CreateAdvisory:
                var startsAt = request.StartsAt ?? now;
                var endsAt = request.EndsAt ?? throw new CommunityValidationException("INVALID_ADVISORY", "endsAt is required.", 422);
                if (startsAt < now.AddMinutes(-5) || endsAt <= startsAt ||
                    endsAt - startsAt > TimeSpan.FromDays(_options.Advisory.MaxDurationDays))
                {
                    throw new CommunityValidationException("INVALID_ADVISORY", $"The advisory must be future-facing and no longer than {_options.Advisory.MaxDurationDays} days.", 422);
                }
                var advisory = new TemporaryAccessAdvisory
                {
                    LocationFeatureId = feature.Id,
                    DisputeCaseId = dispute.Id,
                    Status = startsAt <= now ? AdvisoryStatus.Active : AdvisoryStatus.Scheduled,
                    Reason = string.IsNullOrWhiteSpace(request.AdvisoryReason) ? request.Reason.Trim() : request.AdvisoryReason.Trim(),
                    StartsAt = startsAt,
                    EndsAt = endsAt,
                    CreatedById = moderatorId,
                };
                _db.TemporaryAccessAdvisories.Add(advisory);
                advisoryId = advisory.Id;
                if (dispute.Status == DisputeStatus.Open)
                {
                    dispute.Status = DisputeStatus.UnderReview;
                }
                _db.OutboxMessages.Add(new OutboxMessage
                {
                    Type = "TemporaryAccessAdvisoryCreated",
                    PayloadJson = JsonSerializer.Serialize(new { advisoryId = advisory.Id, featureId = feature.Id }, JsonOptions),
                    OccurredAt = now,
                });
                break;

            default:
                throw new CommunityValidationException("INVALID_DISPUTE_DECISION", "Unsupported dispute decision.", 422);
        }

        dispute.Version += 1;
        dispute.UpdatedAtUtc = now.UtcDateTime;
        _db.DisputeDecisions.Add(new DisputeDecision
        {
            DisputeCaseId = dispute.Id,
            DecisionType = request.Decision,
            ModeratorId = moderatorId,
            Reason = request.Reason.Trim(),
            CorrectionSubmissionId = request.CorrectionSubmissionId ?? dispute.CorrectionSubmissionId,
            AdvisoryId = advisoryId,
            DecidedAt = now,
            CaseVersion = dispute.Version,
        });

        if (dispute.ResolvedAt is not null)
        {
            var state = await _db.FeatureCommunityStates.SingleOrDefaultAsync(
                item => item.LocationFeatureId == feature.Id, cancellationToken);
            if (state is not null)
            {
                state.ActiveDisputeCaseId = null;
                state.Label = request.Decision == DisputeDecisionType.RecordPublication
                    ? FeatureCommunityLabel.Fresh
                    : FeatureCommunityLabel.Reinforced;
                state.FeatureVersion = feature.Version;
                state.ComputedAt = now;
                state.Version += 1;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        var response = await BuildDetailAsync(dispute.Id, cancellationToken);
        _db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            ActorId = moderatorId,
            Endpoint = endpoint,
            Key = idempotencyKey,
            RequestHash = requestHash,
            ResponseStatusCode = 200,
            ResponseBody = JsonSerializer.Serialize(response, JsonOptions),
            ExpiresAt = now.AddHours(_options.Votes.IdempotencyTtlHours),
        });
        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = "DisputeDecisionRecorded",
            PayloadJson = JsonSerializer.Serialize(new { disputeId = dispute.Id, status = dispute.Status.ToString(), version = dispute.Version }, JsonOptions),
            OccurredAt = now,
        });
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    private async Task<DisputeDetailDto> BuildDetailAsync(Guid disputeId, CancellationToken cancellationToken)
    {
        var context = await (from dispute in _db.DisputeCases.AsNoTracking()
                             join feature in _db.LocationFeatures.AsNoTracking() on dispute.LocationFeatureId equals feature.Id
                             join location in _db.Places.AsNoTracking() on feature.LocationId equals location.Id
                             where dispute.Id == disputeId
                             select new { dispute, feature, location })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new CommunityValidationException("DISPUTE_NOT_FOUND", "The dispute was not found.", 404);

        var votes = await (from link in _db.DisputeCaseVotes.AsNoTracking()
                           join vote in _db.CommunityVotes.AsNoTracking() on link.CommunityVoteId equals vote.Id
                           where link.DisputeCaseId == disputeId
                           orderby vote.CreatedAtUtc descending
                           select new DisputeVoteDto(
                               vote.Id, vote.VoteType, vote.ProposedStatus, vote.Comment,
                               vote.Status, ToOffset(vote.CreatedAtUtc), vote.EvidenceSubmissionId))
            .ToListAsync(cancellationToken);
        var decisions = await (from decision in _db.DisputeDecisions.AsNoTracking()
                               join moderator in _db.AppUsers.AsNoTracking() on decision.ModeratorId equals moderator.Id
                               where decision.DisputeCaseId == disputeId
                               orderby decision.DecidedAt
                               select new DisputeDecisionDto(
                                   decision.Id, decision.DecisionType, decision.Reason, moderator.DisplayName,
                                   decision.CorrectionSubmissionId, decision.AdvisoryId, decision.DecidedAt, decision.CaseVersion))
            .ToListAsync(cancellationToken);
        var now = _clock.GetUtcNow();
        var advisory = await _db.TemporaryAccessAdvisories.AsNoTracking()
            .Where(item => item.DisputeCaseId == disputeId && item.Status != AdvisoryStatus.Revoked && item.EndsAt > now)
            .OrderByDescending(item => item.StartsAt)
            .Select(item => new TemporaryAdvisoryDto(
                item.Id,
                item.StartsAt <= now ? AdvisoryStatus.Active : item.Status,
                item.Reason,
                item.StartsAt,
                item.EndsAt))
            .FirstOrDefaultAsync(cancellationToken);

        return new DisputeDetailDto(
            context.dispute.Id, context.location.Id, context.location.Name, context.location.Address,
            context.feature.FeatureType, context.dispute.FeatureVersion, context.feature.CurrentStatus,
            context.dispute.Status, context.dispute.OpenReason, context.dispute.OpenedAt,
            ToOffset(context.dispute.UpdatedAtUtc ?? context.dispute.CreatedAtUtc), votes.Count,
            votes, decisions, advisory, context.dispute.CorrectionSubmissionId, context.dispute.Version);
    }

    private async Task ValidateCorrectionAsync(
        Guid submissionId,
        LocationFeature feature,
        bool mustBePublished,
        CancellationToken cancellationToken)
    {
        var submission = await _db.Submissions.AsNoTracking().SingleOrDefaultAsync(item => item.Id == submissionId, cancellationToken);
        if (submission is null || !Guid.TryParse(submission.PlaceId, out var locationId) || locationId != feature.LocationId)
        {
            throw new CommunityValidationException("CORRECTION_NOT_FOUND", "The correction submission was not found for this location.", 404);
        }

        var matchingClaim = await _db.SubmissionClaims.AsNoTracking().AnyAsync(
            item => item.SubmissionId == submissionId && item.LocationId == feature.LocationId &&
                    item.ScopeId == feature.ScopeId && item.FeatureType == feature.FeatureType &&
                    (!mustBePublished || item.Status == SubmissionClaimStatus.Published),
            cancellationToken);
        if (!matchingClaim)
        {
            throw new CommunityValidationException("CORRECTION_CONTEXT_MISMATCH", "The correction does not target this feature.", 409);
        }
    }

    private static void EnsureActive(DisputeCase dispute)
    {
        if (dispute.Status is DisputeStatus.ResolvedBaseline or DisputeStatus.ResolvedUpdated)
        {
            throw new CommunityValidationException("DISPUTE_ALREADY_RESOLVED", "The dispute is already resolved.", 409);
        }
    }

    private static void ValidatePagination(int page, int pageSize)
    {
        if (page < 1 || pageSize is < 1 or > 100)
        {
            throw new CommunityValidationException("INVALID_PAGINATION", "page must be positive and pageSize must be between 1 and 100.", 422);
        }
    }

    private static void ValidateIdempotencyKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 200)
        {
            throw new CommunityValidationException("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.", 400);
        }
    }

    private static string Hash<T>(T value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, JsonOptions))));

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
