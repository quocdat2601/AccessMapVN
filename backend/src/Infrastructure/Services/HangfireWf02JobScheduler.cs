using AccessMapVN.Application.Features.Wf02;
using Hangfire;

namespace AccessMapVN.Infrastructure.Services;

public sealed class HangfireWf02JobScheduler : IWf02JobScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireWf02JobScheduler(IBackgroundJobClient jobs)
    {
        _jobs = jobs;
    }

    public string? EnqueueEvaluation(Guid assessmentJobId) =>
        _jobs.Enqueue<Wf02EvaluationJob>(job => job.RunAsync(assessmentJobId, CancellationToken.None));
}

public sealed class NoOpWf02JobScheduler : IWf02JobScheduler
{
    public string? EnqueueEvaluation(Guid assessmentJobId) => null;
}

public sealed class Wf02EvaluationJob
{
    private readonly IWf02CommunityService _service;

    public Wf02EvaluationJob(IWf02CommunityService service)
    {
        _service = service;
    }

    [AutomaticRetry(Attempts = 0)]
    [Queue("wf02-community")]
    public Task RunAsync(Guid assessmentJobId, CancellationToken cancellationToken) =>
        _service.EvaluateAsync(assessmentJobId, cancellationToken);
}
