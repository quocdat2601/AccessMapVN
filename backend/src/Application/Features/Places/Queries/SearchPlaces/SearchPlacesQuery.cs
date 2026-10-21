using MediatR;

namespace AccessMapVN.Application.Features.Places.Queries.SearchPlaces;

public record SearchPlacesQuery(
    string? Query,
    double? Latitude = null,
    double? Longitude = null,
    int Limit = 10
) : IRequest<List<GetPlacesInBounds.PlaceDto>>;
