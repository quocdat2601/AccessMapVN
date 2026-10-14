using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.Infrastructure.Services;
using Hangfire;
using Hangfire.PostgreSql;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
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
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IWf02CommunityService, Wf02CommunityService>();
        services.AddScoped<IWf02ReportService, Wf02ReportService>();
        services.AddScoped<IWf02DisputeService, Wf02DisputeService>();
        services.AddScoped<IWf02TimelineCommentService, Wf02TimelineCommentService>();
        services.AddScoped<IWf02MediaService, Wf02MediaService>();
        services.AddScoped<ILocationFeaturePublicationService, LocationFeaturePublicationService>();

        var objectStorageEndpoint = configuration["ObjectStorage:ServiceUrl"];
        var objectStorageAccessKey = configuration["ObjectStorage:AccessKey"];
        var objectStorageSecretKey = configuration["ObjectStorage:SecretKey"];
        services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(
            new BasicAWSCredentials(objectStorageAccessKey ?? string.Empty, objectStorageSecretKey ?? string.Empty),
            new AmazonS3Config
            {
                ServiceURL = objectStorageEndpoint,
                ForcePathStyle = true,
                AuthenticationRegion = configuration["ObjectStorage:Region"] ?? RegionEndpoint.USEast1.SystemName,
            }));

        var hangfireEnabled = configuration.GetValue<bool>("Hangfire:Enabled");
        if (hangfireEnabled && !string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddHangfire((_, configurationBuilder) => configurationBuilder
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(
                    options => options.UseNpgsqlConnection(connectionString),
                    new PostgreSqlStorageOptions
                    {
                        PrepareSchemaIfNecessary = true,
                    }));
            services.AddHangfireServer(options =>
            {
                options.Queues = new[] { "wf02-community", "default" };
            });
            services.AddScoped<IWf02JobScheduler, HangfireWf02JobScheduler>();
            services.AddHostedService<Wf02RecurringJobRegistrar>();
        }
        else
        {
            services.AddSingleton<IWf02JobScheduler, NoOpWf02JobScheduler>();
        }

        services.AddHostedService<Wf02OutboxDispatcher>();

        return services;
    }
}
