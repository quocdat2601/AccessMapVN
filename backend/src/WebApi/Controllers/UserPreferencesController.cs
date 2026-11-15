using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public sealed record UserAccessibilityPreferencesDto(
    bool Wheelchair = false,
    bool Elevator = false,
    bool Restroom = false,
    bool TactilePaving = false,
    bool HighVerified = false,
    string? Preset = null,
    string? StepFree = null,
    string? WideEntrance = null,
    string? Ramp = null,
    string? ElevatorMode = null,
    string? RestroomMode = null,
    string? Parking = null,
    string? Tactile = null,
    string? Companion = null,
    string? TargetFloor = null
);

public sealed record FavoritePlaceSnapshotRequest(
    string? Name = null,
    string? Category = null,
    string? Address = null,
    double? Lng = null,
    double? Lat = null,
    bool? HasRamp = null,
    bool? HasAccessibleElevator = null,
    bool? HasTactilePaving = null,
    bool? HasAccessibleRestroom = null,
    bool? DoorWidthOk = null,
    decimal? AccessibilityScore = null
);

[ApiController]
[Authorize]
[Route("api/v1/users/me")]
public sealed class UserPreferencesController : ControllerBase
{
    private const string PreferencesEndpoint = "/internal/user-preferences";
    private const string PreferencesKey = "default";
    private const string FavoritesEndpoint = "/internal/user-favorites";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ApplicationDbContext _db;

    public UserPreferencesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("preferences")]
    [ProducesResponseType(typeof(UserAccessibilityPreferencesDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserAccessibilityPreferencesDto>> GetPreferences(CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var record = await _db.IdempotencyRecords
            .AsNoTracking()
            .SingleOrDefaultAsync(
                r => r.ActorId == userId && r.Endpoint == PreferencesEndpoint && r.Key == PreferencesKey,
                cancellationToken);

        if (record is null || string.IsNullOrWhiteSpace(record.ResponseBody))
        {
            return Ok(new UserAccessibilityPreferencesDto());
        }

        try
        {
            var prefs = JsonSerializer.Deserialize<UserAccessibilityPreferencesDto>(record.ResponseBody, JsonOptions);
            return Ok(prefs ?? new UserAccessibilityPreferencesDto());
        }
        catch
        {
            return Ok(new UserAccessibilityPreferencesDto());
        }
    }

    [HttpPut("preferences")]
    [ProducesResponseType(typeof(UserAccessibilityPreferencesDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserAccessibilityPreferencesDto>> SavePreferences(
        [FromBody] UserAccessibilityPreferencesDto request,
        CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var serialized = JsonSerializer.Serialize(request, JsonOptions);
        var hash = ComputeSha256(serialized);
        var now = DateTimeOffset.UtcNow;

        var record = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            r => r.ActorId == userId && r.Endpoint == PreferencesEndpoint && r.Key == PreferencesKey,
            cancellationToken);

        if (record is null)
        {
            _db.IdempotencyRecords.Add(new IdempotencyRecord
            {
                ActorId = userId,
                Endpoint = PreferencesEndpoint,
                Key = PreferencesKey,
                RequestHash = hash,
                ResponseStatusCode = 200,
                ResponseBody = serialized,
                ExpiresAt = now.AddYears(10),
            });
        }
        else
        {
            record.RequestHash = hash;
            record.ResponseBody = serialized;
            record.ExpiresAt = now.AddYears(10);
            record.UpdatedAtUtc = now.UtcDateTime;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(request);
    }

    [HttpGet("favorites")]
    [ProducesResponseType(typeof(IReadOnlyList<PlaceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PlaceDto>>> GetFavorites(CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var records = await _db.IdempotencyRecords
            .AsNoTracking()
            .Where(r => r.ActorId == userId && r.Endpoint == FavoritesEndpoint)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (records.Count == 0)
        {
            return Ok(Array.Empty<PlaceDto>());
        }

        var guidMap = new Dictionary<Guid, string>();
        foreach (var rec in records)
        {
            if (Guid.TryParse(rec.Key, out var parsed) && !guidMap.ContainsKey(parsed))
            {
                guidMap[parsed] = rec.Key;
            }
        }

        var dbPlaceIds = guidMap.Keys.ToList();
        var dbPlaces = dbPlaceIds.Count == 0
            ? new Dictionary<string, PlaceDto>(StringComparer.OrdinalIgnoreCase)
            : (await _db.Places
                .AsNoTracking()
                .Where(p => dbPlaceIds.Contains(p.Id) && p.Status == LocationStatus.Active)
                .Select(p => new PlaceDto
                {
                    Id = p.Id.ToString(),
                    Name = p.Name,
                    Category = p.Category,
                    Address = p.Address,
                    Phone = p.Phone,
                    Website = p.Website,
                    OpeningHours = p.OpeningHours,
                    Lng = p.Lng,
                    Lat = p.Lat,
                    FloorLevel = p.FloorLevel,
                    BuildingId = p.BuildingId.HasValue ? p.BuildingId.Value.ToString() : null,
                    HasRamp = p.HasRamp,
                    HasAccessibleElevator = p.HasAccessibleElevator,
                    HasTactilePaving = p.HasTactilePaving,
                    HasAccessibleRestroom = p.HasAccessibleRestroom,
                    DoorWidthOk = p.DoorWidthOk,
                    AccessibilityScore = p.AccessibilityScore,
                    AccessibilityNote = p.AccessibilityNote,
                    LastVerifiedAt = p.LastVerifiedAt,
                })
                .ToListAsync(cancellationToken))
                .ToDictionary(p => p.Id, p => p, StringComparer.OrdinalIgnoreCase);

        var result = new List<PlaceDto>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var rec in records)
        {
            if (!seenKeys.Add(rec.Key))
            {
                continue;
            }

            if (dbPlaces.TryGetValue(rec.Key, out var dbPlace))
            {
                result.Add(dbPlace);
                continue;
            }

            if (!string.IsNullOrWhiteSpace(rec.ResponseBody))
            {
                try
                {
                    var snapshot = JsonSerializer.Deserialize<PlaceDto>(rec.ResponseBody, JsonOptions);
                    if (snapshot is not null && !string.IsNullOrWhiteSpace(snapshot.Name))
                    {
                        result.Add(snapshot);
                    }
                }
                catch
                {
                    // Ignore malformed snapshot
                }
            }
        }

        return Ok(result);
    }

    [HttpPost("favorites/{placeId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> AddFavorite(
        string placeId,
        [FromBody] FavoritePlaceSnapshotRequest? snapshot = null,
        CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var normalizedKey = Guid.TryParse(placeId, out var parsedGuid)
            ? parsedGuid.ToString("D")
            : placeId.Trim();

        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            return BadRequest(new { code = "INVALID_PLACE_ID", message = "Mã địa điểm không hợp lệ." });
        }

        var placeDto = new PlaceDto
        {
            Id = normalizedKey,
            Name = string.IsNullOrWhiteSpace(snapshot?.Name) ? "Địa điểm đã lưu" : snapshot!.Name!.Trim(),
            Category = string.IsNullOrWhiteSpace(snapshot?.Category) ? "other" : snapshot!.Category!.Trim(),
            Address = snapshot?.Address,
            Lng = snapshot?.Lng ?? 106.8373,
            Lat = snapshot?.Lat ?? 10.8454,
            HasRamp = snapshot?.HasRamp ?? false,
            HasAccessibleElevator = snapshot?.HasAccessibleElevator ?? false,
            HasTactilePaving = snapshot?.HasTactilePaving ?? false,
            HasAccessibleRestroom = snapshot?.HasAccessibleRestroom ?? false,
            DoorWidthOk = snapshot?.DoorWidthOk ?? false,
            AccessibilityScore = snapshot?.AccessibilityScore ?? 0.85m,
        };

        var payload = JsonSerializer.Serialize(placeDto, JsonOptions);
        var existing = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            r => r.ActorId == userId && r.Endpoint == FavoritesEndpoint && r.Key == normalizedKey,
            cancellationToken);

        if (existing is null)
        {
            _db.IdempotencyRecords.Add(new IdempotencyRecord
            {
                ActorId = userId,
                Endpoint = FavoritesEndpoint,
                Key = normalizedKey,
                RequestHash = ComputeSha256(normalizedKey),
                ResponseStatusCode = 200,
                ResponseBody = payload,
                ExpiresAt = DateTimeOffset.UtcNow.AddYears(10),
            });
        }
        else
        {
            existing.ResponseBody = payload;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { placeId = normalizedKey, saved = true });
    }

    [HttpDelete("favorites/{placeId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveFavorite(string placeId, CancellationToken cancellationToken = default)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var normalizedKey = Guid.TryParse(placeId, out var parsedGuid)
            ? parsedGuid.ToString("D")
            : placeId.Trim();

        var existing = await _db.IdempotencyRecords.SingleOrDefaultAsync(
            r => r.ActorId == userId && r.Endpoint == FavoritesEndpoint && r.Key == normalizedKey,
            cancellationToken);

        if (existing is not null)
        {
            _db.IdempotencyRecords.Remove(existing);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    private static string ComputeSha256(string input) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}
