using System.Text.RegularExpressions;
using AccessMapVN.Domain.Common;
using AccessMapVN.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AccessMapVN.Infrastructure.Persistence.Configurations;

internal static partial class CommunityModelBuilderExtensions
{
    public static void ConfigureCommunityValidation(this ModelBuilder modelBuilder)
    {
        ConfigureUsers(modelBuilder);
        ConfigureCoreFoundations(modelBuilder);
        ConfigureLocationFeatures(modelBuilder);
        ConfigureVotesAndAssessments(modelBuilder);
        ConfigureDisputes(modelBuilder);
        ConfigureReports(modelBuilder);
        ConfigureCommentsAndInfrastructure(modelBuilder);
    }




    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<AppUser>();
        ConfigureBase(user, "app_users");
        user.Property(x => x.DisplayName).HasMaxLength(200);
        user.Property(x => x.ReputationScore).HasPrecision(12, 4);
        user.Property(x => x.ReputationTier).HasMaxLength(100);
        user.Property(x => x.ReputationPolicyVersion).HasMaxLength(100);
    }

    private static void ConfigureCoreFoundations(ModelBuilder modelBuilder)
    {
        var scope = modelBuilder.Entity<AccessScope>();
        ConfigureBase(scope, "access_scopes");
        scope.Property(x => x.Name).HasMaxLength(300);
        scope.Property(x => x.ScopeType).HasMaxLength(100);
        scope.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        scope.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        scope.HasIndex(x => new { x.LocationId, x.Name }).IsUnique();

        var claim = modelBuilder.Entity<SubmissionClaim>();
        ConfigureBase(claim, "submission_claims");
        claim.Property(x => x.AiConfidence).HasPrecision(12, 8);
        claim.Property(x => x.CommunityConfidence).HasPrecision(12, 8);
        claim.Property(x => x.FinalConfidence).HasPrecision(12, 8);
        claim.HasOne<Submission>().WithMany().HasForeignKey(x => x.SubmissionId).OnDelete(DeleteBehavior.Restrict);
        claim.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        claim.HasOne<AccessScope>().WithMany().HasForeignKey(x => x.ScopeId).OnDelete(DeleteBehavior.Restrict);
        claim.HasIndex(x => new { x.SubmissionId, x.FeatureType })
            .IsUnique()
            .HasFilter("scope_id IS NULL");
        claim.HasIndex(x => new { x.SubmissionId, x.ScopeId, x.FeatureType })
            .IsUnique()
            .HasFilter("scope_id IS NOT NULL");

        var media = modelBuilder.Entity<OwnedMedia>();
        ConfigureBase(media, "owned_media");
        media.Property(x => x.StorageKey).HasMaxLength(1000);
        media.Property(x => x.MimeType).HasMaxLength(200);
        media.Property(x => x.Sha256).HasMaxLength(128);
        media.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        media.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        media.HasIndex(x => x.StorageKey).IsUnique();

        var uploadIntent = modelBuilder.Entity<UploadIntent>();
        ConfigureBase(uploadIntent, "upload_intents");
        uploadIntent.Property(x => x.UploadTokenHash).HasMaxLength(128);
        uploadIntent.HasOne<AppUser>().WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        uploadIntent.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        uploadIntent.HasOne<OwnedMedia>().WithMany().HasForeignKey(x => x.OwnedMediaId).OnDelete(DeleteBehavior.Restrict);
        uploadIntent.HasIndex(x => x.OwnedMediaId).IsUnique();
    }

    public static void ApplySnakeCaseColumnNames(this ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                property.SetColumnName(
                    property.Name == "RowVersion" && property.ClrType == typeof(uint)
                        ? "xmin"
                        : ToSnakeCase(property.Name));
            }
        }
    }

    private static void ConfigureLocationFeatures(ModelBuilder modelBuilder)
    {
        var feature = modelBuilder.Entity<LocationFeature>();
        ConfigureBase(feature, "location_features");
        feature.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        feature.Property(x => x.VerifiedAt).HasColumnType("timestamp with time zone");
        feature.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        feature.HasOne<AccessScope>().WithMany().HasForeignKey(x => x.ScopeId).OnDelete(DeleteBehavior.Restrict);
        feature.HasOne<Submission>().WithMany().HasForeignKey(x => x.SourceSubmissionId).OnDelete(DeleteBehavior.Restrict);
        feature.HasIndex(x => new { x.LocationId, x.FeatureType })
            .IsUnique()
            .HasFilter("scope_id IS NULL");
        feature.HasIndex(x => new { x.LocationId, x.ScopeId, x.FeatureType })
            .IsUnique()
            .HasFilter("scope_id IS NOT NULL");

        var history = modelBuilder.Entity<LocationFeatureHistory>();
        ConfigureBase(history, "location_feature_history");
        history.Property(x => x.Reason).HasMaxLength(1500);
        history.HasOne<LocationFeature>().WithMany().HasForeignKey(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        history.HasOne<Submission>().WithMany().HasForeignKey(x => x.SourceSubmissionId).OnDelete(DeleteBehavior.Restrict);
        history.HasOne<AppUser>().WithMany().HasForeignKey(x => x.PublishedById).OnDelete(DeleteBehavior.Restrict);
        history.HasIndex(x => new { x.LocationFeatureId, x.FeatureVersion }).IsUnique();
    }

    private static void ConfigureVotesAndAssessments(ModelBuilder modelBuilder)
    {
        var vote = modelBuilder.Entity<CommunityVote>();
        ConfigureBase(vote, "community_votes");
        vote.Property(x => x.Comment).HasMaxLength(1500);
        vote.Property(x => x.PolicyVersion).HasMaxLength(100);
        vote.Property(x => x.ReputationTierSnapshot).HasMaxLength(100);
        vote.Property(x => x.EligibilityReason).HasMaxLength(500);
        vote.Property(x => x.ReputationScoreSnapshot).HasPrecision(12, 4);
        vote.Property(x => x.TierFactorSnapshot).HasPrecision(8, 4);
        vote.HasOne<LocationFeature>().WithMany().HasForeignKey(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        vote.HasOne<AppUser>().WithMany().HasForeignKey(x => x.VoterId).OnDelete(DeleteBehavior.Restrict);
        vote.HasOne<Submission>().WithMany().HasForeignKey(x => x.EvidenceSubmissionId).OnDelete(DeleteBehavior.Restrict);
        vote.HasOne<CommunityVote>().WithMany().HasForeignKey(x => x.SupersededByVoteId).OnDelete(DeleteBehavior.Restrict);
        vote.HasIndex(x => new { x.LocationFeatureId, x.ObservedFeatureVersion, x.VoterId });
        vote.HasIndex(x => new { x.LocationFeatureId, x.ObservedFeatureVersion, x.VoterId })
            .IsUnique()
            .HasFilter("status IN (1, 2, 3)");

        var voteHistory = modelBuilder.Entity<CommunityVoteStatusHistory>();
        ConfigureBase(voteHistory, "community_vote_status_history");
        voteHistory.Property(x => x.Reason).HasMaxLength(1000);
        voteHistory.HasOne<CommunityVote>().WithMany().HasForeignKey(x => x.CommunityVoteId).OnDelete(DeleteBehavior.Restrict);
        voteHistory.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
        voteHistory.HasIndex(x => new { x.CommunityVoteId, x.OccurredAt });

        var state = modelBuilder.Entity<FeatureCommunityState>();
        ConfigureBase(state, "feature_community_states");
        state.Property(x => x.WeightedAgreement).HasPrecision(12, 8);
        state.Property(x => x.FreshnessFactor).HasPrecision(12, 8);
        state.Property(x => x.PolicyVersion).HasMaxLength(100);
        state.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        state.HasOne<LocationFeature>().WithOne().HasForeignKey<FeatureCommunityState>(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        state.HasIndex(x => x.LocationFeatureId).IsUnique();

        var assessment = modelBuilder.Entity<CommunityAssessment>();
        ConfigureBase(assessment, "community_assessments");
        assessment.Property(x => x.WeightedAgreement).HasPrecision(12, 8);
        assessment.Property(x => x.FreshnessFactor).HasPrecision(12, 8);
        assessment.Property(x => x.PolicyVersion).HasMaxLength(100);
        assessment.Property(x => x.DecisionSnapshotJson).HasColumnType("jsonb");
        assessment.HasOne<LocationFeature>().WithMany().HasForeignKey(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        assessment.HasIndex(x => new { x.LocationFeatureId, x.FeatureVersion, x.AsOfAt });

        var job = modelBuilder.Entity<FeatureAssessmentJob>();
        ConfigureBase(job, "feature_assessment_jobs");
        job.Property(x => x.LastErrorCategory).HasMaxLength(100);
        job.Property(x => x.LastErrorMessage).HasMaxLength(2000);
        job.HasOne<LocationFeature>().WithMany().HasForeignKey(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        job.HasIndex(x => new { x.LocationFeatureId, x.FeatureVersion, x.Status });
        job.HasIndex(x => new { x.LocationFeatureId, x.FeatureVersion })
            .IsUnique()
            .HasFilter("status IN (1, 2, 3)");
    }

    private static void ConfigureDisputes(ModelBuilder modelBuilder)
    {
        var dispute = modelBuilder.Entity<DisputeCase>();
        ConfigureBase(dispute, "dispute_cases");
        dispute.Property(x => x.OpenReason).HasMaxLength(1500);
        dispute.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        dispute.Property(x => x.RowVersion).IsRowVersion().HasColumnName("xmin");
        dispute.HasOne<LocationFeature>().WithMany().HasForeignKey(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        dispute.HasOne<Submission>().WithMany().HasForeignKey(x => x.CorrectionSubmissionId).OnDelete(DeleteBehavior.Restrict);
        dispute.HasIndex(x => new { x.LocationFeatureId, x.FeatureVersion })
            .IsUnique()
            .HasFilter("status IN (1, 2, 3, 4)");

        var link = modelBuilder.Entity<DisputeCaseVote>();
        ConfigureBase(link, "dispute_case_votes");
        link.HasOne<DisputeCase>().WithMany().HasForeignKey(x => x.DisputeCaseId).OnDelete(DeleteBehavior.Restrict);
        link.HasOne<CommunityVote>().WithMany().HasForeignKey(x => x.CommunityVoteId).OnDelete(DeleteBehavior.Restrict);
        link.HasIndex(x => new { x.DisputeCaseId, x.CommunityVoteId }).IsUnique();

        var decision = modelBuilder.Entity<DisputeDecision>();
        ConfigureBase(decision, "dispute_decisions");
        decision.Property(x => x.Reason).HasMaxLength(2000);
        decision.HasOne<DisputeCase>().WithMany().HasForeignKey(x => x.DisputeCaseId).OnDelete(DeleteBehavior.Restrict);
        decision.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ModeratorId).OnDelete(DeleteBehavior.Restrict);
        decision.HasOne<Submission>().WithMany().HasForeignKey(x => x.CorrectionSubmissionId).OnDelete(DeleteBehavior.Restrict);

        var advisory = modelBuilder.Entity<TemporaryAccessAdvisory>();
        ConfigureBase(advisory, "temporary_access_advisories");
        advisory.Property(x => x.Reason).HasMaxLength(1500);
        advisory.Property(x => x.RevocationReason).HasMaxLength(1500);
        advisory.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        advisory.HasOne<LocationFeature>().WithMany().HasForeignKey(x => x.LocationFeatureId).OnDelete(DeleteBehavior.Restrict);
        advisory.HasOne<DisputeCase>().WithMany().HasForeignKey(x => x.DisputeCaseId).OnDelete(DeleteBehavior.Restrict);
        advisory.HasOne<AppUser>().WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
        advisory.HasOne<AppUser>().WithMany().HasForeignKey(x => x.RevokedById).OnDelete(DeleteBehavior.Restrict);
        advisory.HasIndex(x => new { x.LocationFeatureId, x.StartsAt, x.EndsAt });
    }

    private static void ConfigureReports(ModelBuilder modelBuilder)
    {
        var report = modelBuilder.Entity<InaccurateInformationReport>();
        ConfigureBase(report, "inaccurate_information_reports");
        report.Property(x => x.Description).HasMaxLength(4000);
        report.Property(x => x.ProposedAddress).HasMaxLength(1000);
        report.Property(x => x.PublicResolutionNote).HasMaxLength(1500);
        report.Property(x => x.ReporterActionNote).HasMaxLength(1500);
        report.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        report.Property(x => x.RowVersion).IsRowVersion().HasColumnName("xmin");
        report.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        report.HasOne<AccessScope>().WithMany().HasForeignKey(x => x.ScopeId).OnDelete(DeleteBehavior.Restrict);
        report.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ReporterId).OnDelete(DeleteBehavior.Restrict);
        report.HasOne<DisputeCase>().WithMany().HasForeignKey(x => x.LinkedDisputeCaseId).OnDelete(DeleteBehavior.Restrict);
        report.HasOne<Submission>().WithMany().HasForeignKey(x => x.LinkedSubmissionId).OnDelete(DeleteBehavior.Restrict);
        report.HasIndex(x => new { x.LocationId, x.Status, x.CreatedAtUtc });
        report.HasIndex(x => new { x.ReporterId, x.CreatedAtUtc, x.Id });

        var reportHistory = modelBuilder.Entity<ReportStatusHistory>();
        ConfigureBase(reportHistory, "report_status_history");
        reportHistory.Property(x => x.Reason).HasMaxLength(2000);
        reportHistory.Property(x => x.Outcome).HasMaxLength(1000);
        reportHistory.Property(x => x.PublicNote).HasMaxLength(1500);
        reportHistory.HasOne<InaccurateInformationReport>().WithMany().HasForeignKey(x => x.ReportId).OnDelete(DeleteBehavior.Restrict);
        reportHistory.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
        reportHistory.HasIndex(x => new { x.ReportId, x.OccurredAt });

        var evidence = modelBuilder.Entity<ReportEvidence>();
        ConfigureBase(evidence, "report_evidence");
        evidence.Property(x => x.Description).HasMaxLength(2000);
        evidence.Property(x => x.IdempotencyKey).HasMaxLength(200);
        evidence.Property(x => x.RequestHash).HasMaxLength(128);
        evidence.HasOne<InaccurateInformationReport>().WithMany().HasForeignKey(x => x.ReportId).OnDelete(DeleteBehavior.Restrict);
        evidence.HasOne<AppUser>().WithMany().HasForeignKey(x => x.AddedByReporterId).OnDelete(DeleteBehavior.Restrict);
        evidence.HasOne<OwnedMedia>().WithMany().HasForeignKey(x => x.OwnedMediaId).OnDelete(DeleteBehavior.Restrict);
        evidence.HasIndex(x => new { x.ReportId, x.CreatedAtUtc, x.Id });
        evidence.HasIndex(x => new { x.ReportId, x.AddedByReporterId, x.IdempotencyKey }).IsUnique();
        evidence.ToTable(t => t.HasCheckConstraint(
            "ck_report_evidence_content",
            "description IS NOT NULL OR owned_media_id IS NOT NULL"));

        var metadata = modelBuilder.Entity<LocationMetadataHistory>();
        ConfigureBase(metadata, "location_metadata_history");
        metadata.Property(x => x.BeforeJson).HasColumnType("jsonb");
        metadata.Property(x => x.AfterJson).HasColumnType("jsonb");
        metadata.Property(x => x.Reason).HasMaxLength(2000);
        metadata.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        metadata.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ChangedById).OnDelete(DeleteBehavior.Restrict);
        metadata.HasOne<InaccurateInformationReport>().WithMany().HasForeignKey(x => x.SourceReportId).OnDelete(DeleteBehavior.Restrict);
        metadata.HasIndex(x => new { x.LocationId, x.MetadataVersion }).IsUnique();
    }

    private static void ConfigureCommentsAndInfrastructure(ModelBuilder modelBuilder)
    {
        var comment = modelBuilder.Entity<CommunityComment>();
        ConfigureBase(comment, "community_comments");
        comment.Property(x => x.Body).HasMaxLength(2000);
        comment.Property(x => x.ModerationReason).HasMaxLength(1500);
        comment.Property(x => x.Version).HasDefaultValue(1).IsConcurrencyToken();
        comment.Property(x => x.RowVersion).IsRowVersion().HasColumnName("xmin");
        comment.HasOne<Place>().WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.Restrict);
        comment.HasOne<AccessScope>().WithMany().HasForeignKey(x => x.ScopeId).OnDelete(DeleteBehavior.Restrict);
        comment.HasOne<AppUser>().WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
        comment.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ModeratedById).OnDelete(DeleteBehavior.Restrict);
        comment.HasIndex(x => new { x.LocationId, x.Status, x.CreatedAtUtc, x.Id });

        var commentHistory = modelBuilder.Entity<CommunityCommentStatusHistory>();
        ConfigureBase(commentHistory, "community_comment_status_history");
        commentHistory.Property(x => x.Reason).HasMaxLength(1500);
        commentHistory.HasOne<CommunityComment>().WithMany().HasForeignKey(x => x.CommunityCommentId).OnDelete(DeleteBehavior.Restrict);
        commentHistory.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);

        var idempotency = modelBuilder.Entity<IdempotencyRecord>();
        ConfigureBase(idempotency, "idempotency_records");
        idempotency.Property(x => x.Endpoint).HasMaxLength(300);
        idempotency.Property(x => x.Key).HasMaxLength(200);
        idempotency.Property(x => x.RequestHash).HasMaxLength(128);
        idempotency.Property(x => x.ResponseBody).HasColumnType("jsonb");
        idempotency.HasOne<AppUser>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
        idempotency.HasIndex(x => new { x.ActorId, x.Endpoint, x.Key }).IsUnique();
        idempotency.HasIndex(x => x.ExpiresAt);

        var outbox = modelBuilder.Entity<OutboxMessage>();
        ConfigureBase(outbox, "outbox_messages");
        outbox.Property(x => x.Type).HasMaxLength(200);
        outbox.Property(x => x.PayloadJson).HasColumnType("jsonb");
        outbox.Property(x => x.LastError).HasMaxLength(2000);
        outbox.HasIndex(x => new { x.ProcessedAt, x.OccurredAt });
    }

    private static void ConfigureBase<TEntity>(EntityTypeBuilder<TEntity> builder, string tableName)
        where TEntity : BaseEntity
    {
        builder.ToTable(tableName);
        builder.HasKey(x => x.Id);
        builder.Property(x => x.CreatedAtUtc).HasColumnType("timestamp with time zone");
        builder.Property(x => x.UpdatedAtUtc).HasColumnType("timestamp with time zone");
    }

    private static string ToSnakeCase(string value) =>
        SnakeCaseBoundaryRegex().Replace(value, "$1_$2").ToLowerInvariant();

    [GeneratedRegex("([a-z0-9])([A-Z])")]
    private static partial Regex SnakeCaseBoundaryRegex();
}
