using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class NotificationPreference
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; }
        
        public bool EmailNotifications { get; set; } = true;
        
        public bool PushNotifications { get; set; } = true;
        
        public bool InAppNotifications { get; set; } = true;
        
        public bool LikeNotifications { get; set; } = true;
        
        public bool CommentNotifications { get; set; } = true;
        
        public bool FollowNotifications { get; set; } = true;
        
        public bool MentionNotifications { get; set; } = true;
        
        public bool ShareNotifications { get; set; } = true;
        
        public bool FriendRequestNotifications { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}