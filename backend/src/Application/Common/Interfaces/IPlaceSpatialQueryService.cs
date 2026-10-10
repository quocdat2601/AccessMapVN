using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;

namespace AccessMapVN.Application.Common.Interfaces;

public interface IPlaceSpatialQueryService
{
    Task<List<PlaceDto>> GetPlacesInBoundsAsync(
        double minLng,
        double minLat,
        double maxLng,
        double maxLat,
        int zoomLevel,
        string[]? categories = null,
        CancellationToken cancellationToken = default);
}
