using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ApplicationDbContext? _db;
    private readonly IAiServiceClient? _aiClient;

    public SubmissionsController(
        IMediator mediator,
        ApplicationDbContext? db = null,
        IAiServiceClient? aiClient = null)
    {
        _mediator = mediator;
        _db = db;
        _aiClient = aiClient;
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

    [HttpGet("status")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatuses([FromQuery] string ids, CancellationToken cancellationToken = default)
    {
        if (_db == null || string.IsNullOrWhiteSpace(ids))
        {
            return Ok(Array.Empty<object>());
        }

        var idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var guids = idList
            .Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToList();

        var submissions = await _db.Submissions.AsNoTracking()
            .Where(s => guids.Contains(s.Id) || idList.Contains(s.SubmissionCode) || (s.ClientSubmissionId != null && idList.Contains(s.ClientSubmissionId)))
            .Select(s => new
            {
                submission_id = s.SubmissionCode,
                id = s.Id.ToString(),
                client_submission_id = s.ClientSubmissionId,
                status = s.Status.ToString(),
                points_awarded = s.Status == SubmissionStatus.Published ? 50 : 0,
            })
            .ToListAsync(cancellationToken);

        return Ok(submissions);
    }

    [HttpGet("{id}/status")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatus(string id, CancellationToken cancellationToken = default)
    {
        if (_db == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        Submission? submission = null;
        if (Guid.TryParse(id, out var guidId))
        {
            submission = await _db.Submissions
                .FirstOrDefaultAsync(s => s.Id == guidId, cancellationToken);
        }

        if (submission == null)
        {
            submission = await _db.Submissions
                .FirstOrDefaultAsync(s => s.SubmissionCode == id || s.ClientSubmissionId == id, cancellationToken);
        }

        if (submission == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        if (string.IsNullOrWhiteSpace(submission.AiObservationsJson) && submission.MediaUrls.Count > 0 && _aiClient != null)
        {
            var validWebUrls = submission.MediaUrls
                .Where(u => u.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                            u.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (validWebUrls.Count > 0)
            {
                var json = await _aiClient.VerifySubmissionRawAsync(
                    submission.Id,
                    validWebUrls,
                    submission.TextDescription,
                    cancellationToken);

                if (!string.IsNullOrWhiteSpace(json))
                {
                    submission.AiObservationsJson = json;
                    try
                    {
                        await _db.SaveChangesAsync(cancellationToken);
                    }
                    catch
                    {
                        // Graceful fallback
                    }
                }
            }
        }

        return Ok(new
        {
            submission_id = submission.SubmissionCode,
            id = submission.Id.ToString(),
            client_submission_id = submission.ClientSubmissionId,
            status = submission.Status.ToString(),
            points_awarded = submission.Status == SubmissionStatus.Published ? 50 : 0,
            media_urls = submission.MediaUrls,
            ai_observations = submission.AiObservationsJson,
            created_at = submission.CreatedAt
        });
    }

    [HttpGet("latest")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLatest(CancellationToken cancellationToken = default)
    {
        if (_db == null) return NotFound();
        var list = await _db.Submissions.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(3)
            .Select(s => new
            {
                submission_id = s.SubmissionCode,
                id = s.Id,
                media_urls = s.MediaUrls,
                ai_observations = s.AiObservationsJson,
                status = s.Status.ToString(),
                created_at = s.CreatedAt
            })
            .ToListAsync(cancellationToken);
        return Ok(list);
    }
}

