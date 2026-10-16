using AccessMapVN.Domain.Common;

namespace AccessMapVN.Domain.Entities;

public class PlaceMeasurement : BaseEntity
{
    public Guid AccessPointId { get; set; }
    public string FeatureName { get; set; } = string.Empty;
    public decimal? ConsensusValue { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string Status { get; set; } = "single_source";
    public int DistinctContributorsCount { get; set; } = 0;
    public Guid? LatestObservationId { get; set; }
    public DateTimeOffset? LastVerifiedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
