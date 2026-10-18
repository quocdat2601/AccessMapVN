using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Domain.Enums;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/v1/locations/{locationId:guid}/features/{featureType}")]
public sealed class CommunityValidationController : ControllerBase
{
    private readonly IWf02CommunityService _service;

    public CommunityValidationController(IWf02CommunityService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    [HttpGet("community")]
    [ProducesResponseType(typeof(FeatureCommunityDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FeatureCommunityDto>> GetCommunity(
        Guid locationId,
        AccessibilityFeatureType featureType,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetCommunityAsync(locationId, featureType, cancellationToken));
    }

    [Authorize]
    [HttpPost("votes")]
    [EnableRateLimiting("wf02-vote")]
    [ProducesResponseType(typeof(CreateCommunityVoteResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CreateCommunityVoteResponse>> CreateVote(
        Guid locationId,
        AccessibilityFeatureType featureType,
        [FromBody] CreateCommunityVoteRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var actorId))
        {
            throw new Wf02Exception("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        var key = Request.Headers["Idempotency-Key"].ToString();
        var response = await _service.RecordVoteAsync(
            actorId,
            locationId,
            featureType,
            key,
            request,
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [Authorize]
    [HttpDelete("votes/mine")]
    [ProducesResponseType(typeof(FeatureCommunityDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FeatureCommunityDto>> WithdrawVote(
        Guid locationId,
        AccessibilityFeatureType featureType,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var actorId))
        {
            throw new Wf02Exception("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        var response = await _service.WithdrawVoteAsync(actorId, locationId, featureType, cancellationToken);
        return Ok(response);
    }

    [Authorize]
    [HttpPost("~/api/v1/community-votes/{voteId:guid}/link-submission")]
    [EnableRateLimiting("wf02-evidence")]
    [ProducesResponseType(typeof(LinkVoteSubmissionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<LinkVoteSubmissionResponse>> LinkSubmission(
        Guid voteId,
        [FromBody] LinkVoteSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var actorId))
        {
            throw new Wf02Exception("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        return Ok(await _service.LinkSubmissionAsync(
            actorId,
            voteId,
            Request.Headers["Idempotency-Key"].ToString(),
            request,
            cancellationToken));
    }
}
