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
            // Drop indexes if they exist
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_SharedPosts_UserId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Posts_UserId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Notifications_UserId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Messages_GroupId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Messages_SenderId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_MessageReadReceipts_MessageId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_MessageReadReceipts_UserId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_FriendRequests_ReceiverId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_FriendRequests_SenderId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Comments_PostId\";");

            // Create indexes if they don't exist
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Users_IsEmailVerified\" ON \"Users\" (\"IsEmailVerified\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Users_LaughScore\" ON \"Users\" (\"LaughScore\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SharedPosts_UserId_SharedAt\" ON \"SharedPosts\" (\"UserId\", \"SharedAt\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Reactions_PostId_UserId\" ON \"Reactions\" (\"PostId\", \"UserId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Posts_CreatedAt\" ON \"Posts\" (\"CreatedAt\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Posts_UserId_CreatedAt\" ON \"Posts\" (\"UserId\", \"CreatedAt\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Notifications_UserId_IsRead_CreatedAt\" ON \"Notifications\" (\"UserId\", \"IsRead\", \"CreatedAt\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Messages_GroupId_SentAt\" ON \"Messages\" (\"GroupId\", \"SentAt\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Messages_SenderId_SentAt\" ON \"Messages\" (\"SenderId\", \"SentAt\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_MessageReadReceipts_MessageId_SeenAt\" ON \"MessageReadReceipts\" (\"MessageId\", \"SeenAt\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_MessageReadReceipts_UserId_MessageId\" ON \"MessageReadReceipts\" (\"UserId\", \"MessageId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_FriendRequests_ReceiverId_Status\" ON \"FriendRequests\" (\"ReceiverId\", \"Status\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_FriendRequests_SenderId_Status\" ON \"FriendRequests\" (\"SenderId\", \"Status\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Comments_PostId_CreatedAt\" ON \"Comments\" (\"PostId\", \"CreatedAt\");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop indexes if they exist
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Users_IsEmailVerified\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Users_LaughScore\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_SharedPosts_UserId_SharedAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Reactions_PostId_UserId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Posts_CreatedAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Posts_UserId_CreatedAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Notifications_UserId_IsRead_CreatedAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Messages_GroupId_SentAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Messages_SenderId_SentAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_MessageReadReceipts_MessageId_SeenAt\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_MessageReadReceipts_UserId_MessageId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_FriendRequests_ReceiverId_Status\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_FriendRequests_SenderId_Status\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Comments_PostId_CreatedAt\";");

            // Create indexes if they don't exist
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SharedPosts_UserId\" ON \"SharedPosts\" (\"UserId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Posts_UserId\" ON \"Posts\" (\"UserId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Notifications_UserId\" ON \"Notifications\" (\"UserId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Messages_GroupId\" ON \"Messages\" (\"GroupId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Messages_SenderId\" ON \"Messages\" (\"SenderId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_MessageReadReceipts_MessageId\" ON \"MessageReadReceipts\" (\"MessageId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_MessageReadReceipts_UserId\" ON \"MessageReadReceipts\" (\"UserId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_FriendRequests_ReceiverId\" ON \"FriendRequests\" (\"ReceiverId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_FriendRequests_SenderId\" ON \"FriendRequests\" (\"SenderId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Comments_PostId\" ON \"Comments\" (\"PostId\");");
        }
    }
}
