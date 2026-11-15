using System.Security.Claims;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.Infrastructure.Services;
using AccessMapVN.WebApi.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.UnitTests;

public sealed class CommunityPolicyContractTests
{
    [Fact]
    public void Defaults_MatchApprovedProvisionalPolicy()
    {
        var options = new CommunityValidationOptions();

        options.IsValid().Should().BeTrue();
        options.Recency.RecentWindowDays.Should().Be(30);
        options.Recency.HalfLifeDays.Should().Be(180);
        options.Freshness.RecheckAfterDays.Should().Be(90);
        options.Advisory.MaxDurationDays.Should().Be(60);
        options.Consensus.MinIndependentVotersForReview.Should().Be(2);
        options.Consensus.CrowdAutoResolveEnabled.Should().BeFalse();
        options.Reputation.DefaultReputationScore.Should().Be(0);
        options.Reputation.VoteHoldThreshold.Should().Be(0);
        options.Reputation.PolicyVersion.Should().Be("community-provisional-v1");
        options.Thresholds.AutoApproveConfidenceThreshold.Should().Be(0.80);
        options.Thresholds.RejectConfidenceThreshold.Should().Be(0.40);
    }

    [Fact]
    public void FeatureAndStatusEnums_AreTheCanonicalClosedSets()
    {
        Enum.GetNames<AccessibilityFeatureType>().Should().Equal(
            "Ramp", "EntranceDoor", "Elevator", "AccessibleRestroom", "TactilePaving");
        Enum.GetNames<PublishedFeatureStatus>().Should().Equal(
            "Available", "Limited", "NotAvailable", "Unknown");
    }

    [Fact]
    public void LabelNumericOrder_PreservesApprovedPrecedence()
    {
        ((int)FeatureCommunityLabel.CommunityUnderReview).Should().BeGreaterThan((int)FeatureCommunityLabel.ConflictReported);
        ((int)FeatureCommunityLabel.ConflictReported).Should().BeGreaterThan((int)FeatureCommunityLabel.NeedsRecheck);
        ((int)FeatureCommunityLabel.NeedsRecheck).Should().BeGreaterThan((int)FeatureCommunityLabel.Reinforced);
        ((int)FeatureCommunityLabel.Reinforced).Should().BeGreaterThan((int)FeatureCommunityLabel.Fresh);
        ((int)FeatureCommunityLabel.Fresh).Should().BeGreaterThan((int)FeatureCommunityLabel.Uncorroborated);
    }

    [Fact]
    public void VoteAndReportContracts_CannotRequestPublicationConfidenceOrExperienceMutation()
    {
        var writableContracts = new[]
        {
            typeof(CreateCommunityVoteRequest),
            typeof(LinkVoteSubmissionRequest),
            typeof(CreateInaccurateReportRequest),
            typeof(AddReportEvidenceRequest),
        };

        writableContracts
            .SelectMany(type => type.GetProperties())
            .Select(property => property.Name)
            .Should().NotContain(name =>
                name.Contains("Confidence", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("Experience", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("Points", StringComparison.OrdinalIgnoreCase) ||
                name.Contains("Publish", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommentSanitizer_StripsHtmlAndEnforces1500CharacterLimit()
    {
        var sanitized = LocationTimelineCommentService.SanitizeAndValidateComment("<b>Ram dốc</b> dễ đi   <i>ổn định</i>");
        sanitized.Should().Be("Ram dốc dễ đi ổn định");

        var atLimit = new string('a', 1500);
        LocationTimelineCommentService.SanitizeAndValidateComment(atLimit).Should().HaveLength(1500);

        var overLimit = new string('a', 1501);
        Action actOverLimit = () => LocationTimelineCommentService.SanitizeAndValidateComment(overLimit);
        actOverLimit.Should().Throw<CommunityValidationException>()
            .Which.Code.Should().Be("INVALID_COMMENT");

        Action actScript = () => LocationTimelineCommentService.SanitizeAndValidateComment("javascript:alert(1)");
        actScript.Should().Throw<CommunityValidationException>()
            .Which.Code.Should().Be("INVALID_COMMENT");
    }

    [Fact]
    public void CoverageCsvBuilder_FormatsAndEscapesRows()
    {
        var placeId = Guid.NewGuid();
        var csv = AdminCoverageReportsController.BuildCsvContent(new[]
        {
            new Place
            {
                Id = placeId,
                Name = "Bệnh viện, Cơ sở 1",
                Category = "hospital",
                Address = "123 Lê Lợi, Q.1",
                Lat = 10.77,
                Lng = 106.69,
                HasRamp = true,
                DoorWidthOk = true,
            },
        });

        csv.Should().Contain("Id,Name,Category,Address,Latitude,Longitude");
        csv.Should().Contain(placeId.ToString());
        csv.Should().Contain("\"Bệnh viện, Cơ sở 1\"");
    }

    [Fact]
    public async Task CoverageExport_WhenQueued_Returns422UnprocessableEntity()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().Options;
        await using var db = new ApplicationDbContext(options);
        var controller = new AdminCoverageReportsController(db);

        var result = await controller.ExportCsv("queued");

        var objectResult = result.Should().BeOfType<UnprocessableEntityObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status422UnprocessableEntity);
    }

    [Fact]
    public async Task AdminUsers_SelfReputationAdjustment_Returns403Forbidden()
    {
        var adminId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().Options;
        await using var db = new ApplicationDbContext(options);
        var controller = new AdminUsersController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("sub", adminId.ToString()),
                    }, "TestAuth")),
                },
            },
        };

        var result = await controller.AdjustReputation(adminId, new AdjustReputationRequest(5m, "Self boost"));

        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }
}
