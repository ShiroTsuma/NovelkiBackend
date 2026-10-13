namespace Api.Controllers;

using System.Runtime.CompilerServices;
using Application.Common.DTOs.Book;
using Application.Common.Interfaces;
using Filters;
using FluentValidation;
using Infrastructure.BookFiles;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

[ApiController]
[Authorize]
[Route(ApiRoutes.Book)]
public sealed class BookFilesController(IBookFileService service, IOptions<BookFileOptions> options) : ControllerBase
{
    [HttpGet("files/limits")]
    public IActionResult Limits()
    {
        return Ok(service.Limits());
    }

    [HttpGet("{bookId:guid}/files")]
    public async Task<IActionResult> List(Guid bookId, CancellationToken ct)
    {
        return Ok(await service.ListAsync(bookId, ct));
    }

    [HttpGet("/" + ApiRoutes.PublicBook + "/{snapshotId:guid}/files")]
    public async Task<IActionResult> PublicList(Guid snapshotId, CancellationToken ct)
    {
        return Ok(await service.ListPublicAsync(snapshotId, ct));
    }

    [HttpPut("{bookId:guid}/files/{fileId:guid}")]
    public async Task<IActionResult> Update(Guid bookId, Guid fileId, [FromBody] UpdateFileRequest request,
        CancellationToken ct)
    {
        await service.UpdateAsync(bookId, fileId, request.Title, ct);
        return NoContent();
    }

    [HttpPut("{bookId:guid}/files/order")]
    public async Task<IActionResult> Order(Guid bookId, [FromBody] Guid[] fileIds, CancellationToken ct)
    {
        await service.ReorderAsync(bookId, fileIds, ct);
        return NoContent();
    }

    [HttpPut("{bookId:guid}/files/shared")]
    public async Task<IActionResult> Share(Guid bookId, [FromBody] Guid[] fileIds, CancellationToken ct)
    {
        await service.ShareAsync(bookId, fileIds, ct);
        return NoContent();
    }

    [HttpDelete("{bookId:guid}/files/{fileId:guid}")]
    public async Task<IActionResult> Delete(Guid bookId, Guid fileId, CancellationToken ct)
    {
        await service.DeleteAsync(bookId, fileId, ct);
        return NoContent();
    }

    [HttpPost("{bookId:guid}/files/{fileId:guid}/restore")]
    public async Task<IActionResult> Restore(Guid bookId, Guid fileId, CancellationToken ct)
    {
        await service.RestoreAsync(bookId, fileId, ct);
        return NoContent();
    }

    [HttpPost("{bookId:guid}/files/import/sessions")]
    [DisableFormValueModelBinding]
    [Consumes("multipart/form-data")]
    [DisableRequestSizeLimit]
    [EnableRateLimiting(DependencyInjection.ExpensiveUserActionRateLimitPolicy)]
    public async Task<IActionResult> Upload(Guid bookId, CancellationToken ct)
    {
        return Accepted(await service.CreateImportAsync(bookId, ReadUploads(options.Value.MaxUploadBytes, ct), ct,
            Request.ContentLength));
    }

    [HttpPost("files/import/sessions")]
    [DisableFormValueModelBinding]
    [Consumes("multipart/form-data")]
    [DisableRequestSizeLimit]
    [EnableRateLimiting(DependencyInjection.FullBackupRateLimitPolicy)]
    public async Task<IActionResult> ImportArchive(CancellationToken ct)
    {
        return Accepted(await service.CreateImportAsync(null, ReadUploads(options.Value.MaxLibraryArchiveBytes, ct), ct,
            Request.ContentLength));
    }

    [HttpGet("files/sessions/{id:guid}")]
    public async Task<IActionResult> Session(Guid id, CancellationToken ct)
    {
        return Ok(await service.GetJobAsync(id, ct));
    }

    [HttpGet("files/sessions")]
    public async Task<IActionResult> Sessions(CancellationToken ct)
    {
        return Ok(await service.ListJobsAsync(ct));
    }

    [HttpPost("files/sessions/{id:guid}/confirm")]
    [EnableRateLimiting(DependencyInjection.ExpensiveUserActionRateLimitPolicy)]
    public async Task<IActionResult> Confirm(Guid id, [FromBody] BookFileImportSelection[] selection,
        CancellationToken ct)
    {
        return Accepted(await service.FinalizeAsync(id, selection, ct));
    }

    [HttpDelete("files/sessions/{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        await service.CancelAsync(id, ct);
        return NoContent();
    }

    [HttpGet("files/export/candidates")]
    public async Task<IActionResult> Candidates([FromQuery] string? query, CancellationToken ct)
    {
        return Ok(await service.ExportCandidatesAsync(query, ct));
    }

    [HttpPost("files/export/sessions")]
    [EnableRateLimiting(DependencyInjection.ExpensiveUserActionRateLimitPolicy)]
    public async Task<IActionResult> Export([FromBody] ExportFilesRequest request, CancellationToken ct)
    {
        return Accepted(await service.CreateExportAsync(request.FileIds, request.SnapshotId, request.IncludeManifest,
            ct));
    }

    [HttpPost("files/downloads")]
    [EnableRateLimiting(DependencyInjection.ExpensiveUserActionRateLimitPolicy)]
    public async Task<IActionResult> Downloads([FromBody] DownloadFilesRequest request, CancellationToken ct)
    {
        return Ok(await service.CreateDownloadsAsync(request.FileIds, request.SnapshotId, ct));
    }

    [HttpPost("files/sessions/{id:guid}/download")]
    [EnableRateLimiting(DependencyInjection.ExpensiveUserActionRateLimitPolicy)]
    public async Task<IActionResult> JobDownload(Guid id, CancellationToken ct)
    {
        return Ok(await service.CreateJobDownloadAsync(id, ct));
    }

    [HttpGet("files/download/{id:guid}")]
    [AllowAnonymous]
    [EnableRateLimiting(DependencyInjection.ExpensiveUserActionRateLimitPolicy)]
    public async Task<IActionResult> Download(Guid id, [FromQuery] string token, CancellationToken ct)
    {
        var file = await service.ConsumeDownloadAsync(id, token, ct);
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["Referrer-Policy"] = "no-referrer";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Content, file.MimeType, file.FileName);
    }

    private async IAsyncEnumerable<BookFileUpload> ReadUploads(long maximumBytes,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var feature = HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (feature is { IsReadOnly: false })
        {
            feature.MaxRequestBodySize = maximumBytes + 1024 * 1024;
        }

        if (!MediaTypeHeaderValue.TryParse(Request.ContentType, out var contentType))
        {
            throw new ValidationException("A multipart upload is required.");
        }

        var boundary = HeaderUtilities.RemoveQuotes(contentType.Boundary).Value;
        if (string.IsNullOrWhiteSpace(boundary) || boundary.Length > 128)
        {
            throw new ValidationException("Invalid multipart boundary.");
        }

        var reader = new MultipartReader(boundary, Request.Body)
        {
            HeadersCountLimit = 8, HeadersLengthLimit = 4096, BodyLengthLimit = maximumBytes
        };
        MultipartSection? section;
        var count = 0;
        while ((section = await reader.ReadNextSectionAsync(ct)) != null)
        {
            if (++count > options.Value.MaxFilesPerImport ||
                !ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out var disposition) ||
                (!disposition.FileName.HasValue && !disposition.FileNameStar.HasValue))
            {
                throw new ValidationException("The upload must contain only EPUB or ZIP files.");
            }

            var filename = HeaderUtilities
                .RemoveQuotes(disposition.FileNameStar.HasValue ? disposition.FileNameStar : disposition.FileName)
                .Value!;
            yield return new BookFileUpload(section.Body, filename);
        }
    }

    public sealed record UpdateFileRequest(string Title);

    public sealed record DownloadFilesRequest(Guid[] FileIds, Guid? SnapshotId);

    public sealed record ExportFilesRequest(Guid[] FileIds, Guid? SnapshotId, bool IncludeManifest);
}
