using AccessMapVN.Domain.Entities;
using AccessMapVN.WebApi.Controllers;
using FluentAssertions;
using Xunit;

namespace AccessMapVN.UnitTests;

public class AccessibilityPublicationPolicyTests
{
    [Fact]
    public void TC1_PresenceOfDoor_WithoutMeasurements_DoesNotCreateDoorWidthComplianceConclusion()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm A", DoorWidthOk = null };
        var submission = new Submission
        {
            FeatureTags = new List<string> { "door_detected" },
            MeasurementsJson = null,
            ConfidenceScore = 0.85
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.DoorWidthOk.Should().BeNull("sự hiện diện của cửa không được tự động suy diễn thành cửa đạt chuẩn");
    }

    [Fact]
    public void TC2_BuildingEntranceDoor_Under900mm_IsMarkedNonCompliant()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm B", DoorWidthOk = null };
        var measurementsJson = "{\"door_clear_width\":{\"status\":\"provided\",\"value_mm\":850}}";
        var submission = new Submission
        {
            FeatureTags = new List<string> { "door_detected" },
            MeasurementsJson = measurementsJson,
            ConfidenceScore = 0.90
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.DoorWidthOk.Should().Be(false, "chiều rộng 850mm dưới ngưỡng 900mm theo QCVN 10:2024 mục 2.3.1");
    }

    [Fact]
    public void TC3_BuildingEntranceDoor_AtLeast900mm_IsMarkedCompliant()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm C", DoorWidthOk = null };
        var measurementsJson = "{\"door_clear_width\":{\"status\":\"provided\",\"value_mm\":900}}";
        var submission = new Submission
        {
            FeatureTags = new List<string> { "door_detected" },
            MeasurementsJson = measurementsJson,
            ConfidenceScore = 0.90
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.DoorWidthOk.Should().Be(true, "chiều rộng 900mm đáp ứng ngưỡng QCVN 10:2024 mục 2.3.1");
    }

    [Fact]
    public void TC4_NewSubmissionWithoutMeasurements_PreservesPreviouslyVerifiedDoorWidth()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm D", DoorWidthOk = true };
        var submission = new Submission
        {
            FeatureTags = new List<string> { "door_detected" },
            MeasurementsJson = null, // Không có số đo mới
            ConfidenceScore = 0.85
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.DoorWidthOk.Should().Be(true, "submission mới không đo không được xóa hay ghi đè kết quả đo đã duyệt trước đó");
    }

    [Fact]
    public void TC5_SingleTagDoorDetected_DoesNotTurnOnDoorWidthOk()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm E", DoorWidthOk = null };
        var submission = new Submission
        {
            FeatureTags = new List<string> { "door_detected" },
            MeasurementsJson = null
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.DoorWidthOk.Should().BeNull();
    }

    [Fact]
    public void TC6_RestroomGrabBarsAlone_DoesNotMarkEntireRestroomAsAccessible()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm F", HasAccessibleRestroom = null };
        var submission = new Submission
        {
            FeatureTags = new List<string> { "restroom_grab_bars" },
            MeasurementsJson = null
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.HasAccessibleRestroom.Should().BeNull("chỉ có tay vịn không đủ để kết luận toàn bộ WC tiếp cận cho xe lăn");
    }

    [Fact]
    public void TC7_RampSlope_ComparedWithExactRatio_DoesNotRelyOnRoughRounding()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm G", HasRamp = null };
        // H = 10cm, L = 150cm => 1/15 <= 1/12
        var measurementsJson = "{\"ramp_slope\":{\"status\":\"provided\",\"height_cm\":10,\"length_cm\":150}}";
        var submission = new Submission
        {
            FeatureTags = new List<string> { "exterior_ramp_present" },
            MeasurementsJson = measurementsJson
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.HasRamp.Should().Be(true);
    }

    [Fact]
    public void TC8_AccessibleRestroomExplicitClaim_MarksRestroomAccessible()
    {
        var place = new Place { Id = Guid.NewGuid(), Name = "Địa điểm H", HasAccessibleRestroom = null };
        var submission = new Submission
        {
            FeatureTags = new List<string> { "accessible_restroom" },
            MeasurementsJson = null
        };

        AdminSubmissionsController.ApplyPublicationCriteria(place, submission, DateTimeOffset.UtcNow);

        place.HasAccessibleRestroom.Should().Be(true);
    }
}
