using AccessMapVN.Domain.Entities;

namespace AccessMapVN.Application.Common.Interfaces;

public interface IPlaceRepository
{
    Task<Place?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
}
