using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Application.Features.CommunityValidation;

public sealed record PublicTimelineItemDto(
    Guid Id,
    string EventType,
    DateTimeOffset OccurredAt,
    AccessibilityFeatureType? FeatureType,
    PublishedFeatureStatus? PublishedStatus,
    int? FeatureVersion,
    int? MetadataVersion,
    string Summary);

public sealed record PublicTimelinePage(
    IReadOnlyList<PublicTimelineItemDto> Items,
    string? NextCursor);

public sealed record CreateCommunityCommentRequest(string Body, Guid? ScopeId = null);

public sealed record CreateCommunityCommentResponse(
    Guid CommentId,
    CommunityCommentStatus Status,
    int Version,
    DateTimeOffset CreatedAt);

public sealed record PublicCommunityCommentDto(
    Guid Id,
    string Body,
    string AuthorLabel,
    DateTimeOffset CreatedAt,
    decimal RecencyWeight,
    bool IsRecentContext);

public sealed record PublicCommunityCommentPage(
    IReadOnlyList<PublicCommunityCommentDto> Items,
    string? NextCursor);

public sealed record AdminCommentQueueItemDto(
    Guid Id,
    Guid LocationId,
    string? LocationName,
    Guid? ScopeId,
    string? AuthorDisplayName,
    string Body,
    CommunityCommentStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ModeratedAt,
    string? ModerationReason,
    int Version,
    string Etag);

public sealed record AdminCommentQueuePage(
    IReadOnlyList<AdminCommentQueueItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record ModerateCommentRequest(
    CommentModerationDecision Decision,
    string Reason,
    int ExpectedVersion);

public interface ILocationTimelineCommentService
{
    Task<PublicTimelinePage> GetTimelineAsync(Guid locationId, int pageSize, string? cursor, CancellationToken cancellationToken = default);
    Task<PublicCommunityCommentPage> GetCommentsAsync(
        Guid locationId, int pageSize, string? cursor,
        CancellationToken cancellationToken = default);
    Task<CreateCommunityCommentResponse> CreateCommentAsync(
        Guid actorId, Guid locationId, string idempotencyKey, CreateCommunityCommentRequest request,
        CancellationToken cancellationToken = default);
    Task<AdminCommentQueuePage> GetAdminCommentsAsync(
        CommunityCommentStatus? status, string? search, int page, int pageSize,
        CancellationToken cancellationToken = default);
    Task<AdminCommentQueueItemDto> ModerateCommentAsync(
        Guid moderatorId, Guid locationId, Guid commentId, string idempotencyKey,
        ModerateCommentRequest request, CancellationToken cancellationToken = default);
}


