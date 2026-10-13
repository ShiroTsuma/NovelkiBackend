namespace Infrastructure.BookFiles;

using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Archives;
using BookCovers;
using Microsoft.Extensions.Options;

public sealed class LocalBookFileStorage(IOptions<BookFileOptions> options) : IBookFileStorage
{
    public async Task SaveAsync(string path, Stream content, CancellationToken ct)
    {
        var target = Resolve(path);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        // New objects only. A failed upload can never overwrite another EPUB.
        await using var stream =
            new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true);
        await content.CopyToAsync(stream, ct);
    }

    public Task<Stream> OpenReadAsync(string path, CancellationToken ct)
    {
        try
        {
            return Task.FromResult<Stream>(File.OpenRead(Resolve(path)));
        }
        catch (FileNotFoundException)
        {
            throw new EntityNotFoundException<BookFile, Guid>(Guid.Empty);
        }
    }

    public Task DeleteIfExistsAsync(string path, CancellationToken ct)
    {
        File.Delete(Resolve(path));
        return Task.CompletedTask;
    }

    private string Resolve(string key)
    {
        if (!ArchiveSafety.IsSafeName(key))
        {
            throw new ValidationException("Invalid file storage key.");
        }

        var root = Path.GetFullPath(options.Value.StorageRoot) + Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(Path.Combine(root, key.Replace('/', Path.DirectorySeparatorChar)));
        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Invalid file storage key.");
        }

        return path;
    }
}

public sealed class S3BookFileStorage(IAmazonS3 s3, IOptions<BookCoverOptions> options) : IBookFileStorage
{
    private string Bucket => options.Value.S3!.Bucket!;

    public async Task SaveAsync(string path, Stream content, CancellationToken ct)
    {
        await s3.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = Bucket,
                Key = path,
                InputStream = content,
                AutoCloseStream = false,
                ContentType = "application/epub+zip",
                UseChunkEncoding = false
            }, ct);
    }

    public async Task<Stream> OpenReadAsync(string path, CancellationToken ct)
    {
        try
        {
            return (await s3.GetObjectAsync(Bucket, path, ct)).ResponseStream;
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            throw new EntityNotFoundException<BookFile, Guid>(Guid.Empty);
        }
    }

    public async Task DeleteIfExistsAsync(string path, CancellationToken ct)
    {
        await s3.DeleteObjectAsync(Bucket, path, ct);
    }
}
