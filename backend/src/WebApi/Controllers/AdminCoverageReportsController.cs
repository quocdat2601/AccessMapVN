using System.Globalization;
using System.Text;
using System.Text.Json;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public sealed record CoverageFeatureBreakdownDto(
    string Key,
    string Label,
    int SupportedCount,
    double Percentage
);

public sealed record CoverageCategoryBreakdownDto(
    string Category,
    int TotalPlaces,
    int VerifiedPlaces
);

public sealed record CoverageSnapshotDto(
    string Id,
    string Title,
    string Region,
    string? Category,
    string Status,
    int TotalPlaces,
    int VerifiedPlaces,
    DateTimeOffset CreatedAt
);

public sealed record CoverageOverviewResponse(
    int TotalPlaces,
    int VerifiedPlaces,
    double VerifiedPercentage,
    IReadOnlyList<CoverageFeatureBreakdownDto> FeatureBreakdown,
    IReadOnlyList<CoverageCategoryBreakdownDto> CategoryBreakdown,
    IReadOnlyList<CoverageSnapshotDto> Snapshots
);

public sealed record CreateCoverageReportRequest(
    string Title,
    string Region,
    string? Category = null,
    bool SimulateQueued = false
);

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
[Route("api/v1/admin/coverage-reports")]
public sealed class AdminCoverageReportsController : ControllerBase
{
    private const string SnapshotMessageType = "CoverageReportSnapshot";
    private readonly ApplicationDbContext _db;

    public AdminCoverageReportsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CoverageOverviewResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CoverageOverviewResponse>> GetCoverageOverview(CancellationToken cancellationToken = default)
    {
        var places = await _db.Places
            .AsNoTracking()
            .Where(p => p.Status == LocationStatus.Active)
            .ToListAsync(cancellationToken);

        var total = places.Count;
        var verified = places.Count(p => p.LastVerifiedAt != null || p.AccessibilityScore != null);
        var verifiedPct = total == 0 ? 0 : Math.Round(verified * 100.0 / total, 1);

        var featureBreakdown = new List<CoverageFeatureBreakdownDto>
        {
            BuildFeatureBreakdown("HasRamp", "Ram dốc lối vào", places.Count(p => p.HasRamp == true), total),
            BuildFeatureBreakdown("DoorWidthOk", "Cửa rộng chuẩn >= 90cm", places.Count(p => p.DoorWidthOk == true), total),
            BuildFeatureBreakdown("HasAccessibleElevator", "Thang máy tiếp cận", places.Count(p => p.HasAccessibleElevator == true), total),
            BuildFeatureBreakdown("HasAccessibleRestroom", "Nhà vệ sinh tiếp cận", places.Count(p => p.HasAccessibleRestroom == true), total),
            BuildFeatureBreakdown("HasTactilePaving", "Lối dẫn xúc giác", places.Count(p => p.HasTactilePaving == true), total),
        };

        var categoryBreakdown = places
            .GroupBy(p => string.IsNullOrWhiteSpace(p.Category) ? "Khác" : p.Category)
            .Select(g => new CoverageCategoryBreakdownDto(
                Category: g.Key,
                TotalPlaces: g.Count(),
                VerifiedPlaces: g.Count(p => p.LastVerifiedAt != null || p.AccessibilityScore != null)
            ))
            .OrderByDescending(c => c.TotalPlaces)
            .Take(12)
            .ToList();

        var snapshotMessages = await _db.OutboxMessages
            .AsNoTracking()
            .Where(m => m.Type == SnapshotMessageType)
            .OrderByDescending(m => m.OccurredAt)
            .Take(25)
            .ToListAsync(cancellationToken);

        var snapshots = new List<CoverageSnapshotDto>();
        foreach (var msg in snapshotMessages)
        {
            if (TryParseSnapshot(msg, out var snap))
            {
                snapshots.Add(snap!);
            }
        }

        if (snapshots.Count == 0)
        {
            snapshots.Add(new CoverageSnapshotDto(
                Id: "live-default",
                Title: "Báo cáo độ phủ toàn hệ thống (Mặc định)",
                Region: "TP.HCM & Hà Nội",
                Category: null,
                Status: "Ready",
                TotalPlaces: total,
                VerifiedPlaces: verified,
                CreatedAt: DateTimeOffset.UtcNow
            ));
        }

        return Ok(new CoverageOverviewResponse(
            TotalPlaces: total,
            VerifiedPlaces: verified,
            VerifiedPercentage: verifiedPct,
            FeatureBreakdown: featureBreakdown,
            CategoryBreakdown: categoryBreakdown,
            Snapshots: snapshots
        ));
    }

    [HttpPost]
    [ProducesResponseType(typeof(CoverageSnapshotDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CoverageSnapshotDto>> CreateSnapshot(
        [FromBody] CreateCoverageReportRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Region))
        {
            return UnprocessableEntity(new
            {
                code = "INVALID_COVERAGE_REPORT",
                message = "Tiêu đề báo cáo và khu vực là bắt buộc.",
            });
        }

        var query = _db.Places.AsNoTracking().Where(p => p.Status == LocationStatus.Active);
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var cat = request.Category.Trim();
            query = query.Where(p => p.Category == cat);
        }

        var matchingPlaces = await query.ToListAsync(cancellationToken);
        var verified = matchingPlaces.Count(p => p.LastVerifiedAt != null || p.AccessibilityScore != null);
        var now = DateTimeOffset.UtcNow;
        var id = Guid.NewGuid().ToString("D");
        var status = request.SimulateQueued ? "Queued" : "Ready";

        var snapshot = new CoverageSnapshotDto(
            Id: id,
            Title: request.Title.Trim(),
            Region: request.Region.Trim(),
            Category: string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim(),
            Status: status,
            TotalPlaces: matchingPlaces.Count,
            VerifiedPlaces: verified,
            CreatedAt: now
        );

        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = SnapshotMessageType,
            PayloadJson = JsonSerializer.Serialize(snapshot),
            OccurredAt = now,
        });
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(ExportCsv), new { reportId = id }, snapshot);
    }

    [HttpGet("{reportId}/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ExportCsv(string reportId, CancellationToken cancellationToken = default)
    {
        string? categoryFilter = null;
        if (string.Equals(reportId, "queued", StringComparison.OrdinalIgnoreCase))
        {
            return UnprocessableEntity(new
            {
                code = "REPORT_NOT_READY",
                message = "Báo cáo đang ở trạng thái hàng đợi (Queued), chưa thể kết xuất CSV.",
            });
        }

        if (!string.Equals(reportId, "live-default", StringComparison.OrdinalIgnoreCase))
        {
            var recentSnapshots = await _db.OutboxMessages
                .AsNoTracking()
                .Where(m => m.Type == SnapshotMessageType)
                .OrderByDescending(m => m.OccurredAt)
                .Take(50)
                .ToListAsync(cancellationToken);

            foreach (var msg in recentSnapshots)
            {
                if (TryParseSnapshot(msg, out var snap) && string.Equals(snap!.Id, reportId, StringComparison.OrdinalIgnoreCase))
                {
                    if (string.Equals(snap.Status, "Queued", StringComparison.OrdinalIgnoreCase))
                    {
                        return UnprocessableEntity(new
                        {
                            code = "REPORT_NOT_READY",
                            message = "Báo cáo đang ở trạng thái hàng đợi (Queued), chưa thể kết xuất CSV.",
                        });
                    }
                    categoryFilter = snap.Category;
                    break;
                }
            }
        }

        var query = _db.Places.AsNoTracking().Where(p => p.Status == LocationStatus.Active);
        if (!string.IsNullOrWhiteSpace(categoryFilter))
        {
            query = query.Where(p => p.Category == categoryFilter);
        }

        var places = await query.OrderBy(p => p.Name).ToListAsync(cancellationToken);
        var csv = BuildCsvContent(places);
        var bom = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(csv);
        var bytes = new byte[bom.Length + body.Length];
        Buffer.BlockCopy(bom, 0, bytes, 0, bom.Length);
        Buffer.BlockCopy(body, 0, bytes, bom.Length, body.Length);

        return File(bytes, "text/csv; charset=utf-8", $"accessmap-coverage-{DateTimeOffset.UtcNow:yyyyMMdd-HHmm}.csv");
    }

    public static string BuildCsvContent(IEnumerable<Place> places)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Id,Name,Category,Address,Latitude,Longitude,HasRamp,DoorWidthOk,HasElevator,HasRestroom,HasTactilePaving,AccessibilityScore,LastVerifiedAt");

        foreach (var p in places)
        {
            sb.Append(EscapeCsv(p.Id.ToString())).Append(',')
              .Append(EscapeCsv(p.Name)).Append(',')
              .Append(EscapeCsv(p.Category)).Append(',')
              .Append(EscapeCsv(p.Address ?? string.Empty)).Append(',')
              .Append(p.Lat.ToString(CultureInfo.InvariantCulture)).Append(',')
              .Append(p.Lng.ToString(CultureInfo.InvariantCulture)).Append(',')
              .Append(p.HasRamp?.ToString() ?? string.Empty).Append(',')
              .Append(p.DoorWidthOk?.ToString() ?? string.Empty).Append(',')
              .Append(p.HasAccessibleElevator?.ToString() ?? string.Empty).Append(',')
              .Append(p.HasAccessibleRestroom?.ToString() ?? string.Empty).Append(',')
              .Append(p.HasTactilePaving?.ToString() ?? string.Empty).Append(',')
              .Append(p.AccessibilityScore?.ToString(CultureInfo.InvariantCulture) ?? string.Empty).Append(',')
              .AppendLine(p.LastVerifiedAt?.ToString("O", CultureInfo.InvariantCulture) ?? string.Empty);
        }

        return sb.ToString();
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }

    private static CoverageFeatureBreakdownDto BuildFeatureBreakdown(string key, string label, int supported, int total) =>
        new(key, label, supported, total == 0 ? 0 : Math.Round(supported * 100.0 / total, 1));

    private static bool TryParseSnapshot(OutboxMessage msg, out CoverageSnapshotDto? snapshot)
    {
        snapshot = null;
        try
        {
            snapshot = JsonSerializer.Deserialize<CoverageSnapshotDto>(msg.PayloadJson);
            return snapshot is not null;
        }
        catch
        {
            return false;
        }
    }
}
