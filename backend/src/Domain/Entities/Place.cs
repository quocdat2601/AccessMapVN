using AccessMapVN.Domain.Common;

namespace AccessMapVN.Domain.Entities;

public class Place : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public string? OpeningHours { get; set; }
    public double Lng { get; set; }
    public double Lat { get; set; }
    public int? FloorLevel { get; set; }
    public Guid? BuildingId { get; set; }
    public bool? HasRamp { get; set; }
    public bool? HasAccessibleElevator { get; set; }
    public bool? HasTactilePaving { get; set; }
    public bool? HasAccessibleRestroom { get; set; }
    public bool? DoorWidthOk { get; set; }
    public decimal? AccessibilityScore { get; set; }
    public string? AccessibilityNote { get; set; }
    public double? EntranceLat { get; set; }
    public double? EntranceLng { get; set; }
    public double? GeofenceRadiusMeters { get; set; }
    public DateTimeOffset? LastVerifiedAt { get; set; }
}
