using AccessMapVN.Application.Features.Places.Queries.GetPlaceById;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PlacesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PlacesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<PlaceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetInBounds(
        [FromQuery] GetPlacesInBoundsQuery query,
        CancellationToken cancellationToken = default)
    {
        var places = await _mediator.Send(query, cancellationToken);
        return Ok(places);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PlaceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken = default)
    {
        var place = await _mediator.Send(new GetPlaceByIdQuery(id), cancellationToken);
        if (place == null)
        {
            return NotFound();
        }
        return Ok(place);
    }
}
