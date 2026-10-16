using AccessMapVN.Domain.Common;

namespace AccessMapVN.Domain.Entities;

public class MeasurementObservation : BaseEntity
{
    public Guid AccessPointId { get; set; }
    public string FeatureName { get; set; } = string.Empty;
    public Guid ContributorId { get; set; }
    public decimal ReportedValue { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string? EvidenceMediaUrlsJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
