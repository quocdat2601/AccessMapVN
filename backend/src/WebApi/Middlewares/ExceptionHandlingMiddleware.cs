using System.Text.Json;
using AccessMapVN.Application.Common.Exceptions;
using AccessMapVN.Infrastructure.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

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
        catch (CommunityValidationException ex)
        {
            if (ex.Code == "IDEMPOTENCY_KEY_REUSED")
            {
                CommunityMetrics.IdempotencyConflicts.Add(1);
            }
            _logger.LogWarning("Community request failed with {Code}: {Message}", ex.Code, ex.Message);
            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                code = ex.Code,
                message = ex.Message,
                correlationId = context.TraceIdentifier,
                details = ex.Details,
            }));
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning("Validation failure: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
            context.Response.ContentType = "application/json";

            var errors = ex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray()
                );

            var response = new
            {
                code = "VALIDATION_FAILED",
                message = "One or more validation errors occurred.",
                correlationId = context.TraceIdentifier,
                details = errors,
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Optimistic concurrency conflict for {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                code = "CONCURRENCY_CONFLICT",
                message = "The resource changed; reload it before retrying.",
                correlationId = context.TraceIdentifier,
                details = (object?)null,
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled server exception: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new
            {
                code = "INTERNAL_ERROR",
                message = "An internal server error occurred.",
                correlationId = context.TraceIdentifier,
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
