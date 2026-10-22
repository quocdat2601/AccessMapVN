using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using AccessMapVN.Application;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Infrastructure;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using AccessMapVN.WebApi.Middlewares;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.AddOptions<Wf02Options>()
    .Bind(builder.Configuration.GetSection(Wf02Options.SectionName))
    .Validate(options => options.IsValid(), "WF-02 configuration is invalid.")
    .ValidateOnStart();

var supabase = builder.Configuration.GetSection(SupabaseAuthOptions.SectionName).Get<SupabaseAuthOptions>()
    ?? new SupabaseAuthOptions();
var issuer = $"{supabase.Url.TrimEnd('/')}/auth/v1";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = supabase.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "sub",
            RoleClaimType = "app_role",
        };

        if (!string.IsNullOrWhiteSpace(supabase.JwtSecret))
        {
            options.TokenValidationParameters.IssuerSigningKey =
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supabase.JwtSecret));
        }
        else if (!string.IsNullOrWhiteSpace(supabase.Url))
        {
            options.Authority = issuer;
            options.MetadataAddress = $"{issuer}/.well-known/openid-configuration";
        }

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "AUTHENTICATION_REQUIRED",
                    message = "A valid Bearer token is required.",
                    correlationId = context.HttpContext.TraceIdentifier,
                    details = (object?)null,
                });
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "FORBIDDEN",
                    message = "The current account is not allowed to perform this action.",
                    correlationId = context.HttpContext.TraceIdentifier,
                    details = (object?)null,
                });
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Wf02Policies.Moderate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new Wf02ModerationRequirement()));
});
builder.Services.AddScoped<IAuthorizationHandler, Wf02ModerationAuthorizationHandler>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            code = "RATE_LIMIT_EXCEEDED",
            message = "Too many requests. Try again later.",
            correlationId = context.HttpContext.TraceIdentifier,
            details = (object?)null,
        }, cancellationToken);
    };
    AddFixedWindowPolicy(options, "wf02-vote", 10, TimeSpan.FromMinutes(10),
        context => UserRouteKey(context, "locationId", "featureType"));
    AddFixedWindowPolicy(options, "wf02-report", 5, TimeSpan.FromDays(1),
        context => UserRouteKey(context, "locationId"));
    AddFixedWindowPolicy(options, "wf02-evidence", 10, TimeSpan.FromHours(1),
        context => UserRouteKey(context, "reportId"));
    AddFixedWindowPolicy(options, "wf02-comment", 10, TimeSpan.FromHours(1),
        context => UserRouteKey(context, "locationId"));
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var details = context.ModelState
                .Where(entry => entry.Value?.Errors.Count > 0)
                .ToDictionary(
                    entry => entry.Key,
                    entry => entry.Value!.Errors.Select(error =>
                        string.IsNullOrWhiteSpace(error.ErrorMessage)
                            ? "The supplied value is invalid."
                            : error.ErrorMessage).ToArray());
            return new Microsoft.AspNetCore.Mvc.UnprocessableEntityObjectResult(new
            {
                code = "VALIDATION_FAILED",
                message = "One or more request fields are invalid.",
                correlationId = context.HttpContext.TraceIdentifier,
                details,
            });
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (builder.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();
    await initialiser.InitialiseAsync();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<Wf02FeatureFlagMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseRateLimiter();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(uploadsDir);
app.UseStaticFiles();

app.UseAuthorization();

app.MapControllers();

app.Run();

static void AddFixedWindowPolicy(
    RateLimiterOptions options,
    string name,
    int permitLimit,
    TimeSpan window,
    Func<HttpContext, string> partitionKey)
{
    options.AddPolicy(name, context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window,
            QueueLimit = 0,
            AutoReplenishment = true,
        }));
}

static string UserRouteKey(HttpContext context, params string[] routeNames)
{
    var subject = context.User.FindFirst("sub")?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
    var route = string.Join(':', routeNames.Select(name => context.Request.RouteValues[name]?.ToString() ?? "none"));
    return $"{subject}:{route}";
}

public class SupabaseJwtAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public SupabaseJwtAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IConfiguration configuration,
        IWebHostEnvironment environment)
        : base(options, logger, encoder)
    {
        _configuration = configuration;
        _environment = environment;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeaderValues))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var header = authHeaderValues.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var token = header.Substring("Bearer ".Length).Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            return Task.FromResult(AuthenticateResult.Fail("Empty Bearer token"));
        }

        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid JWT structure: Token must contain exactly 3 dot-separated parts."));
        }

        try
        {
            // 1. Kiểm tra Header và Thuật toán (alg)
            var headerJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            using var headerDoc = JsonDocument.Parse(headerJson);
            if (!headerDoc.RootElement.TryGetProperty("alg", out var algProp))
            {
                return Task.FromResult(AuthenticateResult.Fail("JWT missing 'alg' in header."));
            }

            var alg = algProp.GetString();
            if (!string.Equals(alg, "HS256", StringComparison.OrdinalIgnoreCase))
            {
                return Task.FromResult(AuthenticateResult.Fail($"Unsupported JWT algorithm: {alg}. Allowed: HS256."));
            }

            // 2. Kiểm tra Payload và Claims nghiệp vụ
            var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;

            string? userId = null;
            if (root.TryGetProperty("sub", out var subProp))
                userId = subProp.GetString();
            else if (root.TryGetProperty("nameid", out var nameidProp))
                userId = nameidProp.GetString();

            if (string.IsNullOrWhiteSpace(userId))
            {
                return Task.FromResult(AuthenticateResult.Fail("Token does not contain a valid subject claim."));
            }

            // Kiểm tra thời hạn (exp)
            if (root.TryGetProperty("exp", out var expProp) && expProp.TryGetInt64(out var exp))
            {
                var expTime = DateTimeOffset.FromUnixTimeSeconds(exp);
                if (expTime <= DateTimeOffset.UtcNow.AddSeconds(-60)) // 60s clock skew tolerance
                {
                    return Task.FromResult(AuthenticateResult.Fail("Token has expired."));
                }
            }
            else
            {
                return Task.FromResult(AuthenticateResult.Fail("Token missing 'exp' claim."));
            }

            // Kiểm tra Audience (aud): Supabase user access tokens có aud = "authenticated"
            if (root.TryGetProperty("aud", out var audProp))
            {
                var aud = audProp.GetString();
                if (!string.IsNullOrEmpty(aud) && !string.Equals(aud, "authenticated", StringComparison.OrdinalIgnoreCase))
                {
                    return Task.FromResult(AuthenticateResult.Fail($"Invalid token audience: {aud}. Expected: authenticated."));
                }
            }

            // Kiểm tra Issuer (iss): mặc định là "supabase" hoặc url dự án
            if (root.TryGetProperty("iss", out var issProp))
            {
                var iss = issProp.GetString();
                if (!string.IsNullOrEmpty(iss) && !iss.Contains("supabase", StringComparison.OrdinalIgnoreCase))
                {
                    return Task.FromResult(AuthenticateResult.Fail($"Invalid token issuer: {iss}."));
                }
            }

            // 3. Xác thực chữ ký HMAC-SHA256 (khóa đối xứng của Supabase)
            var jwtSecret = _configuration["Authentication:JwtSecret"]
                            ?? _configuration["Supabase:JwtSecret"]
                            ?? Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET");

            if (!string.IsNullOrWhiteSpace(jwtSecret))
            {
                var keyBytes = Encoding.UTF8.GetBytes(jwtSecret);
                using var hmac = new HMACSHA256(keyBytes);
                var dataToSign = Encoding.UTF8.GetBytes($"{parts[0]}.{parts[1]}");
                var computedSignature = hmac.ComputeHash(dataToSign);
                var expectedSignature = Base64UrlDecode(parts[2]);

                if (!CryptographicOperations.FixedTimeEquals(computedSignature, expectedSignature))
                {
                    return Task.FromResult(AuthenticateResult.Fail("Invalid JWT signature."));
                }
            }
            else if (!_environment.IsDevelopment())
            {
                return Task.FromResult(AuthenticateResult.Fail("JWT Secret is not configured in production environment."));
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("sub", userId),
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
        catch (Exception ex)
        {
            return Task.FromResult(AuthenticateResult.Fail($"Failed to decode JWT: {ex.Message}"));
        }
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var output = input.Replace('-', '+').Replace('_', '/');
        switch (output.Length % 4)
        {
            case 2: output += "=="; break;
            case 3: output += "="; break;
        }
        return Convert.FromBase64String(output);
    }
}
