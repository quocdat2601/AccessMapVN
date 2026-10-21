using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Application.Features.Wf02;

public sealed record ProposedPositionRequest(double Latitude, double Longitude);

public sealed record CreateInaccurateReportRequest(
    InaccurateReportReason Reason,
    string Description,
    Guid? ScopeId = null,
    AccessibilityFeatureType? FeatureType = null,
    int? ObservedFeatureVersion = null,
    string? ProposedAddress = null,
    ProposedPositionRequest? ProposedPosition = null,
    Guid? LinkedSubmissionId = null,
    string? EvidenceMediaUrl = null,
    string? AiAnalysisJson = null);

public sealed record CreateInaccurateReportResponse(
    Guid ReportId,
    InaccurateReportStatus Status,
    Guid LocationId,
    DateTimeOffset CreatedAt);

public sealed record ReportStatusHistoryDto(
    InaccurateReportStatus Status,
    string? PublicNote,
    DateTimeOffset OccurredAt);

public sealed record ReportEvidenceDto(
    Guid EvidenceId,
    string? Description,
    bool HasMedia,
    int SourceVersion,
    DateTimeOffset CreatedAt);

public sealed record MyReportDto(
    Guid ReportId,
    Guid LocationId,
    string LocationName,
    AccessibilityFeatureType? FeatureType,
    int? ObservedFeatureVersion,
    InaccurateReportReason Reason,
    string Description,
    InaccurateReportStatus Status,
    bool IsStaleBaseline,
    string? PublicResolutionNote,
    int Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record MyReportDetailDto(
    Guid ReportId,
    Guid LocationId,
    string LocationName,
    Guid? ScopeId,
    AccessibilityFeatureType? FeatureType,
    int? ObservedFeatureVersion,
    InaccurateReportReason Reason,
    string Description,
    InaccurateReportStatus Status,
    bool IsStaleBaseline,
    string? ProposedAddress,
    double? ProposedLatitude,
    double? ProposedLongitude,
    string? RequestForInformation,
    string? PublicResolutionNote,
    int Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<ReportStatusHistoryDto> StatusHistory,
    IReadOnlyList<ReportEvidenceDto> Evidence);

public sealed record CursorPage<T>(IReadOnlyList<T> Items, string? NextCursor);

public sealed record AddReportEvidenceRequest(
    int ExpectedVersion,
    string? Description = null,
    Guid? OwnedMediaId = null);

public sealed record AddReportEvidenceResponse(
    Guid ReportId,
    Guid EvidenceId,
    InaccurateReportStatus Status,
    int Version,
    DateTimeOffset ActionAt);

public sealed record AdminReportQueueItemDto(
    Guid Id,
    Guid LocationId,
    string? LocationName,
    string? LocationAddress,
    AccessibilityFeatureType? FeatureType,
    int? ObservedFeatureVersion,
    InaccurateReportReason Reason,
    string Description,
    InaccurateReportStatus Status,
    bool IsStaleBaseline,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int EvidenceCount);

public sealed record AdminReportQueuePage(
    IReadOnlyList<AdminReportQueueItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record AdminReportEvidenceDto(
    Guid Id,
    string? Description,
    string? MediaUrl,
    string? MediaContentType,
    DateTimeOffset CreatedAt);

public sealed record AdminReportHistoryDto(
    Guid Id,
    InaccurateReportStatus? FromStatus,
    InaccurateReportStatus ToStatus,
    string Reason,
    string? Outcome,
    string? ActorDisplayName,
    DateTimeOffset OccurredAt);

public sealed record AdminReportDetailDto(
    Guid Id,
    Guid LocationId,
    string? LocationName,
    string? LocationAddress,
    Guid ReporterId,
    string? ReporterDisplayName,
    Guid? ScopeId,
    AccessibilityFeatureType? FeatureType,
    int? ObservedFeatureVersion,
    InaccurateReportReason Reason,
    string Description,
    InaccurateReportStatus Status,
    bool IsStaleBaseline,
    string? ProposedAddress,
    double? ProposedLatitude,
    double? ProposedLongitude,
    Guid? LinkedDisputeCaseId,
    Guid? LinkedSubmissionId,
    InaccurateReportResolution? Resolution,
    string? PublicResolutionNote,
    int LocationMetadataVersion,
    string? CurrentAddress,
    double CurrentLatitude,
    double CurrentLongitude,
    IReadOnlyList<AdminReportEvidenceDto> Evidence,
    IReadOnlyList<AdminReportHistoryDto> History,
    int Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ModerateReportRequest(
    AdminReportDecision Decision,
    string Note,
    int ExpectedVersion,
    Guid? LinkedDisputeCaseId = null,
    Guid? LinkedSubmissionId = null,
    Guid? AdvisoryId = null,
    InaccurateReportResolution? Resolution = null,
    string? PublicResolutionNote = null);

public sealed record ModerateReportResponse(
    Guid ReportId,
    InaccurateReportStatus Status,
    int Version,
    DateTimeOffset UpdatedAt);

public sealed record CorrectLocationMetadataRequest(
    int ExpectedMetadataVersion,
    Guid SourceReportId,
    string Reason,
    string? ProposedAddress = null,
    ProposedPositionRequest? ProposedPosition = null);

public sealed record CorrectLocationMetadataResponse(
    Guid ReportId,
    InaccurateReportStatus Status,
    int Version,
    int LocationMetadataVersion,
    DateTimeOffset UpdatedAt);

public interface IWf02ReportService
{
    Task<CreateInaccurateReportResponse> CreateAsync(
        Guid reporterId,
        Guid requestedLocationId,
        string idempotencyKey,
        CreateInaccurateReportRequest request,
        CancellationToken cancellationToken = default);

    Task<CursorPage<MyReportDto>> GetMineAsync(
        Guid reporterId,
        int pageSize,
        string? cursor,
        CancellationToken cancellationToken = default);

    Task<MyReportDetailDto> GetMineByIdAsync(
        Guid reporterId,
        Guid reportId,
        CancellationToken cancellationToken = default);

    Task<AddReportEvidenceResponse> AddEvidenceAsync(
        Guid reporterId,
        Guid reportId,
        string idempotencyKey,
        AddReportEvidenceRequest request,
        CancellationToken cancellationToken = default);

    Task<AdminReportQueuePage> GetAdminQueueAsync(
        InaccurateReportStatus? status,
        string? search,
        Guid? locationId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<AdminReportDetailDto> GetAdminByIdAsync(
        Guid reportId,
        CancellationToken cancellationToken = default);

    Task<ModerateReportResponse> ModerateAsync(
        Guid moderatorId,
        Guid reportId,
        string idempotencyKey,
        ModerateReportRequest request,
        CancellationToken cancellationToken = default);

    Task<CorrectLocationMetadataResponse> CorrectMetadataAsync(
        Guid moderatorId,
        Guid locationId,
        int? expectedReportVersion,
        string idempotencyKey,
        CorrectLocationMetadataRequest request,
        CancellationToken cancellationToken = default);
}
