namespace AccessMapVN.Application.Common.Options;

public sealed class Wf02Options
{
    public const string SectionName = "Wf02";

    public string PolicyVersion { get; set; } = "wf02-v1";
    public RecencyOptions Recency { get; set; } = new();
    public FreshnessOptions Freshness { get; set; } = new();
    public ConsensusOptions Consensus { get; set; } = new();
    public AdvisoryOptions Advisory { get; set; } = new();
    public JobOptions Jobs { get; set; } = new();
    public VoteOptions Votes { get; set; } = new();
    public ReputationOptions Reputation { get; set; } = new();
    public FeatureFlagOptions FeatureFlags { get; set; } = new();

    public bool IsValid() =>
        !string.IsNullOrWhiteSpace(PolicyVersion) &&
        Recency.RecentWindowDays > 0 &&
        Recency.HalfLifeDays > 0 &&
        Freshness.RecheckAfterDays > 0 &&
        Freshness.FactorHalfLifeAfterRecheckDays > 0 &&
        Freshness.BatchSize is > 0 and <= 10_000 &&
        Consensus.MinIndependentVotersForReview > 0 &&
        Consensus.MaxReputationWeight > 0 &&
        Consensus.CrowdMinAgreement is >= 0 and <= 1 &&
        Advisory.MaxDurationDays > 0 &&
        Jobs.MaxAttempts > 0 &&
        Jobs.LeaseSeconds > 0 &&
        Votes.MaxCommentLength is > 0 and <= 10_000 &&
        Votes.IdempotencyTtlHours > 0 &&
        Reputation.VoteHoldThreshold >= 0 &&
        Reputation.DefaultReputationScore >= 0;

    public sealed class RecencyOptions
    {
        public int RecentWindowDays { get; set; } = 30;
        public int HalfLifeDays { get; set; } = 180;
    }

    public sealed class FreshnessOptions
    {
        public int RecheckAfterDays { get; set; } = 90;
        public int FactorHalfLifeAfterRecheckDays { get; set; } = 180;
        public int BatchSize { get; set; } = 500;
        public string Cron { get; set; } = "0 2 * * *";
    }

    public sealed class ConsensusOptions
    {
        public int MinIndependentVotersForReview { get; set; } = 2;
        public decimal MaxReputationWeight { get; set; } = 100m;
        public bool CrowdAutoResolveEnabled { get; set; }
        public int CrowdMinHighTierVoters { get; set; } = 3;
        public decimal CrowdMinAgreement { get; set; } = 0.90m;
    }

    public sealed class AdvisoryOptions
    {
        public int MaxDurationDays { get; set; } = 60;
    }

    public sealed class JobOptions
    {
        public int MaxAttempts { get; set; } = 3;
        public int LeaseSeconds { get; set; } = 300;
        public string ReconciliationCron { get; set; } = "* * * * *";
        public string Queue { get; set; } = "wf02-community";
    }

    public sealed class VoteOptions
    {
        public int MaxCommentLength { get; set; } = 1500;
        public int IdempotencyTtlHours { get; set; } = 24;
    }

    public sealed class ReputationOptions
    {
        public decimal DefaultReputationScore { get; set; }
        public decimal VoteHoldThreshold { get; set; }
        public string PolicyVersion { get; set; } = "wf02-provisional-v1";
    }

    public sealed class FeatureFlagOptions
    {
        public bool ReadModel { get; set; } = true;
        public bool Vote { get; set; } = true;
        public bool Report { get; set; } = true;
        public bool Moderation { get; set; } = true;
        public bool Comments { get; set; } = true;
    }
}
