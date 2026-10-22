using AccessMapVN.Application.Features.Places.Queries.GetPlaceById;
using AccessMapVN.Application.Features.Places.Queries.GetPlacesInBounds;
using AccessMapVN.Domain.Enums;
using AccessMapVN.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.WebApi.Controllers;

public record PlaceEvidenceResponse(
    string Id,
    string Title,
    string? Subtitle,
    string Badge,
    string ImageUrl,
    List<string> FeatureTags,
    DateTimeOffset CreatedAt
);

[ApiController]
[Route("api/v1/places")]
[Route("api/v1/locations")]
public class PlacesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ApplicationDbContext _db;

    public PlacesController(IMediator mediator, ApplicationDbContext db)
    {
        _mediator = mediator;
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<PlaceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetInBounds(
        [FromQuery] GetPlacesInBoundsQuery query,
        CancellationToken cancellationToken = default)
    {
        var places = await _mediator.Send(query, cancellationToken);
        return Ok(places);
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(List<PlaceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] double? lat,
        [FromQuery] double? lng,
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var places = await _mediator.Send(new AccessMapVN.Application.Features.Places.Queries.SearchPlaces.SearchPlacesQuery(q, lat, lng, limit), cancellationToken);
        return Ok(places);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PlaceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken = default)
    {
        var place = await _mediator.Send(new GetPlaceByIdQuery(id), cancellationToken);
        if (place == null)
        {
            return NotFound();
        }
        return Ok(place);
    }

    [HttpGet("{id}/evidence")]
    [ProducesResponseType(typeof(List<PlaceEvidenceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlaceEvidence(string id, CancellationToken cancellationToken = default)
    {
        var place = await _db.Places.AsNoTracking().FirstOrDefaultAsync(
            p => p.Id.ToString() == id || p.Name == id,
            cancellationToken);

        var query = _db.Submissions.AsNoTracking()
            .Where(s => s.Status == SubmissionStatus.Published);

        if (place != null)
        {
            var placeIdStr = place.Id.ToString();
            query = query.Where(s => s.PlaceId == id || s.PlaceId == placeIdStr);
        }
        else
        {
            query = query.Where(s => s.PlaceId == id);
        }

        var submissions = await query
            .OrderByDescending(s => s.CreatedAt)
            .Take(15)
            .ToListAsync(cancellationToken);

        if (place != null && place.AccessibilityScore == null && submissions.Count > 0)
        {
            var targetPlace = await _db.Places.FirstOrDefaultAsync(p => p.Id == place.Id, cancellationToken);
            if (targetPlace != null)
            {
                var allTags = submissions.SelectMany(s => s.FeatureTags).ToList();
                foreach (var tag in allTags)
                {
                    var lower = tag.ToLowerInvariant();
                    if (lower.Contains("ramp")) targetPlace.HasRamp = true;
                    if (lower.Contains("door") || lower.Contains("entrance")) targetPlace.DoorWidthOk = true;
                    if (lower.Contains("elevator")) targetPlace.HasAccessibleElevator = true;
                    if (lower.Contains("restroom")) targetPlace.HasAccessibleRestroom = true;
                    if (lower.Contains("tactile")) targetPlace.HasTactilePaving = true;
                }
                var count = 0;
                if (targetPlace.HasRamp == true) count++;
                if (targetPlace.DoorWidthOk == true) count++;
                if (targetPlace.HasAccessibleElevator == true) count++;
                if (targetPlace.HasAccessibleRestroom == true) count++;
                if (targetPlace.HasTactilePaving == true) count++;

                targetPlace.AccessibilityScore = Math.Round((decimal)count / 5.0m * 10.0m, 1);
                targetPlace.LastVerifiedAt = submissions.Max(s => s.CreatedAt).UtcDateTime;
                await _db.SaveChangesAsync(cancellationToken);
            }
        }

        var results = new List<PlaceEvidenceResponse>();
        var seenUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var sub in submissions)
        {
            for (var i = 0; i < sub.MediaUrls.Count; i++)
            {
                var url = sub.MediaUrls[i];
                if (string.IsNullOrWhiteSpace(url) || seenUrls.Contains(url)) continue;
                seenUrls.Add(url);

                var title = "Ảnh minh chứng tiếp cận";
                if (sub.FeatureTags.Any(t => t.Contains("ramp", StringComparison.OrdinalIgnoreCase))) title = "Ram dốc tiếp cận";
                else if (sub.FeatureTags.Any(t => t.Contains("door", StringComparison.OrdinalIgnoreCase) || t.Contains("entrance", StringComparison.OrdinalIgnoreCase))) title = "Lối vào / Cửa";
                else if (sub.FeatureTags.Any(t => t.Contains("elevator", StringComparison.OrdinalIgnoreCase))) title = "Thang máy tiếp cận";
                else if (sub.FeatureTags.Any(t => t.Contains("restroom", StringComparison.OrdinalIgnoreCase))) title = "Nhà vệ sinh tiếp cận";
                else if (sub.FeatureTags.Any(t => t.Contains("tactile", StringComparison.OrdinalIgnoreCase))) title = "Gạch xúc giác";

                results.Add(new PlaceEvidenceResponse(
                    Id: $"{sub.SubmissionCode}-{i + 1}",
                    Title: title,
                    Subtitle: sub.CreatedAt.ToString("dd/MM/yyyy"),
                    Badge: "Đã công bố",
                    ImageUrl: url,
                    FeatureTags: sub.FeatureTags,
                    CreatedAt: sub.CreatedAt
                ));
            }
        }

        return Ok(results);
    }
}
