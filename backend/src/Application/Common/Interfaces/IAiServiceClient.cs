namespace AccessMapVN.Application.Common.Interfaces;

public interface IAiServiceClient
{
    /// <summary>
    /// Calls the AI Service /api/v1/ai/verify endpoint and returns the raw JSON string.
    /// Returns null if the call fails or times out.
    /// </summary>
    Task<string?> VerifySubmissionRawAsync(
        Guid submissionId,
        List<string> mediaUrls,
        string? textDescription,
        CancellationToken cancellationToken = default);
}
