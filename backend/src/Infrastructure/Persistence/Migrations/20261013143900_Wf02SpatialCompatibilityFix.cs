using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccessMapVN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Wf02SpatialCompatibilityFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
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
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP FUNCTION IF EXISTS get_places_in_bounds(
                    double precision,
                    double precision,
                    double precision,
                    double precision,
                    integer,
                    text[]
                );
                DROP INDEX IF EXISTS "IX_places_active_lat_lng";
                """);
        }
    }
}
