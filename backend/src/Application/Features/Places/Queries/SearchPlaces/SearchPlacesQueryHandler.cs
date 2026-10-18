using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using MediatR;

namespace AccessMapVN.Application.Features.Places.Queries.SearchPlaces;

public class SearchPlacesQueryHandler : IRequestHandler<SearchPlacesQuery, List<PlaceDto>>
{
    private readonly IPlaceRepository _placeRepository;

    public SearchPlacesQueryHandler(IPlaceRepository placeRepository)
    {
        _placeRepository = placeRepository;
    }

    public async Task<List<PlaceDto>> Handle(SearchPlacesQuery request, CancellationToken cancellationToken)
    {
        var places = await _placeRepository.SearchPlacesAsync(
            request.Query,
            request.Latitude,
            request.Longitude,
            request.Limit,
            cancellationToken);

        return places.Select(place => new PlaceDto
        {
            Id = place.Id.ToString(),
            Name = place.Name,
            Category = place.Category,
            Address = place.Address,
            Phone = place.Phone,
            Website = place.Website,
            OpeningHours = place.OpeningHours,
            Lng = place.Lng,
            Lat = place.Lat,
            FloorLevel = place.FloorLevel,
            BuildingId = place.BuildingId?.ToString(),
            HasRamp = place.HasRamp,
            HasAccessibleElevator = place.HasAccessibleElevator,
            HasTactilePaving = place.HasTactilePaving,
            HasAccessibleRestroom = place.HasAccessibleRestroom,
            DoorWidthOk = place.DoorWidthOk,
            AccessibilityScore = place.AccessibilityScore,
            AccessibilityNote = place.AccessibilityNote,
            LastVerifiedAt = place.LastVerifiedAt,
        }).ToList();
    }
}
