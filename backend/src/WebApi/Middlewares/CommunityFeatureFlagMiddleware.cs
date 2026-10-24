using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace AccessMapVN.WebApi.Middlewares;

public sealed class CommunityFeatureFlagMiddleware
{
    private readonly RequestDelegate _next;

    public CommunityFeatureFlagMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IOptions<CommunityValidationOptions> options)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api/v1/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        var flags = options.Value.FeatureFlags;
        var enabled = path.Contains("/admin/", StringComparison.OrdinalIgnoreCase)
            ? flags.Moderation
            : path.Contains("/comments", StringComparison.OrdinalIgnoreCase)
                ? flags.Comments
                : path.Contains("/reports", StringComparison.OrdinalIgnoreCase)
                    ? flags.Report
                    : path.Contains("/votes", StringComparison.OrdinalIgnoreCase) ||
                      path.Contains("/community-votes/", StringComparison.OrdinalIgnoreCase)
                        ? flags.Vote
                        : path.Contains("/community", StringComparison.OrdinalIgnoreCase) ||
                          path.Contains("/timeline", StringComparison.OrdinalIgnoreCase)
                            ? flags.ReadModel
                            : true;
        if (!enabled)
        {
            throw new CommunityValidationException("FEATURE_DISABLED", "This WF-02 capability is temporarily unavailable.", 404);
        }

        await _next(context);
    }
}
