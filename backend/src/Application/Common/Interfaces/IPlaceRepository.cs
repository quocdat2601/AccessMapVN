using AccessMapVN.Domain.Entities;

namespace AccessMapVN.Application.Common.Interfaces;

public interface IPlaceRepository
{
    Task<Place?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    Task UpdateAccessibilityFeaturesAsync(
        string id,
        bool? hasRamp,
        bool? hasAccessibleElevator,
        bool? hasTactilePaving,
        bool? hasAccessibleRestroom,
        bool? doorWidthOk,
        decimal? accessibilityScore,
        string? accessibilityNote,
        CancellationToken cancellationToken = default);

    Task<List<Place>> SearchPlacesAsync(
        string? query,
        double? latitude = null,
        double? longitude = null,
        int limit = 10,
        CancellationToken cancellationToken = default);
}
