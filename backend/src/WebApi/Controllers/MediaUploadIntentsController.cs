using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize]
public sealed class MediaUploadIntentsController : ControllerBase
{
    private readonly ICommunityMediaService _service;
    public MediaUploadIntentsController(ICommunityMediaService service) => _service = service;

    [EnableRateLimiting("community-evidence")]
    [HttpPost("api/v1/locations/{locationId:guid}/media/upload-intents")]
    public async Task<ActionResult<CreateUploadIntentResponse>> Create(
        Guid locationId, [FromBody] CreateUploadIntentRequest request, CancellationToken cancellationToken)
    {
        var actorId = RequireActor();
        var response = await _service.CreateIntentAsync(
            actorId, locationId, Request.Headers["Idempotency-Key"].ToString(), request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [EnableRateLimiting("community-evidence")]
    [HttpPost("api/v1/upload-intents/{uploadIntentId:guid}/complete")]
    public async Task<ActionResult<CompleteUploadIntentResponse>> Complete(
        Guid uploadIntentId, CancellationToken cancellationToken) =>
        Ok(await _service.CompleteIntentAsync(
            RequireActor(), uploadIntentId, Request.Headers["Idempotency-Key"].ToString(), cancellationToken));

    private Guid RequireActor()
    {
        if (User.TryGetUserId(out var actorId)) return actorId;
        throw new CommunityValidationException("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
    }
}
