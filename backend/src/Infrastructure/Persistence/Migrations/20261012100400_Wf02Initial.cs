using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccessMapVN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Wf02Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    role = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    reputation_score = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: false),
                    reputation_tier = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reputation_policy_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_messages", x => x.id);
                });

            // WF-01 existed before EF migrations were introduced. Keep this migration additive:
            // establish the legacy base tables only for a fresh local database, then add the
            // versioning columns required by WF-02 without recreating or truncating user data.
            migrationBuilder.Sql("""
                CREATE EXTENSION IF NOT EXISTS postgis;
                CREATE EXTENSION IF NOT EXISTS pgcrypto;

                CREATE TABLE IF NOT EXISTS places (
                    id uuid PRIMARY KEY,
                    name text NOT NULL,
                    category text NOT NULL DEFAULT 'other',
                    address text NULL,
                    phone text NULL,
                    website text NULL,
                    opening_hours text NULL,
                    geom geography(Point, 4326) NULL,
                    lng double precision NOT NULL DEFAULT 0,
                    lat double precision NOT NULL DEFAULT 0,
                    floor_level integer NULL,
                    building_id uuid NULL,
                    has_ramp boolean NULL,
                    has_accessible_elevator boolean NULL,
                    has_tactile_paving boolean NULL,
                    has_accessible_restroom boolean NULL,
                    door_width_ok boolean NULL,
                    accessibility_score numeric NULL,
                    accessibility_note text NULL,
                    last_verified_at timestamptz NULL,
                    status integer NOT NULL DEFAULT 1,
                    merged_into_location_id uuid NULL,
                    metadata_version integer NOT NULL DEFAULT 1,
                    created_at_utc timestamptz NOT NULL DEFAULT now(),
                    updated_at_utc timestamptz NULL
                );

                ALTER TABLE places ADD COLUMN IF NOT EXISTS status integer NOT NULL DEFAULT 1;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS merged_into_location_id uuid NULL;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS metadata_version integer NOT NULL DEFAULT 1;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS created_at_utc timestamptz NOT NULL DEFAULT now();
                ALTER TABLE places ADD COLUMN IF NOT EXISTS updated_at_utc timestamptz NULL;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS lng double precision NULL;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS lat double precision NULL;

                DO $wf02$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = current_schema() AND table_name = 'places' AND column_name = 'geom'
                    ) THEN
                        UPDATE places
                        SET lng = COALESCE(lng, ST_X(geom::geometry)),
                            lat = COALESCE(lat, ST_Y(geom::geometry))
                        WHERE geom IS NOT NULL AND (lng IS NULL OR lat IS NULL);
                    END IF;
                END $wf02$;
                UPDATE places SET lng = 0 WHERE lng IS NULL;
                UPDATE places SET lat = 0 WHERE lat IS NULL;
                ALTER TABLE places ALTER COLUMN lng SET NOT NULL;
                ALTER TABLE places ALTER COLUMN lat SET NOT NULL;

                CREATE TABLE IF NOT EXISTS submissions (
                    id uuid PRIMARY KEY,
                    submission_code varchar(50) NOT NULL,
                    place_id varchar(100) NOT NULL,
                    user_id varchar(100) NOT NULL,
                    media_urls text[] NOT NULL DEFAULT '{}',
                    feature_tags text[] NOT NULL DEFAULT '{}',
                    gps_lat double precision NOT NULL,
                    gps_lng double precision NOT NULL,
                    accuracy_meters double precision NULL,
                    text_description text NULL,
                    status varchar(50) NOT NULL DEFAULT 'Submitted',
                    confidence_score double precision NOT NULL DEFAULT 0.88,
                    points_awarded integer NOT NULL DEFAULT 0,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    created_at_utc timestamptz NOT NULL DEFAULT now(),
                    updated_at_utc timestamptz NULL
                );
                ALTER TABLE submissions ALTER COLUMN points_awarded SET DEFAULT 0;

                CREATE TABLE IF NOT EXISTS point_transactions (
                    id uuid PRIMARY KEY,
                    user_id varchar(100) NOT NULL,
                    submission_id varchar(50) NOT NULL,
                    points integer NOT NULL,
                    reason text NOT NULL,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    created_at_utc timestamptz NOT NULL DEFAULT now(),
                    updated_at_utc timestamptz NULL
                );
                """);

            migrationBuilder.CreateTable(
                name: "idempotency_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    endpoint = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    response_status_code = table.Column<int>(type: "integer", nullable: false),
                    response_body = table.Column<string>(type: "jsonb", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idempotency_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_idempotency_records_app_users_actor_id",
                        column: x => x.actor_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "access_scopes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    scope_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_access_scopes", x => x.id);
                    table.ForeignKey(
                        name: "FK_access_scopes_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "owned_media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    mime_type = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_owned_media", x => x.id);
                    table.ForeignKey(
                        name: "FK_owned_media_app_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_owned_media_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "community_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope_id = table.Column<Guid>(type: "uuid", nullable: true),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    moderated_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    moderated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    moderation_reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_comments", x => x.id);
                    table.ForeignKey(
                        name: "FK_community_comments_access_scopes_scope_id",
                        column: x => x.scope_id,
                        principalTable: "access_scopes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_comments_app_users_author_id",
                        column: x => x.author_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_comments_app_users_moderated_by_id",
                        column: x => x.moderated_by_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_comments_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "location_features",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope_id = table.Column<Guid>(type: "uuid", nullable: true),
                    feature_type = table.Column<int>(type: "integer", nullable: false),
                    current_status = table.Column<int>(type: "integer", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    source_submission_id = table.Column<Guid>(type: "uuid", nullable: true),
                    verified_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_features", x => x.id);
                    table.ForeignKey(
                        name: "FK_location_features_access_scopes_scope_id",
                        column: x => x.scope_id,
                        principalTable: "access_scopes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_location_features_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_location_features_submissions_source_submission_id",
                        column: x => x.source_submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "submission_claims",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    submission_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope_id = table.Column<Guid>(type: "uuid", nullable: true),
                    feature_type = table.Column<int>(type: "integer", nullable: false),
                    proposed_status = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    ai_confidence = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: true),
                    community_confidence = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: true),
                    final_confidence = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_submission_claims", x => x.id);
                    table.ForeignKey(
                        name: "FK_submission_claims_access_scopes_scope_id",
                        column: x => x.scope_id,
                        principalTable: "access_scopes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_submission_claims_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_submission_claims_submissions_submission_id",
                        column: x => x.submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "upload_intents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    owned_media_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    upload_token_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    consumed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_upload_intents", x => x.id);
                    table.ForeignKey(
                        name: "FK_upload_intents_app_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_upload_intents_owned_media_owned_media_id",
                        column: x => x.owned_media_id,
                        principalTable: "owned_media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_upload_intents_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "community_comment_status_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    community_comment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<int>(type: "integer", nullable: true),
                    to_status = table.Column<int>(type: "integer", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_comment_status_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_community_comment_status_history_app_users_actor_id",
                        column: x => x.actor_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_comment_status_history_community_comments_communi~",
                        column: x => x.community_comment_id,
                        principalTable: "community_comments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "community_assessments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_version = table.Column<int>(type: "integer", nullable: false),
                    as_of_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    weighted_agreement = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: true),
                    eligible_voter_count = table.Column<int>(type: "integer", nullable: false),
                    contradicting_voter_count = table.Column<int>(type: "integer", nullable: false),
                    result_label = table.Column<int>(type: "integer", nullable: false),
                    freshness_factor = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: false),
                    policy_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    decision_snapshot_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_assessments", x => x.id);
                    table.ForeignKey(
                        name: "FK_community_assessments_location_features_location_feature_id",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "community_votes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    voter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    observed_feature_version = table.Column<int>(type: "integer", nullable: false),
                    vote_type = table.Column<int>(type: "integer", nullable: false),
                    proposed_status = table.Column<int>(type: "integer", nullable: true),
                    comment = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    evidence_submission_id = table.Column<Guid>(type: "uuid", nullable: true),
                    superseded_by_vote_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reputation_score_snapshot = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: true),
                    reputation_tier_snapshot = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    tier_factor_snapshot = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: true),
                    eligibility_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    policy_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_votes", x => x.id);
                    table.ForeignKey(
                        name: "FK_community_votes_app_users_voter_id",
                        column: x => x.voter_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_votes_community_votes_superseded_by_vote_id",
                        column: x => x.superseded_by_vote_id,
                        principalTable: "community_votes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_votes_location_features_location_feature_id",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_votes_submissions_evidence_submission_id",
                        column: x => x.evidence_submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "dispute_cases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    open_reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    opened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    resolved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    correction_submission_id = table.Column<Guid>(type: "uuid", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispute_cases", x => x.id);
                    table.ForeignKey(
                        name: "FK_dispute_cases_location_features_location_feature_id",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dispute_cases_submissions_correction_submission_id",
                        column: x => x.correction_submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "feature_assessment_jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    lease_expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    next_attempt_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    as_of_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    last_error_category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    last_error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feature_assessment_jobs", x => x.id);
                    table.ForeignKey(
                        name: "FK_feature_assessment_jobs_location_features_location_feature_~",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "feature_community_states",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_version = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<int>(type: "integer", nullable: false),
                    weighted_agreement = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: true),
                    eligible_voter_count = table.Column<int>(type: "integer", nullable: false),
                    contradicting_voter_count = table.Column<int>(type: "integer", nullable: false),
                    last_trusted_reconfirmed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    freshness_factor = table.Column<decimal>(type: "numeric(12,8)", precision: 12, scale: 8, nullable: false),
                    active_dispute_case_id = table.Column<Guid>(type: "uuid", nullable: true),
                    computed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    policy_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feature_community_states", x => x.id);
                    table.ForeignKey(
                        name: "FK_feature_community_states_location_features_location_feature~",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "location_feature_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    source_submission_id = table.Column<Guid>(type: "uuid", nullable: true),
                    published_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    effective_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_feature_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_location_feature_history_app_users_published_by_id",
                        column: x => x.published_by_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_location_feature_history_location_features_location_feature~",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_location_feature_history_submissions_source_submission_id",
                        column: x => x.source_submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "community_vote_status_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    community_vote_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<int>(type: "integer", nullable: true),
                    to_status = table.Column<int>(type: "integer", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_vote_status_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_community_vote_status_history_app_users_actor_id",
                        column: x => x.actor_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_community_vote_status_history_community_votes_community_vot~",
                        column: x => x.community_vote_id,
                        principalTable: "community_votes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "dispute_case_votes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    dispute_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    community_vote_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispute_case_votes", x => x.id);
                    table.ForeignKey(
                        name: "FK_dispute_case_votes_community_votes_community_vote_id",
                        column: x => x.community_vote_id,
                        principalTable: "community_votes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dispute_case_votes_dispute_cases_dispute_case_id",
                        column: x => x.dispute_case_id,
                        principalTable: "dispute_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "dispute_decisions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    dispute_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    decision_type = table.Column<int>(type: "integer", nullable: false),
                    moderator_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    correction_submission_id = table.Column<Guid>(type: "uuid", nullable: true),
                    advisory_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    case_version = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispute_decisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_dispute_decisions_app_users_moderator_id",
                        column: x => x.moderator_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dispute_decisions_dispute_cases_dispute_case_id",
                        column: x => x.dispute_case_id,
                        principalTable: "dispute_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_dispute_decisions_submissions_correction_submission_id",
                        column: x => x.correction_submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inaccurate_information_reports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reporter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope_id = table.Column<Guid>(type: "uuid", nullable: true),
                    feature_type = table.Column<int>(type: "integer", nullable: true),
                    observed_feature_version = table.Column<int>(type: "integer", nullable: true),
                    reason = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    is_stale_baseline = table.Column<bool>(type: "boolean", nullable: false),
                    proposed_address = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    proposed_latitude = table.Column<double>(type: "double precision", nullable: true),
                    proposed_longitude = table.Column<double>(type: "double precision", nullable: true),
                    linked_dispute_case_id = table.Column<Guid>(type: "uuid", nullable: true),
                    linked_submission_id = table.Column<Guid>(type: "uuid", nullable: true),
                    resolution = table.Column<int>(type: "integer", nullable: true),
                    public_resolution_note = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    reporter_action_note = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inaccurate_information_reports", x => x.id);
                    table.ForeignKey(
                        name: "FK_inaccurate_information_reports_access_scopes_scope_id",
                        column: x => x.scope_id,
                        principalTable: "access_scopes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inaccurate_information_reports_app_users_reporter_id",
                        column: x => x.reporter_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inaccurate_information_reports_dispute_cases_linked_dispute~",
                        column: x => x.linked_dispute_case_id,
                        principalTable: "dispute_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inaccurate_information_reports_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inaccurate_information_reports_submissions_linked_submissio~",
                        column: x => x.linked_submission_id,
                        principalTable: "submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "temporary_access_advisories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_feature_id = table.Column<Guid>(type: "uuid", nullable: false),
                    dispute_case_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    starts_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ends_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revoked_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    revocation_reason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_temporary_access_advisories", x => x.id);
                    table.ForeignKey(
                        name: "FK_temporary_access_advisories_app_users_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_temporary_access_advisories_app_users_revoked_by_id",
                        column: x => x.revoked_by_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_temporary_access_advisories_dispute_cases_dispute_case_id",
                        column: x => x.dispute_case_id,
                        principalTable: "dispute_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_temporary_access_advisories_location_features_location_feat~",
                        column: x => x.location_feature_id,
                        principalTable: "location_features",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "location_metadata_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    metadata_version = table.Column<int>(type: "integer", nullable: false),
                    source_report_id = table.Column<Guid>(type: "uuid", nullable: true),
                    changed_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    before_json = table.Column<string>(type: "jsonb", nullable: false),
                    after_json = table.Column<string>(type: "jsonb", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    effective_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_metadata_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_location_metadata_history_app_users_changed_by_id",
                        column: x => x.changed_by_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_location_metadata_history_inaccurate_information_reports_so~",
                        column: x => x.source_report_id,
                        principalTable: "inaccurate_information_reports",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_location_metadata_history_places_location_id",
                        column: x => x.location_id,
                        principalTable: "places",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "report_evidence",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    report_id = table.Column<Guid>(type: "uuid", nullable: false),
                    added_by_reporter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    owned_media_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_version = table.Column<int>(type: "integer", nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    request_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_report_evidence", x => x.id);
                    table.CheckConstraint("ck_report_evidence_content", "description IS NOT NULL OR owned_media_id IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_report_evidence_app_users_added_by_reporter_id",
                        column: x => x.added_by_reporter_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_report_evidence_inaccurate_information_reports_report_id",
                        column: x => x.report_id,
                        principalTable: "inaccurate_information_reports",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_report_evidence_owned_media_owned_media_id",
                        column: x => x.owned_media_id,
                        principalTable: "owned_media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "report_status_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    report_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_status = table.Column<int>(type: "integer", nullable: true),
                    to_status = table.Column<int>(type: "integer", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    outcome = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    public_note = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_report_status_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_report_status_history_app_users_actor_id",
                        column: x => x.actor_id,
                        principalTable: "app_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_report_status_history_inaccurate_information_reports_report~",
                        column: x => x.report_id,
                        principalTable: "inaccurate_information_reports",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_access_scopes_location_id_name",
                table: "access_scopes",
                columns: new[] { "location_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_community_assessments_location_feature_id_feature_version_a~",
                table: "community_assessments",
                columns: new[] { "location_feature_id", "feature_version", "as_of_at" });

            migrationBuilder.CreateIndex(
                name: "IX_community_comment_status_history_actor_id",
                table: "community_comment_status_history",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_comment_status_history_community_comment_id",
                table: "community_comment_status_history",
                column: "community_comment_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_author_id",
                table: "community_comments",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_location_id_status_created_at_utc_id",
                table: "community_comments",
                columns: new[] { "location_id", "status", "created_at_utc", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_moderated_by_id",
                table: "community_comments",
                column: "moderated_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_scope_id",
                table: "community_comments",
                column: "scope_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_vote_status_history_actor_id",
                table: "community_vote_status_history",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_vote_status_history_community_vote_id_occurred_at",
                table: "community_vote_status_history",
                columns: new[] { "community_vote_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_community_votes_evidence_submission_id",
                table: "community_votes",
                column: "evidence_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_votes_location_feature_id_observed_feature_versio~",
                table: "community_votes",
                columns: new[] { "location_feature_id", "observed_feature_version", "voter_id" },
                unique: true,
                filter: "status IN (1, 2, 3)");

            migrationBuilder.CreateIndex(
                name: "IX_community_votes_superseded_by_vote_id",
                table: "community_votes",
                column: "superseded_by_vote_id");

            migrationBuilder.CreateIndex(
                name: "IX_community_votes_voter_id",
                table: "community_votes",
                column: "voter_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_case_votes_community_vote_id",
                table: "dispute_case_votes",
                column: "community_vote_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_case_votes_dispute_case_id_community_vote_id",
                table: "dispute_case_votes",
                columns: new[] { "dispute_case_id", "community_vote_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dispute_cases_correction_submission_id",
                table: "dispute_cases",
                column: "correction_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_cases_location_feature_id_feature_version",
                table: "dispute_cases",
                columns: new[] { "location_feature_id", "feature_version" },
                unique: true,
                filter: "status IN (1, 2, 3, 4)");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_decisions_correction_submission_id",
                table: "dispute_decisions",
                column: "correction_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_decisions_dispute_case_id",
                table: "dispute_decisions",
                column: "dispute_case_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispute_decisions_moderator_id",
                table: "dispute_decisions",
                column: "moderator_id");

            migrationBuilder.CreateIndex(
                name: "IX_feature_assessment_jobs_location_feature_id_feature_version",
                table: "feature_assessment_jobs",
                columns: new[] { "location_feature_id", "feature_version" },
                unique: true,
                filter: "status IN (1, 2, 3)");

            migrationBuilder.CreateIndex(
                name: "IX_feature_assessment_jobs_location_feature_id_feature_version~",
                table: "feature_assessment_jobs",
                columns: new[] { "location_feature_id", "feature_version", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_feature_community_states_location_feature_id",
                table: "feature_community_states",
                column: "location_feature_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_records_actor_id_endpoint_key",
                table: "idempotency_records",
                columns: new[] { "actor_id", "endpoint", "key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_idempotency_records_expires_at",
                table: "idempotency_records",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_inaccurate_information_reports_linked_dispute_case_id",
                table: "inaccurate_information_reports",
                column: "linked_dispute_case_id");

            migrationBuilder.CreateIndex(
                name: "IX_inaccurate_information_reports_linked_submission_id",
                table: "inaccurate_information_reports",
                column: "linked_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_inaccurate_information_reports_location_id_status_created_a~",
                table: "inaccurate_information_reports",
                columns: new[] { "location_id", "status", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_inaccurate_information_reports_reporter_id_created_at_utc_id",
                table: "inaccurate_information_reports",
                columns: new[] { "reporter_id", "created_at_utc", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_inaccurate_information_reports_scope_id",
                table: "inaccurate_information_reports",
                column: "scope_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_feature_history_location_feature_id_feature_version",
                table: "location_feature_history",
                columns: new[] { "location_feature_id", "feature_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_location_feature_history_published_by_id",
                table: "location_feature_history",
                column: "published_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_feature_history_source_submission_id",
                table: "location_feature_history",
                column: "source_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_features_location_id_feature_type",
                table: "location_features",
                columns: new[] { "location_id", "feature_type" },
                unique: true,
                filter: "scope_id IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_location_features_location_id_scope_id_feature_type",
                table: "location_features",
                columns: new[] { "location_id", "scope_id", "feature_type" },
                unique: true,
                filter: "scope_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_location_features_scope_id",
                table: "location_features",
                column: "scope_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_features_source_submission_id",
                table: "location_features",
                column: "source_submission_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_metadata_history_changed_by_id",
                table: "location_metadata_history",
                column: "changed_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_metadata_history_location_id_metadata_version",
                table: "location_metadata_history",
                columns: new[] { "location_id", "metadata_version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_location_metadata_history_source_report_id",
                table: "location_metadata_history",
                column: "source_report_id");

            migrationBuilder.CreateIndex(
                name: "IX_outbox_messages_processed_at_occurred_at",
                table: "outbox_messages",
                columns: new[] { "processed_at", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_owned_media_location_id",
                table: "owned_media",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_owned_media_owner_id",
                table: "owned_media",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_owned_media_storage_key",
                table: "owned_media",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_submission_id",
                table: "point_transactions",
                column: "submission_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_report_evidence_added_by_reporter_id",
                table: "report_evidence",
                column: "added_by_reporter_id");

            migrationBuilder.CreateIndex(
                name: "IX_report_evidence_owned_media_id",
                table: "report_evidence",
                column: "owned_media_id");

            migrationBuilder.CreateIndex(
                name: "IX_report_evidence_report_id_added_by_reporter_id_idempotency_~",
                table: "report_evidence",
                columns: new[] { "report_id", "added_by_reporter_id", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_report_evidence_report_id_created_at_utc_id",
                table: "report_evidence",
                columns: new[] { "report_id", "created_at_utc", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_report_status_history_actor_id",
                table: "report_status_history",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "IX_report_status_history_report_id_occurred_at",
                table: "report_status_history",
                columns: new[] { "report_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_submission_claims_location_id",
                table: "submission_claims",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_submission_claims_scope_id",
                table: "submission_claims",
                column: "scope_id");

            migrationBuilder.CreateIndex(
                name: "IX_submission_claims_submission_id_feature_type",
                table: "submission_claims",
                columns: new[] { "submission_id", "feature_type" },
                unique: true,
                filter: "scope_id IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_submission_claims_submission_id_scope_id_feature_type",
                table: "submission_claims",
                columns: new[] { "submission_id", "scope_id", "feature_type" },
                unique: true,
                filter: "scope_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_temporary_access_advisories_created_by_id",
                table: "temporary_access_advisories",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_temporary_access_advisories_dispute_case_id",
                table: "temporary_access_advisories",
                column: "dispute_case_id");

            migrationBuilder.CreateIndex(
                name: "IX_temporary_access_advisories_location_feature_id_starts_at_e~",
                table: "temporary_access_advisories",
                columns: new[] { "location_feature_id", "starts_at", "ends_at" });

            migrationBuilder.CreateIndex(
                name: "IX_temporary_access_advisories_revoked_by_id",
                table: "temporary_access_advisories",
                column: "revoked_by_id");

            migrationBuilder.CreateIndex(
                name: "IX_upload_intents_location_id",
                table: "upload_intents",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_upload_intents_owned_media_id",
                table: "upload_intents",
                column: "owned_media_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_upload_intents_owner_id",
                table: "upload_intents",
                column: "owner_id");

            // Project the five approved WF-02 feature types from the legacy Place flags. Null
            // remains "not published"; false is an explicit NotAvailable publication. No vote,
            // report or confidence value is invented by this backfill.
            migrationBuilder.Sql("""
                INSERT INTO location_features (
                    id, location_id, scope_id, feature_type, current_status, version,
                    source_submission_id, verified_at, is_published, created_at_utc, updated_at_utc)
                SELECT
                    gen_random_uuid(), p.id, NULL, legacy.feature_type,
                    CASE WHEN legacy.is_available THEN 1 ELSE 3 END,
                    1, NULL,
                    p.last_verified_at,
                    TRUE, now(), NULL
                FROM places p
                CROSS JOIN LATERAL (VALUES
                    (1, p.has_ramp),
                    (2, p.door_width_ok),
                    (3, p.has_accessible_elevator),
                    (4, p.has_accessible_restroom),
                    (5, p.has_tactile_paving)
                ) AS legacy(feature_type, is_available)
                WHERE p.last_verified_at IS NOT NULL
                  AND legacy.is_available IS NOT NULL
                ON CONFLICT (location_id, feature_type) WHERE scope_id IS NULL DO NOTHING;

                INSERT INTO location_feature_history (
                    id, location_feature_id, feature_version, status, source_submission_id,
                    published_by_id, reason, effective_at, created_at_utc, updated_at_utc)
                SELECT
                    gen_random_uuid(), f.id, f.version, f.current_status, f.source_submission_id,
                    NULL, 'WF-02 rollout backfill from the legacy published Place projection.',
                    f.verified_at, now(), NULL
                FROM location_features f
                WHERE f.is_published
                ON CONFLICT (location_feature_id, feature_version) DO NOTHING;

                INSERT INTO feature_community_states (
                    id, location_feature_id, feature_version, label, weighted_agreement,
                    eligible_voter_count, contradicting_voter_count, last_trusted_reconfirmed_at,
                    freshness_factor, active_dispute_case_id, computed_at, policy_version,
                    version, created_at_utc, updated_at_utc)
                SELECT
                    gen_random_uuid(), f.id, f.version,
                    CASE WHEN f.verified_at < now() - interval '90 days' THEN 4 ELSE 1 END,
                    NULL, 0, 0, NULL,
                    CASE
                        WHEN f.verified_at >= now() - interval '90 days' THEN 1
                        ELSE power(2::numeric,
                            -((extract(epoch FROM (now() - f.verified_at)) / 86400) - 90) / 180)
                    END,
                    NULL, now(), 'wf02-v1', 1, now(), NULL
                FROM location_features f
                ON CONFLICT (location_feature_id) DO NOTHING;

                DO $wf02$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'FK_places_places_merged_into_location_id'
                    ) THEN
                        ALTER TABLE places ADD CONSTRAINT "FK_places_places_merged_into_location_id"
                            FOREIGN KEY (merged_into_location_id) REFERENCES places(id) ON DELETE RESTRICT;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'CK_places_merge_not_self'
                    ) THEN
                        ALTER TABLE places ADD CONSTRAINT "CK_places_merge_not_self"
                            CHECK (merged_into_location_id IS NULL OR merged_into_location_id <> id);
                    END IF;
                END $wf02$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "community_assessments");

            migrationBuilder.DropTable(
                name: "community_comment_status_history");

            migrationBuilder.DropTable(
                name: "community_vote_status_history");

            migrationBuilder.DropTable(
                name: "dispute_case_votes");

            migrationBuilder.DropTable(
                name: "dispute_decisions");

            migrationBuilder.DropTable(
                name: "feature_assessment_jobs");

            migrationBuilder.DropTable(
                name: "feature_community_states");

            migrationBuilder.DropTable(
                name: "idempotency_records");

            migrationBuilder.DropTable(
                name: "location_feature_history");

            migrationBuilder.DropTable(
                name: "location_metadata_history");

            migrationBuilder.DropTable(
                name: "outbox_messages");

            migrationBuilder.DropTable(
                name: "report_evidence");

            migrationBuilder.DropTable(
                name: "report_status_history");

            migrationBuilder.DropTable(
                name: "submission_claims");

            migrationBuilder.DropTable(
                name: "temporary_access_advisories");

            migrationBuilder.DropTable(
                name: "upload_intents");

            migrationBuilder.DropTable(
                name: "community_comments");

            migrationBuilder.DropTable(
                name: "community_votes");

            migrationBuilder.DropTable(
                name: "inaccurate_information_reports");

            migrationBuilder.DropTable(
                name: "owned_media");

            migrationBuilder.DropTable(
                name: "dispute_cases");

            migrationBuilder.DropTable(
                name: "app_users");

            migrationBuilder.DropTable(
                name: "location_features");

            migrationBuilder.DropTable(
                name: "access_scopes");

            // The WF-01 base tables and additive Place versioning columns deliberately remain.
            // They may predate this migration and must never be destroyed by a WF-02 rollback.
        }
    }
}
