using AccessMapVN.Application.Common.Interfaces;
using MediatR;

namespace AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;

public class GetPlacesInBoundsQueryHandler : IRequestHandler<GetPlacesInBoundsQuery, List<PlaceDto>>
{
    private readonly IPlaceSpatialQueryService _spatialQueryService;

    public GetPlacesInBoundsQueryHandler(IPlaceSpatialQueryService spatialQueryService)
    {
        _spatialQueryService = spatialQueryService;
    }

    public async Task<List<PlaceDto>> Handle(GetPlacesInBoundsQuery request, CancellationToken cancellationToken)
    {
        return await _spatialQueryService.GetPlacesInBoundsAsync(
            request.MinLng,
            request.MinLat,
            request.MaxLng,
            request.MaxLat,
            request.ZoomLevel,
            request.Categories,
            cancellationToken);
    }
}
