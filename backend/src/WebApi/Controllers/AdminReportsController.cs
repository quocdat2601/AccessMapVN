using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Domain.Enums;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = Wf02Policies.Moderate)]
[Route("api/v1/admin/reports")]
public sealed class AdminReportsController : ControllerBase
{
    private readonly IWf02ReportService _service;
    private readonly IWf02MediaService _mediaService;

    public AdminReportsController(IWf02ReportService service, IWf02MediaService mediaService)
    {
        _service = service;
        _mediaService = mediaService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminReportQueuePage), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminReportQueuePage>> GetQueue(
        [FromQuery] InaccurateReportStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] Guid? locationId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _service.GetAdminQueueAsync(
            status,
            search,
            locationId,
            page,
            pageSize,
            cancellationToken));
    }

    [HttpGet("{reportId:guid}")]
    [ProducesResponseType(typeof(AdminReportDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminReportDetailDto>> GetById(
        Guid reportId,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetAdminByIdAsync(reportId, cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return Ok(response);
    }

    [HttpGet("{reportId:guid}/evidence/{evidenceId:guid}/access")]
    [ProducesResponseType(typeof(AdminEvidenceAccessResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminEvidenceAccessResponse>> GetEvidenceAccess(
        Guid reportId,
        Guid evidenceId,
        CancellationToken cancellationToken) =>
        Ok(await _mediaService.CreateAdminEvidenceAccessAsync(reportId, evidenceId, cancellationToken));

    [HttpPatch("{reportId:guid}")]
    [ProducesResponseType(typeof(ModerateReportResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ModerateReportResponse>> Moderate(
        Guid reportId,
        [FromBody] ModerateReportRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var moderatorId))
        {
            throw new Wf02Exception("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        ValidateIfMatch(request.ExpectedVersion);
        var response = await _service.ModerateAsync(
            moderatorId,
            reportId,
            Request.Headers["Idempotency-Key"].ToString(),
            request,
            cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return Ok(response);
    }

    private void ValidateIfMatch(int expectedVersion)
    {
        var header = Request.Headers.IfMatch.ToString();
        if (string.IsNullOrWhiteSpace(header))
        {
            return;
        }

        var value = header.Trim();
        if (value.StartsWith("W/", StringComparison.OrdinalIgnoreCase))
        {
            value = value[2..].Trim();
        }

        value = value.Trim('"');
        if (!int.TryParse(value, out var headerVersion) || headerVersion != expectedVersion)
        {
            throw new Wf02Exception(
                "REPORT_VERSION_CHANGED",
                "If-Match and expectedVersion must identify the same report version.",
                409);
        }
    }
}
