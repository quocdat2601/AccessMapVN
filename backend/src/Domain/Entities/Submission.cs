using AccessMapVN.Domain.Common;
using AccessMapVN.Domain.Enums;

namespace AccessMapVN.Domain.Entities;

public class Submission : BaseEntity
{
    public string SubmissionCode { get; set; } = string.Empty;
    public string PlaceId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public List<string> MediaUrls { get; set; } = new();
    public List<string> FeatureTags { get; set; } = new();
    public double GpsLat { get; set; }
    public double GpsLng { get; set; }
    public double? AccuracyMeters { get; set; }
    public string? TextDescription { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public double ConfidenceScore { get; set; } = 0.88;
    // Points are awarded only when an authorized contribution publication succeeds.
    public int PointsAwarded { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
