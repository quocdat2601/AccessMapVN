using System.Text.Json;
using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Domain.Enums;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace AccessMapVN.Infrastructure.Services;

public sealed class HangfireSubmissionJobScheduler : ISubmissionJobScheduler
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireSubmissionJobScheduler(IBackgroundJobClient jobs)
    {
        _jobs = jobs;
    }

    public string? EnqueueVerification(Guid submissionId) =>
        _jobs.Enqueue<SubmissionVerificationJob>(job => job.RunAsync(submissionId, CancellationToken.None));
}

public sealed class NoOpSubmissionJobScheduler : ISubmissionJobScheduler
{
    public string? EnqueueVerification(Guid submissionId) => null;
}

public sealed class SubmissionVerificationJob
{
    private readonly ISubmissionRepository _submissionRepository;
    private readonly IAiServiceClient _aiClient;
    private readonly ILogger<SubmissionVerificationJob> _logger;

    public SubmissionVerificationJob(
        ISubmissionRepository submissionRepository,
        IAiServiceClient aiClient,
        ILogger<SubmissionVerificationJob> logger)
    {
        _submissionRepository = submissionRepository;
        _aiClient = aiClient;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 2)]
    [Queue("default")]
    public async Task RunAsync(Guid submissionId, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting Hangfire AI verification job for submission {SubmissionId}", submissionId);

        var submission = await _submissionRepository.GetByIdAsync(submissionId, cancellationToken);
        if (submission == null)
        {
            _logger.LogWarning("Submission {SubmissionId} not found in database for AI verification.", submissionId);
            return;
        }

        var json = await _aiClient.VerifySubmissionRawAsync(submission.Id, submission.MediaUrls, submission.TextDescription, cancellationToken);
        if (string.IsNullOrWhiteSpace(json))
        {
            _logger.LogWarning("AI verification returned empty result for submission {SubmissionId}.", submissionId);
            return;
        }

        submission.AiObservationsJson = json;

        // Extract overall confidence score if present
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("overall_confidence_score", out var scoreProp) && scoreProp.TryGetDouble(out var score))
            {
                submission.ConfidenceScore = score;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse overall_confidence_score from AI response for submission {SubmissionId}.", submissionId);
        }

        // Status remains PendingModeration per business policy
        submission.Status = SubmissionStatus.PendingModeration;

        await _submissionRepository.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("AI verification job completed and persisted for submission {SubmissionId}.", submissionId);
    }
}
