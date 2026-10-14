using AccessMapVN.Application;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Infrastructure;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.WebApi.Authorization;
using AccessMapVN.WebApi.Middlewares;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

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
