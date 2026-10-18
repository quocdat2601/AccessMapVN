CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE app_users (
        id uuid NOT NULL,
        display_name character varying(200),
        role integer NOT NULL,
        is_active boolean NOT NULL,
        reputation_score numeric(12,4) NOT NULL,
        reputation_tier character varying(100) NOT NULL,
        reputation_policy_version character varying(100) NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_app_users" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE outbox_messages (
        id uuid NOT NULL,
        type character varying(200) NOT NULL,
        payload_json jsonb NOT NULL,
        occurred_at timestamp with time zone NOT NULL,
        processed_at timestamp with time zone,
        attempts integer NOT NULL,
        last_error character varying(2000),
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_outbox_messages" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE idempotency_records (
        id uuid NOT NULL,
        actor_id uuid NOT NULL,
        endpoint character varying(300) NOT NULL,
        key character varying(200) NOT NULL,
        request_hash character varying(128) NOT NULL,
        response_status_code integer NOT NULL,
        response_body jsonb NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_idempotency_records" PRIMARY KEY (id),
        CONSTRAINT "FK_idempotency_records_app_users_actor_id" FOREIGN KEY (actor_id) REFERENCES app_users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE access_scopes (
        id uuid NOT NULL,
        location_id uuid NOT NULL,
        name character varying(300) NOT NULL,
        scope_type character varying(100) NOT NULL,
        latitude double precision,
        longitude double precision,
        is_active boolean NOT NULL,
        version integer NOT NULL DEFAULT 1,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_access_scopes" PRIMARY KEY (id),
        CONSTRAINT "FK_access_scopes_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE owned_media (
        id uuid NOT NULL,
        owner_id uuid NOT NULL,
        location_id uuid NOT NULL,
        storage_key character varying(1000) NOT NULL,
        mime_type character varying(200) NOT NULL,
        size_bytes bigint NOT NULL,
        sha256 character varying(128) NOT NULL,
        status integer NOT NULL,
        expires_at timestamp with time zone,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_owned_media" PRIMARY KEY (id),
        CONSTRAINT "FK_owned_media_app_users_owner_id" FOREIGN KEY (owner_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_owned_media_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE community_comments (
        id uuid NOT NULL,
        location_id uuid NOT NULL,
        scope_id uuid,
        author_id uuid NOT NULL,
        body character varying(2000) NOT NULL,
        status integer NOT NULL,
        moderated_by_id uuid,
        moderated_at timestamp with time zone,
        moderation_reason character varying(1500),
        version integer NOT NULL DEFAULT 1,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_community_comments" PRIMARY KEY (id),
        CONSTRAINT "FK_community_comments_access_scopes_scope_id" FOREIGN KEY (scope_id) REFERENCES access_scopes (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_comments_app_users_author_id" FOREIGN KEY (author_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_comments_app_users_moderated_by_id" FOREIGN KEY (moderated_by_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_comments_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE location_features (
        id uuid NOT NULL,
        location_id uuid NOT NULL,
        scope_id uuid,
        feature_type integer NOT NULL,
        current_status integer NOT NULL,
        version integer NOT NULL DEFAULT 1,
        source_submission_id uuid,
        verified_at timestamp with time zone NOT NULL,
        is_published boolean NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_location_features" PRIMARY KEY (id),
        CONSTRAINT "FK_location_features_access_scopes_scope_id" FOREIGN KEY (scope_id) REFERENCES access_scopes (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_location_features_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_location_features_submissions_source_submission_id" FOREIGN KEY (source_submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE submission_claims (
        id uuid NOT NULL,
        submission_id uuid NOT NULL,
        location_id uuid NOT NULL,
        scope_id uuid,
        feature_type integer NOT NULL,
        proposed_status integer NOT NULL,
        status integer NOT NULL,
        ai_confidence numeric(12,8),
        community_confidence numeric(12,8),
        final_confidence numeric(12,8),
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_submission_claims" PRIMARY KEY (id),
        CONSTRAINT "FK_submission_claims_access_scopes_scope_id" FOREIGN KEY (scope_id) REFERENCES access_scopes (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_submission_claims_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_submission_claims_submissions_submission_id" FOREIGN KEY (submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE upload_intents (
        id uuid NOT NULL,
        owner_id uuid NOT NULL,
        location_id uuid NOT NULL,
        owned_media_id uuid NOT NULL,
        status integer NOT NULL,
        upload_token_hash character varying(128) NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        consumed_at timestamp with time zone,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_upload_intents" PRIMARY KEY (id),
        CONSTRAINT "FK_upload_intents_app_users_owner_id" FOREIGN KEY (owner_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_upload_intents_owned_media_owned_media_id" FOREIGN KEY (owned_media_id) REFERENCES owned_media (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_upload_intents_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE community_comment_status_history (
        id uuid NOT NULL,
        community_comment_id uuid NOT NULL,
        from_status integer,
        to_status integer NOT NULL,
        actor_id uuid NOT NULL,
        reason character varying(1500) NOT NULL,
        occurred_at timestamp with time zone NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_community_comment_status_history" PRIMARY KEY (id),
        CONSTRAINT "FK_community_comment_status_history_app_users_actor_id" FOREIGN KEY (actor_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_comment_status_history_community_comments_communi~" FOREIGN KEY (community_comment_id) REFERENCES community_comments (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE community_assessments (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        feature_version integer NOT NULL,
        as_of_at timestamp with time zone NOT NULL,
        weighted_agreement numeric(12,8),
        eligible_voter_count integer NOT NULL,
        contradicting_voter_count integer NOT NULL,
        result_label integer NOT NULL,
        freshness_factor numeric(12,8) NOT NULL,
        policy_version character varying(100) NOT NULL,
        decision_snapshot_json jsonb NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_community_assessments" PRIMARY KEY (id),
        CONSTRAINT "FK_community_assessments_location_features_location_feature_id" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE community_votes (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        voter_id uuid NOT NULL,
        observed_feature_version integer NOT NULL,
        vote_type integer NOT NULL,
        proposed_status integer,
        comment character varying(1500),
        status integer NOT NULL,
        evidence_submission_id uuid,
        superseded_by_vote_id uuid,
        reputation_score_snapshot numeric(12,4),
        reputation_tier_snapshot character varying(100),
        tier_factor_snapshot numeric(8,4),
        eligibility_reason character varying(500),
        policy_version character varying(100) NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_community_votes" PRIMARY KEY (id),
        CONSTRAINT "FK_community_votes_app_users_voter_id" FOREIGN KEY (voter_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_votes_community_votes_superseded_by_vote_id" FOREIGN KEY (superseded_by_vote_id) REFERENCES community_votes (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_votes_location_features_location_feature_id" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_votes_submissions_evidence_submission_id" FOREIGN KEY (evidence_submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE dispute_cases (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        feature_version integer NOT NULL,
        status integer NOT NULL,
        open_reason character varying(1500) NOT NULL,
        opened_at timestamp with time zone NOT NULL,
        resolved_at timestamp with time zone,
        correction_submission_id uuid,
        version integer NOT NULL DEFAULT 1,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_dispute_cases" PRIMARY KEY (id),
        CONSTRAINT "FK_dispute_cases_location_features_location_feature_id" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_dispute_cases_submissions_correction_submission_id" FOREIGN KEY (correction_submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE feature_assessment_jobs (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        feature_version integer NOT NULL,
        status integer NOT NULL,
        revision integer NOT NULL,
        attempts integer NOT NULL,
        lease_expires_at timestamp with time zone,
        next_attempt_at timestamp with time zone,
        as_of_at timestamp with time zone,
        last_error_category character varying(100),
        last_error_message character varying(2000),
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_feature_assessment_jobs" PRIMARY KEY (id),
        CONSTRAINT "FK_feature_assessment_jobs_location_features_location_feature_~" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE feature_community_states (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        feature_version integer NOT NULL,
        label integer NOT NULL,
        weighted_agreement numeric(12,8),
        eligible_voter_count integer NOT NULL,
        contradicting_voter_count integer NOT NULL,
        last_trusted_reconfirmed_at timestamp with time zone,
        freshness_factor numeric(12,8) NOT NULL,
        active_dispute_case_id uuid,
        computed_at timestamp with time zone NOT NULL,
        policy_version character varying(100) NOT NULL,
        version integer NOT NULL DEFAULT 1,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_feature_community_states" PRIMARY KEY (id),
        CONSTRAINT "FK_feature_community_states_location_features_location_feature~" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE location_feature_history (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        feature_version integer NOT NULL,
        status integer NOT NULL,
        source_submission_id uuid,
        published_by_id uuid,
        reason character varying(1500) NOT NULL,
        effective_at timestamp with time zone NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_location_feature_history" PRIMARY KEY (id),
        CONSTRAINT "FK_location_feature_history_app_users_published_by_id" FOREIGN KEY (published_by_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_location_feature_history_location_features_location_feature~" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_location_feature_history_submissions_source_submission_id" FOREIGN KEY (source_submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE community_vote_status_history (
        id uuid NOT NULL,
        community_vote_id uuid NOT NULL,
        from_status integer,
        to_status integer NOT NULL,
        actor_id uuid,
        reason character varying(1000) NOT NULL,
        occurred_at timestamp with time zone NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_community_vote_status_history" PRIMARY KEY (id),
        CONSTRAINT "FK_community_vote_status_history_app_users_actor_id" FOREIGN KEY (actor_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_community_vote_status_history_community_votes_community_vot~" FOREIGN KEY (community_vote_id) REFERENCES community_votes (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE dispute_case_votes (
        id uuid NOT NULL,
        dispute_case_id uuid NOT NULL,
        community_vote_id uuid NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_dispute_case_votes" PRIMARY KEY (id),
        CONSTRAINT "FK_dispute_case_votes_community_votes_community_vote_id" FOREIGN KEY (community_vote_id) REFERENCES community_votes (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_dispute_case_votes_dispute_cases_dispute_case_id" FOREIGN KEY (dispute_case_id) REFERENCES dispute_cases (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE dispute_decisions (
        id uuid NOT NULL,
        dispute_case_id uuid NOT NULL,
        decision_type integer NOT NULL,
        moderator_id uuid NOT NULL,
        reason character varying(2000) NOT NULL,
        correction_submission_id uuid,
        advisory_id uuid,
        decided_at timestamp with time zone NOT NULL,
        case_version integer NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_dispute_decisions" PRIMARY KEY (id),
        CONSTRAINT "FK_dispute_decisions_app_users_moderator_id" FOREIGN KEY (moderator_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_dispute_decisions_dispute_cases_dispute_case_id" FOREIGN KEY (dispute_case_id) REFERENCES dispute_cases (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_dispute_decisions_submissions_correction_submission_id" FOREIGN KEY (correction_submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE inaccurate_information_reports (
        id uuid NOT NULL,
        location_id uuid NOT NULL,
        reporter_id uuid NOT NULL,
        scope_id uuid,
        feature_type integer,
        observed_feature_version integer,
        reason integer NOT NULL,
        description character varying(4000) NOT NULL,
        status integer NOT NULL,
        is_stale_baseline boolean NOT NULL,
        proposed_address character varying(1000),
        proposed_latitude double precision,
        proposed_longitude double precision,
        linked_dispute_case_id uuid,
        linked_submission_id uuid,
        resolution integer,
        public_resolution_note character varying(1500),
        reporter_action_note character varying(1500),
        version integer NOT NULL DEFAULT 1,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_inaccurate_information_reports" PRIMARY KEY (id),
        CONSTRAINT "FK_inaccurate_information_reports_access_scopes_scope_id" FOREIGN KEY (scope_id) REFERENCES access_scopes (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_inaccurate_information_reports_app_users_reporter_id" FOREIGN KEY (reporter_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_inaccurate_information_reports_dispute_cases_linked_dispute~" FOREIGN KEY (linked_dispute_case_id) REFERENCES dispute_cases (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_inaccurate_information_reports_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_inaccurate_information_reports_submissions_linked_submissio~" FOREIGN KEY (linked_submission_id) REFERENCES submissions (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE temporary_access_advisories (
        id uuid NOT NULL,
        location_feature_id uuid NOT NULL,
        dispute_case_id uuid,
        status integer NOT NULL,
        reason character varying(1500) NOT NULL,
        starts_at timestamp with time zone NOT NULL,
        ends_at timestamp with time zone NOT NULL,
        created_by_id uuid NOT NULL,
        revoked_by_id uuid,
        revocation_reason character varying(1500),
        version integer NOT NULL DEFAULT 1,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_temporary_access_advisories" PRIMARY KEY (id),
        CONSTRAINT "FK_temporary_access_advisories_app_users_created_by_id" FOREIGN KEY (created_by_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_temporary_access_advisories_app_users_revoked_by_id" FOREIGN KEY (revoked_by_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_temporary_access_advisories_dispute_cases_dispute_case_id" FOREIGN KEY (dispute_case_id) REFERENCES dispute_cases (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_temporary_access_advisories_location_features_location_feat~" FOREIGN KEY (location_feature_id) REFERENCES location_features (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE location_metadata_history (
        id uuid NOT NULL,
        location_id uuid NOT NULL,
        metadata_version integer NOT NULL,
        source_report_id uuid,
        changed_by_id uuid NOT NULL,
        before_json jsonb NOT NULL,
        after_json jsonb NOT NULL,
        reason character varying(2000) NOT NULL,
        effective_at timestamp with time zone NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_location_metadata_history" PRIMARY KEY (id),
        CONSTRAINT "FK_location_metadata_history_app_users_changed_by_id" FOREIGN KEY (changed_by_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_location_metadata_history_inaccurate_information_reports_so~" FOREIGN KEY (source_report_id) REFERENCES inaccurate_information_reports (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_location_metadata_history_places_location_id" FOREIGN KEY (location_id) REFERENCES places (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE report_evidence (
        id uuid NOT NULL,
        report_id uuid NOT NULL,
        added_by_reporter_id uuid NOT NULL,
        description character varying(2000),
        owned_media_id uuid,
        source_version integer NOT NULL,
        idempotency_key character varying(200) NOT NULL,
        request_hash character varying(128) NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_report_evidence" PRIMARY KEY (id),
        CONSTRAINT ck_report_evidence_content CHECK (description IS NOT NULL OR owned_media_id IS NOT NULL),
        CONSTRAINT "FK_report_evidence_app_users_added_by_reporter_id" FOREIGN KEY (added_by_reporter_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_report_evidence_inaccurate_information_reports_report_id" FOREIGN KEY (report_id) REFERENCES inaccurate_information_reports (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_report_evidence_owned_media_owned_media_id" FOREIGN KEY (owned_media_id) REFERENCES owned_media (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE TABLE report_status_history (
        id uuid NOT NULL,
        report_id uuid NOT NULL,
        from_status integer,
        to_status integer NOT NULL,
        actor_id uuid NOT NULL,
        reason character varying(2000) NOT NULL,
        outcome character varying(1000),
        public_note character varying(1500),
        occurred_at timestamp with time zone NOT NULL,
        created_at_utc timestamp with time zone NOT NULL,
        updated_at_utc timestamp with time zone,
        CONSTRAINT "PK_report_status_history" PRIMARY KEY (id),
        CONSTRAINT "FK_report_status_history_app_users_actor_id" FOREIGN KEY (actor_id) REFERENCES app_users (id) ON DELETE RESTRICT,
        CONSTRAINT "FK_report_status_history_inaccurate_information_reports_report~" FOREIGN KEY (report_id) REFERENCES inaccurate_information_reports (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_access_scopes_location_id_name" ON access_scopes (location_id, name);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_assessments_location_feature_id_feature_version_a~" ON community_assessments (location_feature_id, feature_version, as_of_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_comment_status_history_actor_id" ON community_comment_status_history (actor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_comment_status_history_community_comment_id" ON community_comment_status_history (community_comment_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_comments_author_id" ON community_comments (author_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_comments_location_id_status_created_at_utc_id" ON community_comments (location_id, status, created_at_utc, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_comments_moderated_by_id" ON community_comments (moderated_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_comments_scope_id" ON community_comments (scope_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_vote_status_history_actor_id" ON community_vote_status_history (actor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_vote_status_history_community_vote_id_occurred_at" ON community_vote_status_history (community_vote_id, occurred_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_votes_evidence_submission_id" ON community_votes (evidence_submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_community_votes_location_feature_id_observed_feature_versio~" ON community_votes (location_feature_id, observed_feature_version, voter_id) WHERE status IN (1, 2, 3);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_votes_superseded_by_vote_id" ON community_votes (superseded_by_vote_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_community_votes_voter_id" ON community_votes (voter_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_dispute_case_votes_community_vote_id" ON dispute_case_votes (community_vote_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_dispute_case_votes_dispute_case_id_community_vote_id" ON dispute_case_votes (dispute_case_id, community_vote_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_dispute_cases_correction_submission_id" ON dispute_cases (correction_submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_dispute_cases_location_feature_id_feature_version" ON dispute_cases (location_feature_id, feature_version) WHERE status IN (1, 2, 3, 4);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_dispute_decisions_correction_submission_id" ON dispute_decisions (correction_submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_dispute_decisions_dispute_case_id" ON dispute_decisions (dispute_case_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_dispute_decisions_moderator_id" ON dispute_decisions (moderator_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_feature_assessment_jobs_location_feature_id_feature_version" ON feature_assessment_jobs (location_feature_id, feature_version) WHERE status IN (1, 2, 3);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_feature_assessment_jobs_location_feature_id_feature_version~" ON feature_assessment_jobs (location_feature_id, feature_version, status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_feature_community_states_location_feature_id" ON feature_community_states (location_feature_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_idempotency_records_actor_id_endpoint_key" ON idempotency_records (actor_id, endpoint, key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_idempotency_records_expires_at" ON idempotency_records (expires_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_inaccurate_information_reports_linked_dispute_case_id" ON inaccurate_information_reports (linked_dispute_case_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_inaccurate_information_reports_linked_submission_id" ON inaccurate_information_reports (linked_submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_inaccurate_information_reports_location_id_status_created_a~" ON inaccurate_information_reports (location_id, status, created_at_utc);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_inaccurate_information_reports_reporter_id_created_at_utc_id" ON inaccurate_information_reports (reporter_id, created_at_utc, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_inaccurate_information_reports_scope_id" ON inaccurate_information_reports (scope_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_location_feature_history_location_feature_id_feature_version" ON location_feature_history (location_feature_id, feature_version);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_location_feature_history_published_by_id" ON location_feature_history (published_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_location_feature_history_source_submission_id" ON location_feature_history (source_submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_location_features_location_id_feature_type" ON location_features (location_id, feature_type) WHERE scope_id IS NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_location_features_location_id_scope_id_feature_type" ON location_features (location_id, scope_id, feature_type) WHERE scope_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_location_features_scope_id" ON location_features (scope_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_location_features_source_submission_id" ON location_features (source_submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_location_metadata_history_changed_by_id" ON location_metadata_history (changed_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_location_metadata_history_location_id_metadata_version" ON location_metadata_history (location_id, metadata_version);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_location_metadata_history_source_report_id" ON location_metadata_history (source_report_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_outbox_messages_processed_at_occurred_at" ON outbox_messages (processed_at, occurred_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_owned_media_location_id" ON owned_media (location_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_owned_media_owner_id" ON owned_media (owner_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_owned_media_storage_key" ON owned_media (storage_key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_point_transactions_submission_id" ON point_transactions (submission_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_report_evidence_added_by_reporter_id" ON report_evidence (added_by_reporter_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_report_evidence_owned_media_id" ON report_evidence (owned_media_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_report_evidence_report_id_added_by_reporter_id_idempotency_~" ON report_evidence (report_id, added_by_reporter_id, idempotency_key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_report_evidence_report_id_created_at_utc_id" ON report_evidence (report_id, created_at_utc, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_report_status_history_actor_id" ON report_status_history (actor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_report_status_history_report_id_occurred_at" ON report_status_history (report_id, occurred_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_submission_claims_location_id" ON submission_claims (location_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_submission_claims_scope_id" ON submission_claims (scope_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_submission_claims_submission_id_feature_type" ON submission_claims (submission_id, feature_type) WHERE scope_id IS NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_submission_claims_submission_id_scope_id_feature_type" ON submission_claims (submission_id, scope_id, feature_type) WHERE scope_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_temporary_access_advisories_created_by_id" ON temporary_access_advisories (created_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_temporary_access_advisories_dispute_case_id" ON temporary_access_advisories (dispute_case_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_temporary_access_advisories_location_feature_id_starts_at_e~" ON temporary_access_advisories (location_feature_id, starts_at, ends_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_temporary_access_advisories_revoked_by_id" ON temporary_access_advisories (revoked_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_upload_intents_location_id" ON upload_intents (location_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE UNIQUE INDEX "IX_upload_intents_owned_media_id" ON upload_intents (owned_media_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    CREATE INDEX "IX_upload_intents_owner_id" ON upload_intents (owner_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261012100400_Wf02Initial') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261012100400_Wf02Initial', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013143900_Wf02SpatialCompatibilityFix') THEN
    DO $wf02$
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'places'
              AND column_name = 'geom'
        ) THEN
            UPDATE places
            SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            WHERE lat BETWEEN -90 AND 90
              AND lng BETWEEN -180 AND 180
              AND (
                  geom IS NULL OR
                  ST_X(geom::geometry) IS DISTINCT FROM lng OR
                  ST_Y(geom::geometry) IS DISTINCT FROM lat
              );
        END IF;
    END $wf02$;

    CREATE INDEX IF NOT EXISTS "IX_places_active_lat_lng"
        ON places (lat, lng)
        WHERE status = 1 AND merged_into_location_id IS NULL;

    CREATE OR REPLACE FUNCTION get_places_in_bounds(
        p_min_lng double precision,
        p_min_lat double precision,
        p_max_lng double precision,
        p_max_lat double precision,
        p_zoom_level integer,
        p_category_filter text[]
    )
    RETURNS TABLE (
        id uuid,
        name text,
        category text,
        address text,
        phone text,
        website text,
        opening_hours text,
        lng double precision,
        lat double precision,
        floor_level integer,
        building_id uuid,
        has_ramp boolean,
        has_accessible_elevator boolean,
        door_width_ok boolean,
        accessibility_score numeric,
        accessibility_note text,
        last_verified_at timestamptz
    )
    LANGUAGE sql
    STABLE
    PARALLEL SAFE
    AS $function$
        SELECT
            p.id,
            p.name::text,
            p.category::text,
            p.address::text,
            p.phone::text,
            p.website::text,
            p.opening_hours::text,
            p.lng,
            p.lat,
            p.floor_level,
            p.building_id,
            p.has_ramp,
            p.has_accessible_elevator,
            p.door_width_ok,
            p.accessibility_score,
            p.accessibility_note::text,
            p.last_verified_at
        FROM places AS p
        WHERE p.status = 1
          AND p.merged_into_location_id IS NULL
          AND p.lng BETWEEN LEAST(p_min_lng, p_max_lng) AND GREATEST(p_min_lng, p_max_lng)
          AND p.lat BETWEEN LEAST(p_min_lat, p_max_lat) AND GREATEST(p_min_lat, p_max_lat)
          AND (
              p_category_filter IS NULL OR
              cardinality(p_category_filter) = 0 OR
              p.category = ANY(p_category_filter)
          )
        ORDER BY p.id;
    $function$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013143900_Wf02SpatialCompatibilityFix') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261013143900_Wf02SpatialCompatibilityFix', '8.0.11');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018063621_Wf02MapProjectionFix') THEN
    DROP FUNCTION IF EXISTS get_places_in_bounds(
        double precision,
        double precision,
        double precision,
        double precision,
        integer,
        text[]
    );

    CREATE OR REPLACE FUNCTION get_places_in_bounds(
        p_min_lng double precision,
        p_min_lat double precision,
        p_max_lng double precision,
        p_max_lat double precision,
        p_zoom_level integer,
        p_category_filter text[]
    )
    RETURNS TABLE (
        id uuid, name text, category text, address text, phone text,
        website text, opening_hours text, lng double precision,
        lat double precision, floor_level integer, building_id uuid,
        has_ramp boolean, has_accessible_elevator boolean,
        has_tactile_paving boolean, has_accessible_restroom boolean,
        door_width_ok boolean, accessibility_score numeric,
        accessibility_note text, last_verified_at timestamptz
    )
    LANGUAGE sql
    STABLE
    PARALLEL SAFE
    AS $function$
        SELECT
            p.id, p.name::text, p.category::text, p.address::text,
            p.phone::text, p.website::text, p.opening_hours::text,
            p.lng, p.lat, p.floor_level, p.building_id,
            p.has_ramp, p.has_accessible_elevator, p.has_tactile_paving,
            p.has_accessible_restroom, p.door_width_ok, p.accessibility_score,
            p.accessibility_note::text, p.last_verified_at
        FROM places AS p
        WHERE p.status = 1
          AND p.merged_into_location_id IS NULL
          AND p.lng BETWEEN LEAST(p_min_lng, p_max_lng) AND GREATEST(p_min_lng, p_max_lng)
          AND p.lat BETWEEN LEAST(p_min_lat, p_max_lat) AND GREATEST(p_min_lat, p_max_lat)
          AND (
              p_category_filter IS NULL OR
              cardinality(p_category_filter) = 0 OR
              p.category = ANY(p_category_filter)
          )
        ORDER BY p.id;
    $function$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261018063621_Wf02MapProjectionFix') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261018063621_Wf02MapProjectionFix', '8.0.11');
    END IF;
END $EF$;
COMMIT;

