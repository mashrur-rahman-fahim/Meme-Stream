using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MemeStreamApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdatedGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Groups",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsCoAdmin",
                table: "GroupMemberships",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "JoinedAt",
                table: "GroupMemberships",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "IsCoAdmin",
                table: "GroupMemberships");

            migrationBuilder.DropColumn(
                name: "JoinedAt",
                table: "GroupMemberships");
        }
    }
}
