using System.Text.Json;
using FluentValidation;

namespace AccessMapVN.WebApi.Middlewares;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning("Validation failure: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/json";

            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray()
                );

            var response = new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                title = "One or more validation errors occurred.",
                status = StatusCodes.Status400BadRequest,
                errors
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled server exception: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                title = "An internal server error occurred.",
                status = StatusCodes.Status500InternalServerError
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
