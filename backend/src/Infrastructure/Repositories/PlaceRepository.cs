using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.Infrastructure.Repositories;

public class PlaceRepository : IPlaceRepository
{
    private readonly ApplicationDbContext _context;

    public PlaceRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Place?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return null;
        }

        var conn = _context.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(cancellationToken);
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT 
                id,
                name,
                category,
                address,
                phone,
                website,
                opening_hours,
                lng,
                lat,
                floor_level,
                building_id,
                has_ramp,
                has_accessible_elevator,
                has_tactile_paving,
                has_accessible_restroom,
                door_width_ok,
                accessibility_score,
                accessibility_note,
                last_verified_at
            FROM places
            WHERE id = @id
            LIMIT 1;";

        var pId = cmd.CreateParameter();
        pId.ParameterName = "id";
        pId.Value = guid;
        cmd.Parameters.Add(pId);

        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return new Place
            {
                Id = reader.GetGuid(0),
                Name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                Category = reader.IsDBNull(2) ? "other" : reader.GetString(2),
                Address = reader.IsDBNull(3) ? null : reader.GetString(3),
                Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                Website = reader.IsDBNull(5) ? null : reader.GetString(5),
                OpeningHours = reader.IsDBNull(6) ? null : reader.GetString(6),
                Lng = reader.IsDBNull(7) ? 0.0 : reader.GetDouble(7),
                Lat = reader.IsDBNull(8) ? 0.0 : reader.GetDouble(8),
                FloorLevel = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                BuildingId = reader.IsDBNull(10) ? null : reader.GetGuid(10),
                HasRamp = reader.IsDBNull(11) ? null : reader.GetBoolean(11),
                HasAccessibleElevator = reader.IsDBNull(12) ? null : reader.GetBoolean(12),
                HasTactilePaving = reader.IsDBNull(13) ? null : reader.GetBoolean(13),
                HasAccessibleRestroom = reader.IsDBNull(14) ? null : reader.GetBoolean(14),
                DoorWidthOk = reader.IsDBNull(15) ? null : reader.GetBoolean(15),
                AccessibilityScore = reader.IsDBNull(16) ? null : reader.GetDecimal(16),
                AccessibilityNote = reader.IsDBNull(17) ? null : reader.GetString(17),
                LastVerifiedAt = reader.IsDBNull(18) ? null : reader.GetDateTime(18),
            };
        }

        return null;
    }

    public async Task UpdateAccessibilityFeaturesAsync(
        string id,
        bool? hasRamp,
        bool? hasAccessibleElevator,
        bool? hasTactilePaving,
        bool? hasAccessibleRestroom,
        bool? doorWidthOk,
        decimal? accessibilityScore,
        string? accessibilityNote,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guid)) return;

        var conn = _context.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(cancellationToken);
        }

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE places
            SET 
                has_ramp = COALESCE(@has_ramp, has_ramp),
                has_accessible_elevator = COALESCE(@has_accessible_elevator, has_accessible_elevator),
                has_tactile_paving = COALESCE(@has_tactile_paving, has_tactile_paving),
                has_accessible_restroom = COALESCE(@has_accessible_restroom, has_accessible_restroom),
                door_width_ok = COALESCE(@door_width_ok, door_width_ok),
                accessibility_score = COALESCE(@accessibility_score, accessibility_score),
                accessibility_note = COALESCE(@accessibility_note, accessibility_note),
                last_verified_at = NOW(),
                updated_at = NOW()
            WHERE id = @id;";

        void AddParam(string name, object? val)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = name;
            p.Value = val ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }

        AddParam("id", guid);
        AddParam("has_ramp", hasRamp);
        AddParam("has_accessible_elevator", hasAccessibleElevator);
        AddParam("has_tactile_paving", hasTactilePaving);
        AddParam("has_accessible_restroom", hasAccessibleRestroom);
        AddParam("door_width_ok", doorWidthOk);
        AddParam("accessibility_score", accessibilityScore);
        AddParam("accessibility_note", accessibilityNote);

        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string? _unaccentPrefix = null;
    private static readonly SemaphoreSlim _unaccentLock = new(1, 1);

    private static async Task EnsureUnaccentAsync(System.Data.Common.DbConnection conn, CancellationToken cancellationToken)
    {
        if (_unaccentPrefix != null) return;

        await _unaccentLock.WaitAsync(cancellationToken);
        try
        {
            if (_unaccentPrefix != null) return;

            try
            {
                using var extCmd = conn.CreateCommand();
                extCmd.CommandText = "CREATE EXTENSION IF NOT EXISTS unaccent;";
                await extCmd.ExecuteNonQueryAsync(cancellationToken);
            }
            catch {}

            try
            {
                using var testCmd = conn.CreateCommand();
                testCmd.CommandText = "SELECT unaccent('a');";
                await testCmd.ExecuteScalarAsync(cancellationToken);
                _unaccentPrefix = "";
                return;
            }
            catch {}

            try
            {
                using var testExtCmd = conn.CreateCommand();
                testExtCmd.CommandText = "SELECT extensions.unaccent('a');";
                await testExtCmd.ExecuteScalarAsync(cancellationToken);
                _unaccentPrefix = "extensions.";
                return;
            }
            catch {}

            _unaccentPrefix = "NONE";
        }
        finally
        {
            _unaccentLock.Release();
        }
    }

    public async Task<List<Place>> SearchPlacesAsync(
        string? query,
        double? latitude = null,
        double? longitude = null,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var conn = _context.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(cancellationToken);
        }

        await EnsureUnaccentAsync(conn, cancellationToken);

        var useUnaccent = _unaccentPrefix != null && _unaccentPrefix != "NONE";
        var unaccentFunc = useUnaccent ? $"{_unaccentPrefix}unaccent" : "";

        var results = new List<Place>();
        using var cmd = conn.CreateCommand();

        var queryTrimmed = query?.Trim();
        var hasQuery = !string.IsNullOrWhiteSpace(queryTrimmed);
        var hasCoords = latitude.HasValue && longitude.HasValue;

        var sql = @"
            SELECT
                id,
                name,
                category,
                address,
                phone,
                website,
                opening_hours,
                lng,
                lat,
                floor_level,
                building_id,
                has_ramp,
                has_accessible_elevator,
                has_tactile_paving,
                has_accessible_restroom,
                door_width_ok,
                accessibility_score,
                accessibility_note,
                last_verified_at
            FROM places
            WHERE status = 1 AND merged_into_location_id IS NULL";

        if (hasQuery)
        {
            var stripped = queryTrimmed!.Replace("-", "").Replace(" ", "%");

            if (useUnaccent)
            {
                sql += $@" AND (
                    name ILIKE @pattern 
                    OR address ILIKE @pattern 
                    OR replace(name, '-', '') ILIKE @stripped_pattern
                    OR replace(address, '-', '') ILIKE @stripped_pattern
                    OR {unaccentFunc}(name) ILIKE {unaccentFunc}(@pattern) 
                    OR {unaccentFunc}(address) ILIKE {unaccentFunc}(@pattern)
                    OR {unaccentFunc}(replace(name, '-', '')) ILIKE {unaccentFunc}(@stripped_pattern)
                    OR {unaccentFunc}(replace(address, '-', '')) ILIKE {unaccentFunc}(@stripped_pattern)
                )";
            }
            else
            {
                sql += @" AND (
                    name ILIKE @pattern 
                    OR address ILIKE @pattern 
                    OR replace(name, '-', '') ILIKE @stripped_pattern
                    OR replace(address, '-', '') ILIKE @stripped_pattern
                )";
            }

            var pPattern = cmd.CreateParameter();
            pPattern.ParameterName = "pattern";
            pPattern.Value = $"%{queryTrimmed}%";
            cmd.Parameters.Add(pPattern);

            var pStripped = cmd.CreateParameter();
            pStripped.ParameterName = "stripped_pattern";
            pStripped.Value = $"%{stripped}%";
            cmd.Parameters.Add(pStripped);

            var pExact = cmd.CreateParameter();
            pExact.ParameterName = "exact_prefix";
            pExact.Value = $"{queryTrimmed}%";
            cmd.Parameters.Add(pExact);
        }

        if (hasCoords)
        {
            var pLat = cmd.CreateParameter();
            pLat.ParameterName = "user_lat";
            pLat.Value = latitude!.Value;
            cmd.Parameters.Add(pLat);

            var pLng = cmd.CreateParameter();
            pLng.ParameterName = "user_lng";
            pLng.Value = longitude!.Value;
            cmd.Parameters.Add(pLng);
        }

        sql += " ORDER BY ";
        if (hasQuery)
        {
            if (useUnaccent)
            {
                sql += $@"
                    CASE
                        WHEN name ILIKE @exact_prefix OR {unaccentFunc}(name) ILIKE {unaccentFunc}(@exact_prefix) THEN 1
                        WHEN name ILIKE @pattern OR {unaccentFunc}(name) ILIKE {unaccentFunc}(@pattern) THEN 2
                        WHEN replace(name, '-', '') ILIKE @stripped_pattern OR {unaccentFunc}(replace(name, '-', '')) ILIKE {unaccentFunc}(@stripped_pattern) THEN 3
                        ELSE 4
                    END ASC, ";
            }
            else
            {
                sql += @"
                    CASE
                        WHEN name ILIKE @exact_prefix THEN 1
                        WHEN name ILIKE @pattern THEN 2
                        WHEN replace(name, '-', '') ILIKE @stripped_pattern THEN 3
                        ELSE 4
                    END ASC, ";
            }
        }

        if (hasCoords)
        {
            sql += " ((lat - @user_lat) * (lat - @user_lat) + (lng - @user_lng) * (lng - @user_lng)) ASC, ";
        }

        sql += " id ASC LIMIT @limit;";

        var pLimit = cmd.CreateParameter();
        pLimit.ParameterName = "limit";
        pLimit.Value = Math.Clamp(limit, 1, 50);
        cmd.Parameters.Add(pLimit);

        cmd.CommandText = sql;

        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(new Place
            {
                Id = reader.GetGuid(0),
                Name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                Category = reader.IsDBNull(2) ? "other" : reader.GetString(2),
                Address = reader.IsDBNull(3) ? null : reader.GetString(3),
                Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                Website = reader.IsDBNull(5) ? null : reader.GetString(5),
                OpeningHours = reader.IsDBNull(6) ? null : reader.GetString(6),
                Lng = reader.IsDBNull(7) ? 0.0 : reader.GetDouble(7),
                Lat = reader.IsDBNull(8) ? 0.0 : reader.GetDouble(8),
                FloorLevel = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                BuildingId = reader.IsDBNull(10) ? null : reader.GetGuid(10),
                HasRamp = reader.IsDBNull(11) ? null : reader.GetBoolean(11),
                HasAccessibleElevator = reader.IsDBNull(12) ? null : reader.GetBoolean(12),
                HasTactilePaving = reader.IsDBNull(13) ? null : reader.GetBoolean(13),
                HasAccessibleRestroom = reader.IsDBNull(14) ? null : reader.GetBoolean(14),
                DoorWidthOk = reader.IsDBNull(15) ? null : reader.GetBoolean(15),
                AccessibilityScore = reader.IsDBNull(16) ? null : reader.GetDecimal(16),
                AccessibilityNote = reader.IsDBNull(17) ? null : reader.GetString(17),
                LastVerifiedAt = reader.IsDBNull(18) ? null : reader.GetDateTime(18),
            });
        }

        return results;
    }
}
