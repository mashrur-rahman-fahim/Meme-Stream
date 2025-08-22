using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public int SenderId { get; set; }
        public int? ReceiverId { get; set; } // For direct messages
        public int? GroupId { get; set; } // For group messages
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeliveredAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public MessageStatus Status { get; set; } = MessageStatus.Sent;
        public bool IsSpam { get; set; } = false;
        public string? MentionedUserIds { get; set; } 
        
        [ForeignKey("SenderId")]
        public User Sender { get; set; }
        
        [ForeignKey("ReceiverId")]
        public User? Receiver { get; set; }
        
        [ForeignKey("GroupId")]
        public ChatGroup? Group { get; set; }
    }

    public enum MessageStatus
    {
        Sent,       // ✓
        Delivered,  // ✓✓
        Read,       // ✓✓ + blue
        Error       // ! red
    }
}