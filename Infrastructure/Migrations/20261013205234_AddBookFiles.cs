using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookFiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StorageCleanupQueueItems_StoragePath",
                table: "StorageCleanupQueueItems");

            migrationBuilder.AddColumn<string>(
                name: "StorageKind",
                table: "StorageCleanupQueueItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Cover");

            migrationBuilder.CreateTable(
                name: "BookFileDownloadTickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FileId = table.Column<Guid>(type: "uuid", nullable: true),
                    SnapshotId = table.Column<Guid>(type: "uuid", nullable: true),
                    JobId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConsumedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookFileDownloadTickets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BookFileJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookId = table.Column<Guid>(type: "uuid", nullable: true),
                    Kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PayloadJson = table.Column<string>(type: "text", nullable: false),
                    Error = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ImportedCount = table.Column<int>(type: "integer", nullable: false),
                    SkippedCount = table.Column<int>(type: "integer", nullable: false),
                    ProcessedFiles = table.Column<int>(type: "integer", nullable: false),
                    TotalFiles = table.Column<int>(type: "integer", nullable: false),
                    ReservedBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookFileJobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BookFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoragePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    MimeType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Created = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    LastModified = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookFiles", x => x.Id);
                    table.CheckConstraint("CK_BookFiles_Size", "\"SizeBytes\" > 0");
                    table.ForeignKey(
                        name: "FK_BookFiles_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PublicBookFiles",
                columns: table => new
                {
                    SnapshotId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookFileId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicBookFiles", x => new { x.SnapshotId, x.BookFileId });
                    table.ForeignKey(
                        name: "FK_PublicBookFiles_BookFiles_BookFileId",
                        column: x => x.BookFileId,
                        principalTable: "BookFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PublicBookFiles_PublicBookSnapshots_SnapshotId",
                        column: x => x.SnapshotId,
                        principalTable: "PublicBookSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StorageCleanupQueueItems_StorageKind_StoragePath",
                table: "StorageCleanupQueueItems",
                columns: new[] { "StorageKind", "StoragePath" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BookFileDownloadTickets_ExpiresAtUtc",
                table: "BookFileDownloadTickets",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_BookFileJobs_OwnerId_ExpiresAtUtc",
                table: "BookFileJobs",
                columns: new[] { "OwnerId", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BookFileJobs_Status_CreatedAtUtc",
                table: "BookFileJobs",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_BookFiles_BookId_Sha256",
                table: "BookFiles",
                columns: new[] { "BookId", "Sha256" },
                unique: true,
                filter: "\"DeletedAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BookFiles_BookId_SortOrder",
                table: "BookFiles",
                columns: new[] { "BookId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_BookFiles_OwnerId_DeletedAtUtc",
                table: "BookFiles",
                columns: new[] { "OwnerId", "DeletedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PublicBookFiles_BookFileId",
                table: "PublicBookFiles",
                column: "BookFileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookFileDownloadTickets");

            migrationBuilder.DropTable(
                name: "BookFileJobs");

            migrationBuilder.DropTable(
                name: "PublicBookFiles");

            migrationBuilder.DropTable(
                name: "BookFiles");

            migrationBuilder.DropIndex(
                name: "IX_StorageCleanupQueueItems_StorageKind_StoragePath",
                table: "StorageCleanupQueueItems");

            migrationBuilder.DropColumn(
                name: "StorageKind",
                table: "StorageCleanupQueueItems");

            migrationBuilder.CreateIndex(
                name: "IX_StorageCleanupQueueItems_StoragePath",
                table: "StorageCleanupQueueItems",
                column: "StoragePath",
                unique: true);
        }
    }
}
