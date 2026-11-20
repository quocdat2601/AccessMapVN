using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize]
public sealed class ReportsController : ControllerBase
{
    private readonly ICommunityReportService _service;

    public ReportsController(ICommunityReportService service)
    {
        _service = service;
    }

    [HttpPost("api/v1/locations/{locationId:guid}/reports")]
    [EnableRateLimiting("community-report")]
    [ProducesResponseType(typeof(CreateInaccurateReportResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CreateInaccurateReportResponse>> Create(
        Guid locationId,
        [FromBody] CreateInaccurateReportRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = RequireActorId();
        var response = await _service.CreateAsync(
            actorId,
            locationId,
            Request.Headers["Idempotency-Key"].ToString(),
            request,
            cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpGet("api/v1/me/reports")]
    [ProducesResponseType(typeof(CursorPage<MyReportDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<CursorPage<MyReportDto>>> GetMine(
        [FromQuery] int pageSize = 20,
        [FromQuery] string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _service.GetMineAsync(
            RequireActorId(),
            pageSize,
            cursor,
            cancellationToken));
    }

    [HttpGet("api/v1/me/reports/{reportId:guid}")]
    [ProducesResponseType(typeof(MyReportDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MyReportDetailDto>> GetMineById(
        Guid reportId,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetMineByIdAsync(RequireActorId(), reportId, cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return Ok(response);
    }

    [HttpPost("api/v1/me/reports/{reportId:guid}/evidence")]
    [EnableRateLimiting("community-evidence")]
    [ProducesResponseType(typeof(AddReportEvidenceResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AddReportEvidenceResponse>> AddEvidence(
        Guid reportId,
        [FromBody] AddReportEvidenceRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _service.AddEvidenceAsync(
            RequireActorId(),
            reportId,
            Request.Headers["Idempotency-Key"].ToString(),
            request,
            cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return StatusCode(StatusCodes.Status201Created, response);
    }

    private Guid RequireActorId()
    {
        if (User.TryGetUserId(out var actorId))
        {
            return actorId;
        }

        throw new CommunityValidationException("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
    }
}
