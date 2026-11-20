using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Enums;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
public sealed class AdminCommentsController : ControllerBase
{
    private readonly ILocationTimelineCommentService _service;
    public AdminCommentsController(ILocationTimelineCommentService service) => _service = service;

    [HttpGet("api/v1/admin/comments")]
    public async Task<ActionResult<AdminCommentQueuePage>> GetQueue(
        [FromQuery] CommunityCommentStatus? status = null, [FromQuery] string? search = null,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(await _service.GetAdminCommentsAsync(status, search, page, pageSize, cancellationToken));

    [HttpPost("api/v1/admin/locations/{locationId:guid}/comments/{commentId:guid}/moderation")]
    public async Task<ActionResult<AdminCommentQueueItemDto>> Moderate(
        Guid locationId, Guid commentId, [FromBody] ModerateCommentRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var moderatorId))
            throw new CommunityValidationException("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        ValidateIfMatch(request.ExpectedVersion);
        var response = await _service.ModerateCommentAsync(
            moderatorId, locationId, commentId, Request.Headers["Idempotency-Key"].ToString(), request, cancellationToken);
        Response.Headers.ETag = response.Etag;
        return Ok(response);
    }

    private void ValidateIfMatch(int expectedVersion)
    {
        var value = Request.Headers.IfMatch.ToString().Trim();
        if (string.IsNullOrEmpty(value)) return;
        if (value.StartsWith("W/", StringComparison.OrdinalIgnoreCase)) value = value[2..].Trim();
        if (!int.TryParse(value.Trim('"'), out var version) || version != expectedVersion)
            throw new CommunityValidationException("COMMENT_VERSION_CHANGED", "If-Match and expectedVersion must identify the same comment version.", 409);
    }
}
