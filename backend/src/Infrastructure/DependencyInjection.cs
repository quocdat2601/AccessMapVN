using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AccessMapVN.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("SupabaseConnection")
            ?? configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                });
            }
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IPlaceSpatialQueryService, AccessMapVN.Infrastructure.Services.PlaceSpatialQueryService>();
        services.AddScoped<IPlaceRepository, AccessMapVN.Infrastructure.Repositories.PlaceRepository>();
        services.AddScoped<ISubmissionRepository, AccessMapVN.Infrastructure.Repositories.SubmissionRepository>();
        services.AddScoped<ApplicationDbContextInitialiser>();

        return services;
    }
}
