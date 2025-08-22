using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class MessageReaction
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public int UserId { get; set; }
        public string Emoji { get; set; } = string.Empty;
        public DateTime ReactedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey("MessageId")]
        public ChatMessage Message { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; }
    }
}