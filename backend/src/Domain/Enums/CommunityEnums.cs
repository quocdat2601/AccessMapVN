namespace AccessMapVN.Domain.Enums;

public enum AppUserRole
{
    User = 1,
    Moderator = 2,
    Admin = 3,
}

public enum LocationStatus
{
    Active = 1,
    Provisional = 2,
    Merged = 3,
    Archived = 4,
}

public enum AccessibilityFeatureType
{
    Ramp = 1,
    EntranceDoor = 2,
    Elevator = 3,
    AccessibleRestroom = 4,
    TactilePaving = 5,
}

public enum PublishedFeatureStatus
{
    Available = 1,
    Limited = 2,
    NotAvailable = 3,
    Unknown = 4,
}

public enum CommunityVoteType
{
    StillAccurate = 1,
    Changed = 2,
}

public enum CommunityVoteStatus
{
    Recorded = 1,
    PendingValidation = 2,
    Eligible = 3,
    Rejected = 4,
    Superseded = 5,
    Archived = 6,
}

public enum FeatureCommunityLabel
{
    Uncorroborated = 1,
    Fresh = 2,
    Reinforced = 3,
    NeedsRecheck = 4,
    ConflictReported = 5,
    CommunityUnderReview = 6,
}

public enum DisputeStatus
{
    Open = 1,
    UnderReview = 2,
    AwaitingMoreInfo = 3,
    CorrectionPending = 4,
    ResolvedBaseline = 5,
    ResolvedUpdated = 6,
}

public enum DisputeDecisionType
{
    RequestEvidence = 1,
    RetainBaseline = 2,
    LinkCorrection = 3,
    RecordPublication = 4,
    CreateAdvisory = 5,
}

public enum AdvisoryStatus
{
    Scheduled = 1,
    Active = 2,
    Expired = 3,
    Revoked = 4,
}

public enum AssessmentJobStatus
{
    Queued = 1,
    Processing = 2,
    RetryScheduled = 3,
    Completed = 4,
    Failed = 5,
}

public enum InaccurateReportStatus
{
    Submitted = 1,
    UnderReview = 2,
    AwaitingMoreInfo = 3,
    LinkedToDispute = 4,
    Resolved = 5,
    Rejected = 6,
}

public enum InaccurateReportReason
{
    IncorrectFeature = 1,
    MissingFeature = 2,
    OutdatedInformation = 3,
    Other = 4,
    WrongAddressOrPin = 5,
}

public enum InaccurateReportResolution
{
    BaselineRetained = 1,
    AdvisoryCreated = 2,
    CorrectionPublished = 3,
    MetadataCorrected = 4,
}

public enum AdminReportDecision
{
    StartReview = 1,
    RequestEvidence = 2,
    LinkDispute = 3,
    Resolve = 4,
    Reject = 5,
}

public enum CommunityCommentStatus
{
    PendingReview = 1,
    Approved = 2,
    Hidden = 3,
    Rejected = 4,
}

public enum CommentModerationDecision
{
    Approve = 1,
    Hide = 2,
}

public enum SubmissionClaimStatus
{
    Submitted = 1,
    Verified = 2,
    Rejected = 3,
    Published = 4,
}

public enum OwnedMediaStatus
{
    Staged = 1,
    Ready = 2,
    Consumed = 3,
    Rejected = 4,
    Expired = 5,
}

public enum UploadIntentStatus
{
    Issued = 1,
    Uploaded = 2,
    Consumed = 3,
    Expired = 4,
    Revoked = 5,
}
