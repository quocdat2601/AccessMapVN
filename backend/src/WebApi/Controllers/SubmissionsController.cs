using AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;
using AccessMapVN.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SubmissionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(SubmitSurveyResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitSurveyCommand command,
        CancellationToken cancellationToken = default)
    {
        var authUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(authUserId) && User.TryGetUserId(out var userId))
        {
            authUserId = userId.ToString();
        }

        if (string.IsNullOrWhiteSpace(authUserId))
        {
            return Unauthorized(new
            {
                type = "https://tools.ietf.org/html/rfc7235#section-3.1",
                title = "Unauthorized",
                status = StatusCodes.Status401Unauthorized,
                detail = "Yêu cầu xác thực tài khoản (Access Token) để gửi khảo sát đóng góp."
            });
        }

        var authenticatedCommand = command with
        {
            AuthenticatedUserId = authUserId,
            UserId = authUserId
        };

        var result = await _mediator.Send(authenticatedCommand, cancellationToken);
        return Ok(result);
    }
}

