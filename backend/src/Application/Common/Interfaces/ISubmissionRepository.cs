using AccessMapVN.Domain.Entities;

namespace AccessMapVN.Application.Common.Interfaces;

public interface ISubmissionRepository
{
    Task AddAsync(Submission submission, CancellationToken cancellationToken = default);
    Task AddPointTransactionAsync(PointTransaction transaction, CancellationToken cancellationToken = default);
    Task<Submission?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<Submission?> GetByClientSubmissionIdAsync(string userId, string clientSubmissionId, CancellationToken cancellationToken = default);
    Task<List<Submission>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
