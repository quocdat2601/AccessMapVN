using System.Diagnostics.Metrics;

namespace AccessMapVN.Infrastructure.Services;

/// <summary>
/// Low-cardinality WF-02 operational metrics. Exporters can subscribe to the
/// AccessMapVN.Wf02 meter through the deployment's OpenTelemetry configuration.
/// </summary>
public static class Wf02Metrics
{
    private static readonly Meter Meter = new("AccessMapVN.Wf02", "1.0.0");

    public static readonly Counter<long> VotesRecorded =
        Meter.CreateCounter<long>("wf02.votes.recorded", unit: "{vote}");

    public static readonly Counter<long> VotesPendingValidation =
        Meter.CreateCounter<long>("wf02.votes.pending_validation", unit: "{vote}");

    public static readonly Counter<long> AssessmentsCompleted =
        Meter.CreateCounter<long>("wf02.assessments.completed", unit: "{assessment}");

    public static readonly Counter<long> AssessmentFailures =
        Meter.CreateCounter<long>("wf02.assessments.failures", unit: "{failure}");

    public static readonly Counter<long> DisputesOpened =
        Meter.CreateCounter<long>("wf02.disputes.opened", unit: "{case}");

    public static readonly Histogram<double> DisputeAgeHours =
        Meter.CreateHistogram<double>("wf02.disputes.age", unit: "h");

    public static readonly Counter<long> StaleFeaturesObserved =
        Meter.CreateCounter<long>("wf02.features.stale", unit: "{feature}");

    public static readonly Histogram<double> OutboxLagSeconds =
        Meter.CreateHistogram<double>("wf02.outbox.lag", unit: "s");

    public static readonly Counter<long> OutboxFailures =
        Meter.CreateCounter<long>("wf02.outbox.failures", unit: "{failure}");

    public static readonly Counter<long> IdempotencyConflicts =
        Meter.CreateCounter<long>("wf02.idempotency.conflicts", unit: "{conflict}");
}
