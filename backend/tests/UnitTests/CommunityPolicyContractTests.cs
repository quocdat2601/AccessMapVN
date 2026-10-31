using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Enums;
using FluentAssertions;

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
}
