using System.Text.Json;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public sealed record LeaderboardEntryDto(
    int Rank,
    string? RankBadge,
    string UserId,
    string DisplayName,
    decimal ReputationScore,
    string ReputationTier,
    int ExpPoints,
    int ContributionsCount
);

public sealed record LeaderboardResponse(
    IReadOnlyList<LeaderboardEntryDto> Items,
    int TotalContributors
);

public sealed record ReputationEventDto(
    decimal Delta,
    decimal NewScore,
    string Reason,
    DateTimeOffset OccurredAt
);

public sealed record MyReputationResponse(
    string UserId,
    string DisplayName,
    decimal ReputationScore,
    string ReputationTier,
    decimal TrustWeight,
    int? Rank,
    int ExpPoints,
    int ContributionsCount,
    IReadOnlyList<ReputationEventDto> RecentEvents
);

[ApiController]
public sealed class LeaderboardController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public LeaderboardController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("api/v1/leaderboard")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LeaderboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<LeaderboardResponse>> GetLeaderboard(
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        var cappedLimit = Math.Clamp(limit, 1, 100);

        var activeContributors = await _db.AppUsers
            .AsNoTracking()
            .Where(u => u.IsActive && u.Role != AppUserRole.Admin)
            .OrderByDescending(u => u.ReputationScore)
            .ThenBy(u => u.Id)
            .ToListAsync(cancellationToken);

        var submissionCounts = await _db.Submissions
            .AsNoTracking()
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken);

        var expTotals = await _db.PointTransactions
            .AsNoTracking()
            .GroupBy(t => t.UserId)
            .Select(g => new { UserId = g.Key, Points = g.Sum(t => t.Points) })
            .ToDictionaryAsync(x => x.UserId, x => x.Points, cancellationToken);

        var ranked = activeContributors
            .Select(u =>
            {
                var uid = u.Id.ToString();
                var exp = expTotals.GetValueOrDefault(uid, 0);
                var count = submissionCounts.GetValueOrDefault(uid, 0);
                return new
                {
                    User = u,
                    ExpPoints = exp,
                    ContributionsCount = count,
                };
            })
            .OrderByDescending(x => x.User.ReputationScore)
            .ThenByDescending(x => x.ExpPoints)
            .ThenByDescending(x => x.ContributionsCount)
            .ToList();

        var items = ranked
            .Take(cappedLimit)
            .Select((entry, index) =>
            {
                var rank = index + 1;
                return new LeaderboardEntryDto(
                    Rank: rank,
                    RankBadge: rank <= 10 ? $"Top {rank}" : null,
                    UserId: entry.User.Id.ToString(),
                    DisplayName: string.IsNullOrWhiteSpace(entry.User.DisplayName)
                        ? $"Thành viên #{rank}"
                        : entry.User.DisplayName,
                    ReputationScore: entry.User.ReputationScore,
                    ReputationTier: FormatTier(entry.User.ReputationTier, entry.User.ReputationScore),
                    ExpPoints: entry.ExpPoints,
                    ContributionsCount: entry.ContributionsCount
                );
            })
            .ToList();

        return Ok(new LeaderboardResponse(items, ranked.Count));
    }

    [HttpGet("api/v1/users/me/reputation")]
    [Authorize]
    [ProducesResponseType(typeof(MyReputationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MyReputationResponse>> GetMyReputation(CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var userIdStr = userId.ToString();
        var user = await _db.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        var score = user?.ReputationScore ?? 0m;
        var tier = FormatTier(user?.ReputationTier, score);
        var trustWeight = score >= 50m ? 1.5m : 1.0m;

        var expPoints = await _db.PointTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userIdStr)
            .SumAsync(t => (int?)t.Points, cancellationToken) ?? 0;

        var contributionsCount = await _db.Submissions
            .AsNoTracking()
            .CountAsync(s => s.UserId == userIdStr, cancellationToken);

        int? rank = null;
        if (user is not null && user.Role != AppUserRole.Admin)
        {
            var higherCount = await _db.AppUsers
                .AsNoTracking()
                .CountAsync(u => u.IsActive && u.Role != AppUserRole.Admin && u.ReputationScore > score, cancellationToken);
            rank = higherCount + 1;
        }

        var outboxRows = await _db.OutboxMessages
            .AsNoTracking()
            .Where(m => m.Type == "ReputationCredited" || m.Type == "ReputationAdjusted")
            .OrderByDescending(m => m.OccurredAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        var events = new List<ReputationEventDto>();
        foreach (var row in outboxRows)
        {
            if (TryParseEvent(row.PayloadJson, userId, row.OccurredAt, out var dto))
            {
                events.Add(dto!);
                if (events.Count >= 15) break;
            }
        }

        return Ok(new MyReputationResponse(
            UserId: userIdStr,
            DisplayName: string.IsNullOrWhiteSpace(user?.DisplayName) ? "Thành viên" : user.DisplayName,
            ReputationScore: score,
            ReputationTier: tier,
            TrustWeight: trustWeight,
            Rank: rank,
            ExpPoints: expPoints,
            ContributionsCount: contributionsCount,
            RecentEvents: events
        ));
    }

    private static bool TryParseEvent(string payloadJson, Guid targetUserId, DateTimeOffset occurredAt, out ReputationEventDto? dto)
    {
        dto = null;
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;
            if (!root.TryGetProperty("userId", out var uidProp) ||
                !Guid.TryParse(uidProp.GetString(), out var eventUserId) ||
                eventUserId != targetUserId)
            {
                return false;
            }

            var delta = root.TryGetProperty("delta", out var deltaProp) ? deltaProp.GetDecimal() : 0m;
            var newScore = root.TryGetProperty("newScore", out var scoreProp) ? scoreProp.GetDecimal() : 0m;
            var reason = root.TryGetProperty("reason", out var reasonProp)
                ? reasonProp.GetString() ?? "Cập nhật điểm uy tín"
                : "Cập nhật điểm uy tín";

            dto = new ReputationEventDto(delta, newScore, reason, occurredAt);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string FormatTier(string? storedTier, decimal score)
    {
        if (!string.IsNullOrWhiteSpace(storedTier) &&
            !string.Equals(storedTier, "Baseline", StringComparison.OrdinalIgnoreCase))
        {
            return storedTier;
        }

        return score switch
        {
            >= 100m => "Hạng Vàng",
            >= 50m => "Trusted",
            >= 10m => "Hạng Đồng",
            _ => "Thành viên mới",
        };
    }
}
