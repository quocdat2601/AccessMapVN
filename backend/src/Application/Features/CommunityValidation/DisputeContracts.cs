using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Application.Features.CommunityValidation;

public sealed record DisputeQueueItemDto(
    Guid Id,
    Guid LocationId,
    string? LocationName,
    string? LocationAddress,
    AccessibilityFeatureType FeatureType,
    int FeatureVersion,
    PublishedFeatureStatus PublishedStatus,
    DisputeStatus Status,
    string OpenReason,
    DateTimeOffset OpenedAt,
    DateTimeOffset UpdatedAt,
    int ContradictingVoterCount);

public sealed record DisputeQueuePage(
    IReadOnlyList<DisputeQueueItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record DisputeVoteDto(
    Guid Id,
    CommunityVoteType VoteType,
    PublishedFeatureStatus? ProposedStatus,
    string? Comment,
    CommunityVoteStatus Status,
    DateTimeOffset CreatedAt,
    Guid? EvidenceSubmissionId);

public sealed record DisputeDecisionDto(
    Guid Id,
    DisputeDecisionType DecisionType,
    string Reason,
    string? ModeratorDisplayName,
    Guid? CorrectionSubmissionId,
    Guid? AdvisoryId,
    DateTimeOffset DecidedAt,
    int CaseVersion);

public sealed record TemporaryAdvisoryDto(
    Guid Id,
    AdvisoryStatus Status,
    string Reason,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt);

public sealed record DisputeDetailDto(
    Guid Id,
    Guid LocationId,
    string? LocationName,
    string? LocationAddress,
    AccessibilityFeatureType FeatureType,
    int FeatureVersion,
    PublishedFeatureStatus PublishedStatus,
    DisputeStatus Status,
    string OpenReason,
    DateTimeOffset OpenedAt,
    DateTimeOffset UpdatedAt,
    int ContradictingVoterCount,
    IReadOnlyList<DisputeVoteDto> Votes,
    IReadOnlyList<DisputeDecisionDto> Decisions,
    TemporaryAdvisoryDto? Advisory,
    Guid? CorrectionSubmissionId,
    int Version);

public sealed record DecideDisputeRequest(
    DisputeDecisionType Decision,
    string Reason,
    Guid? CorrectionSubmissionId = null,
    DateTimeOffset? StartsAt = null,
    DateTimeOffset? EndsAt = null,
    string? AdvisoryReason = null);

public interface ICommunityDisputeService
{
    Task<DisputeQueuePage> GetQueueAsync(
        DisputeStatus? status,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<DisputeDetailDto> GetByIdAsync(Guid disputeId, CancellationToken cancellationToken = default);

    Task<DisputeDetailDto> DecideAsync(
        Guid moderatorId,
        Guid disputeId,
        int expectedVersion,
        string idempotencyKey,
        DecideDisputeRequest request,
        CancellationToken cancellationToken = default);
}


