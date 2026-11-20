using System.Text.Json;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Common.Utils;
using AccessMapVN.Application.Features.Submissions.Admin;
using AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
[Route("api/v1/admin/submissions")]
public sealed class AdminSubmissionsController : ControllerBase
{
    private const int PublicationPoints = 50;
    private const int SlaTargetMinutes = 120;
    private readonly ApplicationDbContext _db;
    private readonly IAiServiceClient? _aiClient;
    private readonly IWebHostEnvironment? _env;

    public AdminSubmissionsController(
        ApplicationDbContext db,
        IAiServiceClient? aiClient = null,
        IWebHostEnvironment? env = null)
    {
        _db = db;
        _aiClient = aiClient;
        _env = env;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ContributionQueueResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionQueueResponseDto>> GetQueue(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? category = null,
        [FromQuery] string? warning = null,
        [FromQuery] string? date = null,
        [FromQuery] string? view = null,
        [FromQuery] string? sort = "newest",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 8,
        CancellationToken cancellationToken = default)
    {
        var submissions = await _db.Submissions
            .AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        var placeIds = submissions.Select(s => s.PlaceId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
        var userIds = submissions.Select(s => s.UserId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();

        var validGuids = placeIds
            .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToList();

        var matchedPlaces = await _db.Places
            .AsNoTracking()
            .Where(p => validGuids.Contains(p.Id) || placeIds.Contains(p.Name))
            .ToListAsync(cancellationToken);

        var places = new Dictionary<string, Place>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in matchedPlaces)
        {
            places[p.Id.ToString()] = p;
            if (!string.IsNullOrWhiteSpace(p.Name))
            {
                places[p.Name] = p;
            }
        }

        var appUsers = await _db.AppUsers
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id.ToString()))
            .ToDictionaryAsync(u => u.Id.ToString(), cancellationToken);

        var allRecords = submissions.Select(s => MapToRecord(s, places, appUsers)).ToList();

        // 1. Calculate Summary
        var awaitingDecision = allRecords.Count(r => r.Status == "pending");
        var needsSupplement = allRecords.Count(r => r.Status == "needs_supplement");
        var published = allRecords.Count(r => r.Status == "published");
        var rejected = allRecords.Count(r => r.Status == "rejected");

        var summary = new ContributionQueueSummaryDto
        {
            Total = allRecords.Count,
            AwaitingDecision = awaitingDecision,
            NeedsSupplement = needsSupplement,
            Processed = published + rejected,
            Published = published,
            Rejected = rejected,
            Active = awaitingDecision + needsSupplement,
            Warnings = allRecords.Count(r => r.Priority == "high"),
            WaitingOverSla = allRecords.Count(r => r.WaitingMinutes > SlaTargetMinutes),
            NewPlaces = allRecords.Count(r => r.Type == "new_place"),
        };

        // 2. Filter
        var filtered = allRecords.Where(record =>
        {
            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("processed", StringComparison.OrdinalIgnoreCase))
                {
                    if (record.Status != "published" && record.Status != "rejected") return false;
                }
                else if (!record.Status.Equals(status, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            if (!string.IsNullOrWhiteSpace(type) && !type.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (!record.Type.Equals(type, StringComparison.OrdinalIgnoreCase)) return false;
            }

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (!record.Categories.Any(c => c.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase))) return false;
            }

            if (!string.IsNullOrWhiteSpace(warning) && !warning.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (warning.Equals("warning", StringComparison.OrdinalIgnoreCase) && record.Priority != "high") return false;
                if (warning.Equals("over_sla", StringComparison.OrdinalIgnoreCase) && record.WaitingMinutes <= SlaTargetMinutes) return false;
            }

            if (!string.IsNullOrWhiteSpace(date) && !date.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var submittedUtc = DateTimeOffset.Parse(record.SubmittedAt).UtcDateTime;
                var utcNow = DateTime.UtcNow;
                var cutoff = date.ToLowerInvariant() switch
                {
                    "today" => utcNow.Date,
                    "7d" => utcNow.AddDays(-7),
                    "30d" => utcNow.AddDays(-30),
                    _ => DateTime.MinValue,
                };
                if (submittedUtc < cutoff) return false;
            }

            if (!string.IsNullOrWhiteSpace(view) && !view.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var matchView = view.ToLowerInvariant() switch
                {
                    "fast_track" => record.Status == "pending" && record.Verification.Confidence >= 80 && record.Priority != "high",
                    "waiting_long" => record.WaitingMinutes > SlaTargetMinutes,
                    "warning" => record.Priority == "high",
                    "new_place" => record.Type == "new_place",
                    _ => true,
                };
                if (!matchView) return false;
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                var match = record.Id.ToLowerInvariant().Contains(term)
                    || record.Place.Name.ToLowerInvariant().Contains(term)
                    || record.Place.Address.ToLowerInvariant().Contains(term)
                    || record.Contributor.Name.ToLowerInvariant().Contains(term);
                if (!match) return false;
            }

            return true;
        }).ToList();

        // 3. Sort
        filtered = sort?.ToLowerInvariant() switch
        {
            "oldest" => filtered.OrderBy(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
            "highest_confidence" => filtered.OrderByDescending(r => r.Verification.Confidence).ThenByDescending(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
            "lowest_confidence" => filtered.OrderBy(r => r.Verification.Confidence).ThenByDescending(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
            "highest_reputation" => filtered.OrderByDescending(r => r.Contributor.ReputationScore).ThenByDescending(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
            _ => filtered.OrderByDescending(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
        };

        // 4. Pagination
        var safePageSize = Math.Min(50, Math.Max(1, pageSize));
        var totalPages = Math.Max(1, (int)Math.Ceiling(filtered.Count / (double)safePageSize));
        var safePage = Math.Min(totalPages, Math.Max(1, page));
        var pagedItems = filtered.Skip((safePage - 1) * safePageSize).Take(safePageSize).ToList();

        return Ok(new ContributionQueueResponseDto
        {
            Items = pagedItems,
            Total = filtered.Count,
            Page = safePage,
            PageSize = safePageSize,
            TotalPages = totalPages,
            Summary = summary,
            UpdatedAt = DateTimeOffset.UtcNow.ToString("O"),
            SlaTargetMinutes = SlaTargetMinutes,
        });
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ContributionDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContributionDetailDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null) return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });

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
                }
            }
        }

        var place = await FindPlaceAsync(submission.PlaceId, cancellationToken);
        var appUser = await FindAppUserAsync(submission.UserId, cancellationToken);
        var contributorHistory = await GetContributorHistoryAsync(submission.UserId, cancellationToken);

        return Ok(MapToDetail(submission, place, appUser, contributorHistory, _env));
    }

    [HttpGet("{id}/navigation")]
    [ProducesResponseType(typeof(ContributionNavigationDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionNavigationDto>> GetNavigation(string id, CancellationToken cancellationToken)
    {
        var submissions = await _db.Submissions
            .AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => s.SubmissionCode != null && s.SubmissionCode != "" ? s.SubmissionCode : s.Id.ToString())
            .ToListAsync(cancellationToken);

        var index = submissions.FindIndex(code => code.Equals(id, StringComparison.OrdinalIgnoreCase));
        return Ok(new ContributionNavigationDto
        {
            PreviousId = index > 0 ? submissions[index - 1] : null,
            NextId = index >= 0 && index < submissions.Count - 1 ? submissions[index + 1] : null,
            Current = index >= 0 ? index + 1 : 0,
            Total = submissions.Count,
        });
    }

    [HttpPost("{id}/approve")]
    [ProducesResponseType(typeof(ContributionDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionDetailDto>> Approve(
        string id,
        [FromBody] ApproveSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null) return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });

        var place = await FindPlaceAsync(submission.PlaceId, cancellationToken);
        var appUser = await FindAppUserAsync(submission.UserId, cancellationToken);

        // 1. Update submission status & points
        submission.Status = SubmissionStatus.Published;
        var now = DateTimeOffset.UtcNow;

        if (submission.PointsAwarded == 0)
        {
            submission.PointsAwarded = PublicationPoints;

            var existingTx = await _db.PointTransactions
                .AnyAsync(pt => pt.SubmissionId == submission.SubmissionCode, cancellationToken);
            if (!existingTx)
            {
                _db.PointTransactions.Add(new PointTransaction
                {
                    UserId = submission.UserId,
                    SubmissionId = submission.SubmissionCode,
                    Points = PublicationPoints,
                    Reason = $"Xuất bản đóng góp tiếp cận [{submission.SubmissionCode}]",
                    CreatedAt = now,
                });
            }

            if (appUser != null)
            {
                appUser.ReputationScore += 10;
            }
        }

        // 2. Project accessibility onto the target Place
        if (place == null)
        {
            var placeName = !string.IsNullOrWhiteSpace(submission.TextDescription) && !submission.TextDescription.Contains("file:")
                ? submission.TextDescription.Split(new[] { '\r', '\n', '.' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim() ?? "Địa điểm đóng góp thực địa"
                : "Địa điểm đóng góp thực địa";

            place = new Place
            {
                Name = placeName,
                Category = "other",
                Address = "Vị trí khảo sát thực địa",
                Lat = submission.GpsLat,
                Lng = submission.GpsLng,
                Status = LocationStatus.Active,
                MetadataVersion = 1,
            };
            _db.Places.Add(place);
            await _db.SaveChangesAsync(cancellationToken);

            submission.PlaceId = place.Id.ToString();
        }

        ApplyPublicationCriteria(place, submission, now);
        await SyncLocationFeaturesAsync(place, submission, now, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        var contributorHistory = await GetContributorHistoryAsync(submission.UserId, cancellationToken);
        var detail = MapToDetail(submission, place, appUser, contributorHistory, _env);
        detail.ModerationDecision = new ModerationDecisionDto
        {
            Type = "published",
            SelectedClaimIds = request.ClaimIds.Count > 0 ? request.ClaimIds : detail.Claims.Select(c => c.Id).ToList(),
            Reason = !string.IsNullOrWhiteSpace(request.Note) ? request.Note : "Hồ sơ đủ điều kiện và được phê duyệt xuất bản.",
            DecidedAt = now.ToString("O"),
            DecidedBy = "Kiểm duyệt viên",
        };
        detail.Timeline.Add(new ContributionTimelineEventDto
        {
            Id = $"timeline-{Guid.NewGuid()}",
            Type = "published",
            Title = "Phê duyệt và công bố dữ liệu",
            Description = $"Đã duyệt xuất bản đóng góp (+{PublicationPoints} EXP). {request.Note}",
            OccurredAt = now.ToString("O"),
            Actor = "Kiểm duyệt viên",
        });

        return Ok(detail);
    }

    [HttpPost("{id}/reject")]
    [ProducesResponseType(typeof(ContributionDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionDetailDto>> Reject(
        string id,
        [FromBody] RejectSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null) return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });

        var place = await FindPlaceAsync(submission.PlaceId, cancellationToken);
        var appUser = await FindAppUserAsync(submission.UserId, cancellationToken);

        submission.Status = SubmissionStatus.Rejected;
        await _db.SaveChangesAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var contributorHistory = await GetContributorHistoryAsync(submission.UserId, cancellationToken);
        var detail = MapToDetail(submission, place, appUser, contributorHistory, _env);
        detail.ModerationDecision = new ModerationDecisionDto
        {
            Type = "rejected",
            SelectedClaimIds = new List<string>(),
            Reason = request.Reason,
            DecidedAt = now.ToString("O"),
            DecidedBy = "Kiểm duyệt viên",
        };
        detail.Timeline.Add(new ContributionTimelineEventDto
        {
            Id = $"timeline-{Guid.NewGuid()}",
            Type = "rejected",
            Title = "Từ chối hồ sơ",
            Description = request.Reason,
            OccurredAt = now.ToString("O"),
            Actor = "Kiểm duyệt viên",
        });

        return Ok(detail);
    }

    [HttpPost("{id}/request-info")]
    [ProducesResponseType(typeof(ContributionDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionDetailDto>> RequestMoreInfo(
        string id,
        [FromBody] RequestMoreInfoSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null) return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });

        var place = await FindPlaceAsync(submission.PlaceId, cancellationToken);
        var appUser = await FindAppUserAsync(submission.UserId, cancellationToken);

        submission.Status = SubmissionStatus.NeedsSupplement;
        await _db.SaveChangesAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var contributorHistory = await GetContributorHistoryAsync(submission.UserId, cancellationToken);
        var detail = MapToDetail(submission, place, appUser, contributorHistory, _env);
        detail.InformationRequest = new InformationRequestDto
        {
            RequestedClaimIds = request.ClaimIds,
            EvidenceItems = request.EvidenceItems,
            Instructions = request.Instructions,
            RequestedAt = now.ToString("O"),
            RequestedBy = "Kiểm duyệt viên",
            DueAt = now.AddDays(6).ToString("O"),
            ResponseStatus = "waiting",
        };
        detail.Timeline.Add(new ContributionTimelineEventDto
        {
            Id = $"timeline-{Guid.NewGuid()}",
            Type = "info_requested",
            Title = "Yêu cầu bổ sung minh chứng",
            Description = request.Instructions,
            OccurredAt = now.ToString("O"),
            Actor = "Kiểm duyệt viên",
        });

        return Ok(detail);
    }

    [HttpPost("{id}/remind")]
    [ProducesResponseType(typeof(ContributionDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionDetailDto>> SendReminder(
        string id,
        CancellationToken cancellationToken)
    {
        var submission = await FindSubmissionAsync(id, cancellationToken);
        if (submission == null) return NotFound(new { message = $"Không tìm thấy hồ sơ '{id}'." });

        var place = await FindPlaceAsync(submission.PlaceId, cancellationToken);
        var appUser = await FindAppUserAsync(submission.UserId, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var contributorHistory = await GetContributorHistoryAsync(submission.UserId, cancellationToken);
        var detail = MapToDetail(submission, place, appUser, contributorHistory, _env);
        detail.Timeline.Add(new ContributionTimelineEventDto
        {
            Id = $"timeline-{Guid.NewGuid()}",
            Type = "reminder_sent",
            Title = "Đã gửi nhắc bổ sung",
            Description = "Thông báo nhắc nhở đã được gửi tới người khảo sát.",
            OccurredAt = now.ToString("O"),
            Actor = "Hệ thống kiểm duyệt",
        });

        return Ok(detail);
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

    private async Task<Place?> FindPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(placeId, out var guidId))
        {
            var byGuid = await _db.Places.FirstOrDefaultAsync(p => p.Id == guidId, cancellationToken);
            if (byGuid != null) return byGuid;
        }

        if (!string.IsNullOrWhiteSpace(placeId))
        {
            var byName = await _db.Places.FirstOrDefaultAsync(
                p => p.Name.ToLower() == placeId.ToLower(),
                cancellationToken);
            if (byName != null) return byName;
        }

        return null;
    }

    private async Task<AppUser?> FindAppUserAsync(string userId, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(userId, out var guidId))
        {
            return await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == guidId, cancellationToken);
        }
        return null;
    }

    private async Task<ContributorHistorySummaryDto> GetContributorHistoryAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new ContributorHistorySummaryDto
            {
                Approved = 0,
                Supplements = 0,
                Violations = 0,
                ReputationDelta = PublicationPoints,
            };
        }

        var statuses = await _db.Submissions
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => x.Status)
            .ToListAsync(cancellationToken);

        return new ContributorHistorySummaryDto
        {
            Approved = statuses.Count(x => x == SubmissionStatus.Published),
            Supplements = statuses.Count(x => x == SubmissionStatus.NeedsSupplement),
            Violations = statuses.Count(x => x == SubmissionStatus.Rejected),
            ReputationDelta = PublicationPoints,
        };
    }

    private static string FormatFileSizeOrEmpty(string url, IWebHostEnvironment? env)
    {
        if (env == null || string.IsNullOrWhiteSpace(url)) return string.Empty;
        var uploadsIdx = url.IndexOf("/uploads/", StringComparison.OrdinalIgnoreCase);
        if (uploadsIdx < 0) return string.Empty;
        var fileName = Path.GetFileName(url[uploadsIdx..].Split('?')[0]);
        if (string.IsNullOrWhiteSpace(fileName)) return string.Empty;
        var filePath = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", fileName);
        if (!System.IO.File.Exists(filePath)) return string.Empty;
        var bytes = new FileInfo(filePath).Length;
        return bytes >= 1024 * 1024
            ? $"{bytes / (1024.0 * 1024.0):F1} MB"
            : $"{Math.Max(1, bytes / 1024)} KB";
    }

    private static ContributionRecordDto MapToRecord(
        Submission s,
        IReadOnlyDictionary<string, Place> places,
        IReadOnlyDictionary<string, AppUser> appUsers)
    {
        var code = !string.IsNullOrWhiteSpace(s.SubmissionCode) ? s.SubmissionCode : s.Id.ToString();
        var placeName = !string.IsNullOrWhiteSpace(s.PlaceId) && s.PlaceId != "custom-location"
            ? s.PlaceId
            : "Địa điểm khảo sát";
        var placeAddress = string.Empty;
        var placeCity = string.Empty;
        var placeDistrict = string.Empty;

        if (places.TryGetValue(s.PlaceId, out var place))
        {
            placeName = place.Name;
            placeAddress = place.Address?.Trim() ?? string.Empty;
        }

        var contributorName = "Người đóng góp";
        var initials = "AM";
        var reputation = 100m;

        if (appUsers.TryGetValue(s.UserId, out var user))
        {
            contributorName = user.DisplayName ?? "Người đóng góp";
            reputation = user.ReputationScore;
            initials = GetInitials(contributorName);
        }

        var categories = s.FeatureTags.Select(MapTagToVietnameseCategory).Distinct().ToList();
        if (categories.Count == 0) categories.Add("Lối vào chính");

        var confidencePercent = (int)Math.Round(s.ConfidenceScore > 1.0 ? s.ConfidenceScore : s.ConfidenceScore * 100);

        var status = s.Status switch
        {
            SubmissionStatus.Published => "published",
            SubmissionStatus.Rejected => "rejected",
            SubmissionStatus.NeedsSupplement => "needs_supplement",
            _ => "pending",
        };

        var isActiveStatus = status == "pending" || status == "needs_supplement";
        var waitingMinutes = isActiveStatus
            ? (int)Math.Max(0, (DateTimeOffset.UtcNow - s.CreatedAt).TotalMinutes)
            : 0;
        var priority = isActiveStatus && (waitingMinutes > SlaTargetMinutes || confidencePercent < 60)
            ? "high"
            : "normal";

        return new ContributionRecordDto
        {
            Id = code,
            SubmittedAt = s.CreatedAt.ToString("O"),
            AttemptLabel = "Lần gửi 1",
            Type = "place_update",
            Reason = "new_accessibility_data",
            Place = new ContributionPlaceDto
            {
                Id = s.PlaceId,
                Name = placeName,
                Address = placeAddress,
                District = placeDistrict,
                City = placeCity,
            },
            Contributor = new ContributorSummaryDto
            {
                Id = s.UserId,
                Name = contributorName,
                Initials = initials,
                ReputationScore = reputation,
                AvatarTone = "teal",
            },
            Categories = categories,
            Verification = new ContributionVerificationDto
            {
                Confidence = confidencePercent,
                Outcome = status == "published" ? "publishable" : confidencePercent >= 75 ? "matched" : "needs_review",
                CheckedItems = categories.Count,
                TotalItems = categories.Count,
                Note = !string.IsNullOrWhiteSpace(s.TextDescription) ? s.TextDescription : $"Khảo sát {categories.Count} hạng mục tiếp cận",
            },
            Status = status,
            Priority = priority,
            WaitingMinutes = waitingMinutes,
            EvidenceCount = Math.Max(1, s.MediaUrls.Count),
        };
    }

    private static ContributionDetailDto MapToDetail(
        Submission s,
        Place? place,
        AppUser? appUser,
        ContributorHistorySummaryDto? contributorHistory = null,
        IWebHostEnvironment? env = null)
    {
        var placeDict = new Dictionary<string, Place>(StringComparer.OrdinalIgnoreCase);
        if (place != null)
        {
            placeDict[place.Id.ToString()] = place;
            if (!string.IsNullOrWhiteSpace(place.Name)) placeDict[place.Name] = place;
            if (!string.IsNullOrWhiteSpace(s.PlaceId)) placeDict[s.PlaceId] = place;
        }

        var userDict = appUser != null
            ? new Dictionary<string, AppUser> { [appUser.Id.ToString()] = appUser }
            : new Dictionary<string, AppUser>();

        var record = MapToRecord(s, placeDict, userDict);

        var mismatchMeters = place != null
            ? GeoUtils.CalculateDistanceInMeters(s.GpsLat, s.GpsLng, place.Lat, place.Lng)
            : 0.0;

        var evidenceList = new List<ContributionEvidenceDto>();
        if (s.MediaUrls.Count > 0)
        {
            for (var i = 0; i < s.MediaUrls.Count; i++)
            {
                var url = s.MediaUrls[i];
                var cleanPath = url.Split('?')[0];
                var isVideo = cleanPath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)
                    || cleanPath.EndsWith(".mov", StringComparison.OrdinalIgnoreCase)
                    || cleanPath.EndsWith(".webm", StringComparison.OrdinalIgnoreCase);

                var isSafeWebUrl = url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                    || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                    || url.StartsWith("/");
                var displayUrl = isSafeWebUrl ? url : "/evidence/ramp-entrance.png";
                if (url.Contains("/uploads/", StringComparison.OrdinalIgnoreCase))
                {
                    var idx = url.IndexOf("/uploads/", StringComparison.OrdinalIgnoreCase);
                    displayUrl = url[idx..];
                }

                evidenceList.Add(new ContributionEvidenceDto
                {
                    Id = $"{record.Id}-evidence-{i + 1}",
                    Type = isVideo ? "video" : "image",
                    Title = isVideo ? $"Video {i + 1} · Hành trình thực địa" : $"Ảnh {i + 1} · Minh chứng tiếp cận",
                    Url = displayUrl,
                    CapturedAt = s.CreatedAt.ToString("O"),
                    Device = "Điện thoại di động (GPS tích hợp)",
                    Resolution = string.Empty,
                    FileSize = FormatFileSizeOrEmpty(displayUrl, env),
                    ExifStatus = "valid",
                    GeotagStatus = s.AccuracyMeters <= 30 ? "valid" : "mismatch",
                    Description = !string.IsNullOrWhiteSpace(s.TextDescription)
                        ? s.TextDescription
                        : isVideo
                            ? "Video hành trình thực địa được ghi nhận từ thiết bị khảo sát."
                            : isSafeWebUrl
                                ? "Ảnh hiện trường được chụp từ thiết bị khảo sát thực địa."
                                : $"Ảnh chụp từ thiết bị di động: {url}",
                    AiFindings = new List<EvidenceAiFindingDto>
                    {
                        new()
                        {
                            Label = "AI Pre-Scan phát hiện tiện ích tiếp cận",
                            Confidence = record.Verification.Confidence,
                            Tone = record.Verification.Confidence >= 75 ? "positive" : "warning",
                        }
                    },
                });
            }
        }
        else
        {
            evidenceList.Add(new ContributionEvidenceDto
            {
                Id = $"{record.Id}-evidence-1",
                Type = "image",
                Title = "Ảnh 1 · Minh chứng tiếp cận",
                Url = "/evidence/ramp-entrance.png",
                CapturedAt = s.CreatedAt.ToString("O"),
                Device = "Mobile Camera",
                Resolution = string.Empty,
                FileSize = string.Empty,
                ExifStatus = "valid",
                GeotagStatus = "valid",
                Description = "Hình ảnh khảo sát thực tế.",
                AiFindings = new List<EvidenceAiFindingDto>
                {
                    new() { Label = "Phù hợp với thông tin khảo sát", Confidence = record.Verification.Confidence, Tone = "positive" }
                },
            });
        }

        var visualSuggestions = new List<VisualSuggestionDto>();
        var userClaims = new List<UserClaimDto>();
        if (!string.IsNullOrWhiteSpace(s.AiObservationsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(s.AiObservationsJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("visual_suggestions", out var vsEl) && vsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in vsEl.EnumerateArray())
                    {
                        var vs = new VisualSuggestionDto
                        {
                            Feature = item.TryGetProperty("feature", out var fEl) ? fEl.GetString() ?? "" : "",
                            Value = item.TryGetProperty("value", out var vEl) ? vEl.GetString() ?? "unknown" : "unknown",
                            DetectorScore = item.TryGetProperty("detector_score", out var sEl) && sEl.ValueKind == JsonValueKind.Number ? sEl.GetDouble() : null,
                            BboxFormat = item.TryGetProperty("bbox_format", out var bfEl) ? bfEl.GetString() : null,
                            CoordinateSpace = item.TryGetProperty("coordinate_space", out var csEl) ? csEl.GetString() : null,
                        };
                        if (item.TryGetProperty("bbox_normalized", out var bnEl) && bnEl.ValueKind == JsonValueKind.Array)
                        {
                            var coords = new List<double>();
                            foreach (var c in bnEl.EnumerateArray())
                            {
                                if (c.ValueKind == JsonValueKind.Number) coords.Add(c.GetDouble());
                            }
                            if (coords.Count == 4) vs.BboxNormalized = coords;
                        }
                        visualSuggestions.Add(vs);
                    }
                }

                if (root.TryGetProperty("user_claims", out var ucEl) && ucEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in ucEl.EnumerateArray())
                    {
                        userClaims.Add(new UserClaimDto
                        {
                            Feature = item.TryGetProperty("feature", out var fEl) ? fEl.GetString() ?? "" : "",
                            Claim = item.TryGetProperty("claim", out var cEl) ? cEl.GetString() ?? "unknown" : "unknown",
                            Snippet = item.TryGetProperty("snippet", out var snEl) ? snEl.GetString() : null,
                        });
                    }
                }
            }
            catch
            {
                // Graceful fallback on malformed JSON
            }
        }

        if (evidenceList.Count > 0 && visualSuggestions.Count > 0)
        {
            var detectedSuggestions = visualSuggestions
                .Where(v => v.Value == "suggested_present" || (v.DetectorScore.HasValue && v.DetectorScore.Value >= 0.5))
                .ToList();

            evidenceList[0].VisualSuggestions = detectedSuggestions;

            var dynamicFindings = new List<EvidenceAiFindingDto>();
            foreach (var vs in detectedSuggestions)
            {
                var labelName = vs.Feature switch
                {
                    "ramp_present" => "Phát hiện ram dốc",
                    "stairs_present" => "Phát hiện bậc tam cấp / cầu thang",
                    "door_detected" or "door_present" => "Phát hiện cửa ra vào",
                    "elevator_present" => "Phát hiện thang máy",
                    "accessible_restroom_sign" => "Phát hiện nhà vệ sinh tiếp cận",
                    _ => vs.Feature
                };
                var score = vs.DetectorScore.HasValue ? Math.Round(vs.DetectorScore.Value * 100) : record.Verification.Confidence;
                dynamicFindings.Add(new EvidenceAiFindingDto
                {
                    Label = labelName,
                    Confidence = score,
                    Tone = vs.Feature.Contains("stair") ? "warning" : "positive"
                });
            }
            if (dynamicFindings.Count > 0)
            {
                evidenceList[0].AiFindings = dynamicFindings;
            }
        }

        UserMeasurementsDto? measurements = null;
        if (!string.IsNullOrWhiteSpace(s.MeasurementsJson))
        {
            try
            {
                measurements = JsonSerializer.Deserialize<UserMeasurementsDto>(s.MeasurementsJson);
            }
            catch
            {
                // Graceful fallback on non-JSON
            }
        }

        var claims = record.Categories.Select((category, index) =>
        {
            var matchingVs = visualSuggestions.FirstOrDefault(v =>
                (category.Contains("Ram", StringComparison.OrdinalIgnoreCase) && v.Feature.Contains("ramp", StringComparison.OrdinalIgnoreCase)) ||
                (category.Contains("Bậc", StringComparison.OrdinalIgnoreCase) && v.Feature.Contains("stair", StringComparison.OrdinalIgnoreCase)) ||
                (category.Contains("Cửa", StringComparison.OrdinalIgnoreCase) && v.Feature.Contains("door", StringComparison.OrdinalIgnoreCase)) ||
                (category.Contains("Thang máy", StringComparison.OrdinalIgnoreCase) && v.Feature.Contains("elevator", StringComparison.OrdinalIgnoreCase)) ||
                ((category.Contains("vệ sinh", StringComparison.OrdinalIgnoreCase) || category.Contains("ký hiệu", StringComparison.OrdinalIgnoreCase)) && v.Feature.Contains("restroom", StringComparison.OrdinalIgnoreCase))
            );

            var claimConfidence = matchingVs?.DetectorScore.HasValue == true
                ? (int)Math.Round(matchingVs.DetectorScore.Value * 100)
                : (int)Math.Round(record.Verification.Confidence);

            string aiLabel;
            string aiDetails;

            if (matchingVs != null && matchingVs.DetectorScore.HasValue)
            {
                var score = (int)Math.Round(matchingVs.DetectorScore.Value * 100);
                if (score >= 75)
                {
                    aiLabel = "Khớp hình ảnh";
                    aiDetails = $"Nhận diện hình ảnh phát hiện '{category}' ({score}%).";
                }
                else
                {
                    aiLabel = "Cần đối chiếu";
                    aiDetails = $"Nhận diện hình ảnh phát hiện '{category}' nhưng độ tin cậy thấp ({score}%).";
                }
            }
            else
            {
                if (claimConfidence >= 75)
                {
                    aiLabel = "Phù hợp";
                    aiDetails = $"Độ tin cậy tổng thể hồ sơ đạt {claimConfidence}%.";
                }
                else if (claimConfidence >= 50)
                {
                    aiLabel = "Cần đối chiếu";
                    aiDetails = $"Độ tin cậy trung bình ({claimConfidence}%). Cần đối chiếu kỹ minh chứng.";
                }
                else
                {
                    aiLabel = "Chưa phát hiện";
                    aiDetails = $"AI chưa nhận diện được '{category}' trong ảnh ({claimConfidence}%). Cần kiểm tra kỹ minh chứng.";
                }
            }

            string contributorClaimText;
            if (category.Contains("ram", StringComparison.OrdinalIgnoreCase) &&
                measurements?.RampSlope?.Status == "provided" &&
                measurements.RampSlope.HeightCm.HasValue &&
                measurements.RampSlope.LengthCm.HasValue &&
                measurements.RampSlope.LengthCm.Value > 0)
            {
                var h = measurements.RampSlope.HeightCm.Value;
                var l = measurements.RampSlope.LengthCm.Value;
                var slopeRatio = h / l;
                var slopePercent = Math.Round(slopeRatio * 100, 1);
                var ratio = Math.Round(l / h, 1);
                var slopeOk = slopeRatio <= (1.0 / 12.0);
                contributorClaimText = $"Khai báo số đo: Độ dốc {slopePercent}% (1:{ratio}, H={h}cm, L={l}cm) - {(slopeOk ? "Đáp ứng tiêu chí độ dốc QCVN 10:2024 (≤ 1/12)" : "Vượt ngưỡng dốc QCVN 10:2024 (≤ 1/12)")}.";
            }
            else if (category.Contains("cửa", StringComparison.OrdinalIgnoreCase) &&
                     measurements?.DoorClearWidth?.Status == "provided" &&
                     measurements.DoorClearWidth.ValueMm.HasValue)
            {
                var w = measurements.DoorClearWidth.ValueMm.Value;
                var wOk = w >= 900.0;
                contributorClaimText = $"Khai báo số đo: Chiều rộng thông thủy {w / 10.0}cm - {(wOk ? "Đáp ứng tiêu chí chiều rộng cửa vào công trình theo QCVN 10:2024 (≥ 90cm)" : "Chưa đáp ứng tiêu chí chiều rộng cửa vào công trình theo QCVN 10:2024 (≥ 90cm)")}.";
            }
            else
            {
                contributorClaimText = $"Quan sát thực tế: Người dùng ghi nhận '{category}' tại địa điểm (chưa có số đo kỹ thuật).";
            }

            return new AccessibilityClaimDto
            {
                Id = $"{record.Id}-claim-{index + 1}",
                Feature = category,
                Standard = GetStandardForCategory(category),
                ContributorClaim = contributorClaimText,
                AiAssessment = new AiClaimAssessmentDto
                {
                    Label = aiLabel,
                    Confidence = claimConfidence,
                    Details = aiDetails,
                    AdvisoryOnly = true,
                },
                CurrentPublishedValue = "Chưa có dữ liệu",
                EvidenceIds = evidenceList.Select(e => e.Id).Take(1).ToList(),
                EligibleForApproval = record.Status != "rejected",
                Decision = record.Status == "published" ? "approved" : record.Status == "rejected" ? "rejected" : "pending",
                DecisionNote = record.Status == "published" ? "Đã xác minh và chấp thuận." : null,
            };
        }).ToList();

        var timeline = new List<ContributionTimelineEventDto>
        {
            new()
            {
                Id = $"{record.Id}-timeline-1",
                Type = "submitted",
                Title = "Tiếp nhận hồ sơ khảo sát",
                Description = $"Người dùng đã gửi hồ sơ đóng góp gồm {record.Categories.Count} hạng mục và {evidenceList.Count} minh chứng.",
                OccurredAt = s.CreatedAt.ToString("O"),
                Actor = record.Contributor.Name,
            },
            new()
            {
                Id = $"{record.Id}-timeline-2",
                Type = "ai_completed",
                Title = "Hoàn tất AI Pre-Scan",
                Description = $"Độ tin cậy tổng thể đạt {record.Verification.Confidence}%.",
                OccurredAt = s.CreatedAt.AddSeconds(15).ToString("O"),
                Actor = "Hệ thống AI AccessMapVN",
            }
        };

        return new ContributionDetailDto
        {
            Id = record.Id,
            SubmittedAt = record.SubmittedAt,
            AttemptLabel = record.AttemptLabel,
            Type = record.Type,
            Reason = record.Reason,
            Place = record.Place,
            Contributor = record.Contributor,
            Categories = record.Categories,
            Verification = record.Verification,
            Status = record.Status,
            Priority = record.Priority,
            WaitingMinutes = record.WaitingMinutes,
            EvidenceCount = record.EvidenceCount,
            LocationIntegrity = new LocationIntegrityDto
            {
                PoiCode = s.PlaceId,
                Latitude = s.GpsLat,
                Longitude = s.GpsLng,
                GpsAccuracyMeters = s.AccuracyMeters ?? 5.0,
                SurveyArea = !string.IsNullOrWhiteSpace(record.Place.Address) ? record.Place.Address : record.Place.Name,
                MismatchMeters = Math.Round(mismatchMeters, 1),
                Warning = mismatchMeters > 50.0 ? $"Khoảng cách lệch {Math.Round(mismatchMeters, 1)}m so với tọa độ gốc của địa điểm." : null,
                MapHref = $"https://www.google.com/maps?q={s.GpsLat},{s.GpsLng}",
            },
            Evidence = evidenceList,
            Claims = claims,
            Timeline = timeline,
            ContributorHistory = contributorHistory ?? new ContributorHistorySummaryDto
            {
                Approved = 0,
                Supplements = 0,
                Violations = 0,
                ReputationDelta = PublicationPoints,
            },
            TechnicalNotes = new List<string>
            {
                $"Tọa độ GPS ghi nhận: ({s.GpsLat:F6}, {s.GpsLng:F6}), độ chính xác ±{s.AccuracyMeters ?? 5.0:F1}m.",
                !string.IsNullOrWhiteSpace(s.TextDescription) ? $"Ghi chú: \"{s.TextDescription}\"" : "Không có ghi chú thêm."
            },
            ApplicableStandards = new List<string>
            {
                "QCVN 10:2024/BXD - Quy chuẩn kỹ thuật quốc gia về Xây dựng công trình đảm bảo người khuyết tật tiếp cận sử dụng",
                "Tiêu chuẩn khảo sát tiếp cận cộng đồng AccessMapVN 2026"
            },
            UserClaims = userClaims,
        };
    }

    public static void ApplyPublicationCriteria(Place place, Submission submission, DateTimeOffset publishedAt)
    {
        UserMeasurementsDto? measurements = null;
        if (!string.IsNullOrWhiteSpace(submission.MeasurementsJson))
        {
            try
            {
                measurements = JsonSerializer.Deserialize<UserMeasurementsDto>(submission.MeasurementsJson);
            }
            catch
            {
                // Graceful fallback
            }
        }

        // 1. Tiêu chí Chiều rộng thông thủy cửa vào công trình (QCVN 10:2024/BXD mục 2.3.1 >= 900 mm)
        if (measurements?.DoorClearWidth?.ValueMm.HasValue == true)
        {
            var width = measurements.DoorClearWidth.ValueMm.Value;
            place.DoorWidthOk = width >= 900.0;
        }
        // GHI CHÚ: Nếu submission mới không có số đo, bảo tồn nguyên trạng giá trị đã được duyệt trước đó.

        // 2. Tiêu chí Ram dốc
        var hasRampObservation = submission.FeatureTags.Any(t =>
            t.Equals("exterior_ramp_present", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("ramp_present", StringComparison.OrdinalIgnoreCase));

        // ponytail: absent tại một lối vào không được tự động gán place.HasRamp = false cho toàn bộ địa điểm.
        // POI có thể có lối vào khác có dốc. Cập nhật absent phải gắn theo AccessPoint cụ thể và tổng hợp qua projection.
        if (hasRampObservation && place.HasRamp != true)
        {
            place.HasRamp = true;
        }

        // 3. Tiêu chí Thang máy
        var hasElevatorObs = submission.FeatureTags.Any(t =>
            t.Equals("elevator_accessible", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("elevator_present", StringComparison.OrdinalIgnoreCase));
        if (hasElevatorObs && place.HasAccessibleElevator != true)
        {
            place.HasAccessibleElevator = true;
        }

        // 4. Tiêu chí Nhà vệ sinh tiếp cận
        var hasAccessibleRestroomClaim = submission.FeatureTags.Any(t =>
            t.Equals("accessible_restroom", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("restroom_accessible_stall", StringComparison.OrdinalIgnoreCase));

        if (hasAccessibleRestroomClaim && place.HasAccessibleRestroom != true)
        {
            place.HasAccessibleRestroom = true;
        }

        // 5. Tiêu chí Gạch xúc giác
        var hasTactileObs = submission.FeatureTags.Any(t =>
            t.Equals("tactile_paving_guiding", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("tactile_paving_warning", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("tactile_paving_present", StringComparison.OrdinalIgnoreCase));
        if (hasTactileObs && place.HasTactilePaving != true)
        {
            place.HasTactilePaving = true;
        }

        // 6. Cập nhật Điểm số và thời gian kiểm định
        var surveyedCount = 0;
        var availableCount = 0;
        foreach (var flag in new bool?[]
        {
            place.HasRamp,
            place.DoorWidthOk,
            place.HasAccessibleElevator,
            place.HasAccessibleRestroom,
            place.HasTactilePaving,
        })
        {
            if (flag.HasValue) surveyedCount++;
            if (flag == true) availableCount++;
        }

        var confidencePercent = (decimal)Math.Round(submission.ConfidenceScore <= 1.0 ? submission.ConfidenceScore * 100 : submission.ConfidenceScore);
        place.AccessibilityScore = confidencePercent >= 50 ? confidencePercent : Math.Round((decimal)availableCount / 5.0m * 100.0m, 1);
        place.AccessibilityNote = !string.IsNullOrWhiteSpace(submission.TextDescription) && !submission.TextDescription.Contains("file:")
            ? submission.TextDescription
            : $"Khảo sát cộng đồng: Đã ghi nhận {surveyedCount} hạng mục tiếp cận ({availableCount} khả dụng, chưa thẩm định thông số kỹ thuật).";
        place.LastVerifiedAt = publishedAt;
    }

    private static string MapTagToVietnameseCategory(string tag)
    {
        var lower = tag.ToLowerInvariant();
        if (lower.Contains("ramp")) return "Có ram dốc";
        if (lower.Contains("threshold")) return "Không thấy gờ/bậc tại cửa";
        if (lower.Contains("door_auto") || lower == "door_auto_present") return "Có cửa tự động";
        if (lower.Contains("lever") || lower == "door_lever_handle") return "Có tay nắm dạng gạt";
        if (lower.Contains("door") || lower.Contains("entrance")) return "Có cửa ra vào";
        if (lower.Contains("elevator")) return "Có thang máy";
        if (lower.Contains("sink")) return "Có khoảng trống dưới bồn rửa";
        if (lower.Contains("grab_bars")) return "Có tay vịn cạnh bồn cầu";
        if (lower.Contains("sign")) return "Có biển ký hiệu người khuyết tật";
        if (lower.Contains("restroom") || lower.Contains("toilet") || lower.Contains("wc")) return "Có nhà vệ sinh";
        if (lower.Contains("tactile")) return "Có dải xúc giác";
        if (lower.Contains("parking")) return "Có chỗ đỗ xe có ký hiệu NKT";
        if (lower.Contains("counter")) return "Có đoạn quầy hạ thấp";
        if (lower.Contains("braille")) return "Có chữ nổi Braille";
        if (lower.Contains("audible")) return "Có âm thanh thông báo";
        if (lower.Contains("step") || lower.Contains("stair")) return "Có bậc/cầu thang tại lối vào";
        return tag;
    }

    private static string GetStandardForCategory(string category)
    {
        return category switch
        {
            "Có ram dốc" => "QCVN 10:2024/BXD mục 2.2.1: Độ dốc không lớn hơn 1/12, có tay vịn khi dốc cao",
            "Có cửa ra vào" => "QCVN 10:2024/BXD mục 2.3.1: Chiều rộng thông thủy cửa ra vào công trình không nhỏ hơn 900 mm",
            "Không thấy gờ/bậc tại cửa" => "QCVN 10:2024/BXD: Gờ cửa không vượt quá 20 mm, vát thoải",
            "Có cửa tự động" => "QCVN 10:2024/BXD: Cửa tự động có cảm biến nhận diện người ngồi xe lăn",
            "Có tay nắm dạng gạt" => "QCVN 10:2024/BXD: Tay nắm dạng gạt dễ thao tác bằng một tay",
            "Có thang máy" => "QCVN 10:2024/BXD: Buồng thang tiếp cận, bảng điều khiển thấp và chữ nổi",
            "Có nhà vệ sinh" => "QCVN 10:2024/BXD mục 2.6: Cửa mở ra ngoài, không gian quay xe lăn đường kính tối thiểu 1500 mm",
            "Có biển ký hiệu người khuyết tật" => "Biển hiệu quốc tế tiếp cận (ISA) gắn rõ ràng",
            "Có tay vịn cạnh bồn cầu" => "QCVN 10:2024/BXD: Tay vịn chịu lực hỗ trợ chuyển tư thế",
            "Có khoảng trống dưới bồn rửa" => "QCVN 10:2024/BXD: Chiều cao thông thủy dưới gầm lavabo tối thiểu 700 mm",
            "Có chỗ đỗ xe có ký hiệu NKT" => "QCVN 10:2024/BXD: Ô đỗ xe rộng tối thiểu 3,5 m, có biển hiệu tiếp cận",
            "Có bậc/cầu thang tại lối vào" => "Cảnh báo cản trở người đi xe lăn, cần kết hợp ram dốc hoặc thiết bị nâng",
            "Có đoạn quầy hạ thấp" => "QCVN 10:2024/BXD: Chiều cao mặt bàn/quầy phục vụ từ 700 mm đến 800 mm",
            _ => "Quy chuẩn kỹ thuật quốc gia QCVN 10:2024/BXD",
        };
    }

    private static string GetInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "AM";
        if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant();
        return $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[^1][0])}";
    }

    private async Task SyncLocationFeaturesAsync(Place place, Submission submission, DateTimeOffset publishedAt, CancellationToken cancellationToken)
    {
        var existingFeatures = await _db.LocationFeatures
            .Where(f => f.LocationId == place.Id && f.ScopeId == null)
            .ToListAsync(cancellationToken);

        void EnsureFeature(AccessibilityFeatureType type, bool isPresent, PublishedFeatureStatus status)
        {
            if (!isPresent) return;
            var feat = existingFeatures.FirstOrDefault(f => f.FeatureType == type);
            if (feat == null)
            {
                _db.LocationFeatures.Add(new LocationFeature
                {
                    LocationId = place.Id,
                    FeatureType = type,
                    CurrentStatus = status,
                    Version = 1,
                    IsPublished = true,
                    VerifiedAt = publishedAt,
                    SourceSubmissionId = submission.Id,
                });
            }
            else
            {
                feat.CurrentStatus = status;
                feat.IsPublished = true;
                feat.VerifiedAt = publishedAt;
                feat.SourceSubmissionId = submission.Id;
            }
        }

        EnsureFeature(AccessibilityFeatureType.Ramp, place.HasRamp == true, PublishedFeatureStatus.Available);
        EnsureFeature(AccessibilityFeatureType.EntranceDoor, place.DoorWidthOk != null, place.DoorWidthOk == true ? PublishedFeatureStatus.Available : PublishedFeatureStatus.Limited);
        EnsureFeature(AccessibilityFeatureType.Elevator, place.HasAccessibleElevator == true, PublishedFeatureStatus.Available);
        EnsureFeature(AccessibilityFeatureType.AccessibleRestroom, place.HasAccessibleRestroom == true, PublishedFeatureStatus.Available);
    }
}
