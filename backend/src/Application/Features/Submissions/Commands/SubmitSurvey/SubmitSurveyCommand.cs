using System.Text.Json.Serialization;
using MediatR;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public class SubmissionConflictException : Exception
{
    public SubmissionConflictException(string message) : base(message) { }
}

public record MeasurementItemDto
{
    [JsonPropertyName("status")]
    public string Status { get; init; } = "not_measured"; // "provided" | "not_measured"

    [JsonPropertyName("value_mm")]
    public double? ValueMm { get; init; }

    [JsonPropertyName("height_cm")]
    public double? HeightCm { get; init; }

    [JsonPropertyName("length_cm")]
    public double? LengthCm { get; init; }

    [JsonPropertyName("method")]
    public string? Method { get; init; } // "tape_measure" | "ar_kit" | "visual_estimate"
}

public record UserMeasurementsDto
{
    [JsonPropertyName("door_clear_width")]
    public MeasurementItemDto? DoorClearWidth { get; init; }

    [JsonPropertyName("ramp_slope")]
    public MeasurementItemDto? RampSlope { get; init; }
}

public record SubmitSurveyCommand : IRequest<SubmitSurveyResult>
{
    [JsonPropertyName("client_submission_id")]
    public string ClientSubmissionId { get; init; } = string.Empty;

    [JsonPropertyName("location_id")]
    public string LocationId { get; init; } = string.Empty;

    /// <summary>
    /// Untrusted when sent from client. Backend resolves identity from authenticated JWT token.
    /// </summary>
    [JsonPropertyName("user_id")]
    public string? UserId { get; init; }

    [JsonIgnore]
    public string? AuthenticatedUserId { get; set; }

    [JsonPropertyName("media_urls")]
    public List<string> MediaUrls { get; init; } = new();

    /// <summary>
    /// Client-selected observations/tags for UX convenience. Marked as unverified client data.
    /// </summary>
    [JsonPropertyName("client_observations")]
    public List<string> ClientObservations { get; init; } = new();

    /// <summary>
    /// Legacy alias for client_observations.
    /// </summary>
    [JsonPropertyName("feature_tags")]
    public List<string> FeatureTags { get; init; } = new();

    [JsonPropertyName("measurements")]
    public UserMeasurementsDto? Measurements { get; init; }

    [JsonPropertyName("gps_lat")]
    public double GpsLat { get; init; }

    [JsonPropertyName("gps_lng")]
    public double GpsLng { get; init; }

    [JsonPropertyName("accuracy_meters")]
    public double? AccuracyMeters { get; init; }

    [JsonPropertyName("text_description")]
    public string? TextDescription { get; init; }

    [JsonPropertyName("is_mocked")]
    public bool? IsMocked { get; init; }

    [JsonPropertyName("client_timestamp")]
    public long? ClientTimestamp { get; init; }

    /// <summary>
    /// Legacy client-calculated confidence; not used for authoritative scoring.
    /// </summary>
    [JsonPropertyName("confidence_score")]
    public double? ConfidenceScore { get; init; }
}
