namespace Application.Common.Interfaces;

using DTOs.Book;

public interface IBookSearchSuggestionQueryService
{
    public Task<IReadOnlyCollection<BookSearchSuggestionDto>> GetSuggestionsAsync(
        Guid ownerId,
        string field,
        string? search,
        BookSearchCriteria? criteria,
        int take,
        CancellationToken cancellationToken);
}
