using AccessMapVN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "Healthy", timestamp = DateTime.UtcNow });

    [HttpGet("database")]
    public async Task<IActionResult> CheckDatabase([FromServices] ApplicationDbContext dbContext)
    {
        try
        {
            var canConnect = await dbContext.Database.CanConnectAsync();
            return canConnect
                ? Ok(new { status = "Healthy", database = "Connected", timestamp = DateTime.UtcNow })
                : StatusCode(503, new { status = "Unhealthy", database = "Unable to connect" });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { status = "Unhealthy", error = ex.Message });
        }
    }
}
