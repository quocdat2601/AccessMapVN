using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.Infrastructure.Persistence;

internal static class CommunityIdempotencyLock
{
    public static Task AcquireAsync(
        ApplicationDbContext db,
        Guid actorId,
        string endpoint,
        string key,
        CancellationToken cancellationToken)
    {
        var lockIdentity = $"idempotency:{actorId:D}:{endpoint}:{key}";
        return AcquireResourceAsync(db, lockIdentity, cancellationToken);
    }

    public static Task AcquireResourceAsync(
        ApplicationDbContext db,
        string resourceIdentity,
        CancellationToken cancellationToken)
    {
        var lockIdentity = $"wf02:{resourceIdentity}";
        return db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({lockIdentity}, 0));",
            cancellationToken);
    }
}
