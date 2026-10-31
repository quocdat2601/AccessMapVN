using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.CommunityValidation;
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
        services.AddScoped<ICommunityValidationService, CommunityValidationService>();
        services.AddScoped<ICommunityReportService, CommunityReportService>();
        services.AddScoped<ICommunityDisputeService, CommunityDisputeService>();
        services.AddScoped<ILocationTimelineCommentService, LocationTimelineCommentService>();
        services.AddScoped<ICommunityMediaService, CommunityMediaService>();
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
                        DistributedLockTimeout = TimeSpan.FromSeconds(20),
                    }));
            services.AddHangfireServer(options =>
            {
                options.Queues = new[] { "community-validation", "default" };
                options.WorkerCount = 2;
            });
            services.AddScoped<ICommunityJobScheduler, HangfireCommunityJobScheduler>();
            services.AddHostedService<CommunityRecurringJobRegistrar>();
        }
        else
        {
            services.AddSingleton<ICommunityJobScheduler, NoOpCommunityJobScheduler>();
        }

        services.AddHostedService<CommunityOutboxDispatcher>();

        return services;
    }
}
