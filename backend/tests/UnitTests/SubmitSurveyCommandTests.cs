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
    public async Task Handle_WhenGpsDistanceWithin50Meters_StoresDossierWithoutPublishingOrAwardingPoints()
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
        result.PointsAwarded.Should().Be(0);

        _mockSubmissionRepo.Verify(r => r.AddAsync(It.Is<Submission>(s =>
            s.PlaceId == "ben-thanh" &&
            s.PointsAwarded == 0 &&
            s.UserId == "user-123"), It.IsAny<CancellationToken>()), Times.Once);

        _mockSubmissionRepo.Verify(r => r.AddPointTransactionAsync(
            It.IsAny<PointTransaction>(), It.IsAny<CancellationToken>()), Times.Never);

        _mockSubmissionRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        _mockPlaceRepo.Verify(r => r.UpdateAccessibilityFeaturesAsync(
            It.IsAny<string>(),
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<decimal>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenConfidenceScoreUnder40Percent_ThrowsValidationException()
    {
        var place = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = 10.7720,
            Lng = 106.6980,
        };
        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(place);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            UserId = "user-123",
            MediaUrls = new List<string> { "https://example.com/blurry.jpg" },
            GpsLat = 10.7720,
            GpsLng = 106.6980,
            ConfidenceScore = 0.35, // Below 40% threshold
        };

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Chất lượng nhận diện yếu tố tiếp cận quá thấp*");
    }

    [Fact]
    public async Task Handle_WhenConfidenceScoreOver80PercentAndEligible_AutoVerifiesAndAwardsPoints()
    {
        var place = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = 10.7720,
            Lng = 106.6980,
            HasRamp = false,
        };
        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(place);

        // User already has 1 prior published contribution
        var priorSubmission = new Submission
        {
            SubmissionCode = "AMV-2026-11111",
            UserId = "user-vip",
            PlaceId = "other-place",
            Status = Domain.Enums.SubmissionStatus.Published,
        };
        _mockSubmissionRepo.Setup(r => r.GetByUserIdAsync("user-vip", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Submission> { priorSubmission });

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            UserId = "user-vip",
            MediaUrls = new List<string> { "https://example.com/clear_ramp.jpg" },
            FeatureTags = new List<string> { "exterior_ramp_present" },
            GpsLat = 10.7720,
            GpsLng = 106.6980,
            ConfidenceScore = 0.92, // Over 80%
            TextDescription = "Ram dốc chuẩn rộng 1.2m",
        };

        var result = await handler.Handle(command, CancellationToken.None);

        result.Status.Should().Be("AutoVerified");
        result.PointsAwarded.Should().Be(50);
        result.Message.Should().Contain("tự động xác minh");

        _mockSubmissionRepo.Verify(r => r.AddPointTransactionAsync(
            It.Is<PointTransaction>(pt => pt.Points == 50 && pt.UserId == "user-vip"),
            It.IsAny<CancellationToken>()), Times.Once);

        _mockPlaceRepo.Verify(r => r.UpdateAccessibilityFeaturesAsync(
            place.Id.ToString(),
            true, // hasRamp
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<bool?>(),
            It.IsAny<decimal?>(),
            "Ram dốc chuẩn rộng 1.2m",
            It.IsAny<CancellationToken>()), Times.Once);
    }
}

