using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Place> Places => Set<Place>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();
    public DbSet<AccessPoint> AccessPoints => Set<AccessPoint>();
    public DbSet<AccessPointKind> AccessPointKinds => Set<AccessPointKind>();
    public DbSet<LocationSource> LocationSources => Set<LocationSource>();
    public DbSet<MediaKind> MediaKinds => Set<MediaKind>();
    public DbSet<MeasurementUnit> MeasurementUnits => Set<MeasurementUnit>();
    public DbSet<MeasurementMethod> MeasurementMethods => Set<MeasurementMethod>();
    public DbSet<MeasurementFeature> MeasurementFeatures => Set<MeasurementFeature>();
    public DbSet<MeasurementFeatureUnit> MeasurementFeatureUnits => Set<MeasurementFeatureUnit>();
    public DbSet<MeasurementObservation> MeasurementObservations => Set<MeasurementObservation>();
    public DbSet<MeasurementEvidence> MeasurementEvidences => Set<MeasurementEvidence>();
    public DbSet<PlaceMeasurement> PlaceMeasurements => Set<PlaceMeasurement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.ToTable("submissions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SubmissionCode).HasColumnName("submission_code");
            entity.Property(e => e.ClientSubmissionId).HasColumnName("client_submission_id");
            entity.Property(e => e.PayloadHash).HasColumnName("payload_hash");
            entity.Property(e => e.PlaceId).HasColumnName("place_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.MediaUrls).HasColumnName("media_urls");
            entity.Property(e => e.FeatureTags).HasColumnName("feature_tags");
            entity.Property(e => e.MeasurementsJson).HasColumnName("measurements_json");
            entity.Property(e => e.ClientObservationsJson).HasColumnName("client_observations_json");
            entity.Property(e => e.AiObservationsJson).HasColumnName("ai_observations_json");
            entity.Property(e => e.GpsLat).HasColumnName("gps_lat");
            entity.Property(e => e.GpsLng).HasColumnName("gps_lng");
            entity.Property(e => e.AccuracyMeters).HasColumnName("accuracy_meters");
            entity.Property(e => e.DistanceMeters).HasColumnName("distance_meters");
            entity.Property(e => e.EffectiveDistanceMeters).HasColumnName("effective_distance_meters");
            entity.Property(e => e.GeofencePolicy).HasColumnName("geofence_policy");
            entity.Property(e => e.AllowedRadiusMeters).HasColumnName("allowed_radius_meters");
            entity.Property(e => e.IsMocked).HasColumnName("is_mocked");
            entity.Property(e => e.TextDescription).HasColumnName("text_description");
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>();
            entity.Property(e => e.ExpStatus).HasColumnName("exp_status");
            entity.Property(e => e.ConfidenceScore).HasColumnName("confidence_score");
            entity.Property(e => e.PointsAwarded).HasColumnName("points_awarded");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");

            entity.HasIndex(e => new { e.UserId, e.ClientSubmissionId }).IsUnique();
        });

        modelBuilder.Entity<PointTransaction>(entity =>
        {
            entity.ToTable("point_transactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.SubmissionId).HasColumnName("submission_id");
            entity.Property(e => e.Points).HasColumnName("points");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<AccessPointKind>(entity =>
        {
            entity.ToTable("access_point_kinds");
            entity.HasKey(e => e.Code);
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(30);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100);
        });

        modelBuilder.Entity<LocationSource>(entity =>
        {
            entity.ToTable("location_sources");
            entity.HasKey(e => e.Code);
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(30);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100);
        });

        modelBuilder.Entity<MediaKind>(entity =>
        {
            entity.ToTable("media_kinds");
            entity.HasKey(e => e.Code);
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(20);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(50);
        });

        modelBuilder.Entity<MeasurementUnit>(entity =>
        {
            entity.ToTable("measurement_units");
            entity.HasKey(e => e.Code);
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(20);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(50);
        });

        modelBuilder.Entity<MeasurementMethod>(entity =>
        {
            entity.ToTable("measurement_methods");
            entity.HasKey(e => e.Code);
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(30);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100);
            entity.Property(e => e.TrustWeight).HasColumnName("trust_weight");
        });

        modelBuilder.Entity<MeasurementFeature>(entity =>
        {
            entity.ToTable("measurement_features");
            entity.HasKey(e => e.FeatureName);
            entity.Property(e => e.FeatureName).HasColumnName("feature_name").HasMaxLength(50);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100);
        });

        modelBuilder.Entity<MeasurementFeatureUnit>(entity =>
        {
            entity.ToTable("measurement_feature_units");
            entity.HasKey(e => new { e.FeatureName, e.UnitCode });
            entity.Property(e => e.FeatureName).HasColumnName("feature_name").HasMaxLength(50);
            entity.Property(e => e.UnitCode).HasColumnName("unit_code").HasMaxLength(20);
        });

        modelBuilder.Entity<AccessPoint>(entity =>
        {
            entity.ToTable("access_points");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PlaceId).HasColumnName("place_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100);
            entity.Property(e => e.Kind).HasColumnName("kind").HasMaxLength(30);
            entity.Property(e => e.LocationSource).HasColumnName("location_source").HasMaxLength(30);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");

            entity.HasIndex(e => e.PlaceId);
        });

        modelBuilder.Entity<MeasurementObservation>(entity =>
        {
            entity.ToTable("measurement_observations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AccessPointId).HasColumnName("access_point_id");
            entity.Property(e => e.FeatureName).HasColumnName("feature_name").HasMaxLength(50);
            entity.Property(e => e.ContributorId).HasColumnName("contributor_id");
            entity.Property(e => e.ReportedValue).HasColumnName("reported_value").HasPrecision(12, 4);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(20);
            entity.Property(e => e.Method).HasColumnName("method").HasMaxLength(30);
            entity.Property(e => e.EvidenceMediaUrlsJson).HasColumnName("evidence_media_urls");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");

            entity.HasIndex(e => new { e.AccessPointId, e.FeatureName });
            entity.HasIndex(e => e.ContributorId);
        });

        modelBuilder.Entity<MeasurementEvidence>(entity =>
        {
            entity.ToTable("measurement_evidence");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ObservationId).HasColumnName("observation_id");
            entity.Property(e => e.MediaUrl).HasColumnName("media_url");
            entity.Property(e => e.MediaKind).HasColumnName("media_kind").HasMaxLength(20);
            entity.Property(e => e.PrivacyStatus).HasColumnName("privacy_status").HasMaxLength(20);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");

            entity.HasIndex(e => e.ObservationId);
        });

        modelBuilder.Entity<PlaceMeasurement>(entity =>
        {
            entity.ToTable("place_measurements");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AccessPointId).HasColumnName("access_point_id");
            entity.Property(e => e.FeatureName).HasColumnName("feature_name").HasMaxLength(50);
            entity.Property(e => e.ConsensusValue).HasColumnName("consensus_value").HasPrecision(12, 4);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(20);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(30);
            entity.Property(e => e.DistinctContributorsCount).HasColumnName("distinct_contributors_count");
            entity.Property(e => e.LatestObservationId).HasColumnName("latest_observation_id");
            entity.Property(e => e.LastVerifiedAt).HasColumnName("last_verified_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");

            entity.HasIndex(e => new { e.AccessPointId, e.FeatureName }).IsUnique();
        });
    }
}
