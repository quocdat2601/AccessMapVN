using MediatR;

namespace AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;

public record GetPlacesInBoundsQuery : IRequest<List<PlaceDto>>
{
    public double MinLng { get; init; }
    public double MinLat { get; init; }
    public double MaxLng { get; init; }
    public double MaxLat { get; init; }
    public int ZoomLevel { get; init; } = 14;
    public string[]? Categories { get; init; }

    public GetPlacesInBoundsQuery() { }

    public GetPlacesInBoundsQuery(
        double minLng,
        double minLat,
        double maxLng,
        double maxLat,
        int zoomLevel = 14,
        string[]? categories = null)
    {
        MinLng = minLng;
        MinLat = minLat;
        MaxLng = maxLng;
        MaxLat = maxLat;
        ZoomLevel = zoomLevel;
        Categories = categories;
    }
}
