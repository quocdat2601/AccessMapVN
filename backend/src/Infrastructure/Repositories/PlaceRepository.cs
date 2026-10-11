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
                ST_X(geom::geometry) AS lng,
                ST_Y(geom::geometry) AS lat,
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
}
