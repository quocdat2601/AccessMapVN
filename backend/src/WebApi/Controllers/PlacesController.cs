using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using AccessMapVN.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PlacesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IPlaceRepository _placeRepository;

    public PlacesController(IMediator mediator, IPlaceRepository placeRepository)
    {
        _mediator = mediator;
        _placeRepository = placeRepository;
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
    [ProducesResponseType(typeof(Place), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken = default)
    {
        var place = await _placeRepository.GetByIdAsync(id, cancellationToken);
        if (place == null)
        {
            return NotFound();
        }
        return Ok(place);
    }
}
