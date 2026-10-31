using AccessMapVN.Application.Features.CommunityValidation;
using Hangfire;

namespace AccessMapVN.Infrastructure.Services;

public sealed class HangfireCommunityJobScheduler : ICommunityJobScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireCommunityJobScheduler(IBackgroundJobClient jobs)
    {
        _jobs = jobs;
    }

    public string? EnqueueEvaluation(Guid assessmentJobId) =>
        _jobs.Enqueue<CommunityEvaluationJob>(job => job.RunAsync(assessmentJobId, CancellationToken.None));
}

public sealed class NoOpCommunityJobScheduler : ICommunityJobScheduler
{
    public string? EnqueueEvaluation(Guid assessmentJobId) => null;
}

public sealed class CommunityEvaluationJob
{
    private readonly ICommunityValidationService _service;

    public CommunityEvaluationJob(ICommunityValidationService service)
    {
        _service = service;
    }

    [AutomaticRetry(Attempts = 0)]
    [Queue("community-validation")]
    public Task RunAsync(Guid assessmentJobId, CancellationToken cancellationToken) =>
        _service.EvaluateAsync(assessmentJobId, cancellationToken);
}
