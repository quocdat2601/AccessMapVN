using System.Text.Json.Serialization;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public record SubmitSurveyResult
{
    [JsonPropertyName("submission_id")]
    public string SubmissionId { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;

    [JsonPropertyName("points_awarded")]
    public int PointsAwarded { get; init; } = 50;

    [JsonPropertyName("created_at")]
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
