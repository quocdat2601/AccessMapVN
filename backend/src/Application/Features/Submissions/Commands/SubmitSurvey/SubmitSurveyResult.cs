using System.Text.Json.Serialization;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public record SubmitSurveyResult
{
    [JsonPropertyName("submission_id")]
    public string SubmissionId { get; init; } = string.Empty;

    [JsonPropertyName("client_submission_id")]
    public string ClientSubmissionId { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; init; } = "PendingModeration";

    [JsonPropertyName("exp_status")]
    public string ExpStatus { get; init; } = "pending_review";

    [JsonPropertyName("points_awarded")]
    public int PointsAwarded { get; init; } = 0;

    [JsonPropertyName("message")]
    public string Message { get; init; } = "EXP sẽ được tính sau khi khảo sát được duyệt.";

    [JsonPropertyName("created_at")]
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
