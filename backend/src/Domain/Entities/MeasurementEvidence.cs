using AccessMapVN.Domain.Common;

namespace AccessMapVN.Domain.Entities;

public class MeasurementEvidence : BaseEntity
{
    public Guid ObservationId { get; set; }
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaKind { get; set; } = "photo";
    public string PrivacyStatus { get; set; } = "pending_review";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
