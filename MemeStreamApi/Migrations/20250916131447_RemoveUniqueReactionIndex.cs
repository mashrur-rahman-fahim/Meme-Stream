using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MemeStreamApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUniqueReactionIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use IF EXISTS to safely drop the index if it exists
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Reactions_PostId_UserId\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Reactions_PostId_UserId",
                table: "Reactions",
                columns: new[] { "PostId", "UserId" },
                unique: true);
        }
    }
}
