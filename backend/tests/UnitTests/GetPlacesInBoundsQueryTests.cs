using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using FluentAssertions;
using FluentValidation;
using Moq;

namespace AccessMapVN.UnitTests;

public class GetPlacesInBoundsQueryTests
{
    [Fact]
    public async Task Handle_CallsSpatialServiceWithCorrectParameters_ReturnsPlaces()
    {
        // Arrange
        var mockSpatialService = new Mock<IPlaceSpatialQueryService>();
        var expectedPlaces = new List<PlaceDto>
        {
            new PlaceDto { Id = Guid.NewGuid().ToString(), Name = "Ben Thanh Market", Lng = 106.698, Lat = 10.772 }
        };

        mockSpatialService.Setup(s => s.GetPlacesInBoundsAsync(
            106.6, 10.7, 106.8, 10.9, 14, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedPlaces);

        var handler = new GetPlacesInBoundsQueryHandler(mockSpatialService.Object);
        var query = new GetPlacesInBoundsQuery(106.6, 10.7, 106.8, 10.9, 14);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeEquivalentTo(expectedPlaces);
        mockSpatialService.Verify(s => s.GetPlacesInBoundsAsync(
            106.6, 10.7, 106.8, 10.9, 14, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(10, "Zoom level must be at least 11 to query places.")]
    [InlineData(14, null)]
    public async Task Validator_EnforcesZoomLevelRules(int zoomLevel, string? expectedError)
    {
        // Arrange
        var validator = new GetPlacesInBoundsQueryValidator();
        var query = new GetPlacesInBoundsQuery(106.6, 10.7, 106.8, 10.9, zoomLevel);

        // Act
        var result = await validator.ValidateAsync(query);

        // Assert
        if (expectedError != null)
        {
            result.IsValid.Should().BeFalse();
            result.Errors.Should().Contain(e => e.ErrorMessage == expectedError);
        }
        else
        {
            result.IsValid.Should().BeTrue();
        }
    }
}
