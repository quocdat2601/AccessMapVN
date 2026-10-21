using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AccessMapVN.Infrastructure.Persistence;

public class ApplicationDbContextInitialiser
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;

    public ApplicationDbContextInitialiser(
        ApplicationDbContext context,
        ILogger<ApplicationDbContextInitialiser> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitialiseAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_context.Database.IsRelational())
            {
                try
                {
                    await _context.Database.MigrateAsync(cancellationToken);
                    try
                    {
                        await _context.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS unaccent;", cancellationToken);
                    }
                    catch
                    {
                        // Non-fatal if extension cannot be created
                    }
                    _logger.LogInformation("Database migrations applied successfully.");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "MigrateAsync failed or partially applied; proceeding with raw DDL verification.");
                }
            }

            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync(cancellationToken);
            }

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS submissions (
                    id UUID PRIMARY KEY,
                    submission_code VARCHAR(50) NOT NULL,
                    client_submission_id VARCHAR(100) NOT NULL DEFAULT '',
                    payload_hash VARCHAR(100) NOT NULL DEFAULT '',
                    place_id VARCHAR(100) NOT NULL,
                    user_id VARCHAR(100) NOT NULL,
                    media_urls TEXT[] NOT NULL,
                    feature_tags TEXT[] NOT NULL,
                    measurements_json TEXT NULL,
                    client_observations_json TEXT NULL,
                    ai_observations_json TEXT NULL,
                    gps_lat DOUBLE PRECISION NOT NULL,
                    gps_lng DOUBLE PRECISION NOT NULL,
                    accuracy_meters DOUBLE PRECISION NULL,
                    text_description TEXT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'PendingModeration',
                    exp_status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
                    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.88,
                    points_awarded INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at_utc TIMESTAMPTZ NULL
                );

                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_submission_id VARCHAR(100) NOT NULL DEFAULT '';
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(100) NOT NULL DEFAULT '';
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS measurements_json TEXT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_observations_json TEXT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_observations_json TEXT NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS exp_status VARCHAR(50) NOT NULL DEFAULT 'pending_review';
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS distance_meters DOUBLE PRECISION NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS effective_distance_meters DOUBLE PRECISION NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS geofence_policy VARCHAR(50) NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS allowed_radius_meters DOUBLE PRECISION NULL;
                ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_mocked BOOLEAN NULL;

                ALTER TABLE places ADD COLUMN IF NOT EXISTS entrance_lat DOUBLE PRECISION NULL;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS entrance_lng DOUBLE PRECISION NULL;
                ALTER TABLE places ADD COLUMN IF NOT EXISTS geofence_radius_meters DOUBLE PRECISION NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_user_client_sub 
                ON submissions (user_id, client_submission_id)
                WHERE client_submission_id <> '';

                CREATE TABLE IF NOT EXISTS point_transactions (
                    id UUID PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    submission_id VARCHAR(50) NOT NULL,
                    points INTEGER NOT NULL DEFAULT 50,
                    reason TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at_utc TIMESTAMPTZ NULL
                );

                -- Access Points & Lookup Tables
                CREATE TABLE IF NOT EXISTS access_point_kinds (
                    code VARCHAR(30) PRIMARY KEY,
                    display_name VARCHAR(100) NOT NULL
                );

                INSERT INTO access_point_kinds (code, display_name) VALUES
                    ('entrance', 'Main or secondary entrance'),
                    ('ramp', 'Ramp or sloped pathway'),
                    ('elevator', 'Elevator access'),
                    ('restroom', 'Accessible restroom door')
                ON CONFLICT (code) DO NOTHING;

                CREATE TABLE IF NOT EXISTS location_sources (
                    code VARCHAR(30) PRIMARY KEY,
                    display_name VARCHAR(100) NOT NULL
                );

                INSERT INTO location_sources (code, display_name) VALUES
                    ('user_pin', 'User-selected coordinate pin'),
                    ('survey_exif', 'EXIF metadata from uploaded photo'),
                    ('place_center', 'Defaulted to center of place/building')
                ON CONFLICT (code) DO NOTHING;

                CREATE TABLE IF NOT EXISTS access_points (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    kind VARCHAR(30) NOT NULL REFERENCES access_point_kinds(code),
                    geom GEOGRAPHY(Point, 4326) NULL,
                    location_source VARCHAR(30) NOT NULL REFERENCES location_sources(code),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_access_points_place_id ON access_points (place_id);

                -- Measurement Lookup Tables
                CREATE TABLE IF NOT EXISTS media_kinds (
                    code VARCHAR(20) PRIMARY KEY,
                    display_name VARCHAR(50) NOT NULL
                );

                INSERT INTO media_kinds (code, display_name) VALUES
                    ('photo', 'Static photographic evidence'),
                    ('video', 'Short recorded video clip (5-10s)')
                ON CONFLICT (code) DO NOTHING;

                CREATE TABLE IF NOT EXISTS measurement_units (
                    code VARCHAR(20) PRIMARY KEY,
                    display_name VARCHAR(50) NOT NULL
                );

                INSERT INTO measurement_units (code, display_name) VALUES
                    ('mm', 'Millimeters'),
                    ('cm', 'Centimeters'),
                    ('percent', 'Percentage slope (%)'),
                    ('degree', 'Slope in degrees'),
                    ('count', 'Discrete count')
                ON CONFLICT (code) DO NOTHING;

                CREATE TABLE IF NOT EXISTS measurement_methods (
                    code VARCHAR(30) PRIMARY KEY,
                    display_name VARCHAR(100) NOT NULL,
                    trust_weight NUMERIC(3,2) NULL -- Reserved for future consensus; not used in MVP scoring
                );

                ALTER TABLE measurement_methods ALTER COLUMN trust_weight DROP NOT NULL;

                INSERT INTO measurement_methods (code, display_name, trust_weight) VALUES
                    ('tape_measure', 'Physical tape measure with evidence photo', NULL),
                    ('laser_measure', 'Digital laser distance meter', NULL),
                    ('ar_ruler', 'Smartphone AR ruler / LiDAR measurement', NULL),
                    ('visual_estimate', 'Visual rough estimate without tool', NULL)
                ON CONFLICT (code) DO NOTHING;

                CREATE TABLE IF NOT EXISTS measurement_features (
                    feature_name VARCHAR(50) PRIMARY KEY,
                    display_name VARCHAR(100) NOT NULL
                );

                INSERT INTO measurement_features (feature_name, display_name) VALUES
                    ('door_clear_width', 'Clear opening width of door'),
                    ('ramp_slope', 'Slope gradient of ramp'),
                    ('step_height', 'Height of entrance step/curb'),
                    ('corridor_width', 'Passage corridor clear width')
                ON CONFLICT (feature_name) DO NOTHING;

                CREATE TABLE IF NOT EXISTS measurement_feature_units (
                    feature_name VARCHAR(50) NOT NULL REFERENCES measurement_features(feature_name) ON DELETE CASCADE,
                    unit_code VARCHAR(20) NOT NULL REFERENCES measurement_units(code) ON DELETE CASCADE,
                    PRIMARY KEY (feature_name, unit_code)
                );

                INSERT INTO measurement_feature_units (feature_name, unit_code) VALUES
                    ('door_clear_width', 'mm'),
                    ('door_clear_width', 'cm'),
                    ('ramp_slope', 'percent'),
                    ('step_height', 'mm'),
                    ('step_height', 'cm'),
                    ('corridor_width', 'mm'),
                    ('corridor_width', 'cm')
                ON CONFLICT DO NOTHING;

                DELETE FROM measurement_feature_units 
                WHERE feature_name = 'ramp_slope' AND unit_code = 'degree';

                -- Observation Log (Append-only with ON DELETE RESTRICT on access point)
                CREATE TABLE IF NOT EXISTS measurement_observations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE RESTRICT,
                    feature_name VARCHAR(50) NOT NULL,
                    contributor_id UUID NOT NULL,
                    reported_value NUMERIC(12,4) NOT NULL,
                    unit VARCHAR(20) NOT NULL,
                    method VARCHAR(30) NOT NULL REFERENCES measurement_methods(code),
                    evidence_media_urls JSONB NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT fk_observation_feature_unit FOREIGN KEY (feature_name, unit) 
                        REFERENCES measurement_feature_units (feature_name, unit_code)
                );

                CREATE INDEX IF NOT EXISTS idx_obs_ap_feat ON measurement_observations (access_point_id, feature_name);
                CREATE INDEX IF NOT EXISTS idx_obs_contributor ON measurement_observations (contributor_id);

                -- Measurement Evidence (Lifecycle & Privacy Gate)
                CREATE TABLE IF NOT EXISTS measurement_evidence (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    observation_id UUID NOT NULL REFERENCES measurement_observations(id) ON DELETE CASCADE,
                    media_url TEXT NOT NULL,
                    media_kind VARCHAR(20) NOT NULL REFERENCES media_kinds(code),
                    privacy_status VARCHAR(20) NOT NULL DEFAULT 'pending_review' 
                        CHECK (privacy_status IN ('not_required', 'blurred', 'pending_review', 'failed')),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_evidence_observation_id ON measurement_evidence (observation_id);

                -- Place Measurements (Read-model Projection)
                CREATE TABLE IF NOT EXISTS place_measurements (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
                    feature_name VARCHAR(50) NOT NULL,
                    consensus_value NUMERIC(12,4) NULL,
                    unit VARCHAR(20) NOT NULL,
                    status VARCHAR(30) NOT NULL DEFAULT 'single_source',
                    distinct_contributors_count INT NOT NULL DEFAULT 0,
                    latest_observation_id UUID NULL REFERENCES measurement_observations(id) ON DELETE SET NULL,
                    last_verified_at TIMESTAMPTZ NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT uq_place_measurement_ap_feat UNIQUE (access_point_id, feature_name),
                    CONSTRAINT fk_place_measurement_feature_unit FOREIGN KEY (feature_name, unit) 
                        REFERENCES measurement_feature_units (feature_name, unit_code)
                );

                CREATE INDEX IF NOT EXISTS idx_pm_access_point_id ON place_measurements (access_point_id);

                -- Idempotent composite foreign key check for pre-existing tables
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'measurement_observations' AND column_name = 'contributor_id' AND data_type = 'character varying'
                    ) THEN
                        ALTER TABLE measurement_observations ALTER COLUMN contributor_id TYPE UUID USING contributor_id::uuid;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_observation_feature_unit'
                    ) THEN
                        ALTER TABLE measurement_observations 
                        ADD CONSTRAINT fk_observation_feature_unit 
                        FOREIGN KEY (feature_name, unit) REFERENCES measurement_feature_units (feature_name, unit_code);
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_place_measurement_feature_unit'
                    ) THEN
                        ALTER TABLE place_measurements 
                        ADD CONSTRAINT fk_place_measurement_feature_unit 
                        FOREIGN KEY (feature_name, unit) REFERENCES measurement_feature_units (feature_name, unit_code);
                    END IF;
                END $$;";

            await cmd.ExecuteNonQueryAsync(cancellationToken);
            _logger.LogInformation("Database tables verified/initialized successfully.");

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initializing database tables.");
            throw;
        }
    }
}
