using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using MediatR;

namespace AccessMapVN.Application.Features.Places.Queries.GetPlaceById;

public record GetPlaceByIdQuery(string Id) : IRequest<PlaceDto?>;

public class GetPlaceByIdQueryHandler : IRequestHandler<GetPlaceByIdQuery, PlaceDto?>
{
    private readonly IPlaceRepository _placeRepository;

    public GetPlaceByIdQueryHandler(IPlaceRepository placeRepository)
    {
        _placeRepository = placeRepository;
    }

    public async Task<PlaceDto?> Handle(GetPlaceByIdQuery request, CancellationToken cancellationToken)
    {
        var place = await _placeRepository.GetByIdAsync(request.Id, cancellationToken);
        if (place == null) return null;

        return new PlaceDto
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
        };
    }
}
