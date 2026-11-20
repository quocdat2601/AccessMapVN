using System.Diagnostics.Metrics;

namespace AccessMapVN.Infrastructure.Services;

/// <summary>
/// Low-cardinality community operational metrics. Exporters can subscribe to the
/// AccessMapVN.Community meter through the deployment's OpenTelemetry configuration.
/// </summary>
public static class CommunityMetrics
{
    private static readonly Meter Meter = new("AccessMapVN.Community", "1.0.0");

    public static readonly Counter<long> VotesRecorded =
        Meter.CreateCounter<long>("community.votes.recorded", unit: "{vote}");

    public static readonly Counter<long> VotesPendingValidation =
        Meter.CreateCounter<long>("community.votes.pending_validation", unit: "{vote}");

    public static readonly Counter<long> AssessmentsCompleted =
        Meter.CreateCounter<long>("community.assessments.completed", unit: "{assessment}");

    public static readonly Counter<long> AssessmentFailures =
        Meter.CreateCounter<long>("community.assessments.failures", unit: "{failure}");

    public static readonly Counter<long> DisputesOpened =
        Meter.CreateCounter<long>("community.disputes.opened", unit: "{case}");

    public static readonly Histogram<double> DisputeAgeHours =
        Meter.CreateHistogram<double>("community.disputes.age", unit: "h");

    public static readonly Counter<long> StaleFeaturesObserved =
        Meter.CreateCounter<long>("community.features.stale", unit: "{feature}");

    public static readonly Histogram<double> OutboxLagSeconds =
        Meter.CreateHistogram<double>("community.outbox.lag", unit: "s");

    public static readonly Counter<long> OutboxFailures =
        Meter.CreateCounter<long>("community.outbox.failures", unit: "{failure}");

    public static readonly Counter<long> IdempotencyConflicts =
        Meter.CreateCounter<long>("community.idempotency.conflicts", unit: "{conflict}");
}
