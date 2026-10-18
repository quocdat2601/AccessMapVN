using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AccessMapVN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Wf02MapProjectionFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The prior migration owns the function and restores it on a full rollback.
        }
    }
}
