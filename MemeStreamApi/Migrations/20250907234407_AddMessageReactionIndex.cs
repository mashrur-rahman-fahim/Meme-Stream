using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MemeStreamApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageReactionIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MessageReactons_MessageId",
                table: "MessageReactons");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactons_MessageId_ReactorId",
                table: "MessageReactons",
                columns: new[] { "MessageId", "ReactorId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MessageReactons_MessageId_ReactorId",
                table: "MessageReactons");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactons_MessageId",
                table: "MessageReactons",
                column: "MessageId");
        }
    }
}
