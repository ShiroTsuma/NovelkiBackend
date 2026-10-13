namespace Domain.Repositories;

public interface IReadingTimeSettingRepository
{
    public Task<IReadOnlyCollection<ReadingTimeSetting>> GetByUserIdAsync(Guid userId,
        CancellationToken cancellationToken);

    public Task UpsertAsync(
        Guid userId,
        IReadOnlyDictionary<Guid, decimal> minutesByContentType,
        CancellationToken cancellationToken);
}
