using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public sealed record AdminAdvisoryItemDto(
    Guid Id,
    Guid LocationFeatureId,
    Guid? LocationId,
    string LocationName,
    string FeatureType,
    string Status,
    string Reason,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? RevocationReason
);

public sealed record DeactivateAdvisoryRequest(
    string? Reason
);

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
[Route("api/v1/admin/advisories")]
public sealed class AdminAdvisoriesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AdminAdvisoriesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminAdvisoryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminAdvisoryItemDto>>> GetAdvisories(
        [FromQuery] string? status,
        CancellationToken cancellationToken = default)
    {
        var query = from adv in _db.TemporaryAccessAdvisories.AsNoTracking()
                    join feat in _db.LocationFeatures.AsNoTracking() on adv.LocationFeatureId equals feat.Id into featGroup
                    from feat in featGroup.DefaultIfEmpty()
                    join place in _db.Places.AsNoTracking() on feat.LocationId equals place.Id into placeGroup
                    from place in placeGroup.DefaultIfEmpty()
                    orderby adv.StartsAt descending
                    select new
                    {
                        adv,
                        LocationId = feat != null ? (Guid?)feat.LocationId : null,
                        LocationName = place != null ? place.Name : "Địa điểm chưa xác định",
                        FeatureType = feat != null ? feat.FeatureType.ToString() : "Unknown",
                    };

        var rows = await query.Take(100).ToListAsync(cancellationToken);

        var items = rows
            .Where(r => string.IsNullOrWhiteSpace(status) ||
                        string.Equals(status, "ALL", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(r.adv.Status.ToString(), status, StringComparison.OrdinalIgnoreCase))
            .Select(r => new AdminAdvisoryItemDto(
                Id: r.adv.Id,
                LocationFeatureId: r.adv.LocationFeatureId,
                LocationId: r.LocationId,
                LocationName: r.LocationName,
                FeatureType: r.FeatureType,
                Status: r.adv.Status.ToString(),
                Reason: r.adv.Reason,
                StartsAt: r.adv.StartsAt,
                EndsAt: r.adv.EndsAt,
                RevocationReason: r.adv.RevocationReason
            ))
            .ToList();

        return Ok(items);
    }

    [HttpPost("{advisoryId:guid}/deactivate")]
    [ProducesResponseType(typeof(AdminAdvisoryItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminAdvisoryItemDto>> Deactivate(
        Guid advisoryId,
        [FromBody] DeactivateAdvisoryRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var moderatorId))
        {
            return Unauthorized();
        }

        var advisory = await _db.TemporaryAccessAdvisories.SingleOrDefaultAsync(a => a.Id == advisoryId, cancellationToken);
        if (advisory is null)
        {
            return NotFound(new { code = "ADVISORY_NOT_FOUND", message = "Không tìm thấy cảnh báo tạm thời." });
        }

        advisory.Status = AdvisoryStatus.Revoked;
        advisory.RevokedById = moderatorId;
        advisory.RevocationReason = string.IsNullOrWhiteSpace(request?.Reason)
            ? "Đã kiểm tra và xác nhận sự cố được khắc phục."
            : request!.Reason!.Trim();
        advisory.Version += 1;
        advisory.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var feat = await _db.LocationFeatures.AsNoTracking().FirstOrDefaultAsync(f => f.Id == advisory.LocationFeatureId, cancellationToken);
        var place = feat is not null
            ? await _db.Places.AsNoTracking().FirstOrDefaultAsync(p => p.Id == feat.LocationId, cancellationToken)
            : null;

        return Ok(new AdminAdvisoryItemDto(
            Id: advisory.Id,
            LocationFeatureId: advisory.LocationFeatureId,
            LocationId: feat?.LocationId,
            LocationName: place?.Name ?? "Địa điểm chưa xác định",
            FeatureType: feat?.FeatureType.ToString() ?? "Unknown",
            Status: advisory.Status.ToString(),
            Reason: advisory.Reason,
            StartsAt: advisory.StartsAt,
            EndsAt: advisory.EndsAt,
            RevocationReason: advisory.RevocationReason
        ));
    }
}
