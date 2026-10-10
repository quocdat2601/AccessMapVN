using FluentValidation;

namespace AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;

public class GetPlacesInBoundsQueryValidator : AbstractValidator<GetPlacesInBoundsQuery>
{
    public GetPlacesInBoundsQueryValidator()
    {
        RuleFor(x => x.MinLng).InclusiveBetween(-180, 180);
        RuleFor(x => x.MaxLng).InclusiveBetween(-180, 180);
        RuleFor(x => x.MinLat).InclusiveBetween(-90, 90);
        RuleFor(x => x.MaxLat).InclusiveBetween(-90, 90);
        RuleFor(x => x).Must(x => x.MinLng <= x.MaxLng).WithMessage("MinLng must be less than or equal to MaxLng.");
        RuleFor(x => x).Must(x => x.MinLat <= x.MaxLat).WithMessage("MinLat must be less than or equal to MaxLat.");
        RuleFor(x => x.ZoomLevel).GreaterThanOrEqualTo(11).WithMessage("Zoom level must be at least 11 to query places.");
    }
}
