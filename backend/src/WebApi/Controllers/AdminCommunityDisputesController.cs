using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Enums;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
[Route("api/v1/admin/community-disputes")]
public sealed class AdminCommunityDisputesController : ControllerBase
{
    private readonly ICommunityDisputeService _service;

    public AdminCommunityDisputesController(ICommunityDisputeService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<DisputeQueuePage>> GetQueue(
        [FromQuery] DisputeStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(await _service.GetQueueAsync(status, search, page, pageSize, cancellationToken));

    [HttpGet("{disputeId:guid}")]
    public async Task<ActionResult<DisputeDetailDto>> GetById(Guid disputeId, CancellationToken cancellationToken)
    {
        var response = await _service.GetByIdAsync(disputeId, cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return Ok(response);
    }

    [HttpPatch("{disputeId:guid}")]
    public async Task<ActionResult<DisputeDetailDto>> Decide(
        Guid disputeId,
        [FromBody] DecideDisputeRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var moderatorId))
        {
            throw new CommunityValidationException("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        var expectedVersion = ParseRequiredEtag();
        var response = await _service.DecideAsync(
            moderatorId, disputeId, expectedVersion,
            Request.Headers["Idempotency-Key"].ToString(), request, cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return Ok(response);
    }

    private int ParseRequiredEtag()
    {
        var value = Request.Headers.IfMatch.ToString().Trim();
        if (value.StartsWith("W/", StringComparison.OrdinalIgnoreCase)) value = value[2..].Trim();
        if (!int.TryParse(value.Trim('"'), out var version) || version <= 0)
        {
            throw new CommunityValidationException("IF_MATCH_REQUIRED", "A valid If-Match version is required.", 428);
        }
        return version;
    }
}
