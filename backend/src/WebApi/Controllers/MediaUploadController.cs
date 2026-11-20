using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using AccessMapVN.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AccessMapVN.WebApi.Controllers;

[ApiController]
[Route("api/v1/media")]
public class MediaUploadController : ControllerBase
{
    private const long MaxVideoBytes = 25 * 1024 * 1024;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _cacheLocks = new();

    private readonly IWebHostEnvironment _env;
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly IAiServiceClient? _aiClient;

    public MediaUploadController(
        IWebHostEnvironment env,
        IHttpClientFactory? httpClientFactory = null,
        IAiServiceClient? aiClient = null)
    {
        _env = env;
        _httpClientFactory = httpClientFactory;
        _aiClient = aiClient;
    }

    public record Base64UploadRequest(string? FileName, string? Base64Data, string? ContentType);

    [HttpPost("upload")]
    [Authorize]
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
    [Authorize]
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
    [AllowAnonymous]
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
            ".mov" => "video/quicktime",
            ".webm" => "video/webm",
            _ => "application/octet-stream"
        };

        Response.Headers.CacheControl = "public, max-age=86400";
        return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
    }

    [HttpGet("video-stream")]
    [HttpHead("video-stream")]
    [AllowAnonymous]
    public async Task<IActionResult> GetVideoStream([FromQuery] string? url, CancellationToken cancellationToken)
    {
        if (!TryValidateAllowedVideoUrl(url, out var remoteUri, out var localFileName, out var ext, out var contentType))
        {
            return BadRequest(new { message = "URL video không hợp lệ hoặc không thuộc nguồn được phép." });
        }

        var uploadsDir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        if (!string.IsNullOrEmpty(localFileName))
        {
            var localPath = Path.Combine(uploadsDir, localFileName);
            if (!System.IO.File.Exists(localPath)) return NotFound();
            Response.Headers.CacheControl = "public, max-age=86400";
            return PhysicalFile(localPath, contentType, enableRangeProcessing: true);
        }

        // ponytail: Caches remote Supabase videos on local wwwroot disk without eviction; in production use CDN range caching.
        var cacheDir = Path.Combine(uploadsDir, "cache");
        Directory.CreateDirectory(cacheDir);
        var hash = ComputeSha256Hex(remoteUri!.AbsoluteUri);
        var cachePath = Path.Combine(cacheDir, $"{hash}{ext}");

        if (!System.IO.File.Exists(cachePath))
        {
            var gate = _cacheLocks.GetOrAdd($"vid:{hash}", _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(cancellationToken);
            try
            {
                if (!System.IO.File.Exists(cachePath))
                {
                    var http = _httpClientFactory?.CreateClient() ?? new HttpClient();
                    http.Timeout = TimeSpan.FromSeconds(45);
                    using var resp = await http.GetAsync(remoteUri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                    if (!resp.IsSuccessStatusCode)
                    {
                        return StatusCode((int)resp.StatusCode);
                    }
                    if (resp.Content.Headers.ContentLength > MaxVideoBytes)
                    {
                        return StatusCode(StatusCodes.Status413PayloadTooLarge);
                    }

                    var tmpPath = $"{cachePath}.{Guid.NewGuid():N}.tmp";
                    try
                    {
                        await using (var src = await resp.Content.ReadAsStreamAsync(cancellationToken))
                        await using (var dst = new FileStream(tmpPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
                        {
                            var buffer = new byte[81920];
                            long total = 0;
                            int read;
                            while ((read = await src.ReadAsync(buffer, cancellationToken)) > 0)
                            {
                                total += read;
                                if (total > MaxVideoBytes)
                                {
                                    throw new InvalidOperationException("Video exceeds 25MB limit.");
                                }
                                await dst.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                            }
                        }
                        System.IO.File.Move(tmpPath, cachePath, overwrite: true);
                    }
                    catch
                    {
                        if (System.IO.File.Exists(tmpPath)) System.IO.File.Delete(tmpPath);
                        throw;
                    }
                }
            }
            finally
            {
                gate.Release();
            }
        }

        Response.Headers.CacheControl = "public, max-age=86400";
        return PhysicalFile(cachePath, contentType, enableRangeProcessing: true);
    }

    [HttpGet("video-poster")]
    [HttpHead("video-poster")]
    [AllowAnonymous]
    public async Task<IActionResult> GetVideoPoster([FromQuery] string? url, CancellationToken cancellationToken)
    {
        if (!TryValidateAllowedVideoUrl(url, out var remoteUri, out var localFileName, out _, out _))
        {
            return BadRequest(new { message = "URL video không hợp lệ hoặc không thuộc nguồn được phép." });
        }

        var uploadsDir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        var cacheKey = !string.IsNullOrEmpty(localFileName) ? $"local:{localFileName}" : remoteUri!.AbsoluteUri;
        var hash = ComputeSha256Hex(cacheKey);
        var postersDir = Path.Combine(uploadsDir, "posters");
        Directory.CreateDirectory(postersDir);
        var posterPath = Path.Combine(postersDir, $"{hash}.jpg");

        if (System.IO.File.Exists(posterPath))
        {
            Response.Headers.CacheControl = "public, max-age=604800";
            return PhysicalFile(posterPath, "image/jpeg");
        }

        string fetchUrl;
        if (!string.IsNullOrEmpty(localFileName))
        {
            var localPath = Path.Combine(uploadsDir, localFileName);
            if (!System.IO.File.Exists(localPath)) return NotFound();
            var port = Request.Host.Port ?? 5256;
            fetchUrl = $"http://127.0.0.1:{port}/uploads/{Uri.EscapeDataString(localFileName)}";
        }
        else
        {
            fetchUrl = remoteUri!.AbsoluteUri;
        }

        if (_aiClient == null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        var gate = _cacheLocks.GetOrAdd($"poster:{hash}", _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (!System.IO.File.Exists(posterPath))
            {
                var jpegBytes = await _aiClient.ExtractVideoPosterAsync(fetchUrl, cancellationToken);
                if (jpegBytes == null || jpegBytes.Length == 0)
                {
                    return NotFound();
                }

                var tmpPath = $"{posterPath}.{Guid.NewGuid():N}.tmp";
                try
                {
                    await System.IO.File.WriteAllBytesAsync(tmpPath, jpegBytes, cancellationToken);
                    System.IO.File.Move(tmpPath, posterPath, overwrite: true);
                }
                catch
                {
                    if (System.IO.File.Exists(tmpPath)) System.IO.File.Delete(tmpPath);
                    throw;
                }
            }
        }
        finally
        {
            gate.Release();
        }

        Response.Headers.CacheControl = "public, max-age=604800";
        return PhysicalFile(posterPath, "image/jpeg");
    }

    private static bool TryValidateAllowedVideoUrl(
        string? rawUrl,
        out Uri? remoteUri,
        out string? localFileName,
        out string ext,
        out string contentType)
    {
        remoteUri = null;
        localFileName = null;
        ext = ".mp4";
        contentType = "video/mp4";

        if (string.IsNullOrWhiteSpace(rawUrl)) return false;
        var trimmed = rawUrl.Trim();

        if (trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var pathOnly = trimmed.Split('?')[0];
            var name = Path.GetFileName(pathOnly);
            if (string.IsNullOrWhiteSpace(name) || !TryGetVideoMime(name, out ext, out contentType)) return false;
            localFileName = name;
            return true;
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;

        var cleanFile = Path.GetFileName(uri.AbsolutePath);
        if (!TryGetVideoMime(cleanFile, out ext, out contentType)) return false;

        if ((uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host.Equals("127.0.0.1"))
            && uri.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            localFileName = cleanFile;
            return true;
        }

        if (uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase)
            && uri.AbsolutePath.Contains("/storage/v1/object/public/contributions-media/", StringComparison.OrdinalIgnoreCase))
        {
            remoteUri = uri;
            return true;
        }

        return false;
    }

    private static bool TryGetVideoMime(string fileName, out string ext, out string contentType)
    {
        ext = Path.GetExtension(fileName).ToLowerInvariant();
        contentType = ext switch
        {
            ".mp4" => "video/mp4",
            ".mov" => "video/quicktime",
            ".webm" => "video/webm",
            _ => string.Empty,
        };
        return contentType.Length > 0;
    }

    private static string ComputeSha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
