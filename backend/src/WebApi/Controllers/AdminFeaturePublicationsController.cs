using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Application.Features.CommunityValidation;
using AccessMapVN.WebApi.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Authorize(Policy = CommunityPolicies.Moderate)]
[Route("api/v1/admin/publications/location-features")]
public sealed class AdminFeaturePublicationsController : ControllerBase
{
    private readonly ILocationFeaturePublicationService _service;

    public AdminFeaturePublicationsController(ILocationFeaturePublicationService service) => _service = service;

    [HttpPost]
    public async Task<ActionResult<PublishLocationFeatureResult>> Publish(
        [FromBody] PublishLocationFeatureRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var moderatorId))
        {
            throw new CommunityValidationException("INVALID_SUBJECT", "The authenticated subject is not a UUID.", 401);
        }

        var result = await _service.PublishAsync(request, moderatorId, cancellationToken);
        return Ok(result);
    }
}
