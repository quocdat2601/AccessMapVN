using System.Text.Json.Serialization;
using MediatR;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public record SubmitSurveyCommand : IRequest<SubmitSurveyResult>
{
    [JsonPropertyName("location_id")]
    public string LocationId { get; init; } = string.Empty;

    // Server-populated from the validated JWT subject; never accepted from JSON.
    [JsonIgnore]
    public string? UserId { get; init; }

    [JsonPropertyName("media_urls")]
    public List<string> MediaUrls { get; init; } = new();

    [JsonPropertyName("feature_tags")]
    public List<string> FeatureTags { get; init; } = new();

    [JsonPropertyName("gps_lat")]
    public double GpsLat { get; init; }

    [JsonPropertyName("gps_lng")]
    public double GpsLng { get; init; }

    [JsonPropertyName("accuracy_meters")]
    public double? AccuracyMeters { get; init; }

    [JsonPropertyName("text_description")]
    public string? TextDescription { get; init; }

    [JsonPropertyName("confidence_score")]
    public double? ConfidenceScore { get; init; }
}
