namespace AccessMapVN.Domain.Enums;

public enum SubmissionStatus
{
    Submitted = 0,
    AIProcessing = 1,
    AwaitingMoreInfo = 2,
    PendingModeration = 3,
    Published = 5,
    Rejected = 6,
    Cancelled = 7
}
