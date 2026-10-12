using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Infrastructure.Persistence;
using AccessMapVN.Infrastructure.Repositories;
using FluentAssertions;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace AccessMapVN.UnitTests;

public class SubmitSurveyCommandTests
{
    private readonly Mock<IPlaceRepository> _mockPlaceRepo = new();
    private readonly Mock<ISubmissionRepository> _mockSubmissionRepo = new();

    [Fact]
    public async Task Validator_WithEmptyLocationOrMedia_FailsValidation()
    {
        var validator = new SubmitSurveyCommandValidator();
        var command = new SubmitSurveyCommand
        {
            LocationId = "",
            MediaUrls = new List<string>(),
            GpsLat = 10.772,
            GpsLng = 106.698,
        };

        var result = await validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SubmitSurveyCommand.ClientSubmissionId));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SubmitSurveyCommand.LocationId));
        result.Errors.Should().Contain(e => e.PropertyName == nameof(SubmitSurveyCommand.MediaUrls));
    }

    [Fact]
    public async Task Handle_WhenGpsDistanceExceeds50Meters_ThrowsValidationException()
    {
        // Ben Thanh Market coordinates
        var placeLat = 10.7720;
        var placeLng = 106.6980;
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = placeLat,
            Lng = placeLng,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        // Submitting from coordinates ~200m away
        var command = new SubmitSurveyCommand
        {
            AuthenticatedUserId = "user-gps-test",
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            GpsLat = 10.7740,
            GpsLng = 106.6995,
        };

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*vượt quá ngưỡng cho phép 50m*");
    }

    [Fact]
    public async Task Handle_WhenUnauthenticated_ThrowsUnauthorizedAccessException()
    {
        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);
        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            AuthenticatedUserId = null, // No token claims
            UserId = "spoofed-user",
            MediaUrls = new List<string> { "https://example.com/photo.jpg" },
            GpsLat = 10.7720,
            GpsLng = 106.6980,
        };

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Access Token*");
    }

    [Fact]
    public async Task Handle_WhenGpsDistanceWithin50Meters_CreatesPendingModerationSubmissionWithoutAwardingPointsImmediately()
    {
        var placeLat = 10.7720;
        var placeLng = 106.6980;
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = placeLat,
            Lng = placeLng,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        var command = new SubmitSurveyCommand
        {
            ClientSubmissionId = "client-sub-1",
            AuthenticatedUserId = "user-123",
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            FeatureTags = new List<string> { "exterior_ramp_present", "door_width_ok" },
            GpsLat = 10.77205,
            GpsLng = 106.69805,
            TextDescription = "Lối vào có ram dốc thoải, cửa tự động",
        };

        var result = await handler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.SubmissionId.Should().StartWith("AMV-");
        result.ClientSubmissionId.Should().Be("client-sub-1");
        result.Status.Should().Be("PendingModeration");
        result.ExpStatus.Should().Be("pending_review");
        result.PointsAwarded.Should().Be(0);
        result.Message.Should().Contain("EXP sẽ được tính sau khi khảo sát được duyệt");

        _mockSubmissionRepo.Verify(r => r.AddPointTransactionAsync(
            It.IsAny<PointTransaction>(), It.IsAny<CancellationToken>()), Times.Never);

        _mockPlaceRepo.Verify(r => r.UpdateAccessibilityFeaturesAsync(
            It.IsAny<string>(), It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<bool?>(),
            It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<decimal?>(), It.IsAny<string?>(),
            It.IsAny<CancellationToken>()), Times.Never);

        _mockSubmissionRepo.Verify(r => r.AddAsync(It.Is<Submission>(s =>
            s.PlaceId == "ben-thanh" &&
            s.ClientSubmissionId == "client-sub-1" &&
            s.PointsAwarded == 0 &&
            s.Status == Domain.Enums.SubmissionStatus.PendingModeration &&
            s.ExpStatus == "pending_review" &&
            s.UserId == "user-123"), It.IsAny<CancellationToken>()), Times.Once);

        _mockSubmissionRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_Idempotency_SameClientSubmissionId_AndSamePayload_ReturnsExistingResult()
    {
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = 10.7720,
            Lng = 106.6980,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var command = new SubmitSurveyCommand
        {
            ClientSubmissionId = "sub-key-100",
            AuthenticatedUserId = "auth-user-abc",
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            FeatureTags = new List<string> { "exterior_ramp_present" },
            GpsLat = 10.77205,
            GpsLng = 106.69805,
        };

        // Compute expected canonical payload hash using the same canonical serialization format
        var canonicalObj = new
        {
            locationId = "ben-thanh",
            mediaUrls = new[] { "https://example.com/ramp.jpg" },
            observations = new[] { "exterior_ramp_present" },
            lat = 10.77205,
            lng = 106.69805,
        };
        var expectedHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(canonicalObj))));

        var existingSubmission = new Submission
        {
            SubmissionCode = "AMV-2026-99999",
            ClientSubmissionId = "sub-key-100",
            UserId = "auth-user-abc",
            PlaceId = "ben-thanh",
            PayloadHash = expectedHash,
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            Status = Domain.Enums.SubmissionStatus.PendingModeration,
            ExpStatus = "pending_review",
            PointsAwarded = 0,
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
        };

        _mockSubmissionRepo.Setup(r => r.GetByClientSubmissionIdAsync("auth-user-abc", "sub-key-100", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingSubmission);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);
        var result = await handler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.SubmissionId.Should().Be("AMV-2026-99999");
        result.ClientSubmissionId.Should().Be("sub-key-100");
        result.Message.Should().Contain("tiếp nhận trước đó");

        _mockSubmissionRepo.Verify(r => r.AddAsync(It.IsAny<Submission>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_Idempotency_SameClientSubmissionId_AndDifferentPayload_ThrowsSubmissionConflictException()
    {
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = 10.7720,
            Lng = 106.6980,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var existingSubmission = new Submission
        {
            SubmissionCode = "AMV-2026-88888",
            ClientSubmissionId = "sub-key-conflict",
            UserId = "user-123",
            PayloadHash = "ORIGINAL_HASH_12345",
        };

        _mockSubmissionRepo.Setup(r => r.GetByClientSubmissionIdAsync("user-123", "sub-key-conflict", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingSubmission);

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        var command = new SubmitSurveyCommand
        {
            ClientSubmissionId = "sub-key-conflict",
            AuthenticatedUserId = "user-123",
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/different-photo.jpg" },
            GpsLat = 10.77205,
            GpsLng = 106.69805,
        };

        var act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<SubmissionConflictException>()
            .WithMessage("*Conflict*");
    }

    [Fact]
    public async Task Handle_ConcurrentDbUpdateException_RecoversIdempotentlyWhenSamePayload()
    {
        var targetPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành",
            Lat = 10.7720,
            Lng = 106.6980,
        };

        _mockPlaceRepo.Setup(r => r.GetByIdAsync("ben-thanh", It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetPlace);

        var command = new SubmitSurveyCommand
        {
            ClientSubmissionId = "sub-race-condition",
            AuthenticatedUserId = "user-race",
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
            GpsLat = 10.77205,
            GpsLng = 106.69805,
        };

        var canonicalObj = new
        {
            locationId = "ben-thanh",
            mediaUrls = new[] { "https://example.com/ramp.jpg" },
            observations = Array.Empty<string>(),
            lat = 10.77205,
            lng = 106.69805,
        };
        var expectedHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(canonicalObj))));

        var committedRecord = new Submission
        {
            SubmissionCode = "AMV-2026-77777",
            ClientSubmissionId = "sub-race-condition",
            UserId = "user-race",
            PayloadHash = expectedHash,
            Status = Domain.Enums.SubmissionStatus.PendingModeration,
            ExpStatus = "pending_review",
            PointsAwarded = 0,
        };

        // First check returns null (both requests racing)
        _mockSubmissionRepo.SetupSequence(r => r.GetByClientSubmissionIdAsync("user-race", "sub-race-condition", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Submission?)null)
            .ReturnsAsync(committedRecord);

        // SaveChangesAsync throws DbUpdateException due to database unique constraint
        _mockSubmissionRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Microsoft.EntityFrameworkCore.DbUpdateException("Duplicate key violation", (Exception?)null));

        var handler = new SubmitSurveyCommandHandler(_mockPlaceRepo.Object, _mockSubmissionRepo.Object);

        var result = await handler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.SubmissionId.Should().Be("AMV-2026-77777");
        result.ClientSubmissionId.Should().Be("sub-race-condition");
        result.Message.Should().Contain("tiếp nhận trước đó");
    }

    [Fact]
    public async Task ExceptionHandlingMiddleware_MapsUnauthorized_ToHttp401()
    {
        var middleware = new AccessMapVN.WebApi.Middlewares.ExceptionHandlingMiddleware(
            _ => throw new UnauthorizedAccessException("Thiếu Access Token"),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<AccessMapVN.WebApi.Middlewares.ExceptionHandlingMiddleware>>());

        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(401);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();
        body.Should().Contain("Unauthorized");
    }

    [Fact]
    public async Task ExceptionHandlingMiddleware_MapsSubmissionConflict_ToHttp409()
    {
        var middleware = new AccessMapVN.WebApi.Middlewares.ExceptionHandlingMiddleware(
            _ => throw new SubmissionConflictException("Trùng lặp client submission ID nhưng khác payload (Conflict)."),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<AccessMapVN.WebApi.Middlewares.ExceptionHandlingMiddleware>>());

        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(409);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();
        body.Should().Contain("Idempotency Conflict");
    }

    [Fact]
    public async Task SubmissionsController_WhenUnauthenticated_ReturnsHttp401()
    {
        var mockMediator = new Mock<MediatR.IMediator>();
        var controller = new AccessMapVN.WebApi.Controllers.SubmissionsController(mockMediator.Object)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext()
            }
        };

        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
        };

        var result = await controller.Submit(command);

        result.Should().BeOfType<Microsoft.AspNetCore.Mvc.UnauthorizedObjectResult>();
        mockMediator.Verify(m => m.Send(It.IsAny<SubmitSurveyCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SubmissionsController_WhenAuthenticated_SetsAuthenticatedUserId()
    {
        var mockMediator = new Mock<MediatR.IMediator>();
        mockMediator.Setup(m => m.Send(It.IsAny<SubmitSurveyCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SubmitSurveyResult { SubmissionId = "AMV-2026-12345" });

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        var claims = new[] { new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "user-jwt-456") };
        httpContext.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "TestAuth"));

        var controller = new AccessMapVN.WebApi.Controllers.SubmissionsController(mockMediator.Object)
        {
            ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = httpContext
            }
        };

        var command = new SubmitSurveyCommand
        {
            LocationId = "ben-thanh",
            MediaUrls = new List<string> { "https://example.com/ramp.jpg" },
        };

        var result = await controller.Submit(command);

        result.Should().BeOfType<Microsoft.AspNetCore.Mvc.OkObjectResult>();
        mockMediator.Verify(m => m.Send(It.Is<SubmitSurveyCommand>(c => c.AuthenticatedUserId == "user-jwt-456"), It.IsAny<CancellationToken>()), Times.Once);
    }

    private static SupabaseJwtAuthenticationHandler CreateJwtHandler(string? secret, string envName)
    {
        var optionsMock = new Mock<IOptionsMonitor<AuthenticationSchemeOptions>>();
        optionsMock.Setup(o => o.Get(It.IsAny<string>())).Returns(new AuthenticationSchemeOptions());

        var loggerFactory = LoggerFactory.Create(builder => { });
        var encoder = UrlEncoder.Default;

        var configData = new Dictionary<string, string?>();
        if (secret != null)
        {
            configData["Authentication:JwtSecret"] = secret;
        }
        var config = new ConfigurationBuilder().AddInMemoryCollection(configData).Build();

        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(envName);

        return new SupabaseJwtAuthenticationHandler(
            optionsMock.Object,
            loggerFactory,
            encoder,
            config,
            envMock.Object);
    }

    private static string CreateTestJwt(string sub, string alg, string aud, long exp, string? secret)
    {
        var header = JsonSerializer.Serialize(new { alg, typ = "JWT" });
        var payload = JsonSerializer.Serialize(new { sub, aud, exp, iss = "supabase" });
        var headerB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(header));
        var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payload));
        var data = $"{headerB64}.{payloadB64}";
        string signatureB64 = "";
        if (!string.IsNullOrEmpty(secret))
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            signatureB64 = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(data)));
        }
        return $"{data}.{signatureB64}";
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    [Fact]
    public async Task SupabaseJwtHandler_WhenValidTokenAndSignature_ReturnsSuccess()
    {
        var secret = "test-very-secure-jwt-secret-string-12345";
        var exp = DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds();
        var token = CreateTestJwt("user-test-1", "HS256", "authenticated", exp, secret);

        var handler = CreateJwtHandler(secret, "Development");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = $"Bearer {token}";
        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(SupabaseJwtAuthenticationHandler)), httpContext);

        var result = await handler.AuthenticateAsync();

        result.Succeeded.Should().BeTrue();
        result.Principal?.FindFirst("sub")?.Value.Should().Be("user-test-1");
    }

    [Fact]
    public async Task SupabaseJwtHandler_WhenExpiredToken_FailsAuthentication()
    {
        var secret = "test-very-secure-jwt-secret-string-12345";
        var exp = DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeSeconds();
        var token = CreateTestJwt("user-test-1", "HS256", "authenticated", exp, secret);

        var handler = CreateJwtHandler(secret, "Development");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = $"Bearer {token}";
        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(SupabaseJwtAuthenticationHandler)), httpContext);

        var result = await handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.Failure?.Message.Should().Contain("expired");
    }

    [Fact]
    public async Task SupabaseJwtHandler_WhenAlgNone_FailsAuthentication()
    {
        var secret = "test-very-secure-jwt-secret-string-12345";
        var exp = DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds();
        var token = CreateTestJwt("user-test-1", "none", "authenticated", exp, secret);

        var handler = CreateJwtHandler(secret, "Development");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = $"Bearer {token}";
        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(SupabaseJwtAuthenticationHandler)), httpContext);

        var result = await handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.Failure?.Message.Should().Contain("algorithm");
    }

    [Fact]
    public async Task SupabaseJwtHandler_WhenInvalidSignature_FailsAuthentication()
    {
        var correctSecret = "test-very-secure-jwt-secret-string-12345";
        var wrongSecret = "wrong-secret-string-54321";
        var exp = DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds();
        var token = CreateTestJwt("user-test-1", "HS256", "authenticated", exp, wrongSecret);

        var handler = CreateJwtHandler(correctSecret, "Development");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = $"Bearer {token}";
        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(SupabaseJwtAuthenticationHandler)), httpContext);

        var result = await handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.Failure?.Message.Should().Contain("signature");
    }

    [Fact]
    public async Task SupabaseJwtHandler_WhenAnonRoleAudience_FailsAuthentication()
    {
        var secret = "test-very-secure-jwt-secret-string-12345";
        var exp = DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds();
        var token = CreateTestJwt("user-test-1", "HS256", "anon", exp, secret);

        var handler = CreateJwtHandler(secret, "Development");
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = $"Bearer {token}";
        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(SupabaseJwtAuthenticationHandler)), httpContext);

        var result = await handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.Failure?.Message.Should().Contain("audience");
    }

    private static string? GetPostgreSqlConnectionString()
    {
        var env = Environment.GetEnvironmentVariable("ConnectionStrings__SupabaseConnection")
                  ?? Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(env) && !env.Contains("YOUR_SUPABASE_DB_PASSWORD"))
        {
            return env;
        }

        var userSecretsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "Microsoft", "UserSecrets", "8f61a1c3-07fe-49c9-89d7-85410dd472a2", "secrets.json");

        if (File.Exists(userSecretsPath))
        {
            try
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(userSecretsPath));
                if (doc.RootElement.TryGetProperty("ConnectionStrings:SupabaseConnection", out var prop))
                {
                    var val = prop.GetString();
                    if (!string.IsNullOrWhiteSpace(val) && !val.Contains("YOUR_SUPABASE_DB_PASSWORD"))
                        return val;
                }
            }
            catch { }
        }

        return null;
    }

    [Fact]
    public async Task RealPostgreSql_UniqueIndexAndConcurrencyVerification()
    {
        var connStr = GetPostgreSqlConnectionString();
        if (string.IsNullOrWhiteSpace(connStr))
        {
            return;
        }

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(connStr);

        await using var dbContext = new ApplicationDbContext(optionsBuilder.Options);

        // 1. Chạy initializer xác thực/tạo schema trên database thật
        var logger = Mock.Of<ILogger<ApplicationDbContextInitialiser>>();
        var initialiser = new ApplicationDbContextInitialiser(dbContext, logger);
        await initialiser.InitialiseAsync();

        // 2. Truy vấn pg_indexes để xác nhận unique index thực sự tồn tại trên database
        await using var conn = (Npgsql.NpgsqlConnection)dbContext.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync();
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'submissions' AND indexname = 'idx_submissions_user_client_sub';";

        await using var reader = await cmd.ExecuteReaderAsync();
        var indexExists = await reader.ReadAsync();
        indexExists.Should().BeTrue("Unique index idx_submissions_user_client_sub phải tồn tại trong PostgreSQL pg_indexes");

        var indexDef = reader.GetString(1);
        indexDef.Should().Contain("UNIQUE INDEX");
        indexDef.Should().Contain("user_id, client_submission_id");
        await reader.CloseAsync();

        // 3. Kiểm tra Race Condition với hai request song song cùng user và client submission ID
        var testUserId = $"real-db-user-{Guid.NewGuid():N}";
        var testClientSubId = $"client-sub-{Guid.NewGuid():N}";

        var testPlace = new Place
        {
            Id = Guid.NewGuid(),
            Name = "Chợ Bến Thành Test",
            Lat = 10.772,
            Lng = 106.698,
        };
        var placeId = testPlace.Id.ToString();

        var mockPlaceRepo = new Mock<IPlaceRepository>();
        mockPlaceRepo.Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(testPlace);

        var command1 = new SubmitSurveyCommand
        {
            AuthenticatedUserId = testUserId,
            ClientSubmissionId = testClientSubId,
            LocationId = placeId,
            MediaUrls = new List<string> { "https://example.com/test.jpg" },
            GpsLat = 10.772,
            GpsLng = 106.698,
        };

        var command2Same = new SubmitSurveyCommand
        {
            AuthenticatedUserId = testUserId,
            ClientSubmissionId = testClientSubId,
            LocationId = placeId,
            MediaUrls = new List<string> { "https://example.com/test.jpg" },
            GpsLat = 10.772,
            GpsLng = 106.698,
        };

        var command3Different = new SubmitSurveyCommand
        {
            AuthenticatedUserId = testUserId,
            ClientSubmissionId = testClientSubId,
            LocationId = placeId,
            MediaUrls = new List<string> { "https://example.com/different-photo.jpg" },
            GpsLat = 10.772,
            GpsLng = 106.698,
        };

        // Sử dụng 2 DbContext riêng biệt để mô phỏng 2 request HTTP độc lập đồng thời
        await using var dbContext1 = new ApplicationDbContext(optionsBuilder.Options);
        await using var dbContext2 = new ApplicationDbContext(optionsBuilder.Options);
        var handler1 = new SubmitSurveyCommandHandler(mockPlaceRepo.Object, new SubmissionRepository(dbContext1));
        var handler2 = new SubmitSurveyCommandHandler(mockPlaceRepo.Object, new SubmissionRepository(dbContext2));

        // Kích hoạt đồng thời cả 2 request
        var task1 = handler1.Handle(command1, CancellationToken.None);
        var task2 = handler2.Handle(command2Same, CancellationToken.None);

        var results = await Task.WhenAll(task1, task2);

        results[0].SubmissionId.Should().Be(results[1].SubmissionId, "Hai request song song cùng payload phải trả về cùng submission ID");

        // Xác nhận trong PostgreSQL chỉ tồn tại duy nhất 1 bản ghi
        var count = await dbContext.Submissions.CountAsync(s => s.UserId == testUserId && s.ClientSubmissionId == testClientSubId);
        count.Should().Be(1, "Postgres unique constraint phải chặn bản ghi trùng và chỉ lưu đúng 1 dòng");

        // Kiểm tra request cùng key nhưng khác payload -> phải nhận SubmissionConflictException
        await using var dbContext3 = new ApplicationDbContext(optionsBuilder.Options);
        var handler3 = new SubmitSurveyCommandHandler(mockPlaceRepo.Object, new SubmissionRepository(dbContext3));
        var actConflict = () => handler3.Handle(command3Different, CancellationToken.None);
        await actConflict.Should().ThrowAsync<SubmissionConflictException>();

        // Dọn dẹp dữ liệu test
        var insertedRows = await dbContext.Submissions.Where(s => s.UserId == testUserId).ToListAsync();
        dbContext.Submissions.RemoveRange(insertedRows);
        await dbContext.SaveChangesAsync();
    }
}
