using System.Text.Json;
using AccessMapVN.Application.Features.Wf02;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AccessMapVN.Infrastructure.Services;

public sealed class Wf02MaintenanceJob
{
    private readonly ApplicationDbContext _db;
    private readonly IWf02CommunityService _community;
    private readonly TimeProvider _clock;

    public Wf02MaintenanceJob(ApplicationDbContext db, IWf02CommunityService community, TimeProvider clock)
    {
        _db = db;
        _community = community;
        _clock = clock;
    }

    [AutomaticRetry(Attempts = 2)]
    [Queue("wf02-community")]
    public Task ScanFreshnessAsync(CancellationToken cancellationToken) =>
        _community.ScanFreshnessAsync(cancellationToken);

    [AutomaticRetry(Attempts = 2)]
    [Queue("wf02-community")]
    public Task ReconcileAssessmentsAsync(CancellationToken cancellationToken) =>
        _community.ReconcileJobsAsync(cancellationToken);

    [AutomaticRetry(Attempts = 2)]
    [Queue("wf02-community")]
    public async Task MaintainAdvisoriesAsync(CancellationToken cancellationToken)
    {
        var now = _clock.GetUtcNow();
        var advisories = await _db.TemporaryAccessAdvisories
            .Where(item =>
                (item.Status == AdvisoryStatus.Scheduled && item.StartsAt <= now) ||
                ((item.Status == AdvisoryStatus.Scheduled || item.Status == AdvisoryStatus.Active) && item.EndsAt <= now))
            .ToListAsync(cancellationToken);
        foreach (var advisory in advisories)
        {
            var nextStatus = advisory.EndsAt <= now ? AdvisoryStatus.Expired : AdvisoryStatus.Active;
            if (advisory.Status == nextStatus) continue;
            advisory.Status = nextStatus;
            advisory.Version += 1;
            advisory.UpdatedAtUtc = now.UtcDateTime;
            _db.OutboxMessages.Add(new OutboxMessage
            {
                Type = nextStatus == AdvisoryStatus.Active
                    ? "TemporaryAccessAdvisoryStarted"
                    : "TemporaryAccessAdvisoryExpired",
                PayloadJson = JsonSerializer.Serialize(new
                {
                    advisoryId = advisory.Id,
                    featureId = advisory.LocationFeatureId,
                    status = nextStatus.ToString(),
                }),
                OccurredAt = now,
            });
        }
        await _db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class Wf02RecurringJobRegistrar : IHostedService
{
    private readonly IRecurringJobManager _jobs;
    private readonly IConfiguration _configuration;

    private readonly ILogger<Wf02RecurringJobRegistrar> _logger;

    public Wf02RecurringJobRegistrar(IRecurringJobManager jobs, IConfiguration configuration, ILogger<Wf02RecurringJobRegistrar> logger)
    {
        _jobs = jobs;
        _configuration = configuration;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var freshnessCron = _configuration["Wf02:Freshness:Cron"] ?? "0 2 * * *";
            var reconciliationCron = _configuration["Wf02:Jobs:ReconciliationCron"] ?? "* * * * *";
            var options = new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc };
            _jobs.AddOrUpdate<Wf02MaintenanceJob>(
                "wf02-freshness", job => job.ScanFreshnessAsync(CancellationToken.None), freshnessCron, options);
            _jobs.AddOrUpdate<Wf02MaintenanceJob>(
                "wf02-reconcile", job => job.ReconcileAssessmentsAsync(CancellationToken.None), reconciliationCron, options);
            _jobs.AddOrUpdate<Wf02MaintenanceJob>(
                "wf02-advisories", job => job.MaintainAdvisoriesAsync(CancellationToken.None), "* * * * *", options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to register one or more Hangfire recurring jobs due to distributed lock contention.");
        }
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

public sealed class Wf02OutboxDispatcher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly TimeProvider _clock;
    private readonly ILogger<Wf02OutboxDispatcher> _logger;
    private FirebaseMessaging? _messaging;

    public Wf02OutboxDispatcher(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        TimeProvider clock,
        ILogger<Wf02OutboxDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _clock = clock;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_configuration.GetValue<bool>("Notifications:Firebase:Enabled")) return;
        _messaging = CreateMessaging();
        var interval = TimeSpan.FromSeconds(Math.Max(5, _configuration.GetValue("Notifications:Firebase:PollSeconds", 15)));
        while (!stoppingToken.IsCancellationRequested)
        {
            await DispatchBatchAsync(stoppingToken);
            await Task.Delay(interval, stoppingToken);
        }
    }

    private FirebaseMessaging CreateMessaging()
    {
        var credentialPath = _configuration["Notifications:Firebase:CredentialPath"];
        var credential = string.IsNullOrWhiteSpace(credentialPath)
            ? GoogleCredential.GetApplicationDefault()
            : CredentialFactory.FromFile<ServiceAccountCredential>(credentialPath).ToGoogleCredential();
        var app = FirebaseApp.Create(new AppOptions
        {
            Credential = credential,
            ProjectId = _configuration["Notifications:Firebase:ProjectId"],
        }, $"accessmapvn-wf02-{Guid.NewGuid():N}");
        return FirebaseMessaging.GetMessaging(app);
    }

    private async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var messages = await db.OutboxMessages
            .Where(item => item.ProcessedAt == null && item.Attempts < 3)
            .OrderBy(item => item.OccurredAt)
            .Take(50)
            .ToListAsync(cancellationToken);
        foreach (var outbox in messages)
        {
            Wf02Metrics.OutboxLagSeconds.Record(
                Math.Max(0, (_clock.GetUtcNow() - outbox.OccurredAt).TotalSeconds),
                new KeyValuePair<string, object?>("event.type", outbox.Type));
            try
            {
                var target = ResolveTopic(outbox);
                if (target is not null)
                {
                    await _messaging!.SendAsync(new Message
                    {
                        Topic = target,
                        Data = new Dictionary<string, string>
                        {
                            ["outboxId"] = outbox.Id.ToString("D"),
                            ["eventType"] = outbox.Type,
                            ["payload"] = outbox.PayloadJson,
                        },
                    }, cancellationToken);
                }
                outbox.ProcessedAt = _clock.GetUtcNow();
                outbox.LastError = null;
            }
            catch (Exception exception)
            {
                Wf02Metrics.OutboxFailures.Add(1,
                    new KeyValuePair<string, object?>("event.type", outbox.Type));
                outbox.Attempts += 1;
                outbox.LastError = exception.Message.Length > 2000 ? exception.Message[..2000] : exception.Message;
                _logger.LogWarning(exception, "WF-02 outbox dispatch failed for {OutboxId} attempt {Attempt}", outbox.Id, outbox.Attempts);
                if (outbox.Attempts >= 3) outbox.ProcessedAt = _clock.GetUtcNow();
            }
            outbox.UpdatedAtUtc = _clock.GetUtcNow().UtcDateTime;
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static string? ResolveTopic(OutboxMessage message)
    {
        var sendToReporter = message.Type is "ReportEvidenceRequested" or "ReportDecisionFinalized" or "LocationMetadataCorrected";
        var sendToFeature = message.Type is "TemporaryAccessAdvisoryStarted" or "TemporaryAccessAdvisoryExpired";
        if (!sendToReporter && !sendToFeature) return null;

        using var payload = JsonDocument.Parse(message.PayloadJson);
        var root = payload.RootElement;
        if (sendToReporter && root.TryGetProperty("reporterId", out var reporterId))
            return $"accessmap-user-{reporterId.GetString()}";
        if (sendToFeature && root.TryGetProperty("featureId", out var featureId))
            return $"accessmap-feature-{featureId.GetString()}";
        return null;
    }
}
