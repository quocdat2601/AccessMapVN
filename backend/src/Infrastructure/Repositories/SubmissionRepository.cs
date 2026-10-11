using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AccessMapVN.Infrastructure.Repositories;

public class SubmissionRepository : ISubmissionRepository
{
    private readonly ApplicationDbContext _context;

    public SubmissionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    private static bool _tablesInitialized = false;

    private async Task EnsureTablesExistAsync(CancellationToken cancellationToken)
    {
        if (_tablesInitialized) return;

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
        _tablesInitialized = true;
    }

    public async Task AddAsync(Submission submission, CancellationToken cancellationToken = default)
    {
        await EnsureTablesExistAsync(cancellationToken);
        await _context.Submissions.AddAsync(submission, cancellationToken);
    }

    public async Task AddPointTransactionAsync(PointTransaction transaction, CancellationToken cancellationToken = default)
    {
        await EnsureTablesExistAsync(cancellationToken);
        await _context.PointTransactions.AddAsync(transaction, cancellationToken);
    }

    public async Task<Submission?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .FirstOrDefaultAsync(s => s.SubmissionCode == code, cancellationToken);
    }

    public async Task<List<Submission>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
