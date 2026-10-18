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
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AccessMapVN.Infrastructure.Services;

public sealed class Wf02CommunityService : IWf02CommunityService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly ApplicationDbContext _db;
    private readonly Wf02Options _options;
    private readonly IWf02JobScheduler _scheduler;
    private readonly TimeProvider _clock;
    private readonly ILogger<Wf02CommunityService> _logger;

    public Wf02CommunityService(
        ApplicationDbContext db,
        IOptions<Wf02Options> options,
        IWf02JobScheduler scheduler,
        TimeProvider clock,
        ILogger<Wf02CommunityService> logger)
    {
        _db = db;
        _options = options.Value;
        _scheduler = scheduler;
        _clock = clock;
        _logger = logger;
    }

    public async Task<FeatureCommunityDto> GetCommunityAsync(
        Guid locationId,
        AccessibilityFeatureType featureType,
        CancellationToken cancellationToken = default)
    {
        var location = await _db.Places.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == locationId, cancellationToken);
        if (location is null || location.Status is LocationStatus.Provisional or LocationStatus.Archived)
        {
            throw new Wf02Exception("LOCATION_NOT_FOUND", "The location was not found.", 404);
        }
        if (location.Status == LocationStatus.Merged || location.MergedIntoLocationId is not null)
        {
            throw new Wf02Exception(
                "LOCATION_MERGED",
                "Use the canonical location.",
                409,
                new { canonicalLocationId = location.MergedIntoLocationId });
        }

        var feature = await _db.LocationFeatures.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.LocationId == locationId &&
                        item.ScopeId == null &&
                        item.FeatureType == featureType &&
                        item.IsPublished,
                cancellationToken);

        if (feature is null || feature.CurrentStatus == PublishedFeatureStatus.Unknown)
        {
            throw new Wf02Exception(
                "FEATURE_NOT_PUBLISHED",
                "The requested accessibility feature has not been published.",
                404);
        }

        var state = await _db.FeatureCommunityStates.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.LocationFeatureId == feature.Id && item.FeatureVersion == feature.Version,
                cancellationToken);
        var now = _clock.GetUtcNow();
        var ageDays = Math.Max(0, (now - (state?.LastTrustedReconfirmedAt ?? feature.VerifiedAt)).TotalDays);
        var stale = ageDays > _options.Freshness.RecheckAfterDays;
        var label = state?.Label ?? (stale
            ? FeatureCommunityLabel.NeedsRecheck
            : FeatureCommunityLabel.Uncorroborated);

        var advisory = await _db.TemporaryAccessAdvisories.AsNoTracking()
            .Where(item => item.LocationFeatureId == feature.Id &&
                           (item.Status == AdvisoryStatus.Active || item.Status == AdvisoryStatus.Scheduled) &&
                           item.StartsAt <= now &&
                           item.EndsAt > now)
            .OrderByDescending(item => item.StartsAt)
            .Select(item => new ActiveAdvisoryDto(item.Id, item.Reason, item.StartsAt, item.EndsAt))
            .FirstOrDefaultAsync(cancellationToken);

        return new FeatureCommunityDto(
            feature.LocationId,
            feature.FeatureType,
            feature.CurrentStatus,
            feature.Version,
            feature.VerifiedAt,
            label,
            state?.EligibleVoterCount ?? 0,
            state?.ContradictingVoterCount ?? 0,
            state?.LastTrustedReconfirmedAt,
            state?.FreshnessFactor ?? 1m,
            stale,
            advisory,
            PublicMessage(label, featureType));
    }

    public async Task<CreateCommunityVoteResponse> RecordVoteAsync(
        Guid actorId,
        Guid locationId,
        AccessibilityFeatureType featureType,
        string idempotencyKey,
        CreateCommunityVoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 200)
        {
            throw new Wf02Exception("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.", 400);
        }

        var endpoint = $"/api/v1/locations/{locationId:D}/features/{featureType}/votes";
        var requestHash = HashRequest(request);
        var now = _clock.GetUtcNow();

        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await Wf02IdempotencyLock.AcquireAsync(_db, actorId, endpoint, idempotencyKey, cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(_db, $"actor:{actorId:D}", cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(
            _db, $"vote:{actorId:D}:{locationId:D}:{featureType}", cancellationToken);

        var replay = await _db.IdempotencyRecords
            .SingleOrDefaultAsync(
                item => item.ActorId == actorId && item.Endpoint == endpoint && item.Key == idempotencyKey,
                cancellationToken);
        if (replay is not null)
        {
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(replay.RequestHash),
                    Encoding.UTF8.GetBytes(requestHash)))
            {
                throw new Wf02Exception(
                    "IDEMPOTENCY_KEY_REUSED",
                    "This idempotency key was already used with a different request.",
                    409);
            }

            var stored = JsonSerializer.Deserialize<CreateCommunityVoteResponse>(replay.ResponseBody, JsonOptions)
                ?? throw new InvalidOperationException("Stored idempotency response is invalid.");
            await transaction.CommitAsync(cancellationToken);
            return stored;
        }

        var place = await _db.Places.SingleOrDefaultAsync(item => item.Id == locationId, cancellationToken);
        if (place is null || place.Status != LocationStatus.Active || place.MergedIntoLocationId is not null)
        {
            throw new Wf02Exception("LOCATION_NOT_ACTIVE", "The location is not active or no longer canonical.", 409);
        }

        var feature = await _db.LocationFeatures.SingleOrDefaultAsync(
            item => item.LocationId == locationId &&
                    item.ScopeId == null &&
                    item.FeatureType == featureType &&
                    item.IsPublished,
            cancellationToken);
        if (feature is null || feature.CurrentStatus == PublishedFeatureStatus.Unknown)
        {
            throw new Wf02Exception(
                "FEATURE_NOT_PUBLISHED",
                "The feature is not published; contribute it through WF-01 instead.",
                404);
        }

        if (request.ObservedFeatureVersion != feature.Version)
        {
            throw new Wf02Exception(
                "FEATURE_VERSION_CHANGED",
                "The published feature changed after it was displayed. Reload and decide again.",
                409,
                new { featureVersion = feature.Version, publishedStatus = feature.CurrentStatus });
        }

        await Wf02IdempotencyLock.AcquireResourceAsync(
            _db, $"assessment:{feature.Id:D}:{feature.Version}", cancellationToken);

        ValidateVote(request, feature.CurrentStatus);
        await EnsureUserAsync(actorId, cancellationToken);

        if (request.EvidenceSubmissionId is Guid evidenceId)
        {
            var evidence = await _db.Submissions.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == evidenceId, cancellationToken);
            if (evidence is null ||
                !Guid.TryParse(evidence.UserId, out var ownerId) || ownerId != actorId ||
                !string.Equals(evidence.PlaceId, locationId.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                throw new Wf02Exception("EVIDENCE_NOT_OWNED", "The linked WF-01 submission is not available for this vote.", 403);
            }
        }

        var previous = await _db.CommunityVotes
            .Where(item => item.LocationFeatureId == feature.Id &&
                           item.ObservedFeatureVersion == feature.Version &&
                           item.VoterId == actorId &&
                           (item.Status == CommunityVoteStatus.Recorded ||
                            item.Status == CommunityVoteStatus.PendingValidation ||
                            item.Status == CommunityVoteStatus.Eligible))
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var user = await _db.AppUsers.SingleAsync(item => item.Id == actorId, cancellationToken);
        var voteStatus = user.ReputationScore < _options.Reputation.VoteHoldThreshold
            ? CommunityVoteStatus.PendingValidation
            : CommunityVoteStatus.Recorded;
        var vote = new CommunityVote
        {
            LocationFeatureId = feature.Id,
            VoterId = actorId,
            ObservedFeatureVersion = feature.Version,
            VoteType = request.VoteType,
            ProposedStatus = request.ProposedStatus,
            Comment = NormalizeOptional(request.Comment),
            EvidenceSubmissionId = request.EvidenceSubmissionId,
            Status = voteStatus,
            PolicyVersion = _options.PolicyVersion,
            EligibilityReason = voteStatus == CommunityVoteStatus.PendingValidation
                ? "BelowVoteHoldThreshold"
                : "AwaitingEvaluation",
        };

        if (previous is not null)
        {
            var previousStatus = previous.Status;
            previous.Status = CommunityVoteStatus.Superseded;
            previous.SupersededByVoteId = null;
            previous.UpdatedAtUtc = now.UtcDateTime;
            _db.CommunityVoteStatusHistories.Add(new CommunityVoteStatusHistory
            {
                CommunityVoteId = previous.Id,
                FromStatus = previousStatus,
                ToStatus = CommunityVoteStatus.Superseded,
                ActorId = actorId,
                Reason = "Replaced by a newer observation from the same voter.",
                OccurredAt = now,
            });

            // Release the filtered unique index before inserting the replacement vote.
            // The transaction keeps this intermediate state invisible to other requests.
            await _db.SaveChangesAsync(cancellationToken);
        }

        _db.CommunityVotes.Add(vote);
        _db.CommunityVoteStatusHistories.Add(new CommunityVoteStatusHistory
        {
            CommunityVoteId = vote.Id,
            FromStatus = null,
            ToStatus = voteStatus,
            ActorId = actorId,
            Reason = voteStatus == CommunityVoteStatus.PendingValidation
                ? "Vote held for validation under the authoritative reputation policy."
                : "Vote recorded and queued for eligibility evaluation.",
            OccurredAt = now,
        });

        // Persist the replacement before assigning the self-referencing FK. This avoids
        // both the active-vote filtered unique index and self-FK ordering races.
        await _db.SaveChangesAsync(cancellationToken);
        if (previous is not null)
        {
            previous.SupersededByVoteId = vote.Id;
            previous.UpdatedAtUtc = now.UtcDateTime;
        }

        var job = await _db.FeatureAssessmentJobs.SingleOrDefaultAsync(
            item => item.LocationFeatureId == feature.Id &&
                    item.FeatureVersion == feature.Version &&
                    (item.Status == AssessmentJobStatus.Queued ||
                     item.Status == AssessmentJobStatus.Processing ||
                     item.Status == AssessmentJobStatus.RetryScheduled),
            cancellationToken);
        if (job is null)
        {
            job = new FeatureAssessmentJob
            {
                LocationFeatureId = feature.Id,
                FeatureVersion = feature.Version,
                Status = AssessmentJobStatus.Queued,
            };
            _db.FeatureAssessmentJobs.Add(job);
        }
        else
        {
            job.Revision += 1;
            if (job.Status != AssessmentJobStatus.Processing)
            {
                job.Status = AssessmentJobStatus.Queued;
            }
        }

        var response = new CreateCommunityVoteResponse(
            vote.Id,
            voteStatus,
            AssessmentJobStatus.Queued,
            feature.Version,
            false,
            "Observation recorded. The community status will update after validation.");

        _db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            ActorId = actorId,
            Endpoint = endpoint,
            Key = idempotencyKey,
            RequestHash = requestHash,
            ResponseStatusCode = 201,
            ResponseBody = JsonSerializer.Serialize(response, JsonOptions),
            ExpiresAt = now.AddHours(_options.Votes.IdempotencyTtlHours),
        });

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        Wf02Metrics.VotesRecorded.Add(1,
            new KeyValuePair<string, object?>("vote.type", request.VoteType.ToString()),
            new KeyValuePair<string, object?>("vote.status", voteStatus.ToString()));
        if (voteStatus == CommunityVoteStatus.PendingValidation)
        {
            Wf02Metrics.VotesPendingValidation.Add(1);
        }

        try
        {
            _scheduler.EnqueueEvaluation(job.Id);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to enqueue WF-02 assessment job {AssessmentJobId}; reconciliation will retry.", job.Id);
        }

        return response;
    }

    public async Task<LinkVoteSubmissionResponse> LinkSubmissionAsync(
        Guid actorId,
        Guid voteId,
        string idempotencyKey,
        LinkVoteSubmissionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 200)
        {
            throw new Wf02Exception("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.", 400);
        }
        if (request.SubmissionId == Guid.Empty)
        {
            throw new Wf02Exception("INVALID_SUBMISSION_LINK", "submissionId is required.", 422);
        }

        var endpoint = $"/api/v1/community-votes/{voteId:D}/link-submission";
        var requestHash = Convert.ToHexString(SHA256.HashData(
            Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request, JsonOptions))));
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        await Wf02IdempotencyLock.AcquireAsync(_db, actorId, endpoint, idempotencyKey, cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(_db, $"actor:{actorId:D}", cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(_db, $"vote-link:{voteId:D}", cancellationToken);

        var replay = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            item => item.ActorId == actorId && item.Endpoint == endpoint && item.Key == idempotencyKey,
            cancellationToken);
        if (replay is not null)
        {
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(replay.RequestHash), Encoding.UTF8.GetBytes(requestHash)))
            {
                throw new Wf02Exception("IDEMPOTENCY_KEY_REUSED", "This idempotency key was already used with a different request.", 409);
            }
            var stored = JsonSerializer.Deserialize<LinkVoteSubmissionResponse>(replay.ResponseBody, JsonOptions)
                         ?? throw new InvalidOperationException("Stored idempotency response is invalid.");
            await transaction.CommitAsync(cancellationToken);
            return stored;
        }

        var vote = await _db.CommunityVotes.SingleOrDefaultAsync(
            item => item.Id == voteId && item.VoterId == actorId, cancellationToken)
            ?? throw new Wf02Exception("VOTE_NOT_FOUND", "The vote was not found.", 404);
        if (vote.Status is CommunityVoteStatus.Superseded or CommunityVoteStatus.Rejected or CommunityVoteStatus.Archived)
        {
            throw new Wf02Exception("VOTE_NOT_ACTIVE", "Evidence can only be linked to the current observation.", 409);
        }
        if (vote.EvidenceSubmissionId is not null && vote.EvidenceSubmissionId != request.SubmissionId)
        {
            throw new Wf02Exception("VOTE_EVIDENCE_ALREADY_LINKED", "This vote already links a different submission.", 409);
        }

        var feature = await _db.LocationFeatures.AsNoTracking()
            .SingleAsync(item => item.Id == vote.LocationFeatureId, cancellationToken);
        await Wf02IdempotencyLock.AcquireResourceAsync(
            _db, $"assessment:{feature.Id:D}:{vote.ObservedFeatureVersion}", cancellationToken);
        var submission = await _db.Submissions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.SubmissionId, cancellationToken);
        if (submission is null || !Guid.TryParse(submission.UserId, out var ownerId) || ownerId != actorId ||
            !Guid.TryParse(submission.PlaceId, out var locationId) || locationId != feature.LocationId)
        {
            throw new Wf02Exception("SUBMISSION_NOT_FOUND", "The owned submission was not found for this location.", 404);
        }

        var previous = vote.Status;
        vote.EvidenceSubmissionId = submission.Id;
        vote.Status = CommunityVoteStatus.Recorded;
        vote.EligibilityReason = "EvidenceLinkedAwaitingEvaluation";
        vote.UpdatedAtUtc = now.UtcDateTime;
        if (previous != vote.Status)
        {
            _db.CommunityVoteStatusHistories.Add(new CommunityVoteStatusHistory
            {
                CommunityVoteId = vote.Id,
                FromStatus = previous,
                ToStatus = vote.Status,
                ActorId = actorId,
                Reason = "Owned WF-01 evidence submission linked; eligibility will be evaluated again.",
                OccurredAt = now,
            });
        }

        var job = await _db.FeatureAssessmentJobs.SingleOrDefaultAsync(
            item => item.LocationFeatureId == vote.LocationFeatureId &&
                    item.FeatureVersion == vote.ObservedFeatureVersion &&
                    (item.Status == AssessmentJobStatus.Queued ||
                     item.Status == AssessmentJobStatus.Processing ||
                     item.Status == AssessmentJobStatus.RetryScheduled),
            cancellationToken);
        if (job is null)
        {
            job = new FeatureAssessmentJob
            {
                LocationFeatureId = vote.LocationFeatureId,
                FeatureVersion = vote.ObservedFeatureVersion,
                Status = AssessmentJobStatus.Queued,
            };
            _db.FeatureAssessmentJobs.Add(job);
        }
        else
        {
            job.Revision += 1;
            if (job.Status != AssessmentJobStatus.Processing) job.Status = AssessmentJobStatus.Queued;
        }

        var response = new LinkVoteSubmissionResponse(vote.Id, submission.Id, vote.Status, AssessmentJobStatus.Queued, now);
        _db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            ActorId = actorId,
            Endpoint = endpoint,
            Key = idempotencyKey,
            RequestHash = requestHash,
            ResponseStatusCode = 200,
            ResponseBody = JsonSerializer.Serialize(response, JsonOptions),
            ExpiresAt = now.AddHours(_options.Votes.IdempotencyTtlHours),
        });
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        try
        {
            _scheduler.EnqueueEvaluation(job.Id);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to enqueue WF-02 assessment job {AssessmentJobId}; reconciliation will retry.", job.Id);
        }
        return response;
    }

    public async Task<FeatureCommunityDto> WithdrawVoteAsync(
        Guid actorId,
        Guid locationId,
        AccessibilityFeatureType featureType,
        CancellationToken cancellationToken = default)
    {
        var place = await _db.Places.SingleOrDefaultAsync(item => item.Id == locationId, cancellationToken);
        if (place is null || place.Status != LocationStatus.Active || place.MergedIntoLocationId is not null)
        {
            throw new Wf02Exception("LOCATION_NOT_ACTIVE", "The location is not active or no longer canonical.", 409);
        }

        var feature = await _db.LocationFeatures.SingleOrDefaultAsync(
            item => item.LocationId == locationId &&
                    item.ScopeId == null &&
                    item.FeatureType == featureType &&
                    item.IsPublished,
            cancellationToken);
        if (feature is null)
        {
            throw new Wf02Exception("FEATURE_NOT_PUBLISHED", "The feature is not published.", 404);
        }

        var now = _clock.GetUtcNow();
        var activeVote = await _db.CommunityVotes
            .Where(item => item.LocationFeatureId == feature.Id &&
                           item.ObservedFeatureVersion == feature.Version &&
                           item.VoterId == actorId &&
                           (item.Status == CommunityVoteStatus.Recorded ||
                            item.Status == CommunityVoteStatus.PendingValidation ||
                            item.Status == CommunityVoteStatus.Eligible))
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeVote is not null)
        {
            var previousStatus = activeVote.Status;
            activeVote.Status = CommunityVoteStatus.Archived;
            activeVote.UpdatedAtUtc = now.UtcDateTime;
            _db.CommunityVoteStatusHistories.Add(new CommunityVoteStatusHistory
            {
                CommunityVoteId = activeVote.Id,
                FromStatus = previousStatus,
                ToStatus = CommunityVoteStatus.Archived,
                ActorId = actorId,
                Reason = "Withdrawn by voter during grace period.",
                OccurredAt = now,
            });

            var job = await _db.FeatureAssessmentJobs.SingleOrDefaultAsync(
                item => item.LocationFeatureId == feature.Id &&
                        item.FeatureVersion == feature.Version &&
                        (item.Status == AssessmentJobStatus.Queued ||
                         item.Status == AssessmentJobStatus.Processing ||
                         item.Status == AssessmentJobStatus.RetryScheduled),
                cancellationToken);
            if (job is null)
            {
                job = new FeatureAssessmentJob
                {
                    LocationFeatureId = feature.Id,
                    FeatureVersion = feature.Version,
                    Status = AssessmentJobStatus.Queued,
                };
                _db.FeatureAssessmentJobs.Add(job);
            }
            else
            {
                job.Revision += 1;
                if (job.Status != AssessmentJobStatus.Processing) job.Status = AssessmentJobStatus.Queued;
            }

            await _db.SaveChangesAsync(cancellationToken);
            await EvaluateAsync(job.Id, cancellationToken);
        }

        return await GetCommunityAsync(locationId, featureType, cancellationToken);
    }

    public async Task EvaluateAsync(Guid assessmentJobId, CancellationToken cancellationToken = default)
    {
        var now = _clock.GetUtcNow();
        var leaseExpiresAt = now.AddSeconds(_options.Jobs.LeaseSeconds);
        var claimed = await _db.FeatureAssessmentJobs
            .Where(item => item.Id == assessmentJobId &&
                           (item.Status == AssessmentJobStatus.Queued ||
                            (item.Status == AssessmentJobStatus.RetryScheduled &&
                             (item.NextAttemptAt == null || item.NextAttemptAt <= now)) ||
                            (item.Status == AssessmentJobStatus.Processing && item.LeaseExpiresAt <= now)))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.Status, AssessmentJobStatus.Processing)
                .SetProperty(item => item.Attempts, item => item.Attempts + 1)
                .SetProperty(item => item.LeaseExpiresAt, leaseExpiresAt)
                .SetProperty(item => item.AsOfAt, now), cancellationToken);
        if (claimed == 0)
        {
            return;
        }

        var job = await _db.FeatureAssessmentJobs
            .SingleAsync(item => item.Id == assessmentJobId, cancellationToken);

        try
        {
            var feature = await _db.LocationFeatures.SingleAsync(item => item.Id == job.LocationFeatureId, cancellationToken);
            if (!feature.IsPublished || feature.Version != job.FeatureVersion)
            {
                job.Status = AssessmentJobStatus.Completed;
                job.LastErrorCategory = "FeatureVersionChanged";
                await _db.SaveChangesAsync(cancellationToken);
                return;
            }

            var votes = await _db.CommunityVotes
                .Where(item => item.LocationFeatureId == feature.Id &&
                               item.ObservedFeatureVersion == feature.Version &&
                               item.Status != CommunityVoteStatus.Superseded &&
                               item.Status != CommunityVoteStatus.Rejected &&
                               item.Status != CommunityVoteStatus.Archived)
                .ToListAsync(cancellationToken);
            var userIds = votes.Select(item => item.VoterId).Distinct().ToArray();
            var users = await _db.AppUsers
                .Where(item => userIds.Contains(item.Id))
                .ToDictionaryAsync(item => item.Id, cancellationToken);

            foreach (var vote in votes.Where(item => item.Status == CommunityVoteStatus.Recorded))
            {
                var from = vote.Status;
                if (!users.TryGetValue(vote.VoterId, out var user) || !user.IsActive)
                {
                    vote.Status = CommunityVoteStatus.PendingValidation;
                    vote.EligibilityReason = "AuthoritativeReputationUnavailable";
                }
                else if (user.ReputationScore < _options.Reputation.VoteHoldThreshold)
                {
                    vote.Status = CommunityVoteStatus.PendingValidation;
                    vote.EligibilityReason = "BelowVoteHoldThreshold";
                }
                else
                {
                    vote.Status = CommunityVoteStatus.Eligible;
                    vote.EligibilityReason = "Eligible";
                    vote.ReputationScoreSnapshot = user.ReputationScore;
                    vote.ReputationTierSnapshot = user.ReputationTier;
                    vote.TierFactorSnapshot = 1m;
                }

                _db.CommunityVoteStatusHistories.Add(new CommunityVoteStatusHistory
                {
                    CommunityVoteId = vote.Id,
                    FromStatus = from,
                    ToStatus = vote.Status,
                    ActorId = null,
                    Reason = vote.EligibilityReason,
                    OccurredAt = now,
                });
            }

            Guid? sourceContributorId = null;
            if (feature.SourceSubmissionId is Guid sourceSubmissionId)
            {
                var sourceUserId = await _db.Submissions.AsNoTracking()
                    .Where(item => item.Id == sourceSubmissionId)
                    .Select(item => item.UserId)
                    .SingleOrDefaultAsync(cancellationToken);
                if (Guid.TryParse(sourceUserId, out var parsedSourceUserId))
                {
                    sourceContributorId = parsedSourceUserId;
                }
            }

            var eligible = votes
                .Where(item => item.Status == CommunityVoteStatus.Eligible && item.VoterId != sourceContributorId)
                .ToList();
            decimal totalWeight = 0;
            decimal agreementWeight = 0;
            foreach (var vote in eligible)
            {
                var ageDays = Math.Max(0, (now.UtcDateTime - vote.CreatedAtUtc).TotalDays);
                var recencyWeight = (decimal)Math.Pow(2, -ageDays / _options.Recency.HalfLifeDays);
                var reputation = Math.Clamp(vote.ReputationScoreSnapshot ?? 1m, 1m, _options.Consensus.MaxReputationWeight);
                var effectiveWeight = reputation * (vote.TierFactorSnapshot ?? 1m) * recencyWeight;
                totalWeight += effectiveWeight;
                if (vote.VoteType == CommunityVoteType.StillAccurate)
                {
                    agreementWeight += effectiveWeight;
                }
            }

            decimal? weightedAgreement = totalWeight > 0 ? agreementWeight / totalWeight : null;
            var contradictoryVotes = eligible.Where(item => item.VoteType == CommunityVoteType.Changed).ToList();
            var corroboratingVotes = eligible.Where(item => item.VoteType == CommunityVoteType.StillAccurate).ToList();

            var state = await _db.FeatureCommunityStates.SingleOrDefaultAsync(
                item => item.LocationFeatureId == feature.Id,
                cancellationToken);
            if (state is null)
            {
                state = new FeatureCommunityState { LocationFeatureId = feature.Id };
                _db.FeatureCommunityStates.Add(state);
            }
            else if (state.FeatureVersion != feature.Version)
            {
                state.FeatureVersion = feature.Version;
                state.Label = FeatureCommunityLabel.Uncorroborated;
                state.WeightedAgreement = null;
                state.EligibleVoterCount = 0;
                state.ContradictingVoterCount = 0;
                state.LastTrustedReconfirmedAt = null;
                state.FreshnessFactor = 1m;
                state.ActiveDisputeCaseId = null;
                state.Version += 1;
            }

            if (corroboratingVotes.Count > 0 && contradictoryVotes.Count == 0)
            {
                state.LastTrustedReconfirmedAt = corroboratingVotes.Max(item => new DateTimeOffset(item.CreatedAtUtc, TimeSpan.Zero));
            }

            var freshnessOrigin = state.LastTrustedReconfirmedAt ?? feature.VerifiedAt;
            var freshnessAgeDays = Math.Max(0, (now - freshnessOrigin).TotalDays);
            var staleDays = Math.Max(0, freshnessAgeDays - _options.Freshness.RecheckAfterDays);
            var freshnessFactor = staleDays == 0
                ? 1m
                : (decimal)Math.Pow(2, -staleDays / _options.Freshness.FactorHalfLifeAfterRecheckDays);

            DisputeCase? dispute = null;
            var disputeOpened = false;
            if (contradictoryVotes.Count >= _options.Consensus.MinIndependentVotersForReview)
            {
                dispute = await _db.DisputeCases.SingleOrDefaultAsync(
                    item => item.LocationFeatureId == feature.Id &&
                            item.FeatureVersion == feature.Version &&
                            (item.Status == DisputeStatus.Open ||
                             item.Status == DisputeStatus.UnderReview ||
                             item.Status == DisputeStatus.AwaitingMoreInfo ||
                             item.Status == DisputeStatus.CorrectionPending),
                    cancellationToken);
                if (dispute is null)
                {
                    dispute = new DisputeCase
                    {
                        LocationFeatureId = feature.Id,
                        FeatureVersion = feature.Version,
                        Status = DisputeStatus.Open,
                        OpenReason = "Independent eligible observations conflict with the published feature.",
                        OpenedAt = now,
                    };
                    _db.DisputeCases.Add(dispute);
                    _db.OutboxMessages.Add(new OutboxMessage
                    {
                        Type = "DisputeOpened",
                        PayloadJson = JsonSerializer.Serialize(new { disputeCaseId = dispute.Id, featureId = feature.Id }, JsonOptions),
                        OccurredAt = now,
                    });
                    disputeOpened = true;
                }

                var linkedIds = await _db.DisputeCaseVotes
                    .Where(item => item.DisputeCaseId == dispute.Id)
                    .Select(item => item.CommunityVoteId)
                    .ToListAsync(cancellationToken);
                foreach (var vote in contradictoryVotes.Where(item => !linkedIds.Contains(item.Id)))
                {
                    _db.DisputeCaseVotes.Add(new DisputeCaseVote
                    {
                        DisputeCaseId = dispute.Id,
                        CommunityVoteId = vote.Id,
                    });
                }
            }

            // Fresh is intentionally not emitted in the initial policy: without an independent
            // corroboration the safe label is Uncorroborated; with one it is Reinforced.
            var label = dispute is not null
                ? FeatureCommunityLabel.CommunityUnderReview
                : contradictoryVotes.Count > 0
                    ? FeatureCommunityLabel.ConflictReported
                    : freshnessAgeDays > _options.Freshness.RecheckAfterDays
                        ? FeatureCommunityLabel.NeedsRecheck
                        : corroboratingVotes.Count > 0
                            ? FeatureCommunityLabel.Reinforced
                            : FeatureCommunityLabel.Uncorroborated;

            state.FeatureVersion = feature.Version;
            state.Label = label;
            state.WeightedAgreement = weightedAgreement;
            state.EligibleVoterCount = eligible.Select(item => item.VoterId).Distinct().Count();
            state.ContradictingVoterCount = contradictoryVotes.Select(item => item.VoterId).Distinct().Count();
            state.FreshnessFactor = Math.Clamp(freshnessFactor, 0m, 1m);
            state.ActiveDisputeCaseId = dispute?.Id;
            state.ComputedAt = now;
            state.PolicyVersion = _options.PolicyVersion;
            state.Version += 1;

            _db.CommunityAssessments.Add(new CommunityAssessment
            {
                LocationFeatureId = feature.Id,
                FeatureVersion = feature.Version,
                AsOfAt = now,
                WeightedAgreement = weightedAgreement,
                EligibleVoterCount = state.EligibleVoterCount,
                ContradictingVoterCount = state.ContradictingVoterCount,
                ResultLabel = label,
                FreshnessFactor = state.FreshnessFactor,
                PolicyVersion = _options.PolicyVersion,
                DecisionSnapshotJson = JsonSerializer.Serialize(new
                {
                    asOfAt = now,
                    recentWindowDays = _options.Recency.RecentWindowDays,
                    halfLifeDays = _options.Recency.HalfLifeDays,
                    voteHoldThreshold = _options.Reputation.VoteHoldThreshold,
                }, JsonOptions),
            });

            job.Status = AssessmentJobStatus.Completed;
            job.LeaseExpiresAt = null;
            job.LastErrorCategory = null;
            job.LastErrorMessage = null;
            await _db.SaveChangesAsync(cancellationToken);
            Wf02Metrics.AssessmentsCompleted.Add(1,
                new KeyValuePair<string, object?>("result.label", label.ToString()));
            if (disputeOpened)
            {
                Wf02Metrics.DisputesOpened.Add(1);
            }
        }
        catch (Exception exception)
        {
            Wf02Metrics.AssessmentFailures.Add(1,
                new KeyValuePair<string, object?>("error.category", exception.GetType().Name));
            job.LastErrorCategory = exception.GetType().Name;
            job.LastErrorMessage = exception.Message.Length > 2000 ? exception.Message[..2000] : exception.Message;
            job.LeaseExpiresAt = null;
            job.Status = job.Attempts >= _options.Jobs.MaxAttempts
                ? AssessmentJobStatus.Failed
                : AssessmentJobStatus.RetryScheduled;
            job.NextAttemptAt = now.AddMinutes(Math.Pow(2, Math.Max(0, job.Attempts - 1)));
            await _db.SaveChangesAsync(cancellationToken);
            throw;
        }
    }

    public async Task ScanFreshnessAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = _clock.GetUtcNow().AddDays(-_options.Freshness.RecheckAfterDays);
        var featureIds = await _db.LocationFeatures.AsNoTracking()
            .Where(item => item.IsPublished && item.VerifiedAt <= cutoff)
            .OrderBy(item => item.VerifiedAt)
            .Take(_options.Freshness.BatchSize)
            .Select(item => new { item.Id, item.Version })
            .ToListAsync(cancellationToken);

        Wf02Metrics.StaleFeaturesObserved.Add(featureIds.Count);

        foreach (var feature in featureIds)
        {
            var exists = await _db.FeatureAssessmentJobs.AnyAsync(
                item => item.LocationFeatureId == feature.Id &&
                        item.FeatureVersion == feature.Version &&
                        (item.Status == AssessmentJobStatus.Queued ||
                         item.Status == AssessmentJobStatus.Processing ||
                         item.Status == AssessmentJobStatus.RetryScheduled),
                cancellationToken);
            if (!exists)
            {
                var job = new FeatureAssessmentJob
                {
                    LocationFeatureId = feature.Id,
                    FeatureVersion = feature.Version,
                };
                _db.FeatureAssessmentJobs.Add(job);
                await _db.SaveChangesAsync(cancellationToken);
                _scheduler.EnqueueEvaluation(job.Id);
            }
        }
    }

    public async Task ReconcileJobsAsync(CancellationToken cancellationToken = default)
    {
        var now = _clock.GetUtcNow();
        var jobs = await _db.FeatureAssessmentJobs
            .Where(item => item.Status == AssessmentJobStatus.Queued ||
                           (item.Status == AssessmentJobStatus.RetryScheduled && item.NextAttemptAt <= now) ||
                           (item.Status == AssessmentJobStatus.Processing && item.LeaseExpiresAt <= now))
            .OrderBy(item => item.CreatedAtUtc)
            .Take(_options.Freshness.BatchSize)
            .ToListAsync(cancellationToken);

        foreach (var job in jobs)
        {
            job.Status = AssessmentJobStatus.Queued;
            job.LeaseExpiresAt = null;
            _scheduler.EnqueueEvaluation(job.Id);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureUserAsync(Guid actorId, CancellationToken cancellationToken)
    {
        if (await _db.AppUsers.AnyAsync(item => item.Id == actorId, cancellationToken))
        {
            return;
        }

        _db.AppUsers.Add(new AppUser
        {
            Id = actorId,
            ReputationScore = _options.Reputation.DefaultReputationScore,
            ReputationPolicyVersion = _options.Reputation.PolicyVersion,
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    private void ValidateVote(CreateCommunityVoteRequest request, PublishedFeatureStatus baseline)
    {
        if (request.ObservedFeatureVersion <= 0)
        {
            throw new Wf02Exception("INVALID_OBSERVATION", "observedFeatureVersion must be positive.", 422);
        }

        if (request.Comment?.Length > _options.Votes.MaxCommentLength)
        {
            throw new Wf02Exception("INVALID_OBSERVATION", "The vote comment is too long.", 422);
        }

        if (request.VoteType == CommunityVoteType.StillAccurate &&
            request.ProposedStatus is not null && request.ProposedStatus != baseline)
        {
            throw new Wf02Exception("INVALID_OBSERVATION", "StillAccurate cannot propose a different status.", 422);
        }

        if (request.VoteType == CommunityVoteType.Changed)
        {
            var meaningfulStatus = request.ProposedStatus is not null &&
                                   request.ProposedStatus != PublishedFeatureStatus.Unknown &&
                                   request.ProposedStatus != baseline;
            if (!meaningfulStatus && string.IsNullOrWhiteSpace(request.Comment))
            {
                throw new Wf02Exception(
                    "INVALID_OBSERVATION",
                    "Changed requires a different concrete status or a description of the observed change.",
                    422);
            }
        }
    }

    private static string HashRequest(CreateCommunityVoteRequest request)
    {
        var json = JsonSerializer.Serialize(request, JsonOptions);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string PublicMessage(FeatureCommunityLabel label, AccessibilityFeatureType featureType) =>
        label switch
        {
            FeatureCommunityLabel.CommunityUnderReview => $"Community observations about {featureType} are under review.",
            FeatureCommunityLabel.ConflictReported => $"A change to {featureType} has been reported and is being checked.",
            FeatureCommunityLabel.NeedsRecheck => $"Information about {featureType} needs an on-site reconfirmation.",
            FeatureCommunityLabel.Reinforced => $"Recent independent observations support the published {featureType} information.",
            _ => $"No independent community reconfirmation is available yet for {featureType}.",
        };
}
