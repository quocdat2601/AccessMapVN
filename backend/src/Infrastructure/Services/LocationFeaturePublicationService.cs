using System.Data;
using System.Text.Json;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.Infrastructure.Services;

public sealed class LocationFeaturePublicationService : ILocationFeaturePublicationService
{
    private const int PublicationPoints = 50;
    private readonly ApplicationDbContext _db;
    private readonly TimeProvider _clock;

    public LocationFeaturePublicationService(ApplicationDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<PublishLocationFeatureResult> PublishAsync(
        PublishLocationFeatureRequest request,
        Guid? publishedById,
        CancellationToken cancellationToken = default)
    {
        if (request.SubmissionId == Guid.Empty || request.LocationId == Guid.Empty ||
            string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new Wf02Exception("INVALID_PUBLICATION", "A submission, location and publication reason are required.", 422);
        }

        if (!Enum.IsDefined(request.FeatureType) || !Enum.IsDefined(request.Status))
        {
            throw new Wf02Exception("INVALID_PUBLICATION", "Unsupported feature type or published status.", 422);
        }

        if (request.Status == PublishedFeatureStatus.Unknown)
        {
            throw new Wf02Exception("INVALID_PUBLICATION", "Unknown is not a publishable verified status.", 422);
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var submission = await _db.Submissions.SingleOrDefaultAsync(
            item => item.Id == request.SubmissionId,
            cancellationToken);
        if (submission is null)
        {
            throw new Wf02Exception("SUBMISSION_NOT_FOUND", "The source submission does not exist.", 404);
        }

        if (!Guid.TryParse(submission.PlaceId, out var submittedLocationId) ||
            submittedLocationId != request.LocationId)
        {
            throw new Wf02Exception("PUBLICATION_LOCATION_MISMATCH", "The submission does not belong to this location.", 409);
        }

        if (submission.Status is not (SubmissionStatus.AutoVerified or SubmissionStatus.PendingModeration or SubmissionStatus.Published))
        {
            throw new Wf02Exception("SUBMISSION_NOT_VERIFIED", "Only a verified submission can be published.", 409);
        }

        var location = await _db.Places.SingleOrDefaultAsync(
            item => item.Id == request.LocationId,
            cancellationToken);
        if (location is null)
        {
            throw new Wf02Exception("LOCATION_NOT_FOUND", "The location does not exist.", 404);
        }

        if (location.Status != LocationStatus.Active)
        {
            throw new Wf02Exception("LOCATION_NOT_ACTIVE", "Only an active canonical location can be published.", 409);
        }

        if (request.ScopeId is Guid scopeId)
        {
            var validScope = await _db.AccessScopes.AnyAsync(
                item => item.Id == scopeId && item.LocationId == request.LocationId && item.IsActive,
                cancellationToken);
            if (!validScope)
            {
                throw new Wf02Exception("SCOPE_MISMATCH", "The scope is not active for this location.", 422);
            }
        }

        if (publishedById is Guid actorId)
        {
            var authorizedActor = await _db.AppUsers.AnyAsync(
                item => item.Id == actorId && item.IsActive && item.Role == AppUserRole.Admin,
                cancellationToken);
            if (!authorizedActor)
            {
                throw new Wf02Exception("PUBLICATION_FORBIDDEN", "The publication actor is not authorized.", 403);
            }
        }

        var now = _clock.GetUtcNow();
        var feature = await _db.LocationFeatures.SingleOrDefaultAsync(
            item => item.LocationId == request.LocationId &&
                    item.ScopeId == request.ScopeId &&
                    item.FeatureType == request.FeatureType,
            cancellationToken);

        var isExactReplay = feature is not null &&
                            feature.IsPublished &&
                            feature.CurrentStatus == request.Status &&
                            feature.SourceSubmissionId == request.SubmissionId;

        if (feature is null)
        {
            feature = new LocationFeature
            {
                LocationId = request.LocationId,
                ScopeId = request.ScopeId,
                FeatureType = request.FeatureType,
                CurrentStatus = request.Status,
                SourceSubmissionId = request.SubmissionId,
                VerifiedAt = now,
                IsPublished = true,
                Version = 1,
            };
            _db.LocationFeatures.Add(feature);
        }
        else if (!isExactReplay)
        {
            feature.CurrentStatus = request.Status;
            feature.SourceSubmissionId = request.SubmissionId;
            feature.VerifiedAt = now;
            feature.IsPublished = true;
            feature.Version += 1;
            feature.UpdatedAtUtc = now.UtcDateTime;
        }

        if (!isExactReplay)
        {
            _db.LocationFeatureHistories.Add(new LocationFeatureHistory
            {
                LocationFeatureId = feature.Id,
                FeatureVersion = feature.Version,
                Status = request.Status,
                SourceSubmissionId = request.SubmissionId,
                PublishedById = publishedById,
                Reason = request.Reason.Trim(),
                EffectiveAt = now,
            });

            ApplyLegacyProjection(location, request.FeatureType, request.Status, now);

            var communityState = await _db.FeatureCommunityStates.SingleOrDefaultAsync(
                item => item.LocationFeatureId == feature.Id,
                cancellationToken);
            if (communityState is not null)
            {
                communityState.FeatureVersion = feature.Version;
                communityState.Label = FeatureCommunityLabel.Uncorroborated;
                communityState.WeightedAgreement = null;
                communityState.EligibleVoterCount = 0;
                communityState.ContradictingVoterCount = 0;
                communityState.LastTrustedReconfirmedAt = null;
                communityState.FreshnessFactor = 1m;
                communityState.ActiveDisputeCaseId = null;
                communityState.ComputedAt = now;
                communityState.Version += 1;
                communityState.UpdatedAtUtc = now.UtcDateTime;
            }
        }

        var claim = await _db.SubmissionClaims.SingleOrDefaultAsync(
            item => item.SubmissionId == request.SubmissionId &&
                    item.ScopeId == request.ScopeId &&
                    item.FeatureType == request.FeatureType,
            cancellationToken);
        if (claim is null)
        {
            claim = new SubmissionClaim
            {
                SubmissionId = request.SubmissionId,
                LocationId = request.LocationId,
                ScopeId = request.ScopeId,
                FeatureType = request.FeatureType,
                ProposedStatus = request.Status,
                Status = SubmissionClaimStatus.Published,
                FinalConfidence = (decimal)submission.ConfidenceScore,
            };
            _db.SubmissionClaims.Add(claim);
        }
        else
        {
            if (claim.LocationId != request.LocationId)
            {
                throw new Wf02Exception("CLAIM_LOCATION_MISMATCH", "The submission claim belongs to another location.", 409);
            }

            claim.ProposedStatus = request.Status;
            claim.Status = SubmissionClaimStatus.Published;
            claim.UpdatedAtUtc = now.UtcDateTime;
        }

        var pointsTransaction = await _db.PointTransactions.SingleOrDefaultAsync(
            item => item.SubmissionId == submission.SubmissionCode,
            cancellationToken);
        var newlyAwardedPoints = 0;
        if (pointsTransaction is null)
        {
            newlyAwardedPoints = PublicationPoints;
            submission.PointsAwarded = PublicationPoints;
            _db.PointTransactions.Add(new PointTransaction
            {
                UserId = submission.UserId,
                SubmissionId = submission.SubmissionCode,
                Points = PublicationPoints,
                Reason = $"Xuất bản đóng góp tiếp cận [{submission.SubmissionCode}]",
                CreatedAt = now,
            });
        }
        else
        {
            submission.PointsAwarded = pointsTransaction.Points;
        }

        submission.Status = SubmissionStatus.Published;
        submission.UpdatedAtUtc = now.UtcDateTime;

        if (!isExactReplay)
        {
            _db.OutboxMessages.Add(new OutboxMessage
            {
                Type = "LocationFeaturePublished",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    locationFeatureId = feature.Id,
                    locationId = request.LocationId,
                    featureType = request.FeatureType.ToString(),
                    featureVersion = feature.Version,
                    sourceSubmissionId = request.SubmissionId,
                }),
                OccurredAt = now,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new PublishLocationFeatureResult(feature.Id, feature.Version, newlyAwardedPoints, feature.VerifiedAt);
    }

    private static void ApplyLegacyProjection(
        Place location,
        AccessibilityFeatureType featureType,
        PublishedFeatureStatus status,
        DateTimeOffset verifiedAt)
    {
        var exists = status is PublishedFeatureStatus.Available or PublishedFeatureStatus.Limited;
        switch (featureType)
        {
            case AccessibilityFeatureType.Ramp:
                location.HasRamp = exists;
                break;
            case AccessibilityFeatureType.EntranceDoor:
                location.DoorWidthOk = status == PublishedFeatureStatus.Available;
                break;
            case AccessibilityFeatureType.Elevator:
                location.HasAccessibleElevator = exists;
                break;
            case AccessibilityFeatureType.AccessibleRestroom:
                location.HasAccessibleRestroom = exists;
                break;
            case AccessibilityFeatureType.TactilePaving:
                location.HasTactilePaving = exists;
                break;
        }

        location.LastVerifiedAt = verifiedAt;
        location.UpdatedAtUtc = verifiedAt.UtcDateTime;
    }
}
