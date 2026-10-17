using System.Security.Claims;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Authorization;

public static class Wf02Policies
{
    public const string Moderate = "Wf02.Moderate";
}

public sealed class Wf02ModerationRequirement : IAuthorizationRequirement;

public sealed class Wf02ModerationAuthorizationHandler
    : AuthorizationHandler<Wf02ModerationRequirement>
{
    private readonly ApplicationDbContext _db;

    public Wf02ModerationAuthorizationHandler(ApplicationDbContext db)
    {
        _db = db;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        Wf02ModerationRequirement requirement)
    {
        if (!context.User.TryGetUserId(out var userId))
        {
            return;
        }

        var hasPermission = context.User.Claims
            .Where(claim => claim.Type is "permissions" or "permission")
            .SelectMany(claim => claim.Value.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries))
            .Any(value => string.Equals(value, Wf02Policies.Moderate, StringComparison.OrdinalIgnoreCase));
        if (!hasPermission)
        {
            return;
        }

        var isServerAuthorizedAdmin = await _db.AppUsers.AsNoTracking()
            .AnyAsync(user => user.Id == userId && user.IsActive && user.Role == AppUserRole.Admin);
        if (isServerAuthorizedAdmin)
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
