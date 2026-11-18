using System.Text.Json.Serialization;
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

[ApiController]
[Route("api/v1/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ApplicationDbContext _db;

    public SubmissionsController(IMediator mediator, ApplicationDbContext db)
    {
        _mediator = mediator;
        _db = db;
    }

    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(SubmitSurveyResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitSurveyCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var authenticatedCommand = command with { UserId = userId.ToString() };
        var result = await _mediator.Send(authenticatedCommand, cancellationToken);
        return Ok(result);
    }

    [HttpGet("mine")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatus(string id, CancellationToken cancellationToken = default)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });
        }

        return Ok(new
        {
            id = submission.Id,
            submission_code = submission.SubmissionCode,
            status = submission.Status.ToString(),
            status_code = (int)submission.Status,
            revision = submission.Revision,
            resubmission_count = submission.ResubmissionCount,
            last_resubmitted_at = submission.LastResubmittedAt,
            points_awarded = submission.PointsAwarded,
            created_at = submission.CreatedAt
        });
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
        if (Guid.TryParse(id, out var guidId))
        {
            var byGuid = await _db.Submissions.FirstOrDefaultAsync(s => s.Id == guidId, cancellationToken);
            if (byGuid != null) return byGuid;
        }

        return await _db.Submissions.FirstOrDefaultAsync(s => s.SubmissionCode == id, cancellationToken);
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
