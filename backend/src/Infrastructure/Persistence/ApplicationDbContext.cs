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
    }
}
