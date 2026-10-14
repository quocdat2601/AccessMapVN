using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Application.Features.Wf02;

public sealed record ActiveAdvisoryDto(
    Guid AdvisoryId,
    string Reason,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt);

public sealed record FeatureCommunityDto(
    Guid LocationId,
    AccessibilityFeatureType FeatureType,
    PublishedFeatureStatus PublishedStatus,
    int PublishedVersion,
    DateTimeOffset VerifiedAt,
    FeatureCommunityLabel CommunityLabel,
    int EligibleVoterCount,
    int ContradictingVoterCount,
    DateTimeOffset? LastTrustedReconfirmedAt,
    decimal FreshnessFactor,
    bool RecheckRecommended,
    ActiveAdvisoryDto? ActiveAdvisory,
    string PublicMessage);

public sealed record CreateCommunityVoteRequest(
    int ObservedFeatureVersion,
    CommunityVoteType VoteType,
    PublishedFeatureStatus? ProposedStatus,
    string? Comment,
    Guid? EvidenceSubmissionId = null);

public sealed record CreateCommunityVoteResponse(
    Guid VoteId,
    CommunityVoteStatus VoteStatus,
    AssessmentJobStatus EvaluationStatus,
    int FeatureVersion,
    bool PublishedFeatureChanged,
    string Message);

public sealed record LinkVoteSubmissionRequest(Guid SubmissionId);

public sealed record LinkVoteSubmissionResponse(
    Guid VoteId,
    Guid SubmissionId,
    CommunityVoteStatus VoteStatus,
    AssessmentJobStatus EvaluationStatus,
    DateTimeOffset LinkedAt);

public interface IWf02CommunityService
{
    Task<FeatureCommunityDto> GetCommunityAsync(
        Guid locationId,
        AccessibilityFeatureType featureType,
        CancellationToken cancellationToken = default);

    Task<CreateCommunityVoteResponse> RecordVoteAsync(
        Guid actorId,
        Guid locationId,
        AccessibilityFeatureType featureType,
        string idempotencyKey,
        CreateCommunityVoteRequest request,
        CancellationToken cancellationToken = default);

    Task<LinkVoteSubmissionResponse> LinkSubmissionAsync(
        Guid actorId,
        Guid voteId,
        string idempotencyKey,
        LinkVoteSubmissionRequest request,
        CancellationToken cancellationToken = default);

    Task EvaluateAsync(Guid assessmentJobId, CancellationToken cancellationToken = default);
    Task ScanFreshnessAsync(CancellationToken cancellationToken = default);
    Task ReconcileJobsAsync(CancellationToken cancellationToken = default);
}

public interface IWf02JobScheduler
{
    string? EnqueueEvaluation(Guid assessmentJobId);
}
