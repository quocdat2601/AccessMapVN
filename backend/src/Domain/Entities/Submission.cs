using AccessMapVN.Domain.Common;
using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Domain.Entities;

public class Submission : BaseEntity
{
    public string SubmissionCode { get; set; } = string.Empty;
    public string ClientSubmissionId { get; set; } = string.Empty;
    public string PayloadHash { get; set; } = string.Empty;
    public string PlaceId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public List<string> MediaUrls { get; set; } = new();
    public List<string> FeatureTags { get; set; } = new();
    public string? MeasurementsJson { get; set; }
    public string? ClientObservationsJson { get; set; }
    public string? AiObservationsJson { get; set; }
    public double GpsLat { get; set; }
    public double GpsLng { get; set; }
    public double? AccuracyMeters { get; set; }
    public double? DistanceMeters { get; set; }
    public double? EffectiveDistanceMeters { get; set; }
    public string? GeofencePolicy { get; set; }
    public double? AllowedRadiusMeters { get; set; }
    public bool? IsMocked { get; set; }
    public string? TextDescription { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.PendingModeration;
    public string ExpStatus { get; set; } = "pending_review";
    public double ConfidenceScore { get; set; } = 0.88;
    public int PointsAwarded { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
