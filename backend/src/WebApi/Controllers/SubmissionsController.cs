using System.Text.Json.Serialization;
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

    [HttpGet("mine")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken = default)
    {
        if (_db == null || !User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var userIdStr = userId.ToString();
        var submissions = await _db.Submissions
            .Where(s => s.UserId == userIdStr)
            .OrderByDescending(s => s.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var placeIds = submissions.Select(s => s.PlaceId).Distinct().ToList();
        var places = await _db.Places
            .Where(p => placeIds.Contains(p.Id.ToString()))
            .ToDictionaryAsync(p => p.Id.ToString(), p => p.Name, cancellationToken);

        var result = submissions.Select(s => new
        {
            id = s.Id,
            submission_code = s.SubmissionCode,
            place_id = s.PlaceId,
            location_name = places.TryGetValue(s.PlaceId, out var name) ? name : "Địa điểm đã khảo sát",
            status = s.Status.ToString(),
            status_code = (int)s.Status,
            revision = s.Revision,
            resubmission_count = s.ResubmissionCount,
            last_resubmitted_at = s.LastResubmittedAt,
            points_awarded = s.PointsAwarded,
            media_urls = s.MediaUrls,
            feature_tags = s.FeatureTags,
            text_description = s.TextDescription,
            gps_lat = s.GpsLat,
            gps_lng = s.GpsLng,
            created_at = s.CreatedAt
        });

        return Ok(result);
    }

    [HttpGet("{id}/status")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatus(string id, CancellationToken cancellationToken = default)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        if (_db != null && string.IsNullOrWhiteSpace(submission.AiObservationsJson) && submission.MediaUrls.Count > 0 && _aiClient != null)
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

        var pointsAwarded = submission.Status == SubmissionStatus.Published
            ? (submission.PointsAwarded > 0 ? submission.PointsAwarded : 50)
            : submission.PointsAwarded;

        return Ok(new
        {
            id = submission.Id,
            submission_id = submission.SubmissionCode,
            submission_code = submission.SubmissionCode,
            client_submission_id = submission.ClientSubmissionId,
            status = submission.Status.ToString(),
            status_code = (int)submission.Status,
            revision = submission.Revision,
            resubmission_count = submission.ResubmissionCount,
            last_resubmitted_at = submission.LastResubmittedAt,
            points_awarded = pointsAwarded,
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

    [HttpPost("{id}/resubmit")]
    [Authorize]
    [ProducesResponseType(typeof(ResubmitSubmissionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Resubmit(
        string id,
        [FromBody] ResubmitSubmissionRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        if (_db == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        if (User.TryGetUserId(out var userId) && !string.IsNullOrEmpty(submission.UserId) && submission.UserId != userId.ToString())
        {
            return Forbid();
        }

        if (submission.ResubmissionCount >= 3)
        {
            return BadRequest(new { message = "Hồ sơ đã đạt giới hạn tối đa 3 lần gửi lại." });
        }

        if (submission.Status is SubmissionStatus.Published or SubmissionStatus.Rejected or SubmissionStatus.Cancelled)
        {
            return BadRequest(new { message = "Hồ sơ đã ở trạng thái kết thúc và không thể gửi lại." });
        }

        if (request != null)
        {
            if (request.MediaUrls != null && request.MediaUrls.Count > 0)
                submission.MediaUrls = request.MediaUrls;
            if (request.FeatureTags != null && request.FeatureTags.Count > 0)
                submission.FeatureTags = request.FeatureTags;
            if (!string.IsNullOrWhiteSpace(request.TextDescription))
                submission.TextDescription = request.TextDescription;
            if (request.GpsLat.HasValue && request.GpsLng.HasValue)
            {
                submission.GpsLat = request.GpsLat.Value;
                submission.GpsLng = request.GpsLng.Value;
                submission.AccuracyMeters = request.AccuracyMeters;
            }
        }

        submission.Revision++;
        submission.ResubmissionCount++;
        var now = DateTime.UtcNow;
        submission.LastResubmittedAt = now;
        submission.UpdatedAtUtc = now;
        submission.Status = SubmissionStatus.Submitted;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new ResubmitSubmissionResponse
        {
            Id = submission.Id,
            SubmissionCode = submission.SubmissionCode,
            Revision = submission.Revision,
            ResubmissionCount = submission.ResubmissionCount,
            LastResubmittedAt = submission.LastResubmittedAt,
            Status = submission.Status.ToString(),
            Message = "Hồ sơ đã được gửi lại thành công và đang chờ xử lý.",
        });
    }

    [HttpPost("{id}/cancel")]
    [Authorize]
    [ProducesResponseType(typeof(CancelSubmissionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Cancel(
        string id,
        CancellationToken cancellationToken = default)
    {
        if (_db == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        if (User.TryGetUserId(out var userId) && !string.IsNullOrEmpty(submission.UserId) && submission.UserId != userId.ToString())
        {
            return Forbid();
        }

        if (submission.Status is SubmissionStatus.Published or SubmissionStatus.Rejected or SubmissionStatus.Cancelled)
        {
            return BadRequest(new { message = "Hồ sơ đã ở trạng thái kết thúc và không thể hủy." });
        }

        submission.Status = SubmissionStatus.Cancelled;
        submission.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new CancelSubmissionResponse
        {
            Id = submission.Id,
            SubmissionCode = submission.SubmissionCode,
            Status = submission.Status.ToString(),
            Message = "Hồ sơ đã được hủy thành công.",
        });
    }

    private async Task<Submission?> FindSubmissionAsync(string id, CancellationToken cancellationToken)
    {
        if (_db == null) return null;

        if (Guid.TryParse(id, out var guidId))
        {
            var byGuid = await _db.Submissions.FirstOrDefaultAsync(s => s.Id == guidId, cancellationToken);
            if (byGuid != null) return byGuid;
        }

        return await _db.Submissions.FirstOrDefaultAsync(
            s => s.SubmissionCode == id || s.ClientSubmissionId == id,
            cancellationToken);
    }
}

public class ResubmitSubmissionRequest
{
    [JsonPropertyName("media_urls")]
    public List<string>? MediaUrls { get; set; }

    [JsonPropertyName("feature_tags")]
    public List<string>? FeatureTags { get; set; }

    [JsonPropertyName("gps_lat")]
    public double? GpsLat { get; set; }

    [JsonPropertyName("gps_lng")]
    public double? GpsLng { get; set; }

    [JsonPropertyName("accuracy_meters")]
    public double? AccuracyMeters { get; set; }

    [JsonPropertyName("text_description")]
    public string? TextDescription { get; set; }

    [JsonPropertyName("contributor_note")]
    public string? ContributorNote { get; set; }
}

public class ResubmitSubmissionResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("submission_code")]
    public string SubmissionCode { get; set; } = string.Empty;

    [JsonPropertyName("revision")]
    public int Revision { get; set; }

    [JsonPropertyName("resubmission_count")]
    public int ResubmissionCount { get; set; }

    [JsonPropertyName("last_resubmitted_at")]
    public DateTime? LastResubmittedAt { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

public class CancelSubmissionResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("submission_code")]
    public string SubmissionCode { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

