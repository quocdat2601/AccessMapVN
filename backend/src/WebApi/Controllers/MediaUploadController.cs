using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/v1/media")]
public class MediaUploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public MediaUploadController(IWebHostEnvironment env)
    {
        _env = env;
    }

    public record Base64UploadRequest(string? FileName, string? Base64Data, string? ContentType);

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadForm([FromForm] IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Không tìm thấy file tải lên." });
        }

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";
        var fileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{ext}";

        var uploadsDir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var relativeUrl = $"/uploads/{fileName}";
        var fullUrl = $"{Request.Scheme}://{Request.Host}{relativeUrl}";

        return Ok(new
        {
            url = fullUrl,
            relativeUrl = relativeUrl,
            fileName = fileName,
            size = file.Length
        });
    }

    [HttpPost("upload-base64")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadBase64([FromBody] Base64UploadRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Base64Data))
        {
            return BadRequest(new { message = "Dữ liệu ảnh base64 không hợp lệ." });
        }

        var cleanBase64 = request.Base64Data;
        var commaIndex = cleanBase64.IndexOf(',');
        if (commaIndex >= 0)
        {
            cleanBase64 = cleanBase64.Substring(commaIndex + 1);
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(cleanBase64);
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Chuỗi base64 không đúng định dạng." });
        }

        var ext = !string.IsNullOrWhiteSpace(request.FileName) ? Path.GetExtension(request.FileName) : ".jpg";
        if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";
        var fileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{ext}";

        var uploadsDir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(uploadsDir, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes, cancellationToken);

        var relativeUrl = $"/uploads/{fileName}";
        var fullUrl = $"{Request.Scheme}://{Request.Host}{relativeUrl}";

        return Ok(new
        {
            url = fullUrl,
            relativeUrl = relativeUrl,
            fileName = fileName,
            size = bytes.Length
        });
    }

    [HttpGet("/uploads/{fileName}")]
    [HttpHead("/uploads/{fileName}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetMedia(string fileName)
    {
        var cleanFileName = Path.GetFileName(fileName);
        var uploadsDir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        var filePath = Path.Combine(uploadsDir, cleanFileName);

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = $"Không tìm thấy tệp '{cleanFileName}'." });
        }

        var ext = Path.GetExtension(cleanFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".mp4" => "video/mp4",
            _ => "application/octet-stream"
        };

        return PhysicalFile(filePath, contentType);
    }
}
