namespace AccessMapVN.Application.Common.Interfaces;

public interface ISubmissionJobScheduler
{
    /// <summary>
    /// Enqueues an asynchronous background job to verify a newly created submission with AI.
    /// </summary>
    string? EnqueueVerification(Guid submissionId);
}
