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
        _jobs.Enqueue<Wf02EvaluationJob>(job => job.RunAsync(assessmentJobId, CancellationToken.None));
}

public sealed class NoOpCommunityJobScheduler : ICommunityJobScheduler
{
    public string? EnqueueEvaluation(Guid assessmentJobId) => null;
}

public sealed class Wf02EvaluationJob
{
    private readonly ICommunityValidationService _service;

    public Wf02EvaluationJob(ICommunityValidationService service)
    {
        _service = service;
    }

    [AutomaticRetry(Attempts = 0)]
    [Queue("wf02-community")]
    public Task RunAsync(Guid assessmentJobId, CancellationToken cancellationToken) =>
        _service.EvaluateAsync(assessmentJobId, cancellationToken);
}
