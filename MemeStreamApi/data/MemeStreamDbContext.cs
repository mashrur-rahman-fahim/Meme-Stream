using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.controller;
using MemeStreamApi.model;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.data
{
    public class MemeStreamDbContext : DbContext
    {
        public MemeStreamDbContext(DbContextOptions<MemeStreamDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<SharedPosts> SharedPosts { get; set; }
        public DbSet<FriendRequest> FriendRequests { get; set; }
        public DbSet<Reaction> Reactions { get; set; }
        public DbSet<Comment> Comments { get; set; }

        public DbSet<Message> Messages { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<GroupMembership> GroupMemberships { get; set; }

        public DbSet<MessageReacton> MessageReactons { get; set; }

        public DbSet<ChatFile> ChatFiles { get; set; }

        public DbSet<MessageReadReceipt> MessageReadReceipts { get; set; }
        
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<NotificationPreference> NotificationPreferences { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // User indexes
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
            
            modelBuilder.Entity<User>()
                .HasIndex(u => u.IsEmailVerified);
            
            modelBuilder.Entity<User>()
                .HasIndex(u => u.LaughScore);

            // Post indexes for feed performance
            modelBuilder.Entity<Post>()
                .HasIndex(p => new { p.UserId, p.CreatedAt })
                .HasDatabaseName("IX_Posts_UserId_CreatedAt");
            
            modelBuilder.Entity<Post>()
                .HasIndex(p => p.CreatedAt)
                .HasDatabaseName("IX_Posts_CreatedAt");

            // SharedPosts indexes
            modelBuilder.Entity<SharedPosts>()
                .HasIndex(sp => new { sp.UserId, sp.SharedAt })
                .HasDatabaseName("IX_SharedPosts_UserId_SharedAt");
            
            modelBuilder.Entity<SharedPosts>()
                .HasIndex(sp => sp.PostId);

            // FriendRequest indexes for friend queries
            modelBuilder.Entity<FriendRequest>()
                .HasIndex(fr => new { fr.SenderId, fr.Status })
                .HasDatabaseName("IX_FriendRequests_SenderId_Status");
            
            modelBuilder.Entity<FriendRequest>()
                .HasIndex(fr => new { fr.ReceiverId, fr.Status })
                .HasDatabaseName("IX_FriendRequests_ReceiverId_Status");

            // Reaction indexes for engagement queries
            modelBuilder.Entity<Reaction>()
                .HasIndex(r => new { r.PostId, r.UserId })
                .IsUnique()
                .HasDatabaseName("IX_Reactions_PostId_UserId");
            
            modelBuilder.Entity<Reaction>()
                .HasIndex(r => r.PostId);

            // Comment indexes
            modelBuilder.Entity<Comment>()
                .HasIndex(c => new { c.PostId, c.CreatedAt })
                .HasDatabaseName("IX_Comments_PostId_CreatedAt");
            
            modelBuilder.Entity<Comment>()
                .HasIndex(c => c.ParentCommentId);

            // Notification indexes
            modelBuilder.Entity<Notification>()
                .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt })
                .HasDatabaseName("IX_Notifications_UserId_IsRead_CreatedAt");
            
            modelBuilder.Entity<Notification>()
                .HasIndex(n => n.PostId);

            // Message indexes for chat performance
            modelBuilder.Entity<Message>()
                .HasIndex(m => new { m.GroupId, m.SentAt })
                .HasDatabaseName("IX_Messages_GroupId_SentAt");
            
            modelBuilder.Entity<Message>()
                .HasIndex(m => new { m.SenderId, m.SentAt })
                .HasDatabaseName("IX_Messages_SenderId_SentAt");

            // GroupMembership indexes
            modelBuilder.Entity<GroupMembership>()
                .HasIndex(gm => gm.UserId)
                .HasDatabaseName("IX_GroupMemberships_UserId");
            
            modelBuilder.Entity<GroupMembership>()
                .HasIndex(gm => gm.GroupId);

            // MessageReadReceipt indexes
            modelBuilder.Entity<MessageReadReceipt>()
                .HasIndex(mrr => new { mrr.UserId, mrr.MessageId })
                .IsUnique()
                .HasDatabaseName("IX_MessageReadReceipts_UserId_MessageId");
            
            modelBuilder.Entity<MessageReadReceipt>()
                .HasIndex(mrr => new { mrr.MessageId, mrr.SeenAt })
                .HasDatabaseName("IX_MessageReadReceipts_MessageId_SeenAt");

            modelBuilder.Entity<MessageReacton>()
                .HasIndex(r => new { r.MessageId, r.ReactorId })
                .IsUnique();

            // Configure Comment self-referencing relationship for replies
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascade delete issues
        }
    }
}
