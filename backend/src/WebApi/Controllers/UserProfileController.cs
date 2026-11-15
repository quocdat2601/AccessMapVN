using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public sealed record UserProfileResponse(
    string Id,
    string DisplayName,
    string Role,
    int ExpPoints,
    decimal ReputationScore,
    string ReputationTier,
    int ContributionsCount,
    int ReportsCount
);

[ApiController]
[Authorize]
[Route("api/v1/users/me")]
public sealed class UserProfileController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public UserProfileController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns the authenticated user's real profile statistics and reputation tier from the database.
    /// </summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserProfileResponse>> GetMyProfile(CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var userIdStr = userId.ToString();

        var appUser = await _db.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        var contributionsCount = await _db.Submissions
            .AsNoTracking()
            .CountAsync(s => s.UserId == userIdStr, cancellationToken);

        var reportsCount = await _db.InaccurateInformationReports
            .AsNoTracking()
            .CountAsync(r => r.ReporterId == userId, cancellationToken);

        var expPoints = await _db.PointTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userIdStr)
            .SumAsync(t => (int?)t.Points, cancellationToken) ?? 0;

        var reputationScore = appUser?.ReputationScore ?? 0m;
        var tier = ResolveTierLabel(appUser?.ReputationTier, reputationScore);

        return Ok(new UserProfileResponse(
            Id: userIdStr,
            DisplayName: string.IsNullOrWhiteSpace(appUser?.DisplayName) ? "Thành viên" : appUser.DisplayName,
            Role: appUser?.Role.ToString() ?? "User",
            ExpPoints: expPoints,
            ReputationScore: reputationScore,
            ReputationTier: tier,
            ContributionsCount: contributionsCount,
            ReportsCount: reportsCount
        ));
    }

    private static string ResolveTierLabel(string? storedTier, decimal score)
    {
        if (!string.IsNullOrWhiteSpace(storedTier) &&
            !string.Equals(storedTier, "Baseline", StringComparison.OrdinalIgnoreCase))
        {
            return storedTier;
        }

        return score switch
        {
            >= 100m => "Hạng Vàng",
            >= 50m => "Hạng Bạc",
            >= 10m => "Hạng Đồng",
            _ => "Thành viên mới",
        };
    }
}

