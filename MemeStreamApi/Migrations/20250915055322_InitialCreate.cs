using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MemeStreamApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SharedPosts_UserId",
                table: "SharedPosts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_UserId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Messages_GroupId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_MessageReadReceipts_MessageId",
                table: "MessageReadReceipts");

            migrationBuilder.DropIndex(
                name: "IX_MessageReadReceipts_UserId",
                table: "MessageReadReceipts");

            migrationBuilder.DropIndex(
                name: "IX_FriendRequests_ReceiverId",
                table: "FriendRequests");

            migrationBuilder.DropIndex(
                name: "IX_FriendRequests_SenderId",
                table: "FriendRequests");

            migrationBuilder.DropIndex(
                name: "IX_Comments_PostId",
                table: "Comments");

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsEmailVerified",
                table: "Users",
                column: "IsEmailVerified");

            migrationBuilder.CreateIndex(
                name: "IX_Users_LaughScore",
                table: "Users",
                column: "LaughScore");

            migrationBuilder.CreateIndex(
                name: "IX_SharedPosts_UserId_SharedAt",
                table: "SharedPosts",
                columns: new[] { "UserId", "SharedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Reactions_PostId_UserId",
                table: "Reactions",
                columns: new[] { "PostId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Posts_CreatedAt",
                table: "Posts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_UserId_CreatedAt",
                table: "Posts",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_GroupId_SentAt",
                table: "Messages",
                columns: new[] { "GroupId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId_SentAt",
                table: "Messages",
                columns: new[] { "SenderId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MessageReadReceipts_MessageId_SeenAt",
                table: "MessageReadReceipts",
                columns: new[] { "MessageId", "SeenAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MessageReadReceipts_UserId_MessageId",
                table: "MessageReadReceipts",
                columns: new[] { "UserId", "MessageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FriendRequests_ReceiverId_Status",
                table: "FriendRequests",
                columns: new[] { "ReceiverId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_FriendRequests_SenderId_Status",
                table: "FriendRequests",
                columns: new[] { "SenderId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_PostId_CreatedAt",
                table: "Comments",
                columns: new[] { "PostId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_IsEmailVerified",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_LaughScore",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SharedPosts_UserId_SharedAt",
                table: "SharedPosts");

            migrationBuilder.DropIndex(
                name: "IX_Reactions_PostId_UserId",
                table: "Reactions");

            migrationBuilder.DropIndex(
                name: "IX_Posts_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_UserId_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId_IsRead_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Messages_GroupId_SentAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderId_SentAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_MessageReadReceipts_MessageId_SeenAt",
                table: "MessageReadReceipts");

            migrationBuilder.DropIndex(
                name: "IX_MessageReadReceipts_UserId_MessageId",
                table: "MessageReadReceipts");

            migrationBuilder.DropIndex(
                name: "IX_FriendRequests_ReceiverId_Status",
                table: "FriendRequests");

            migrationBuilder.DropIndex(
                name: "IX_FriendRequests_SenderId_Status",
                table: "FriendRequests");

            migrationBuilder.DropIndex(
                name: "IX_Comments_PostId_CreatedAt",
                table: "Comments");

            migrationBuilder.CreateIndex(
                name: "IX_SharedPosts_UserId",
                table: "SharedPosts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_UserId",
                table: "Posts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_GroupId",
                table: "Messages",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReadReceipts_MessageId",
                table: "MessageReadReceipts",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReadReceipts_UserId",
                table: "MessageReadReceipts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FriendRequests_ReceiverId",
                table: "FriendRequests",
                column: "ReceiverId");

            migrationBuilder.CreateIndex(
                name: "IX_FriendRequests_SenderId",
                table: "FriendRequests",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_PostId",
                table: "Comments",
                column: "PostId");
        }
    }
}
