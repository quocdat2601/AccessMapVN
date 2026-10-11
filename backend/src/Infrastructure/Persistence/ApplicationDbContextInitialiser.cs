using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AccessMapVN.Infrastructure.Persistence;

public class ApplicationDbContextInitialiser
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;

    public ApplicationDbContextInitialiser(
        ApplicationDbContext context,
        ILogger<ApplicationDbContextInitialiser> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitialiseAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync(cancellationToken);
            }

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS submissions (
                    id UUID PRIMARY KEY,
                    submission_code VARCHAR(50) NOT NULL,
                    place_id VARCHAR(100) NOT NULL,
                    user_id VARCHAR(100) NOT NULL,
                    media_urls TEXT[] NOT NULL,
                    feature_tags TEXT[] NOT NULL,
                    gps_lat DOUBLE PRECISION NOT NULL,
                    gps_lng DOUBLE PRECISION NOT NULL,
                    accuracy_meters DOUBLE PRECISION NULL,
                    text_description TEXT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
                    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.88,
                    points_awarded INTEGER NOT NULL DEFAULT 50,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at_utc TIMESTAMPTZ NULL
                );

                CREATE TABLE IF NOT EXISTS point_transactions (
                    id UUID PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    submission_id VARCHAR(50) NOT NULL,
                    points INTEGER NOT NULL DEFAULT 50,
                    reason TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at_utc TIMESTAMPTZ NULL
                );";

            await cmd.ExecuteNonQueryAsync(cancellationToken);
            _logger.LogInformation("Database tables verified/initialized successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initializing database tables.");
            throw;
        }
    }
}
