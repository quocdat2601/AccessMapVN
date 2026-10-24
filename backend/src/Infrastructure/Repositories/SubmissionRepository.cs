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

    public async Task AddAsync(Submission submission, CancellationToken cancellationToken = default)
    {
        await _context.Submissions.AddAsync(submission, cancellationToken);
    }

    public async Task AddPointTransactionAsync(PointTransaction transaction, CancellationToken cancellationToken = default)
    {
        await _context.PointTransactions.AddAsync(transaction, cancellationToken);
    }

    public async Task<Submission?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<Submission?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .FirstOrDefaultAsync(s => s.SubmissionCode == code, cancellationToken);
    }

    public async Task<Submission?> GetByClientSubmissionIdAsync(string userId, string clientSubmissionId, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.ClientSubmissionId == clientSubmissionId, cancellationToken);
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
