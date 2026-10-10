using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.Infrastructure.Services;

public class PlaceSpatialQueryService : IPlaceSpatialQueryService
{
    private readonly ApplicationDbContext _dbContext;

    public PlaceSpatialQueryService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<PlaceDto>> GetPlacesInBoundsAsync(
        double minLng,
        double minLat,
        double maxLng,
        double maxLat,
        int zoomLevel,
        string[]? categories = null,
        CancellationToken cancellationToken = default)
    {
        var results = new List<PlaceDto>();
        var conn = _dbContext.Database.GetDbConnection();
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
                door_width_ok,
                accessibility_score,
                accessibility_note,
                last_verified_at
            FROM get_places_in_bounds(
                @min_lng,
                @min_lat,
                @max_lng,
                @max_lat,
                @zoom_level,
                @category_filter
            );";

        var pMinLng = cmd.CreateParameter();
        pMinLng.ParameterName = "min_lng";
        pMinLng.Value = minLng;
        cmd.Parameters.Add(pMinLng);

        var pMinLat = cmd.CreateParameter();
        pMinLat.ParameterName = "min_lat";
        pMinLat.Value = minLat;
        cmd.Parameters.Add(pMinLat);

        var pMaxLng = cmd.CreateParameter();
        pMaxLng.ParameterName = "max_lng";
        pMaxLng.Value = maxLng;
        cmd.Parameters.Add(pMaxLng);

        var pMaxLat = cmd.CreateParameter();
        pMaxLat.ParameterName = "max_lat";
        pMaxLat.Value = maxLat;
        cmd.Parameters.Add(pMaxLat);

        var pZoom = cmd.CreateParameter();
        pZoom.ParameterName = "zoom_level";
        pZoom.Value = zoomLevel;
        cmd.Parameters.Add(pZoom);

        var pCat = cmd.CreateParameter();
        pCat.ParameterName = "category_filter";
        pCat.Value = (object?)categories ?? DBNull.Value;
        cmd.Parameters.Add(pCat);

        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(new PlaceDto
            {
                Id = reader.IsDBNull(0) ? string.Empty : reader.GetString(0),
                Name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                Category = reader.IsDBNull(2) ? "other" : reader.GetString(2),
                Address = reader.IsDBNull(3) ? null : reader.GetString(3),
                Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                Website = reader.IsDBNull(5) ? null : reader.GetString(5),
                OpeningHours = reader.IsDBNull(6) ? null : reader.GetString(6),
                Lng = reader.IsDBNull(7) ? 0.0 : reader.GetDouble(7),
                Lat = reader.IsDBNull(8) ? 0.0 : reader.GetDouble(8),
                FloorLevel = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                BuildingId = reader.IsDBNull(10) ? null : reader.GetString(10),
                HasRamp = reader.IsDBNull(11) ? null : reader.GetBoolean(11),
                HasAccessibleElevator = reader.IsDBNull(12) ? null : reader.GetBoolean(12),
                DoorWidthOk = reader.IsDBNull(13) ? null : reader.GetBoolean(13),
                AccessibilityScore = reader.IsDBNull(14) ? null : reader.GetDecimal(14),
                AccessibilityNote = reader.IsDBNull(15) ? null : reader.GetString(15),
                LastVerifiedAt = reader.IsDBNull(16) ? null : reader.GetDateTime(16),
            });
        }

        return results;
    }
}
