using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Application.Features.CommunityValidation;

public sealed record PublishLocationFeatureRequest(
    Guid SubmissionId,
    Guid LocationId,
    Guid? ScopeId,
    AccessibilityFeatureType FeatureType,
    PublishedFeatureStatus Status,
    string Reason);

public sealed record PublishLocationFeatureResult(
    Guid LocationFeatureId,
    int FeatureVersion,
    int PointsAwarded,
    DateTimeOffset PublishedAt);

/// <summary>
/// The single WF-01 publication boundary allowed to mutate published feature truth.
/// Votes and reports must never call this contract directly.
/// </summary>
public interface ILocationFeaturePublicationService
{
    Task<PublishLocationFeatureResult> PublishAsync(
        PublishLocationFeatureRequest request,
        Guid? publishedById,
        CancellationToken cancellationToken = default);
}
