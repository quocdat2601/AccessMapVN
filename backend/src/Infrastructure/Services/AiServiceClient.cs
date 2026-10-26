using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AccessMapVN.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace AccessMapVN.Infrastructure.Services;

public class AiServiceClient : IAiServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AiServiceClient> _logger;

    public AiServiceClient(HttpClient httpClient, ILogger<AiServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public Task<string?> VerifySubmissionRawAsync(
        Guid submissionId,
        List<string> mediaUrls,
        string? textDescription,
        CancellationToken cancellationToken = default)
        => VerifySubmissionRawAsync(submissionId, mediaUrls, textDescription, null, cancellationToken);

    public async Task<string?> VerifySubmissionRawAsync(
        Guid submissionId,
        List<string> mediaUrls,
        string? textDescription,
        string? locationId,
        CancellationToken cancellationToken = default)
    {
        if (mediaUrls == null || mediaUrls.Count == 0)
        {
            _logger.LogInformation("No media URLs provided for submission {SubmissionId}; skipping AI verification call.", submissionId);
            return null;
        }

        var requestPayload = new
        {
            submission_id = submissionId.ToString(),
            location_id = Guid.TryParse(locationId, out var g) ? g.ToString() : Guid.NewGuid().ToString(),
            media_urls = mediaUrls,
            text_description = textDescription,
        };

        try
        {
            _logger.LogInformation("Sending verification request to AI service for submission {SubmissionId} with {Count} media items.", submissionId, mediaUrls.Count);

            var response = await _httpClient.PostAsJsonAsync("/api/v1/ai/verify", requestPayload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("AI service verify failed for submission {SubmissionId} with status {StatusCode}: {Error}",
                    submissionId, response.StatusCode, errorBody);
                return null;
            }

            var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("AI service successfully verified submission {SubmissionId}.", submissionId);
            return jsonContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception calling AI service verify endpoint for submission {SubmissionId}.", submissionId);
            return null;
        }
    }
}
