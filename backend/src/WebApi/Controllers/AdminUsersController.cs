using System.Text.Json;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public sealed record AdminUserItemDto(
    string Id,
    string DisplayName,
    string Role,
    bool IsActive,
    decimal ReputationScore,
    string ReputationTier,
    int ExpPoints,
    int ContributionsCount,
    int ReportsCount
);

public sealed record AdminUserListResponse(
    IReadOnlyList<AdminUserItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages
);

public sealed record AdjustReputationRequest(
    decimal Delta,
    string Reason
);

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
[Route("api/v1/admin/users")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AdminUsersController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminUserListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminUserListResponse>> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? tier,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var normalizedPage = Math.Max(1, page);
        var normalizedPageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.AppUsers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u =>
                (u.DisplayName != null && EF.Functions.ILike(u.DisplayName, $"%{term}%")) ||
                u.Id.ToString().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(tier) && !string.Equals(tier, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedTier = tier.Trim();
            query = query.Where(u => u.ReputationTier == normalizedTier);
        }

        var total = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderByDescending(u => u.ReputationScore)
            .ThenBy(u => u.Id)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        var userIdStrings = users.Select(u => u.Id.ToString()).ToList();
        var userGuids = users.Select(u => u.Id).ToList();

        var submissionCounts = await _db.Submissions
            .AsNoTracking()
            .Where(s => userIdStrings.Contains(s.UserId))
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken);

        var reportCounts = await _db.InaccurateInformationReports
            .AsNoTracking()
            .Where(r => userGuids.Contains(r.ReporterId))
            .GroupBy(r => r.ReporterId)
            .Select(g => new { ReporterId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ReporterId, x => x.Count, cancellationToken);

        var expTotals = await _db.PointTransactions
            .AsNoTracking()
            .Where(t => userIdStrings.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new { UserId = g.Key, Points = g.Sum(t => t.Points) })
            .ToDictionaryAsync(x => x.UserId, x => x.Points, cancellationToken);

        var items = users.Select(u =>
        {
            var uid = u.Id.ToString();
            return new AdminUserItemDto(
                Id: uid,
                DisplayName: string.IsNullOrWhiteSpace(u.DisplayName) ? uid[..8] : u.DisplayName,
                Role: u.Role.ToString(),
                IsActive: u.IsActive,
                ReputationScore: u.ReputationScore,
                ReputationTier: u.ReputationTier,
                ExpPoints: expTotals.GetValueOrDefault(uid, 0),
                ContributionsCount: submissionCounts.GetValueOrDefault(uid, 0),
                ReportsCount: reportCounts.GetValueOrDefault(u.Id, 0)
            );
        }).ToList();

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)normalizedPageSize));
        return Ok(new AdminUserListResponse(items, total, normalizedPage, normalizedPageSize, totalPages));
    }

    [HttpPost("{userId:guid}/reputation-adjustments")]
    [ProducesResponseType(typeof(AdminUserItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AdminUserItemDto>> AdjustReputation(
        Guid userId,
        [FromBody] AdjustReputationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var moderatorId))
        {
            return Unauthorized();
        }

        if (moderatorId == userId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                code = "SELF_ADJUSTMENT_FORBIDDEN",
                message = "Quản trị viên không được tự điều chỉnh điểm uy tín của chính mình.",
            });
        }

        if (request.Delta == 0 || Math.Abs(request.Delta) > 100 || string.IsNullOrWhiteSpace(request.Reason))
        {
            return UnprocessableEntity(new
            {
                code = "INVALID_ADJUSTMENT",
                message = "Mức điều chỉnh phải khác 0 (trong khoảng ±100) và cần có lý do rõ ràng.",
            });
        }

        var user = await _db.AppUsers.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound(new { code = "USER_NOT_FOUND", message = "Không tìm thấy người dùng." });
        }

        var now = DateTimeOffset.UtcNow;
        user.ReputationScore = Math.Max(0m, user.ReputationScore + request.Delta);
        user.ReputationTier = user.ReputationScore switch
        {
            >= 100m => "Hạng Vàng",
            >= 50m => "Trusted",
            >= 10m => "Hạng Đồng",
            _ => "Baseline",
        };
        user.UpdatedAtUtc = now.UtcDateTime;

        _db.OutboxMessages.Add(new OutboxMessage
        {
            Type = "ReputationAdjusted",
            PayloadJson = JsonSerializer.Serialize(new
            {
                userId,
                moderatorId,
                delta = request.Delta,
                newScore = user.ReputationScore,
                tier = user.ReputationTier,
                reason = request.Reason.Trim(),
                occurredAt = now,
            }),
            OccurredAt = now,
        });

        await _db.SaveChangesAsync(cancellationToken);

        var uid = user.Id.ToString();
        var exp = await _db.PointTransactions.AsNoTracking().Where(t => t.UserId == uid).SumAsync(t => (int?)t.Points, cancellationToken) ?? 0;
        var contributions = await _db.Submissions.AsNoTracking().CountAsync(s => s.UserId == uid, cancellationToken);
        var reports = await _db.InaccurateInformationReports.AsNoTracking().CountAsync(r => r.ReporterId == user.Id, cancellationToken);

        return Ok(new AdminUserItemDto(
            Id: uid,
            DisplayName: string.IsNullOrWhiteSpace(user.DisplayName) ? uid[..8] : user.DisplayName,
            Role: user.Role.ToString(),
            IsActive: user.IsActive,
            ReputationScore: user.ReputationScore,
            ReputationTier: user.ReputationTier,
            ExpPoints: exp,
            ContributionsCount: contributions,
            ReportsCount: reports
        ));
    }
}
