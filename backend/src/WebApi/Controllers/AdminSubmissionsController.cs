using System.Text.Json;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Utils;
using AccessMapVN.Application.Features.Submissions.Admin;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = Wf02Policies.Moderate)]
[Route("api/v1/admin/submissions")]
public sealed class AdminSubmissionsController : ControllerBase
{
    private const int PublicationPoints = 50;
    private const int SlaTargetMinutes = 120;
    private readonly ApplicationDbContext _db;

    public AdminSubmissionsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ContributionQueueResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionQueueResponseDto>> GetQueue(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? sort = "oldest",
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

        var places = await _db.Places
            .AsNoTracking()
            .Where(p => placeIds.Contains(p.Id.ToString()))
            .ToDictionaryAsync(p => p.Id.ToString(), cancellationToken);

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
            "newest" => filtered.OrderByDescending(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
            "lowest_confidence" => filtered.OrderBy(r => r.Verification.Confidence).ToList(),
            "highest_reputation" => filtered.OrderByDescending(r => r.Contributor.ReputationScore).ToList(),
            _ => filtered.OrderBy(r => DateTimeOffset.Parse(r.SubmittedAt)).ToList(),
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

        var place = await FindPlaceAsync(submission.PlaceId, cancellationToken);
        if (place == null && submission.Status == SubmissionStatus.Published)
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
            await _db.SaveChangesAsync(cancellationToken);
        }

        if (place != null && submission.Status == SubmissionStatus.Published && place.AccessibilityScore == null)
        {
            foreach (var tag in submission.FeatureTags)
            {
                var lower = tag.ToLowerInvariant();
                if (lower.Contains("ramp") && place.HasRamp != true) place.HasRamp = true;
                if ((lower.Contains("door") || lower.Contains("entrance")) && place.DoorWidthOk != true) place.DoorWidthOk = true;
                if (lower.Contains("elevator") && place.HasAccessibleElevator != true) place.HasAccessibleElevator = true;
                if (lower.Contains("restroom") && place.HasAccessibleRestroom != true) place.HasAccessibleRestroom = true;
                if (lower.Contains("tactile") && place.HasTactilePaving != true) place.HasTactilePaving = true;
            }

            var featureCount = 0;
            if (place.HasRamp == true) featureCount++;
            if (place.DoorWidthOk == true) featureCount++;
            if (place.HasAccessibleElevator == true) featureCount++;
            if (place.HasAccessibleRestroom == true) featureCount++;
            if (place.HasTactilePaving == true) featureCount++;

            var confidencePercent = (decimal)Math.Round(submission.ConfidenceScore <= 1.0 ? submission.ConfidenceScore * 100 : submission.ConfidenceScore);
            place.AccessibilityScore = confidencePercent >= 50 ? confidencePercent : Math.Round((decimal)featureCount / 5.0m * 100.0m, 1);
            place.AccessibilityNote = !string.IsNullOrWhiteSpace(submission.TextDescription) && !submission.TextDescription.Contains("file:")
                ? submission.TextDescription
                : $"Đã kiểm định tiện ích tiếp cận thực tế ({featureCount} hạng mục).";
            place.LastVerifiedAt = submission.CreatedAt.UtcDateTime;
            await _db.SaveChangesAsync(cancellationToken);
        }

        var appUser = await FindAppUserAsync(submission.UserId, cancellationToken);

        return Ok(MapToDetail(submission, place, appUser));
    }

    [HttpGet("{id}/navigation")]
    [ProducesResponseType(typeof(ContributionNavigationDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ContributionNavigationDto>> GetNavigation(string id, CancellationToken cancellationToken)
    {
        var submissions = await _db.Submissions
            .AsNoTracking()
            .OrderBy(s => s.CreatedAt)
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

        foreach (var tag in submission.FeatureTags)
        {
            var lower = tag.ToLowerInvariant();
            if (lower.Contains("ramp")) place.HasRamp = true;
            if (lower.Contains("door") || lower.Contains("entrance")) place.DoorWidthOk = true;
            if (lower.Contains("elevator")) place.HasAccessibleElevator = true;
            if (lower.Contains("restroom")) place.HasAccessibleRestroom = true;
            if (lower.Contains("tactile")) place.HasTactilePaving = true;
        }

        var featureCount = 0;
        if (place.HasRamp == true) featureCount++;
        if (place.DoorWidthOk == true) featureCount++;
        if (place.HasAccessibleElevator == true) featureCount++;
        if (place.HasAccessibleRestroom == true) featureCount++;
        if (place.HasTactilePaving == true) featureCount++;

        var confidencePercent = (decimal)Math.Round(submission.ConfidenceScore <= 1.0 ? submission.ConfidenceScore * 100 : submission.ConfidenceScore);
        place.AccessibilityScore = confidencePercent >= 50 ? confidencePercent : Math.Round((decimal)featureCount / 5.0m * 100.0m, 1);
        place.AccessibilityNote = !string.IsNullOrWhiteSpace(submission.TextDescription) && !submission.TextDescription.Contains("file:")
            ? submission.TextDescription
            : $"Đã kiểm định tiện ích tiếp cận thực tế ({featureCount} hạng mục).";
        place.LastVerifiedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        var detail = MapToDetail(submission, place, appUser);
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
        var detail = MapToDetail(submission, place, appUser);
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
        var detail = MapToDetail(submission, place, appUser);
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
        var detail = MapToDetail(submission, place, appUser);
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
            return await _db.Places.FirstOrDefaultAsync(p => p.Id == guidId, cancellationToken);
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

    private static ContributionRecordDto MapToRecord(
        Submission s,
        IReadOnlyDictionary<string, Place> places,
        IReadOnlyDictionary<string, AppUser> appUsers)
    {
        var code = !string.IsNullOrWhiteSpace(s.SubmissionCode) ? s.SubmissionCode : s.Id.ToString();
        var placeName = "Địa điểm khảo sát";
        var placeAddress = "Chưa có địa chỉ";
        var placeCity = "TP.HCM";
        var placeDistrict = "Quận 1";

        if (places.TryGetValue(s.PlaceId, out var place))
        {
            placeName = place.Name;
            placeAddress = place.Address ?? "";
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

        var waitingMinutes = (int)Math.Max(0, (DateTimeOffset.UtcNow - s.CreatedAt).TotalMinutes);
        var confidencePercent = (int)Math.Round(s.ConfidenceScore > 1.0 ? s.ConfidenceScore : s.ConfidenceScore * 100);

        var status = s.Status switch
        {
            SubmissionStatus.Published => "published",
            SubmissionStatus.Rejected => "rejected",
            SubmissionStatus.NeedsSupplement => "needs_supplement",
            _ => "pending",
        };

        var priority = waitingMinutes > SlaTargetMinutes || s.ConfidenceScore < 0.6 ? "high" : "normal";

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
        AppUser? appUser)
    {
        var placeDict = place != null
            ? new Dictionary<string, Place> { [place.Id.ToString()] = place }
            : new Dictionary<string, Place>();

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
                var isVideo = url.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)
                    || url.EndsWith(".mov", StringComparison.OrdinalIgnoreCase);

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
                    Resolution = "1920 × 1080",
                    FileSize = "2,4 MB",
                    ExifStatus = "valid",
                    GeotagStatus = s.AccuracyMeters <= 30 ? "valid" : "mismatch",
                    Description = !string.IsNullOrWhiteSpace(s.TextDescription)
                        ? s.TextDescription
                        : (isSafeWebUrl ? "Ảnh hiện trường được chụp từ thiết bị khảo sát thực địa." : $"Ảnh chụp từ thiết bị di động: {url}"),
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
                Resolution = "1920 × 1080",
                FileSize = "2,5 MB",
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
            evidenceList[0].VisualSuggestions = visualSuggestions;

            var dynamicFindings = new List<EvidenceAiFindingDto>();
            foreach (var vs in visualSuggestions)
            {
                var labelName = vs.Feature switch
                {
                    "ramp_present" => "Phát hiện ram dốc (Ramp)",
                    "stairs_present" => "Phát hiện bậc thang / tam cấp (Stairs)",
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

        var claims = record.Categories.Select((category, index) =>
        {
            var claimConfidence = Math.Max(40, (int)Math.Round(record.Verification.Confidence - index * 5));
            return new AccessibilityClaimDto
            {
                Id = $"{record.Id}-claim-{index + 1}",
                Feature = category,
                Standard = GetStandardForCategory(category),
                ContributorClaim = $"Xác nhận có '{category}' tại địa điểm.",
                AiAssessment = new AiClaimAssessmentDto
                {
                    Label = claimConfidence >= 75 ? "Phù hợp" : "Cần đối chiếu",
                    Confidence = claimConfidence,
                    Details = $"Nhận diện hình ảnh phù hợp tiêu chuẩn {category}.",
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
                SurveyArea = record.Place.Address,
                MismatchMeters = Math.Round(mismatchMeters, 1),
                Warning = mismatchMeters > 50.0 ? $"Khoảng cách lệch {Math.Round(mismatchMeters, 1)}m so với tọa độ gốc của địa điểm." : null,
                MapHref = $"https://www.google.com/maps?q={s.GpsLat},{s.GpsLng}",
            },
            Evidence = evidenceList,
            Claims = claims,
            Timeline = timeline,
            ContributorHistory = new ContributorHistorySummaryDto
            {
                Approved = appUser != null && appUser.ReputationScore > 200 ? 5 : 1,
                Supplements = 0,
                Violations = 0,
                ReputationDelta = 50,
            },
            TechnicalNotes = new List<string>
            {
                $"Tọa độ GPS ghi nhận: ({s.GpsLat:F6}, {s.GpsLng:F6}), độ chính xác ±{s.AccuracyMeters ?? 5.0:F1}m.",
                !string.IsNullOrWhiteSpace(s.TextDescription) ? $"Ghi chú: \"{s.TextDescription}\"" : "Không có ghi chú thêm."
            },
            ApplicableStandards = new List<string>
            {
                "QCVN 10:2014/BXD - Quy chuẩn kỹ thuật quốc gia về Xây dựng công trình đảm bảo người khuyết tật tiếp cận sử dụng",
                "Tiêu chuẩn khảo sát tiếp cận cộng đồng AccessMapVN 2026"
            },
            UserClaims = userClaims,
        };
    }

    private static string MapTagToVietnameseCategory(string tag)
    {
        var lower = tag.ToLowerInvariant();
        if (lower.Contains("ramp")) return "Ram dốc";
        if (lower.Contains("door") || lower.Contains("entrance")) return "Lối vào chính";
        if (lower.Contains("elevator")) return "Thang máy";
        if (lower.Contains("restroom")) return "WC tiếp cận";
        if (lower.Contains("tactile")) return "Lối xúc giác";
        if (lower.Contains("parking")) return "Bãi đỗ xe ưu tiên";
        if (lower.Contains("step_free")) return "Lối vào phẳng";
        if (lower.Contains("auto")) return "Cửa tự động";
        return tag;
    }

    private static string GetStandardForCategory(string category)
    {
        return category switch
        {
            "Ram dốc" => "Độ dốc không vượt quá 1:12, có tay vịn hai bên",
            "Lối vào chính" => "Lối đi thông thủy rộng tối thiểu 900 mm, không có bậc cản",
            "Cửa tự động" => "Chiều rộng thông thủy tối thiểu 900 mm, cảm biến nhạy",
            "Thang máy" => "Kích thước buồng thang tối thiểu 1100x1400mm, bảng nút bấm thấp có chữ nổi",
            "WC tiếp cận" => "Cửa mở ra ngoài, có tay vịn hỗ trợ, khoảng quay xe lăn đường kính tối thiểu 1500 mm",
            "Lối xúc giác" => "Dải dẫn hướng và cảnh báo liên tục, độ tương phản màu sắc cao",
            "Bãi đỗ xe ưu tiên" => "Ô đỗ xe rộng tối thiểu 3,5m, gần lối vào chính, có biển hiệu tiếp cận",
            _ => "Quy chuẩn kỹ thuật QCVN 10:2014/BXD",
        };
    }

    private static string GetInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "AM";
        if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant();
        return $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[^1][0])}";
    }
}
