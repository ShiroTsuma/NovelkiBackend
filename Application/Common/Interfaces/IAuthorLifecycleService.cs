namespace Application.Common.Interfaces;

public interface IAuthorLifecycleService
{
    public Task<Author> SetVisibilityAsync(Guid authorId, Guid actorId, bool isAdmin, bool isPublic,
        CancellationToken cancellationToken);

    public Task DeleteAsync(Guid authorId, Guid actorId, bool isAdmin, CancellationToken cancellationToken);

    public Task<int> DeleteOwnedAuthorsAsync(Guid ownerId, CancellationToken cancellationToken);
}
