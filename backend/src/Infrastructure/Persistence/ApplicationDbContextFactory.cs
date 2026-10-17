using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AccessMapVN.Infrastructure.Persistence;

/// <summary>
/// Design-time only factory. The placeholder is used to build the migration model and is never
/// opened by migration generation; deployment supplies its own secret connection string.
/// </summary>
public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__SupabaseConnection")
            ?? Environment.GetEnvironmentVariable("ACCESSMAP_DB_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=accessmapvn;Username=accessmap;Password=accessmap_dev_only";
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new ApplicationDbContext(options);
    }
}
