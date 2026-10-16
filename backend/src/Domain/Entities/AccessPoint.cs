using AccessMapVN.Domain.Common;

namespace AccessMapVN.Domain.Entities;

public class AccessPoint : BaseEntity
{
    public Guid PlaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string LocationSource { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
