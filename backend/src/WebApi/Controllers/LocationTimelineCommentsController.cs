using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/v1/locations/{locationId:guid}")]
public sealed class LocationTimelineCommentsController : ControllerBase
{
    private readonly IWf02TimelineCommentService _service;
    public LocationTimelineCommentsController(IWf02TimelineCommentService service) => _service = service;

    [AllowAnonymous]
    [HttpGet("timeline")]
    public async Task<ActionResult<PublicTimelinePage>> GetTimeline(
        Guid locationId, [FromQuery] int pageSize = 20, [FromQuery] string? cursor = null,
        CancellationToken cancellationToken = default) =>
        Ok(await _service.GetTimelineAsync(locationId, pageSize, cursor, cancellationToken));

    [AllowAnonymous]
    [HttpGet("comments")]
    public async Task<ActionResult<PublicCommunityCommentPage>> GetComments(
        Guid locationId, [FromQuery] int pageSize = 20, [FromQuery] string? cursor = null,
        CancellationToken cancellationToken = default) =>
        Ok(await _service.GetCommentsAsync(locationId, pageSize, cursor, cancellationToken));

    [Authorize]
    [HttpPost("comments")]
    [EnableRateLimiting("wf02-comment")]
    public async Task<ActionResult<CreateCommunityCommentResponse>> CreateComment(
        Guid locationId, [FromBody] CreateCommunityCommentRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var actorId))
            throw new Wf02Exception("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        var response = await _service.CreateCommentAsync(
            actorId, locationId, Request.Headers["Idempotency-Key"].ToString(), request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }
}
