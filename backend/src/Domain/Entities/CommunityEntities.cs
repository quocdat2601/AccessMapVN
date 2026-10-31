using AccessMapVN.Domain.Common;
using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Domain.Entities;

// Local authorization/reputation projection keyed by the authoritative Supabase `sub` UUID.
// Credentials and sessions remain owned by Supabase Auth.
public class AppUser : BaseEntity
{
    public string? DisplayName { get; set; }
    public AppUserRole Role { get; set; } = AppUserRole.User;
    public bool IsActive { get; set; } = true;
    public decimal ReputationScore { get; set; }
    public string ReputationTier { get; set; } = "Baseline";
    public string ReputationPolicyVersion { get; set; } = "community-provisional-v1";
}

public class AccessScope : BaseEntity
{
    public Guid LocationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ScopeType { get; set; } = "PrimaryEntrance";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsActive { get; set; } = true;
    public int Version { get; set; } = 1;
}

public class SubmissionClaim : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Guid LocationId { get; set; }
    public Guid? ScopeId { get; set; }
    public AccessibilityFeatureType FeatureType { get; set; }
    public PublishedFeatureStatus ProposedStatus { get; set; }
    public SubmissionClaimStatus Status { get; set; } = SubmissionClaimStatus.Submitted;
    public decimal? AiConfidence { get; set; }
    public decimal? CommunityConfidence { get; set; }
    public decimal? FinalConfidence { get; set; }
}

public class OwnedMedia : BaseEntity
{
    public Guid OwnerId { get; set; }
    public Guid LocationId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = string.Empty;
    public OwnedMediaStatus Status { get; set; } = OwnedMediaStatus.Staged;
    public DateTimeOffset? ExpiresAt { get; set; }
}

public class UploadIntent : BaseEntity
{
    public Guid OwnerId { get; set; }
    public Guid LocationId { get; set; }
    public Guid OwnedMediaId { get; set; }
    public UploadIntentStatus Status { get; set; } = UploadIntentStatus.Issued;
    public string UploadTokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConsumedAt { get; set; }
}

public class LocationFeature : BaseEntity
{
    public Guid LocationId { get; set; }
    public Guid? ScopeId { get; set; }
    public AccessibilityFeatureType FeatureType { get; set; }
    public PublishedFeatureStatus CurrentStatus { get; set; }
    public int Version { get; set; } = 1;
    public Guid? SourceSubmissionId { get; set; }
    public DateTimeOffset VerifiedAt { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class LocationFeatureHistory : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public int FeatureVersion { get; set; }
    public PublishedFeatureStatus Status { get; set; }
    public Guid? SourceSubmissionId { get; set; }
    public Guid? PublishedById { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset EffectiveAt { get; set; }
}

public class CommunityVote : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public Guid VoterId { get; set; }
    public int ObservedFeatureVersion { get; set; }
    public CommunityVoteType VoteType { get; set; }
    public PublishedFeatureStatus? ProposedStatus { get; set; }
    public string? Comment { get; set; }
    public CommunityVoteStatus Status { get; set; } = CommunityVoteStatus.Recorded;
    public Guid? EvidenceSubmissionId { get; set; }
    public Guid? SupersededByVoteId { get; set; }
    public decimal? ReputationScoreSnapshot { get; set; }
    public string? ReputationTierSnapshot { get; set; }
    public decimal? TierFactorSnapshot { get; set; }
    public string? EligibilityReason { get; set; }
    public string PolicyVersion { get; set; } = string.Empty;
}

public class CommunityVoteStatusHistory : BaseEntity
{
    public Guid CommunityVoteId { get; set; }
    public CommunityVoteStatus? FromStatus { get; set; }
    public CommunityVoteStatus ToStatus { get; set; }
    public Guid? ActorId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset OccurredAt { get; set; }
}

public class FeatureCommunityState : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public int FeatureVersion { get; set; }
    public FeatureCommunityLabel Label { get; set; } = FeatureCommunityLabel.Uncorroborated;
    public decimal? WeightedAgreement { get; set; }
    public int EligibleVoterCount { get; set; }
    public int ContradictingVoterCount { get; set; }
    public DateTimeOffset? LastTrustedReconfirmedAt { get; set; }
    public decimal FreshnessFactor { get; set; } = 1m;
    public Guid? ActiveDisputeCaseId { get; set; }
    public DateTimeOffset ComputedAt { get; set; }
    public string PolicyVersion { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
}

public class CommunityAssessment : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public int FeatureVersion { get; set; }
    public DateTimeOffset AsOfAt { get; set; }
    public decimal? WeightedAgreement { get; set; }
    public int EligibleVoterCount { get; set; }
    public int ContradictingVoterCount { get; set; }
    public FeatureCommunityLabel ResultLabel { get; set; }
    public decimal FreshnessFactor { get; set; }
    public string PolicyVersion { get; set; } = string.Empty;
    public string DecisionSnapshotJson { get; set; } = "{}";
}

public class FeatureAssessmentJob : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public int FeatureVersion { get; set; }
    public AssessmentJobStatus Status { get; set; } = AssessmentJobStatus.Queued;
    public int Revision { get; set; } = 1;
    public int Attempts { get; set; }
    public DateTimeOffset? LeaseExpiresAt { get; set; }
    public DateTimeOffset? NextAttemptAt { get; set; }
    public DateTimeOffset? AsOfAt { get; set; }
    public string? LastErrorCategory { get; set; }
    public string? LastErrorMessage { get; set; }
}

public class DisputeCase : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public int FeatureVersion { get; set; }
    public DisputeStatus Status { get; set; } = DisputeStatus.Open;
    public string OpenReason { get; set; } = string.Empty;
    public DateTimeOffset OpenedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public Guid? CorrectionSubmissionId { get; set; }
    public int Version { get; set; } = 1;
    public uint RowVersion { get; set; }
}

public class DisputeCaseVote : BaseEntity
{
    public Guid DisputeCaseId { get; set; }
    public Guid CommunityVoteId { get; set; }
}

public class DisputeDecision : BaseEntity
{
    public Guid DisputeCaseId { get; set; }
    public DisputeDecisionType DecisionType { get; set; }
    public Guid ModeratorId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public Guid? CorrectionSubmissionId { get; set; }
    public Guid? AdvisoryId { get; set; }
    public DateTimeOffset DecidedAt { get; set; }
    public int CaseVersion { get; set; }
}

public class TemporaryAccessAdvisory : BaseEntity
{
    public Guid LocationFeatureId { get; set; }
    public Guid? DisputeCaseId { get; set; }
    public AdvisoryStatus Status { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public Guid CreatedById { get; set; }
    public Guid? RevokedById { get; set; }
    public string? RevocationReason { get; set; }
    public int Version { get; set; } = 1;
}

public class InaccurateInformationReport : BaseEntity
{
    public Guid LocationId { get; set; }
    public Guid ReporterId { get; set; }
    public Guid? ScopeId { get; set; }
    public AccessibilityFeatureType? FeatureType { get; set; }
    public int? ObservedFeatureVersion { get; set; }
    public InaccurateReportReason Reason { get; set; }
    public string Description { get; set; } = string.Empty;
    public InaccurateReportStatus Status { get; set; } = InaccurateReportStatus.Submitted;
    public bool IsStaleBaseline { get; set; }
    public string? ProposedAddress { get; set; }
    public double? ProposedLatitude { get; set; }
    public double? ProposedLongitude { get; set; }
    public Guid? LinkedDisputeCaseId { get; set; }
    public Guid? LinkedSubmissionId { get; set; }
    public InaccurateReportResolution? Resolution { get; set; }
    public string? PublicResolutionNote { get; set; }
    public string? ReporterActionNote { get; set; }
    public int Version { get; set; } = 1;
    public uint RowVersion { get; set; }
}

public class ReportStatusHistory : BaseEntity
{
    public Guid ReportId { get; set; }
    public InaccurateReportStatus? FromStatus { get; set; }
    public InaccurateReportStatus ToStatus { get; set; }
    public Guid ActorId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Outcome { get; set; }
    public string? PublicNote { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
}

public class ReportEvidence : BaseEntity
{
    public Guid ReportId { get; set; }
    public Guid AddedByReporterId { get; set; }
    public string? Description { get; set; }
    public Guid? OwnedMediaId { get; set; }
    public int SourceVersion { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
}

public class LocationMetadataHistory : BaseEntity
{
    public Guid LocationId { get; set; }
    public int MetadataVersion { get; set; }
    public Guid? SourceReportId { get; set; }
    public Guid ChangedById { get; set; }
    public string BeforeJson { get; set; } = "{}";
    public string AfterJson { get; set; } = "{}";
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset EffectiveAt { get; set; }
}

public class CommunityComment : BaseEntity
{
    public Guid LocationId { get; set; }
    public Guid? ScopeId { get; set; }
    public Guid AuthorId { get; set; }
    public string Body { get; set; } = string.Empty;
    public CommunityCommentStatus Status { get; set; } = CommunityCommentStatus.PendingReview;
    public Guid? ModeratedById { get; set; }
    public DateTimeOffset? ModeratedAt { get; set; }
    public string? ModerationReason { get; set; }
    public int Version { get; set; } = 1;
    public uint RowVersion { get; set; }
}

public class CommunityCommentStatusHistory : BaseEntity
{
    public Guid CommunityCommentId { get; set; }
    public CommunityCommentStatus? FromStatus { get; set; }
    public CommunityCommentStatus ToStatus { get; set; }
    public Guid ActorId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset OccurredAt { get; set; }
}

public class IdempotencyRecord : BaseEntity
{
    public Guid ActorId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public int ResponseStatusCode { get; set; }
    public string ResponseBody { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
}

public class OutboxMessage : BaseEntity
{
    public string Type { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
}
