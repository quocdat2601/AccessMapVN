using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Infrastructure.Persistence.Configurations;
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
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<AccessScope> AccessScopes => Set<AccessScope>();
    public DbSet<SubmissionClaim> SubmissionClaims => Set<SubmissionClaim>();
    public DbSet<OwnedMedia> OwnedMedia => Set<OwnedMedia>();
    public DbSet<UploadIntent> UploadIntents => Set<UploadIntent>();
    public DbSet<LocationFeature> LocationFeatures => Set<LocationFeature>();
    public DbSet<LocationFeatureHistory> LocationFeatureHistories => Set<LocationFeatureHistory>();
    public DbSet<CommunityVote> CommunityVotes => Set<CommunityVote>();
    public DbSet<CommunityVoteStatusHistory> CommunityVoteStatusHistories => Set<CommunityVoteStatusHistory>();
    public DbSet<FeatureCommunityState> FeatureCommunityStates => Set<FeatureCommunityState>();
    public DbSet<CommunityAssessment> CommunityAssessments => Set<CommunityAssessment>();
    public DbSet<FeatureAssessmentJob> FeatureAssessmentJobs => Set<FeatureAssessmentJob>();
    public DbSet<DisputeCase> DisputeCases => Set<DisputeCase>();
    public DbSet<DisputeCaseVote> DisputeCaseVotes => Set<DisputeCaseVote>();
    public DbSet<DisputeDecision> DisputeDecisions => Set<DisputeDecision>();
    public DbSet<TemporaryAccessAdvisory> TemporaryAccessAdvisories => Set<TemporaryAccessAdvisory>();
    public DbSet<InaccurateInformationReport> InaccurateInformationReports => Set<InaccurateInformationReport>();
    public DbSet<ReportStatusHistory> ReportStatusHistories => Set<ReportStatusHistory>();
    public DbSet<ReportEvidence> ReportEvidence => Set<ReportEvidence>();
    public DbSet<LocationMetadataHistory> LocationMetadataHistories => Set<LocationMetadataHistory>();
    public DbSet<CommunityComment> CommunityComments => Set<CommunityComment>();
    public DbSet<CommunityCommentStatusHistory> CommunityCommentStatusHistories => Set<CommunityCommentStatusHistory>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        modelBuilder.Entity<Place>(entity =>
        {
            entity.ToTable("places");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status)
                .HasDefaultValue(AccessMapVN.Domain.Enums.LocationStatus.Active)
                .HasSentinel((AccessMapVN.Domain.Enums.LocationStatus)0);
            entity.Property(e => e.MetadataVersion).HasDefaultValue(1).IsConcurrencyToken();
            entity.Property(e => e.RowVersion).IsRowVersion().HasColumnName("xmin");
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.ToTable("submissions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SubmissionCode).HasColumnName("submission_code");
            entity.Property(e => e.PlaceId).HasColumnName("place_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.MediaUrls).HasColumnName("media_urls");
            entity.Property(e => e.FeatureTags).HasColumnName("feature_tags");
            entity.Property(e => e.GpsLat).HasColumnName("gps_lat");
            entity.Property(e => e.GpsLng).HasColumnName("gps_lng");
            entity.Property(e => e.AccuracyMeters).HasColumnName("accuracy_meters");
            entity.Property(e => e.TextDescription).HasColumnName("text_description");
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>();
            entity.Property(e => e.ConfidenceScore).HasColumnName("confidence_score");
            entity.Property(e => e.PointsAwarded).HasColumnName("points_awarded");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc");
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
            entity.HasIndex(e => e.SubmissionId).IsUnique();
        });

        modelBuilder.ConfigureWf02();
        modelBuilder.ApplySnakeCaseColumnNames();
    }
}
