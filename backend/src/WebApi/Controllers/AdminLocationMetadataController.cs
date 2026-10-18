using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = Wf02Policies.Moderate)]
[Route("api/v1/admin/locations/{locationId:guid}/metadata")]
public sealed class AdminLocationMetadataController : ControllerBase
{
    private readonly IWf02ReportService _service;

    public AdminLocationMetadataController(IWf02ReportService service) => _service = service;

    [HttpPatch]
    public async Task<ActionResult<CorrectLocationMetadataResponse>> Correct(
        Guid locationId,
        [FromBody] CorrectLocationMetadataRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var moderatorId))
        {
            throw new Wf02Exception("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        var expectedReportVersion = ParseOptionalEtag();
        var response = await _service.CorrectMetadataAsync(
            moderatorId,
            locationId,
            expectedReportVersion,
            Request.Headers["Idempotency-Key"].ToString(),
            request,
            cancellationToken);
        Response.Headers.ETag = $"\"{response.Version}\"";
        return Ok(response);
    }

    private int? ParseOptionalEtag()
    {
        var value = Request.Headers.IfMatch.ToString().Trim();
        if (string.IsNullOrEmpty(value)) return null;
        if (value.StartsWith("W/", StringComparison.OrdinalIgnoreCase)) value = value[2..].Trim();
        if (!int.TryParse(value.Trim('"'), out var version) || version <= 0)
        {
            throw new Wf02Exception("INVALID_IF_MATCH", "If-Match must contain a positive report version.", 422);
        }
        return version;
    }
}
