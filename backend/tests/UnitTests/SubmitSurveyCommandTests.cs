using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;
using AccessMapVN.Domain.Entities;
using FluentAssertions;
using FluentValidation;
using Moq;

namespace AccessMapVN.UnitTests;

public class SubmitSurveyCommandTests
{
    private readonly Mock<IPlaceRepository> _mockPlaceRepo = new();
    private readonly Mock<ISubmissionRepository> _mockSubmissionRepo = new();

    [Fact]
    public async Task Validator_WithEmptyLocationOrMedia_FailsValidation()
    {
        var validator = new SubmitSurveyCommandValidator();
        var command = new SubmitSurveyCommand
        {
            LocationId = "",
            MediaUrls = new List<string>(),
            GpsLat = 10.772,
            GpsLng = 106.698,
        };

        var result = await validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SubmitSurveyCommand.LocationId));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SubmitSurveyCommand.MediaUrls));
    }

    [Fact]
    public async Task Handle_WhenGpsDistanceExceeds50Meters_ThrowsValidationException()
    {
        // Ben Thanh Market coordinates
        var placeLat = 10.7720;
        var placeLng = 106.6980;
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = placeLat,
            Lng = placeLng,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        // Submitting from coordinates ~200m away
        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            GpsLat = 10.7740,
            GpsLng = 106.6995,
        };

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*vượt quá ngưỡng cho phép 50m*");
    }

    [Fact]
    public async Task Handle_WhenGpsDistanceWithin50Meters_CreatesSubmissionAndAwardsPoints()
    {
        var placeLat = 10.7720;
        var placeLng = 106.6980;
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = placeLat,
            Lng = placeLng,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        // Submitting from coordinates ~10m away
        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            UserId = "user-123",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            FeatureTags = new List<string> { "exterior_ramp_present", "door_width_ok" },
            GpsLat = 10.77205,
            GpsLng = 106.69805,
            TextDescription = "Lối vào có ram dốc thoải, cửa tự động rộng 90cm",
        };

        var result = await handler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.SubmissionId.Should().StartWith("AMV-");
        result.Status.Should().Be("Submitted");
        result.PointsAwarded.Should().Be(50);

        _mockSubmissionRepo.Verify(r => r.AddAsync(It.Is<Submission>(s =>
            s.PlaceId == "ben-thanh" &&
            s.PointsAwarded == 50 &&
            s.UserId == "user-123"), It.IsAny<CancellationToken>()), Times.Once);

        _mockSubmissionRepo.Verify(r => r.AddPointTransactionAsync(It.Is<PointTransaction>(t =>
            t.Points == 50 &&
            t.UserId == "user-123"), It.IsAny<CancellationToken>()), Times.Once);

        _mockSubmissionRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        _mockPlaceRepo.Verify(r => r.UpdateAccessibilityFeaturesAsync(
            targetPlace.Id.ToString(),
            true,
            null,
            null,
            null,
            true,
            0.55m,
            It.Is<string>(note => note.Contains("Có ram dốc") && note.Contains("Cửa đạt chuẩn")),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
