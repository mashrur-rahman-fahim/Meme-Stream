-- Create Notifications table
CREATE TABLE IF NOT EXISTS "Notifications" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL,
    "Type" VARCHAR(50) NOT NULL,
    "Message" VARCHAR(500) NOT NULL,
    "Title" VARCHAR(100),
    "RelatedUserId" INTEGER,
    "PostId" INTEGER,
    "CommentId" INTEGER,
    "ActionUrl" VARCHAR(200),
    "IsRead" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "Priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "ReadAt" TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    FOREIGN KEY ("RelatedUserId") REFERENCES "Users"("Id") ON DELETE SET NULL,
    FOREIGN KEY ("PostId") REFERENCES "Posts"("Id") ON DELETE SET NULL,
    FOREIGN KEY ("CommentId") REFERENCES "Comments"("Id") ON DELETE SET NULL
);

-- Create NotificationPreferences table
CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL UNIQUE,
    "EmailNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "PushNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "InAppNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "LikeNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "CommentNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "FollowNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "MentionNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "ShareNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "FriendRequestNotifications" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "IX_Notifications_UserId" ON "Notifications"("UserId");
CREATE INDEX IF NOT EXISTS "IX_Notifications_RelatedUserId" ON "Notifications"("RelatedUserId");
CREATE INDEX IF NOT EXISTS "IX_Notifications_PostId" ON "Notifications"("PostId");
CREATE INDEX IF NOT EXISTS "IX_Notifications_CommentId" ON "Notifications"("CommentId");
CREATE INDEX IF NOT EXISTS "IX_Notifications_CreatedAt" ON "Notifications"("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_Notifications_IsRead" ON "Notifications"("IsRead");
CREATE INDEX IF NOT EXISTS "IX_NotificationPreferences_UserId" ON "NotificationPreferences"("UserId");