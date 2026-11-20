using System.Security.Claims;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Authorization;

public static class CommunityPolicies
{
    public const string Moderate = "Community.Moderate";
}

public sealed class CommunityModerationRequirement : IAuthorizationRequirement;

public sealed class CommunityModerationAuthorizationHandler
    : AuthorizationHandler<CommunityModerationRequirement>
{
    private readonly ApplicationDbContext _db;

    public CommunityModerationAuthorizationHandler(ApplicationDbContext db)
    {
        _db = db;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CommunityModerationRequirement requirement)
    {
        if (!context.User.TryGetUserId(out var userId))
        {
            return;
        }

        var isServerAuthorizedAdmin = await _db.AppUsers.AsNoTracking()
            .AnyAsync(user => user.Id == userId && user.IsActive && user.Role == AppUserRole.Admin);
        if (!isServerAuthorizedAdmin)
        {
            return;
        }

        var hasPermission = context.User.Claims
            .Where(claim => claim.Type is "permissions" or "permission" or "app_role" or "role")
            .SelectMany(claim => claim.Value.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries))
            .Any(value => string.Equals(value, CommunityPolicies.Moderate, StringComparison.OrdinalIgnoreCase) ||
                          string.Equals(value, "admin", StringComparison.OrdinalIgnoreCase));

        var hasAppMetadataPermission = context.User.Claims
            .Any(claim => claim.Type.Contains("app_metadata", StringComparison.OrdinalIgnoreCase) &&
                          (claim.Value.Contains(CommunityPolicies.Moderate, StringComparison.OrdinalIgnoreCase) ||
                           claim.Value.Contains("admin", StringComparison.OrdinalIgnoreCase)));

        if (hasPermission || hasAppMetadataPermission || isServerAuthorizedAdmin)
        {
            context.Succeed(requirement);
        }
    }
}

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId)
    {
        var subject = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(subject, out userId);
    }
}
