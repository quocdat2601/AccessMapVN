using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AccessMapVN.UnitTests;

public sealed class Wf02PostgresIntegrationTests
{
    [PostgreSqlFact]
    [Trait("Category", "PostgreSQL")]
    public async Task VoteReplayAndSupersession_KeepPublishedTruthAndExperienceUnchanged()
    {
        await using var db = CreateDatabaseOrSkip();

        var location = NewLocation("WF02 vote integration");
        var feature = new LocationFeature
        {
            LocationId = location.Id,
            FeatureType = AccessibilityFeatureType.Ramp,
            CurrentStatus = PublishedFeatureStatus.Available,
            Version = 1,
            VerifiedAt = DateTimeOffset.UtcNow.AddDays(-10),
        };
        db.Places.Add(location);
        db.LocationFeatures.Add(feature);
        await db.SaveChangesAsync();

        var actorId = Guid.NewGuid();
        var scheduler = new CapturingScheduler();
        var service = new CommunityValidationService(
            db,
            Options.Create(new CommunityValidationOptions()),
            scheduler,
            TimeProvider.System,
            NullLogger<CommunityValidationService>.Instance);
        var firstRequest = new CreateCommunityVoteRequest(
            1, CommunityVoteType.StillAccurate, null, null);

        var first = await service.RecordVoteAsync(
            actorId, location.Id, AccessibilityFeatureType.Ramp, $"vote-{Guid.NewGuid():N}", firstRequest);
        var replayKey = db.IdempotencyRecords.Local.Single().Key;
        var replay = await service.RecordVoteAsync(
            actorId, location.Id, AccessibilityFeatureType.Ramp, replayKey, firstRequest);

        replay.Should().BeEquivalentTo(first);
        (await db.CommunityVotes.CountAsync(item => item.LocationFeatureId == feature.Id)).Should().Be(1);

        var second = await service.RecordVoteAsync(
            actorId,
            location.Id,
            AccessibilityFeatureType.Ramp,
            $"vote-{Guid.NewGuid():N}",
            new CreateCommunityVoteRequest(
                1, CommunityVoteType.Changed, PublishedFeatureStatus.NotAvailable, "Ramp is blocked."));

        second.VoteId.Should().NotBe(first.VoteId);
        var votes = await db.CommunityVotes
            .Where(item => item.LocationFeatureId == feature.Id)
            .OrderBy(item => item.CreatedAtUtc)
            .ToListAsync();
        votes.Should().HaveCount(2);
        votes.Single(item => item.Id == first.VoteId).Status.Should().Be(CommunityVoteStatus.Superseded);
        votes.Single(item => item.Id == first.VoteId).SupersededByVoteId.Should().Be(second.VoteId);
        votes.Single(item => item.Id == second.VoteId).Status.Should().Be(CommunityVoteStatus.Recorded);

        await db.Entry(feature).ReloadAsync();
        feature.Version.Should().Be(1);
        feature.CurrentStatus.Should().Be(PublishedFeatureStatus.Available);
        (await db.PointTransactions.CountAsync(item => item.UserId == actorId.ToString())).Should().Be(0);
        scheduler.JobIds.Should().NotBeEmpty();
    }

    [PostgreSqlFact]
    [Trait("Category", "PostgreSQL")]
    public async Task ReportReplayAndHistoricalVersions_NeverBecomeVotesOrPublishedChanges()
    {
        await using var db = CreateDatabaseOrSkip();

        var location = NewLocation("WF02 report integration");
        var feature = new LocationFeature
        {
            LocationId = location.Id,
            FeatureType = AccessibilityFeatureType.Ramp,
            CurrentStatus = PublishedFeatureStatus.Limited,
            Version = 3,
            VerifiedAt = DateTimeOffset.UtcNow.AddDays(-5),
        };
        db.Places.Add(location);
        db.LocationFeatures.Add(feature);
        await db.SaveChangesAsync();

        var reporterId = Guid.NewGuid();
        var service = new CommunityReportService(
            db,
            Options.Create(new CommunityValidationOptions()),
            TimeProvider.System);
        var key = $"report-{Guid.NewGuid():N}";
        var request = new CreateInaccurateReportRequest(
            InaccurateReportReason.IncorrectFeature,
            "The current ramp status appears inaccurate.",
            FeatureType: AccessibilityFeatureType.Ramp,
            ObservedFeatureVersion: 2);

        var first = await service.CreateAsync(reporterId, location.Id, key, request);
        var replay = await service.CreateAsync(reporterId, location.Id, key, request);

        replay.Should().BeEquivalentTo(first);
        (await db.InaccurateInformationReports.CountAsync(item => item.Id == first.ReportId)).Should().Be(1);
        (await db.ReportStatusHistories.CountAsync(item => item.ReportId == first.ReportId)).Should().Be(1);
        (await db.InaccurateInformationReports.SingleAsync(item => item.Id == first.ReportId))
            .IsStaleBaseline.Should().BeTrue();

        var conflict = async () => await service.CreateAsync(
            reporterId,
            location.Id,
            key,
            request with { Description = "A different payload using the same key." });
        var exception = await conflict.Should().ThrowAsync<CommunityValidationException>();
        exception.Which.Code.Should().Be("IDEMPOTENCY_KEY_REUSED");
        exception.Which.StatusCode.Should().Be(409);

        await service.CreateAsync(
            reporterId,
            location.Id,
            $"missing-{Guid.NewGuid():N}",
            new CreateInaccurateReportRequest(
                InaccurateReportReason.MissingFeature,
                "An accessible restroom is missing from the published information.",
                FeatureType: AccessibilityFeatureType.AccessibleRestroom));

        (await db.CommunityVotes.CountAsync(item => item.VoterId == reporterId)).Should().Be(0);
        await db.Entry(feature).ReloadAsync();
        feature.Version.Should().Be(3);
        feature.CurrentStatus.Should().Be(PublishedFeatureStatus.Limited);
        (await db.PointTransactions.CountAsync(item => item.UserId == reporterId.ToString())).Should().Be(0);
    }

    [PostgreSqlFact]
    [Trait("Category", "PostgreSQL")]
    public async Task SpatialReadModel_ReturnsCanonicalCoordinatesAndUuid()
    {
        await using var db = CreateDatabaseOrSkip();
        var location = NewLocation("WF02 spatial integration");
        location.Lat = 10.77123;
        location.Lng = 106.70123;
        db.Places.Add(location);
        await db.SaveChangesAsync();

        var service = new PlaceSpatialQueryService(db);
        var results = await service.GetPlacesInBoundsAsync(106.70, 10.77, 106.71, 10.78, 16);

        var result = results.Single(item => item.Id == location.Id.ToString());
        result.Lat.Should().Be(location.Lat);
        result.Lng.Should().Be(location.Lng);
    }

    [PostgreSqlFact]
    [Trait("Category", "PostgreSQL")]
    public async Task CommunityRead_IgnoresProjectionFromOlderFeatureVersion()
    {
        await using var db = CreateDatabaseOrSkip();
        var location = NewLocation("WF02 projection integration");
        var feature = new LocationFeature
        {
            LocationId = location.Id,
            FeatureType = AccessibilityFeatureType.Ramp,
            CurrentStatus = PublishedFeatureStatus.NotAvailable,
            Version = 2,
            VerifiedAt = DateTimeOffset.UtcNow,
        };
        db.Places.Add(location);
        db.LocationFeatures.Add(feature);
        await db.SaveChangesAsync();
        db.FeatureCommunityStates.Add(new FeatureCommunityState
        {
            LocationFeatureId = feature.Id,
            FeatureVersion = 1,
            Label = FeatureCommunityLabel.CommunityUnderReview,
            EligibleVoterCount = 3,
            ContradictingVoterCount = 2,
            LastTrustedReconfirmedAt = DateTimeOffset.UtcNow.AddDays(-2),
            ComputedAt = DateTimeOffset.UtcNow,
            PolicyVersion = "wf02-provisional-v1",
        });
        await db.SaveChangesAsync();

        var service = new CommunityValidationService(
            db,
            Options.Create(new CommunityValidationOptions()),
            new CapturingScheduler(),
            TimeProvider.System,
            NullLogger<CommunityValidationService>.Instance);
        var response = await service.GetCommunityAsync(location.Id, AccessibilityFeatureType.Ramp);

        response.CommunityLabel.Should().Be(FeatureCommunityLabel.Uncorroborated);
        response.EligibleVoterCount.Should().Be(0);
        response.ContradictingVoterCount.Should().Be(0);
        response.LastTrustedReconfirmedAt.Should().BeNull();
    }

    [PostgreSqlFact]
    [Trait("Category", "PostgreSQL")]
    public async Task Publication_ResetsCommunityProjectionForNewVersion()
    {
        await using var db = CreateDatabaseOrSkip();
        var location = NewLocation("WF02 publication integration");
        var admin = new AppUser { Role = AppUserRole.Admin, IsActive = true };
        var submission = new Submission
        {
            SubmissionCode = $"WF02-{Guid.NewGuid():N}",
            PlaceId = location.Id.ToString(),
            UserId = Guid.NewGuid().ToString(),
            Status = SubmissionStatus.AutoVerified,
            GpsLat = location.Lat,
            GpsLng = location.Lng,
        };
        var feature = new LocationFeature
        {
            LocationId = location.Id,
            FeatureType = AccessibilityFeatureType.Ramp,
            CurrentStatus = PublishedFeatureStatus.Available,
            Version = 1,
            VerifiedAt = DateTimeOffset.UtcNow.AddDays(-10),
        };
        db.AddRange(location, admin, submission, feature);
        await db.SaveChangesAsync();
        db.FeatureCommunityStates.Add(new FeatureCommunityState
        {
            LocationFeatureId = feature.Id,
            FeatureVersion = 1,
            Label = FeatureCommunityLabel.CommunityUnderReview,
            EligibleVoterCount = 4,
            ContradictingVoterCount = 2,
            LastTrustedReconfirmedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ActiveDisputeCaseId = null,
            ComputedAt = DateTimeOffset.UtcNow,
            PolicyVersion = "wf02-provisional-v1",
        });
        await db.SaveChangesAsync();

        var service = new LocationFeaturePublicationService(db, TimeProvider.System);
        var result = await service.PublishAsync(
            new PublishLocationFeatureRequest(
                submission.Id,
                location.Id,
                null,
                AccessibilityFeatureType.Ramp,
                PublishedFeatureStatus.NotAvailable,
                "Verified correction"),
            admin.Id);

        result.FeatureVersion.Should().Be(2);
        var state = await db.FeatureCommunityStates.SingleAsync(item => item.LocationFeatureId == feature.Id);
        state.FeatureVersion.Should().Be(2);
        state.Label.Should().Be(FeatureCommunityLabel.Uncorroborated);
        state.EligibleVoterCount.Should().Be(0);
        state.ContradictingVoterCount.Should().Be(0);
        state.LastTrustedReconfirmedAt.Should().BeNull();
    }

    [PostgreSqlFact]
    [Trait("Category", "PostgreSQL")]
    public async Task Timeline_ResolvesMergedLocationToCanonicalHistory()
    {
        await using var db = CreateDatabaseOrSkip();
        var canonical = NewLocation("WF02 canonical timeline");
        var actor = new AppUser { IsActive = true };
        db.AddRange(canonical, actor);
        await db.SaveChangesAsync();
        var merged = NewLocation("WF02 merged timeline");
        merged.Status = LocationStatus.Merged;
        merged.MergedIntoLocationId = canonical.Id;
        db.Places.Add(merged);
        db.LocationMetadataHistories.Add(new LocationMetadataHistory
        {
            LocationId = canonical.Id,
            MetadataVersion = 2,
            ChangedById = actor.Id,
            BeforeJson = "{}",
            AfterJson = "{}",
            Reason = "Timeline merge test",
            EffectiveAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = new LocationTimelineCommentService(
            db,
            Options.Create(new CommunityValidationOptions()),
            TimeProvider.System);
        var response = await service.GetTimelineAsync(merged.Id, 20, null);

        response.Items.Should().ContainSingle(item =>
            item.EventType == "MetadataUpdated" && item.MetadataVersion == 2);
    }

    private static ApplicationDbContext CreateDatabaseOrSkip()
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__SupabaseConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("The PostgreSQL integration-test connection string is missing.");

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .EnableDetailedErrors()
            .Options;
        return new ApplicationDbContext(options);
    }

    private static Place NewLocation(string name) => new()
    {
        Name = $"{name} {Guid.NewGuid():N}",
        Category = "IntegrationTest",
        Address = "Test-only address",
        Lat = 10.77,
        Lng = 106.70,
        Status = LocationStatus.Active,
        MetadataVersion = 1,
    };

    private sealed class CapturingScheduler : ICommunityJobScheduler
    {
        public List<Guid> JobIds { get; } = [];

        public string EnqueueEvaluation(Guid assessmentJobId)
        {
            JobIds.Add(assessmentJobId);
            return assessmentJobId.ToString("N");
        }
    }
}

public sealed class PostgreSqlFactAttribute : FactAttribute
{
    public PostgreSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(
                Environment.GetEnvironmentVariable("ConnectionStrings__SupabaseConnection")))
        {
            Skip = "Set ConnectionStrings__SupabaseConnection to run PostgreSQL integration tests.";
        }
    }
}
