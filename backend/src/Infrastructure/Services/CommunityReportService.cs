using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AccessMapVN.Infrastructure.Services;

public sealed class CommunityReportService : ICommunityReportService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly ApplicationDbContext _db;
    private readonly CommunityValidationOptions _options;
    private readonly TimeProvider _clock;

    public CommunityReportService(
        ApplicationDbContext db,
        IOptions<CommunityValidationOptions> options,
        TimeProvider clock)
    {
        _db = db;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<CreateInaccurateReportResponse> CreateAsync(
        Guid reporterId,
        Guid requestedLocationId,
        string idempotencyKey,
        CreateInaccurateReportRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        ValidateCreateRequest(request);

        var canonicalLocation = await ResolveCanonicalLocationAsync(requestedLocationId, cancellationToken);
        var endpoint = $"/api/v1/locations/{canonicalLocation.Id:D}/reports";
        var requestHash = Hash(request);
        var now = _clock.GetUtcNow();

        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);

        await CommunityIdempotencyLock.AcquireAsync(_db, reporterId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"actor:{reporterId:D}", cancellationToken);
        await EnsureUserAsync(reporterId, cancellationToken);
        var replay = await TryReplayAsync<CreateInaccurateReportResponse>(
            reporterId,
            endpoint,
            idempotencyKey,
            requestHash,
            now,
            cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }

        var locationStillActive = await _db.Places.AnyAsync(
            item => item.Id == canonicalLocation.Id && item.Status == LocationStatus.Active,
            cancellationToken);
        if (!locationStillActive)
        {
            throw new CommunityValidationException(
                "LOCATION_CHANGED",
                "The target location changed while the report was being submitted.",
                409,
                new { canonicalLocationId = canonicalLocation.Id });
        }

        if (request.ScopeId is Guid scopeId)
        {
            var scopeValid = await _db.AccessScopes.AnyAsync(
                item => item.Id == scopeId && item.LocationId == canonicalLocation.Id && item.IsActive,
                cancellationToken);
            if (!scopeValid)
            {
                throw new CommunityValidationException("SCOPE_MISMATCH", "The scope does not belong to this location.", 422);
            }
        }

        if (request.LinkedSubmissionId is Guid linkedSubmissionId)
        {
            var linkedSubmission = await _db.Submissions.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == linkedSubmissionId, cancellationToken);
            if (linkedSubmission is null ||
                !Guid.TryParse(linkedSubmission.UserId, out var ownerId) ||
                ownerId != reporterId ||
                !Guid.TryParse(linkedSubmission.PlaceId, out var submissionLocationId) ||
                submissionLocationId != canonicalLocation.Id)
            {
                // Non-disclosing response for a foreign or unrelated submission.
                throw new CommunityValidationException("LINKED_SUBMISSION_NOT_FOUND", "The linked submission was not found.", 404);
            }
        }

        var staleBaseline = false;
        if (request.FeatureType is AccessibilityFeatureType featureType)
        {
            var feature = await _db.LocationFeatures
                .SingleOrDefaultAsync(
                    item => item.LocationId == canonicalLocation.Id &&
                            item.ScopeId == request.ScopeId &&
                            item.FeatureType == featureType &&
                            item.IsPublished,
                    cancellationToken);

            if (feature is null && request.Reason != InaccurateReportReason.MissingFeature)
            {
                var initialStatus = featureType switch
                {
                    AccessibilityFeatureType.Ramp => canonicalLocation.HasRamp == true ? PublishedFeatureStatus.Available : PublishedFeatureStatus.NotAvailable,
                    AccessibilityFeatureType.Elevator => canonicalLocation.HasAccessibleElevator == true ? PublishedFeatureStatus.Available : PublishedFeatureStatus.NotAvailable,
                    AccessibilityFeatureType.EntranceDoor => canonicalLocation.DoorWidthOk == true ? PublishedFeatureStatus.Available : PublishedFeatureStatus.NotAvailable,
                    AccessibilityFeatureType.AccessibleRestroom => canonicalLocation.HasAccessibleRestroom == true ? PublishedFeatureStatus.Available : PublishedFeatureStatus.NotAvailable,
                    AccessibilityFeatureType.TactilePaving => canonicalLocation.HasTactilePaving == true ? PublishedFeatureStatus.Available : PublishedFeatureStatus.NotAvailable,
                    _ => PublishedFeatureStatus.Available
                };

                feature = new LocationFeature
                {
                    LocationId = canonicalLocation.Id,
                    ScopeId = request.ScopeId,
                    FeatureType = featureType,
                    CurrentStatus = initialStatus,
                    VerifiedAt = now,
                    IsPublished = true,
                    Version = 1,
                };
                _db.LocationFeatures.Add(feature);
            }

            staleBaseline = feature is not null &&
                            request.ObservedFeatureVersion is int observedVersion &&
                            observedVersion != feature.Version;
        }

        var report = new InaccurateInformationReport
        {
            LocationId = canonicalLocation.Id,
            ReporterId = reporterId,
            ScopeId = request.ScopeId,
            FeatureType = request.FeatureType,
            ObservedFeatureVersion = request.ObservedFeatureVersion,
            Reason = request.Reason,
            Description = request.Description.Trim(),
            Status = InaccurateReportStatus.Submitted,
            IsStaleBaseline = staleBaseline,
            ProposedAddress = NormalizeOptional(request.ProposedAddress),
            ProposedLatitude = request.ProposedPosition?.Latitude,
            ProposedLongitude = request.ProposedPosition?.Longitude,
            LinkedSubmissionId = request.LinkedSubmissionId,
            Version = 1,
        };
        _db.InaccurateInformationReports.Add(report);

        if (!string.IsNullOrWhiteSpace(request.EvidenceMediaUrl))
        {
            var media = new OwnedMedia
            {
                LocationId = canonicalLocation.Id,
                OwnerId = reporterId,
                StorageKey = request.EvidenceMediaUrl,
                MimeType = "image/jpeg",
                SizeBytes = 1024,
                Sha256 = Guid.NewGuid().ToString("N"),
                Status = OwnedMediaStatus.Ready,
                ExpiresAt = now.AddYears(1),
            };
            _db.OwnedMedia.Add(media);

            var aiDesc = !string.IsNullOrWhiteSpace(request.AiAnalysisJson)
                ? request.AiAnalysisJson
                : "Ảnh minh chứng chụp từ Camera AI";

            _db.ReportEvidence.Add(new ReportEvidence
            {
                ReportId = report.Id,
                AddedByReporterId = reporterId,
                Description = aiDesc,
                OwnedMediaId = media.Id,
                IdempotencyKey = $"evidence-{report.Id}-{Guid.NewGuid():N}",
                RequestHash = Guid.NewGuid().ToString("N"),
                SourceVersion = 1,
            });
        }
        _db.ReportStatusHistories.Add(new ReportStatusHistory
        {
            ReportId = report.Id,
            FromStatus = null,
            ToStatus = InaccurateReportStatus.Submitted,
            ActorId = reporterId,
            Reason = "Report submitted by its owner.",
            PublicNote = "Report submitted.",
            OccurredAt = now,
        });

        var response = new CreateInaccurateReportResponse(
            report.Id,
            report.Status,
            report.LocationId,
            ToOffset(report.CreatedAtUtc));
        StoreIdempotency(reporterId, endpoint, idempotencyKey, requestHash, 201, response, now);
        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = "InaccurateInformationReportSubmitted",
            PayloadJson = JsonSerializer.Serialize(new
            {
                reportId = report.Id,
                locationId = report.LocationId,
                reporterId,
            }, JsonOptions),
            OccurredAt = now,
        });

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public async Task<CursorPage<MyReportDto>> GetMineAsync(
        Guid reporterId,
        int pageSize,
        string? cursor,
        CancellationToken cancellationToken = default)
    {
        ValidatePageSize(pageSize);
        var query = _db.InaccurateInformationReports.AsNoTracking()
            .Where(item => item.ReporterId == reporterId);

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            var parsed = DecodeCursor(cursor);
            query = query.Where(item =>
                item.CreatedAtUtc < parsed.CreatedAt ||
                (item.CreatedAtUtc == parsed.CreatedAt && item.Id.CompareTo(parsed.Id) < 0));
        }

        var reports = await query
            .OrderByDescending(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.Id)
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);
        var hasMore = reports.Count > pageSize;
        if (hasMore)
        {
            reports.RemoveAt(reports.Count - 1);
        }

        var locationIds = reports.Select(item => item.LocationId).Distinct().ToArray();
        var locationNames = await _db.Places.AsNoTracking()
            .Where(item => locationIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var items = reports.Select(item => ToMyReportDto(
            item,
            locationNames.GetValueOrDefault(item.LocationId, "Unknown location"))).ToArray();
        var nextCursor = hasMore && reports.Count > 0
            ? EncodeCursor(reports[^1].CreatedAtUtc, reports[^1].Id)
            : null;
        return new CursorPage<MyReportDto>(items, nextCursor);
    }

    public async Task<MyReportDetailDto> GetMineByIdAsync(
        Guid reporterId,
        Guid reportId,
        CancellationToken cancellationToken = default)
    {
        var report = await _db.InaccurateInformationReports.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == reportId && item.ReporterId == reporterId,
                cancellationToken);
        if (report is null)
        {
            throw new CommunityValidationException("REPORT_NOT_FOUND", "The report was not found.", 404);
        }

        var locationName = await _db.Places.AsNoTracking()
            .Where(item => item.Id == report.LocationId)
            .Select(item => item.Name)
            .SingleOrDefaultAsync(cancellationToken) ?? "Unknown location";
        var history = await _db.ReportStatusHistories.AsNoTracking()
            .Where(item => item.ReportId == report.Id)
            .OrderBy(item => item.OccurredAt)
            .ThenBy(item => item.Id)
            .Select(item => new ReportStatusHistoryDto(item.ToStatus, item.PublicNote, item.OccurredAt))
            .ToListAsync(cancellationToken);
        var evidence = await _db.ReportEvidence.AsNoTracking()
            .Where(item => item.ReportId == report.Id)
            .OrderBy(item => item.CreatedAtUtc)
            .ThenBy(item => item.Id)
            .Select(item => new ReportEvidenceDto(
                item.Id,
                item.Description,
                item.OwnedMediaId != null,
                item.SourceVersion,
                new DateTimeOffset(DateTime.SpecifyKind(item.CreatedAtUtc, DateTimeKind.Utc))))
            .ToListAsync(cancellationToken);

        return new MyReportDetailDto(
            report.Id,
            report.LocationId,
            locationName,
            report.ScopeId,
            report.FeatureType,
            report.ObservedFeatureVersion,
            report.Reason,
            report.Description,
            report.Status,
            report.IsStaleBaseline,
            report.ProposedAddress,
            report.ProposedLatitude,
            report.ProposedLongitude,
            report.ReporterActionNote,
            report.PublicResolutionNote,
            report.Version,
            ToOffset(report.CreatedAtUtc),
            ToOffset(report.UpdatedAtUtc ?? report.CreatedAtUtc),
            history,
            evidence);
    }

    public async Task<AddReportEvidenceResponse> AddEvidenceAsync(
        Guid reporterId,
        Guid reportId,
        string idempotencyKey,
        AddReportEvidenceRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        if (request.ExpectedVersion <= 0)
        {
            throw new CommunityValidationException("INVALID_EVIDENCE", "expectedVersion must be positive.", 422);
        }

        var description = NormalizeOptional(request.Description);
        if (description is null && request.OwnedMediaId is null)
        {
            throw new CommunityValidationException("INVALID_EVIDENCE", "A description or ownedMediaId is required.", 422);
        }

        if (description?.Length > 2000)
        {
            throw new CommunityValidationException("INVALID_EVIDENCE", "The evidence description is too long.", 422);
        }

        var endpoint = $"/api/v1/me/reports/{reportId:D}/evidence";
        var requestHash = Hash(request);
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);

        await CommunityIdempotencyLock.AcquireAsync(_db, reporterId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"actor:{reporterId:D}", cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"report:{reportId:D}", cancellationToken);
        await EnsureUserAsync(reporterId, cancellationToken);
        var replay = await TryReplayAsync<AddReportEvidenceResponse>(
            reporterId,
            endpoint,
            idempotencyKey,
            requestHash,
            now,
            cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }

        var report = await _db.InaccurateInformationReports.SingleOrDefaultAsync(
            item => item.Id == reportId && item.ReporterId == reporterId,
            cancellationToken);
        if (report is null)
        {
            throw new CommunityValidationException("REPORT_NOT_FOUND", "The report was not found.", 404);
        }

        if (report.Version != request.ExpectedVersion)
        {
            throw ReportVersionChanged(report);
        }

        if (report.Status != InaccurateReportStatus.AwaitingMoreInfo)
        {
            throw new CommunityValidationException(
                "INVALID_REPORT_TRANSITION",
                "Evidence can only be added while more information is requested.",
                409,
                SafeReportSummary(report));
        }

        OwnedMedia? media = null;
        if (request.OwnedMediaId is Guid mediaId)
        {
            media = await _db.OwnedMedia.SingleOrDefaultAsync(
                item => item.Id == mediaId &&
                        item.OwnerId == reporterId &&
                        item.LocationId == report.LocationId,
                cancellationToken);
            if (media is null ||
                media.Status != OwnedMediaStatus.Ready ||
                (media.ExpiresAt is DateTimeOffset expiresAt && expiresAt <= now))
            {
                throw new CommunityValidationException("OWNED_MEDIA_NOT_FOUND", "The owned media item is unavailable.", 404);
            }
        }

        var evidence = new ReportEvidence
        {
            ReportId = report.Id,
            AddedByReporterId = reporterId,
            Description = description,
            OwnedMediaId = request.OwnedMediaId,
            SourceVersion = report.Version,
            IdempotencyKey = idempotencyKey,
            RequestHash = requestHash,
        };
        _db.ReportEvidence.Add(evidence);

        var previousStatus = report.Status;
        report.Status = InaccurateReportStatus.UnderReview;
        report.ReporterActionNote = null;
        report.Version += 1;
        report.UpdatedAtUtc = now.UtcDateTime;
        if (media is not null)
        {
            media.Status = OwnedMediaStatus.Consumed;
            media.UpdatedAtUtc = now.UtcDateTime;
        }

        _db.ReportStatusHistories.Add(new ReportStatusHistory
        {
            ReportId = report.Id,
            FromStatus = previousStatus,
            ToStatus = report.Status,
            ActorId = reporterId,
            Reason = $"Owner supplied report evidence {evidence.Id:D}.",
            PublicNote = "Additional evidence received; review resumed.",
            OccurredAt = now,
        });

        var response = new AddReportEvidenceResponse(
            report.Id,
            evidence.Id,
            report.Status,
            report.Version,
            now);
        StoreIdempotency(reporterId, endpoint, idempotencyKey, requestHash, 201, response, now);
        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = "ReportEvidenceAdded",
            PayloadJson = JsonSerializer.Serialize(new
            {
                reportId = report.Id,
                evidenceId = evidence.Id,
                reporterId,
            }, JsonOptions),
            OccurredAt = now,
        });

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public async Task<AdminReportQueuePage> GetAdminQueueAsync(
        InaccurateReportStatus? status,
        string? search,
        Guid? locationId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (page <= 0)
        {
            throw new CommunityValidationException("INVALID_PAGINATION", "page must be positive.", 422);
        }

        ValidatePageSize(pageSize);
        var query = _db.InaccurateInformationReports.AsNoTracking().AsQueryable();
        if (status is not null)
        {
            query = query.Where(item => item.Status == status);
        }

        if (locationId is not null)
        {
            query = query.Where(item => item.LocationId == locationId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            if (value.Length > 200)
            {
                throw new CommunityValidationException("INVALID_SEARCH", "search must not exceed 200 characters.", 422);
            }

            var pattern = $"%{value}%";
            var parsedId = Guid.TryParse(value, out var id) ? id : (Guid?)null;
            query = query.Where(item =>
                (parsedId != null && (item.Id == parsedId || item.LocationId == parsedId)) ||
                EF.Functions.ILike(item.Description, pattern) ||
                _db.Places.Any(place =>
                    place.Id == item.LocationId &&
                    (EF.Functions.ILike(place.Name, pattern) ||
                     (place.Address != null && EF.Functions.ILike(place.Address, pattern)))));
        }

        var total = await query.CountAsync(cancellationToken);
        var reports = await query
            .OrderBy(item => item.Status)
            .ThenByDescending(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        var locationIds = reports.Select(item => item.LocationId).Distinct().ToArray();
        var locations = await _db.Places.AsNoTracking()
            .Where(item => locationIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        var reportIds = reports.Select(item => item.Id).ToArray();
        var evidenceCounts = await _db.ReportEvidence.AsNoTracking()
            .Where(item => reportIds.Contains(item.ReportId))
            .GroupBy(item => item.ReportId)
            .Select(group => new { ReportId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ReportId, item => item.Count, cancellationToken);

        var items = reports.Select(item =>
        {
            locations.TryGetValue(item.LocationId, out var location);
            return new AdminReportQueueItemDto(
                item.Id,
                item.LocationId,
                location?.Name,
                location?.Address,
                item.FeatureType,
                item.ObservedFeatureVersion,
                item.Reason,
                item.Description,
                item.Status,
                item.IsStaleBaseline,
                ToOffset(item.CreatedAtUtc),
                ToOffset(item.UpdatedAtUtc ?? item.CreatedAtUtc),
                evidenceCounts.GetValueOrDefault(item.Id));
        }).ToArray();
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new AdminReportQueuePage(items, total, page, pageSize, totalPages);
    }

    public async Task<AdminReportDetailDto> GetAdminByIdAsync(
        Guid reportId,
        CancellationToken cancellationToken = default)
    {
        var report = await _db.InaccurateInformationReports.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == reportId, cancellationToken);
        if (report is null)
        {
            throw new CommunityValidationException("REPORT_NOT_FOUND", "The report was not found.", 404);
        }

        var location = await _db.Places.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == report.LocationId, cancellationToken);
        var reporterName = await _db.AppUsers.AsNoTracking()
            .Where(item => item.Id == report.ReporterId)
            .Select(item => item.DisplayName)
            .SingleOrDefaultAsync(cancellationToken);
        var evidenceRows = await _db.ReportEvidence.AsNoTracking()
            .Where(item => item.ReportId == report.Id)
            .OrderBy(item => item.CreatedAtUtc)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);
        var mediaIds = evidenceRows.Where(item => item.OwnedMediaId is not null)
            .Select(item => item.OwnedMediaId!.Value)
            .Distinct()
            .ToArray();
        var mediaInfo = await _db.OwnedMedia.AsNoTracking()
            .Where(item => mediaIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => new { item.MimeType, item.StorageKey }, cancellationToken);
        var evidence = evidenceRows.Select(item =>
        {
            string? mediaUrl = null;
            if (item.OwnedMediaId is Guid mId && mediaInfo.TryGetValue(mId, out var info) && !string.IsNullOrWhiteSpace(info.StorageKey))
            {
                if (info.StorageKey.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                    info.StorageKey.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    mediaUrl = info.StorageKey;
                }
                else if (info.StorageKey.StartsWith('/'))
                {
                    mediaUrl = $"http://localhost:5256{info.StorageKey}";
                }
                else
                {
                    mediaUrl = $"http://localhost:5256/uploads/{info.StorageKey}";
                }
            }

            return new AdminReportEvidenceDto(
                item.Id,
                item.Description,
                mediaUrl,
                item.OwnedMediaId is Guid mediaId && mediaInfo.TryGetValue(mediaId, out var m) ? m.MimeType : "image/jpeg",
                ToOffset(item.CreatedAtUtc));
        }).ToArray();

        var historyRows = await _db.ReportStatusHistories.AsNoTracking()
            .Where(item => item.ReportId == report.Id)
            .OrderBy(item => item.OccurredAt)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);
        var actorIds = historyRows.Select(item => item.ActorId).Distinct().ToArray();
        var actorNames = await _db.AppUsers.AsNoTracking()
            .Where(item => actorIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.DisplayName, cancellationToken);
        var history = historyRows.Select(item => new AdminReportHistoryDto(
            item.Id,
            item.FromStatus,
            item.ToStatus,
            item.Reason,
            item.Outcome,
            actorNames.GetValueOrDefault(item.ActorId),
            item.OccurredAt)).ToArray();

        return new AdminReportDetailDto(
            report.Id,
            report.LocationId,
            location?.Name,
            location?.Address,
            report.ReporterId,
            reporterName,
            report.ScopeId,
            report.FeatureType,
            report.ObservedFeatureVersion,
            report.Reason,
            report.Description,
            report.Status,
            report.IsStaleBaseline,
            report.ProposedAddress,
            report.ProposedLatitude,
            report.ProposedLongitude,
            report.LinkedDisputeCaseId,
            report.LinkedSubmissionId,
            report.Resolution,
            report.PublicResolutionNote,
            location?.MetadataVersion ?? 0,
            location?.Address,
            location?.Lat ?? 0,
            location?.Lng ?? 0,
            evidence,
            history,
            report.Version,
            ToOffset(report.CreatedAtUtc),
            ToOffset(report.UpdatedAtUtc ?? report.CreatedAtUtc));
    }

    public async Task<ModerateReportResponse> ModerateAsync(
        Guid moderatorId,
        Guid reportId,
        string idempotencyKey,
        ModerateReportRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        if (!Enum.IsDefined(request.Decision) || request.ExpectedVersion <= 0 ||
            string.IsNullOrWhiteSpace(request.Note) || request.Note.Trim().Length > 2000)
        {
            throw new CommunityValidationException(
                "INVALID_REPORT_DECISION",
                "A supported decision, note and positive expectedVersion are required.",
                422);
        }

        var endpoint = $"/api/v1/admin/reports/{reportId:D}";
        var requestHash = Hash(request);
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);

        await CommunityIdempotencyLock.AcquireAsync(_db, moderatorId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"report:{reportId:D}", cancellationToken);
        var moderator = await _db.AppUsers.SingleOrDefaultAsync(
            item => item.Id == moderatorId && item.IsActive && item.Role == AppUserRole.Admin,
            cancellationToken);
        if (moderator is null)
        {
            throw new CommunityValidationException("MODERATION_FORBIDDEN", "The moderator is not authorized.", 403);
        }

        var replay = await TryReplayAsync<ModerateReportResponse>(
            moderatorId,
            endpoint,
            idempotencyKey,
            requestHash,
            now,
            cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }

        var report = await _db.InaccurateInformationReports.SingleOrDefaultAsync(
            item => item.Id == reportId,
            cancellationToken);
        if (report is null)
        {
            throw new CommunityValidationException("REPORT_NOT_FOUND", "The report was not found.", 404);
        }

        if (report.Version != request.ExpectedVersion)
        {
            throw ReportVersionChanged(report);
        }

        var previousStatus = report.Status;
        string? publicNote = null;
        string? outcome = null;
        switch (request.Decision)
        {
            case AdminReportDecision.StartReview:
                RequireTransition(report, InaccurateReportStatus.Submitted,
                    InaccurateReportStatus.AwaitingMoreInfo, InaccurateReportStatus.LinkedToDispute);
                if (report.Status == InaccurateReportStatus.AwaitingMoreInfo &&
                    !await _db.ReportEvidence.AnyAsync(item => item.ReportId == report.Id, cancellationToken))
                {
                    throw new CommunityValidationException(
                        "INVALID_REPORT_TRANSITION",
                        "An awaiting report cannot be reopened without existing owner evidence.",
                        409);
                }

                report.Status = InaccurateReportStatus.UnderReview;
                report.ReporterActionNote = null;
                publicNote = "Review started.";
                break;

            case AdminReportDecision.RequestEvidence:
                RequireTransition(report, InaccurateReportStatus.UnderReview);
                report.Status = InaccurateReportStatus.AwaitingMoreInfo;
                report.ReporterActionNote = request.Note.Trim();
                publicNote = report.ReporterActionNote;
                break;

            case AdminReportDecision.LinkDispute:
                RequireTransition(report, InaccurateReportStatus.UnderReview);
                if (request.LinkedDisputeCaseId is not Guid disputeId)
                {
                    throw new CommunityValidationException(
                        "INVALID_REPORT_DECISION",
                        "linkedDisputeCaseId is required for LinkDispute.",
                        422);
                }

                await ValidateDisputeLinkAsync(report, disputeId, cancellationToken);
                report.LinkedDisputeCaseId = disputeId;
                if (request.LinkedSubmissionId is Guid linkedSubmissionId)
                {
                    await ValidateAdminSubmissionLinkAsync(report, linkedSubmissionId, false, cancellationToken);
                    report.LinkedSubmissionId = linkedSubmissionId;
                }

                report.Status = InaccurateReportStatus.LinkedToDispute;
                publicNote = "The report was linked to an accessibility review.";
                break;

            case AdminReportDecision.Resolve:
                RequireTransition(report, InaccurateReportStatus.UnderReview, InaccurateReportStatus.LinkedToDispute);
                if (request.Resolution is not InaccurateReportResolution resolution)
                {
                    throw new CommunityValidationException(
                        "INVALID_REPORT_DECISION",
                        "resolution is required for Resolve.",
                        422);
                }

                if (resolution == InaccurateReportResolution.MetadataCorrected)
                {
                    throw new CommunityValidationException(
                        "INVALID_REPORT_DECISION",
                        "MetadataCorrected is only available through the atomic location metadata endpoint.",
                        409);
                }

                if (resolution == InaccurateReportResolution.CorrectionPublished)
                {
                    var publicationSubmissionId = request.LinkedSubmissionId ?? report.LinkedSubmissionId;
                    if (publicationSubmissionId is not Guid publishedSubmissionId)
                    {
                        throw new CommunityValidationException(
                            "PUBLICATION_REQUIRED",
                            "A published WF-01 submission is required for this resolution.",
                            409);
                    }

                    await ValidateAdminSubmissionLinkAsync(report, publishedSubmissionId, true, cancellationToken);
                    report.LinkedSubmissionId = publishedSubmissionId;
                }

                if (resolution == InaccurateReportResolution.AdvisoryCreated)
                {
                    if (request.AdvisoryId is not Guid advisoryId)
                    {
                        throw new CommunityValidationException(
                            "ADVISORY_REQUIRED",
                            "advisoryId is required for AdvisoryCreated.",
                            422);
                    }

                    var validAdvisory = await _db.TemporaryAccessAdvisories.AsNoTracking()
                        .Join(
                            _db.LocationFeatures.AsNoTracking(),
                            advisory => advisory.LocationFeatureId,
                            feature => feature.Id,
                            (advisory, feature) => new { advisory, feature })
                        .AnyAsync(
                            item => item.advisory.Id == advisoryId &&
                                    item.feature.LocationId == report.LocationId &&
                                    item.advisory.Status != AdvisoryStatus.Revoked,
                            cancellationToken);
                    if (!validAdvisory)
                    {
                        throw new CommunityValidationException("ADVISORY_NOT_FOUND", "The advisory was not found for this location.", 404);
                    }
                }

                report.Status = InaccurateReportStatus.Resolved;
                report.Resolution = resolution;
                report.ReporterActionNote = null;
                report.PublicResolutionNote = NormalizeOptional(request.PublicResolutionNote) ??
                                                    "The report review has been completed.";
                publicNote = report.PublicResolutionNote;
                outcome = resolution.ToString();
                break;

            case AdminReportDecision.Reject:
                RequireTransition(report, InaccurateReportStatus.Submitted,
                    InaccurateReportStatus.UnderReview, InaccurateReportStatus.AwaitingMoreInfo);
                report.Status = InaccurateReportStatus.Rejected;
                report.ReporterActionNote = null;
                report.PublicResolutionNote = NormalizeOptional(request.PublicResolutionNote) ??
                                              "The report was not accepted after review.";
                publicNote = report.PublicResolutionNote;
                break;

            default:
                throw new CommunityValidationException("INVALID_REPORT_DECISION", "Unsupported report decision.", 422);
        }

        report.Version += 1;
        report.UpdatedAtUtc = now.UtcDateTime;
        _db.ReportStatusHistories.Add(new ReportStatusHistory
        {
            ReportId = report.Id,
            FromStatus = previousStatus,
            ToStatus = report.Status,
            ActorId = moderatorId,
            Reason = request.Note.Trim(),
            Outcome = outcome,
            PublicNote = publicNote,
            OccurredAt = now,
        });

        var response = new ModerateReportResponse(report.Id, report.Status, report.Version, now);
        StoreIdempotency(moderatorId, endpoint, idempotencyKey, requestHash, 200, response, now);
        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = report.Status == InaccurateReportStatus.AwaitingMoreInfo
                ? "ReportEvidenceRequested"
                : report.Status is InaccurateReportStatus.Resolved or InaccurateReportStatus.Rejected
                    ? "ReportDecisionFinalized"
                    : "InaccurateInformationReportTransitioned",
            PayloadJson = JsonSerializer.Serialize(new
            {
                reportId = report.Id,
                reporterId = report.ReporterId,
                status = report.Status.ToString(),
                version = report.Version,
            }, JsonOptions),
            OccurredAt = now,
        });

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public async Task<CorrectLocationMetadataResponse> CorrectMetadataAsync(
        Guid moderatorId,
        Guid locationId,
        int? expectedReportVersion,
        string idempotencyKey,
        CorrectLocationMetadataRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateIdempotencyKey(idempotencyKey);
        if (request.ExpectedMetadataVersion <= 0 || string.IsNullOrWhiteSpace(request.Reason) ||
            request.Reason.Trim().Length > 2000 ||
            (string.IsNullOrWhiteSpace(request.ProposedAddress) && request.ProposedPosition is null))
        {
            throw new CommunityValidationException(
                "INVALID_METADATA_CORRECTION",
                "A metadata version, reason and proposed address or position are required.",
                422);
        }

        if (request.ProposedAddress?.Trim().Length > 1000 ||
            request.ProposedPosition is { } invalidPosition &&
            (!double.IsFinite(invalidPosition.Latitude) || !double.IsFinite(invalidPosition.Longitude) ||
             invalidPosition.Latitude is < -90 or > 90 || invalidPosition.Longitude is < -180 or > 180))
        {
            throw new CommunityValidationException("INVALID_METADATA_CORRECTION", "The proposed location metadata is invalid.", 422);
        }

        var endpoint = $"/api/v1/admin/locations/{locationId:D}/metadata";
        var requestHash = Hash(new { expectedReportVersion, request });
        var now = _clock.GetUtcNow();
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        await CommunityIdempotencyLock.AcquireAsync(_db, moderatorId, endpoint, idempotencyKey, cancellationToken);
        await CommunityIdempotencyLock.AcquireResourceAsync(_db, $"location-metadata:{locationId:D}", cancellationToken);
        var moderator = await _db.AppUsers.SingleOrDefaultAsync(
            item => item.Id == moderatorId && item.IsActive && item.Role == AppUserRole.Admin,
            cancellationToken);
        if (moderator is null)
        {
            throw new CommunityValidationException("MODERATION_FORBIDDEN", "The moderator is not authorized.", 403);
        }

        var replay = await TryReplayAsync<CorrectLocationMetadataResponse>(
            moderatorId, endpoint, idempotencyKey, requestHash, now, cancellationToken);
        if (replay is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return replay;
        }

        var location = await _db.Places.SingleOrDefaultAsync(item => item.Id == locationId, cancellationToken)
                       ?? throw new CommunityValidationException("LOCATION_NOT_FOUND", "The location was not found.", 404);
        if (location.Status != LocationStatus.Active)
        {
            throw new CommunityValidationException("LOCATION_NOT_ACTIVE", "Only an active canonical location can be corrected.", 409);
        }
        if (location.MetadataVersion != request.ExpectedMetadataVersion)
        {
            throw new CommunityValidationException(
                "METADATA_VERSION_CHANGED",
                "The location metadata changed; reload it before retrying.",
                409,
                new { locationId, metadataVersion = location.MetadataVersion });
        }

        var report = await _db.InaccurateInformationReports.SingleOrDefaultAsync(
            item => item.Id == request.SourceReportId && item.LocationId == locationId,
            cancellationToken)
            ?? throw new CommunityValidationException("REPORT_NOT_FOUND", "The source report was not found for this location.", 404);
        if (expectedReportVersion is int reportVersion && report.Version != reportVersion)
        {
            throw ReportVersionChanged(report);
        }
        if (report.Reason != InaccurateReportReason.WrongAddressOrPin ||
            report.Status is not (InaccurateReportStatus.UnderReview or InaccurateReportStatus.LinkedToDispute))
        {
            throw new CommunityValidationException(
                "INVALID_REPORT_TRANSITION",
                "Only an active WrongAddressOrPin report can authorize a metadata correction.",
                409,
                SafeReportSummary(report));
        }

        var previousStatus = report.Status;
        var before = JsonSerializer.Serialize(new
        {
            address = location.Address,
            latitude = location.Lat,
            longitude = location.Lng,
            metadataVersion = location.MetadataVersion,
        }, JsonOptions);
        if (!string.IsNullOrWhiteSpace(request.ProposedAddress))
        {
            location.Address = request.ProposedAddress.Trim();
        }
        if (request.ProposedPosition is { } position)
        {
            location.Lat = position.Latitude;
            location.Lng = position.Longitude;
        }
        location.MetadataVersion += 1;
        location.UpdatedAtUtc = now.UtcDateTime;

        var after = JsonSerializer.Serialize(new
        {
            address = location.Address,
            latitude = location.Lat,
            longitude = location.Lng,
            metadataVersion = location.MetadataVersion,
        }, JsonOptions);
        _db.LocationMetadataHistories.Add(new LocationMetadataHistory
        {
            LocationId = location.Id,
            MetadataVersion = location.MetadataVersion,
            SourceReportId = report.Id,
            ChangedById = moderatorId,
            BeforeJson = before,
            AfterJson = after,
            Reason = request.Reason.Trim(),
            EffectiveAt = now,
        });

        report.Status = InaccurateReportStatus.Resolved;
        report.Resolution = InaccurateReportResolution.MetadataCorrected;
        report.PublicResolutionNote = "Location address or map position was corrected.";
        report.ReporterActionNote = null;
        report.Version += 1;
        report.UpdatedAtUtc = now.UtcDateTime;
        _db.ReportStatusHistories.Add(new ReportStatusHistory
        {
            ReportId = report.Id,
            FromStatus = previousStatus,
            ToStatus = report.Status,
            ActorId = moderatorId,
            Reason = request.Reason.Trim(),
            Outcome = InaccurateReportResolution.MetadataCorrected.ToString(),
            PublicNote = report.PublicResolutionNote,
            OccurredAt = now,
        });

        var response = new CorrectLocationMetadataResponse(
            report.Id, report.Status, report.Version, location.MetadataVersion, now);
        StoreIdempotency(moderatorId, endpoint, idempotencyKey, requestHash, 200, response, now);
        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = "LocationMetadataCorrected",
            PayloadJson = JsonSerializer.Serialize(new
            {
                locationId = location.Id,
                reportId = report.Id,
                reporterId = report.ReporterId,
                metadataVersion = location.MetadataVersion,
            }, JsonOptions),
            OccurredAt = now,
        });

        await _db.SaveChangesAsync(cancellationToken);
        if (request.ProposedPosition is not null)
        {
            await _db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE places
                SET geom = ST_SetSRID(ST_MakePoint({location.Lng}, {location.Lat}), 4326)::geography
                WHERE id = {location.Id};
                """, cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    private async Task ValidateDisputeLinkAsync(
        InaccurateInformationReport report,
        Guid disputeId,
        CancellationToken cancellationToken)
    {
        var context = await _db.DisputeCases.AsNoTracking()
            .Join(
                _db.LocationFeatures.AsNoTracking(),
                dispute => dispute.LocationFeatureId,
                feature => feature.Id,
                (dispute, feature) => new { dispute, feature })
            .SingleOrDefaultAsync(item => item.dispute.Id == disputeId, cancellationToken);
        if (context is null || context.feature.LocationId != report.LocationId)
        {
            throw new CommunityValidationException("DISPUTE_NOT_FOUND", "The dispute was not found for this location.", 404);
        }

        if (report.FeatureType is null ||
            context.feature.FeatureType != report.FeatureType ||
            context.feature.ScopeId != report.ScopeId ||
            report.ObservedFeatureVersion != context.dispute.FeatureVersion)
        {
            throw new CommunityValidationException(
                "DISPUTE_CONTEXT_MISMATCH",
                "The dispute does not match the report feature, scope and observed version.",
                409);
        }
    }

    private async Task ValidateAdminSubmissionLinkAsync(
        InaccurateInformationReport report,
        Guid submissionId,
        bool requirePublishedFeature,
        CancellationToken cancellationToken)
    {
        var submission = await _db.Submissions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == submissionId, cancellationToken);
        if (submission is null ||
            !Guid.TryParse(submission.PlaceId, out var submissionLocationId) ||
            submissionLocationId != report.LocationId)
        {
            throw new CommunityValidationException("LINKED_SUBMISSION_NOT_FOUND", "The linked submission was not found for this location.", 404);
        }

        if (requirePublishedFeature)
        {
            var actuallyPublished = submission.Status == SubmissionStatus.Published &&
                                    await _db.LocationFeatures.AsNoTracking().AnyAsync(
                                        item => item.LocationId == report.LocationId &&
                                                item.SourceSubmissionId == submissionId &&
                                                item.IsPublished &&
                                                (report.FeatureType == null || item.FeatureType == report.FeatureType),
                                        cancellationToken);
            if (!actuallyPublished)
            {
                throw new CommunityValidationException(
                    "PUBLICATION_REQUIRED",
                    "The linked submission has not produced a matching published feature.",
                    409);
            }
        }
    }

    private async Task<Place> ResolveCanonicalLocationAsync(
        Guid requestedLocationId,
        CancellationToken cancellationToken)
    {
        if (requestedLocationId == Guid.Empty)
        {
            throw new CommunityValidationException("INVALID_LOCATION", "A valid locationId is required.", 422);
        }

        var visited = new HashSet<Guid>();
        var currentId = requestedLocationId;
        for (var depth = 0; depth < 8; depth++)
        {
            if (!visited.Add(currentId))
            {
                break;
            }

            var location = await _db.Places.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == currentId, cancellationToken);
            if (location is null)
            {
                throw new CommunityValidationException("LOCATION_NOT_FOUND", "The location was not found.", 404);
            }

            if (location.Status == LocationStatus.Active)
            {
                return location;
            }

            if (location.Status == LocationStatus.Merged && location.MergedIntoLocationId is Guid replacementId)
            {
                currentId = replacementId;
                continue;
            }

            throw new CommunityValidationException("LOCATION_NOT_ACTIVE", "The location is not an active canonical location.", 409);
        }

        throw new CommunityValidationException("INVALID_LOCATION_MERGE", "The location merge chain is invalid.", 409);
    }

    private async Task EnsureUserAsync(Guid actorId, CancellationToken cancellationToken)
    {
        if (await _db.AppUsers.AnyAsync(item => item.Id == actorId, cancellationToken))
        {
            return;
        }

        _db.AppUsers.Add(new AppUser
        {
            Id = actorId,
            ReputationScore = _options.Reputation.DefaultReputationScore,
            ReputationPolicyVersion = _options.Reputation.PolicyVersion,
        });
    }

    private async Task<T?> TryReplayAsync<T>(
        Guid actorId,
        string endpoint,
        string key,
        string requestHash,
        DateTimeOffset now,
        CancellationToken cancellationToken)
        where T : class
    {
        var record = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            item => item.ActorId == actorId && item.Endpoint == endpoint && item.Key == key,
            cancellationToken);
        if (record is null)
        {
            return null;
        }

        if (record.ExpiresAt <= now)
        {
            _db.IdempotencyRecords.Remove(record);
            return null;
        }

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(record.RequestHash),
                Encoding.UTF8.GetBytes(requestHash)))
        {
            throw new CommunityValidationException(
                "IDEMPOTENCY_KEY_REUSED",
                "This Idempotency-Key was already used with a different request.",
                409);
        }

        return JsonSerializer.Deserialize<T>(record.ResponseBody, JsonOptions)
               ?? throw new InvalidOperationException("Stored idempotency response is invalid.");
    }

    private void StoreIdempotency<T>(
        Guid actorId,
        string endpoint,
        string key,
        string requestHash,
        int statusCode,
        T response,
        DateTimeOffset now)
    {
        _db.IdempotencyRecords.Add(new IdempotencyRecord
        {
            ActorId = actorId,
            Endpoint = endpoint,
            Key = key,
            RequestHash = requestHash,
            ResponseStatusCode = statusCode,
            ResponseBody = JsonSerializer.Serialize(response, JsonOptions),
            ExpiresAt = now.AddHours(_options.Votes.IdempotencyTtlHours),
        });
    }

    private void ValidateCreateRequest(CreateInaccurateReportRequest request)
    {
        if (!Enum.IsDefined(request.Reason) ||
            string.IsNullOrWhiteSpace(request.Description) ||
            request.Description.Trim().Length > 4000)
        {
            throw new CommunityValidationException(
                "INVALID_REPORT",
                "A supported reason and a non-empty description of at most 4000 characters are required.",
                422);
        }

        if (request.FeatureType is AccessibilityFeatureType featureType && !Enum.IsDefined(featureType))
        {
            throw new CommunityValidationException("INVALID_REPORT", "Unsupported featureType.", 422);
        }

        if (request.ObservedFeatureVersion is <= 0)
        {
            throw new CommunityValidationException("INVALID_REPORT", "observedFeatureVersion must be positive.", 422);
        }

        if (request.ObservedFeatureVersion is not null && request.FeatureType is null)
        {
            throw new CommunityValidationException("INVALID_REPORT", "featureType is required with observedFeatureVersion.", 422);
        }

        var hasProposedAddress = !string.IsNullOrWhiteSpace(request.ProposedAddress);
        var hasProposedPosition = request.ProposedPosition is not null;
        if (request.Reason == InaccurateReportReason.WrongAddressOrPin)
        {
            if (!hasProposedAddress && !hasProposedPosition)
            {
                throw new CommunityValidationException(
                    "INVALID_REPORT",
                    "WrongAddressOrPin requires proposedAddress or proposedPosition.",
                    422);
            }
        }
        else if (hasProposedAddress || hasProposedPosition)
        {
            throw new CommunityValidationException(
                "INVALID_REPORT",
                "Proposed location metadata is only valid for WrongAddressOrPin.",
                422);
        }

        if (request.ProposedAddress?.Trim().Length > 1000)
        {
            throw new CommunityValidationException("INVALID_REPORT", "proposedAddress is too long.", 422);
        }

        if (request.ProposedPosition is { } position &&
            (!double.IsFinite(position.Latitude) || !double.IsFinite(position.Longitude) ||
             position.Latitude is < -90 or > 90 || position.Longitude is < -180 or > 180))
        {
            throw new CommunityValidationException("INVALID_REPORT", "proposedPosition is outside valid coordinate ranges.", 422);
        }

        if (!string.IsNullOrWhiteSpace(request.AiAnalysisJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(request.AiAnalysisJson);
                if (doc.RootElement.TryGetProperty("aiConfidence", out var confProp) &&
                    confProp.ValueKind == JsonValueKind.Number)
                {
                    var conf = confProp.GetDouble();
                    if (conf < _options.Thresholds.RejectConfidenceThreshold)
                    {
                        var percent = Math.Round(conf * 100);
                        throw new CommunityValidationException(
                            "EVIDENCE_CONFIDENCE_TOO_LOW",
                            $"Minh chứng ảnh có độ nhận diện yếu tố tiếp cận quá thấp ({percent}% < {_options.Thresholds.RejectConfidenceThreshold * 100}%). Vui lòng chụp lại ảnh rõ nét phản ánh đúng thực trạng tiếp cận.",
                            422);
                    }
                }
            }
            catch (JsonException)
            {
                // ignore parsing failure for non-json descriptions
            }
        }
    }

    private static void RequireTransition(
        InaccurateInformationReport report,
        params InaccurateReportStatus[] allowedFrom)
    {
        if (!allowedFrom.Contains(report.Status))
        {
            throw new CommunityValidationException(
                "INVALID_REPORT_TRANSITION",
                $"The requested action is not allowed from {report.Status}.",
                409,
                SafeReportSummary(report));
        }
    }

    private static CommunityValidationException ReportVersionChanged(InaccurateInformationReport report) =>
        new(
            "REPORT_VERSION_CHANGED",
            "The report changed; reload it before retrying.",
            409,
            SafeReportSummary(report));

    private static object SafeReportSummary(InaccurateInformationReport report) => new
    {
        reportId = report.Id,
        status = report.Status.ToString(),
        version = report.Version,
        updatedAt = ToOffset(report.UpdatedAtUtc ?? report.CreatedAtUtc),
    };

    private static MyReportDto ToMyReportDto(InaccurateInformationReport report, string locationName) =>
        new(
            report.Id,
            report.LocationId,
            locationName,
            report.FeatureType,
            report.ObservedFeatureVersion,
            report.Reason,
            report.Description,
            report.Status,
            report.IsStaleBaseline,
            report.PublicResolutionNote,
            report.Version,
            ToOffset(report.CreatedAtUtc),
            ToOffset(report.UpdatedAtUtc ?? report.CreatedAtUtc));

    private static void ValidateIdempotencyKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length > 200)
        {
            throw new CommunityValidationException(
                "IDEMPOTENCY_KEY_REQUIRED",
                "A valid Idempotency-Key header is required.",
                400);
        }
    }

    private static void ValidatePageSize(int pageSize)
    {
        if (pageSize is < 1 or > 100)
        {
            throw new CommunityValidationException("INVALID_PAGINATION", "pageSize must be between 1 and 100.", 422);
        }
    }

    private static string Hash<T>(T value)
    {
        var json = JsonSerializer.Serialize(value, JsonOptions);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static string EncodeCursor(DateTime createdAt, Guid id) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes($"{createdAt.Ticks}:{id:D}"));

    private static (DateTime CreatedAt, Guid Id) DecodeCursor(string cursor)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            var parts = decoded.Split(':', 2);
            if (parts.Length == 2 && long.TryParse(parts[0], out var ticks) && Guid.TryParse(parts[1], out var id))
            {
                return (new DateTime(ticks, DateTimeKind.Utc), id);
            }
        }
        catch (FormatException)
        {
            // Converted to the stable validation error below.
        }

        throw new CommunityValidationException("INVALID_CURSOR", "The pagination cursor is invalid.", 422);
    }
}
