using AccessMapVN.Domain.Common;

namespace AccessMapVN.Domain.Entities;

public class PointTransaction : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string SubmissionId { get; set; } = string.Empty;
    public int Points { get; set; } = 50;
    public string Reason { get; set; } = "Thẩm định đóng góp tiếp cận";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
