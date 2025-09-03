using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class Message
    {
        public int Id { get; set; }

        [Required]
        public int SenderId { get; set; }

        public int? ReceiverId { get; set; } // null for group messages

        public int? GroupId { get; set; } // null for private messages

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public bool IsRead { get; set; } = false;

        public bool IsDeleted { get; set; } = false;
        public DateTime? EditedAt { get; set; }

        [ForeignKey("SenderId")]
        public User Sender { get; set; }

        [ForeignKey("ReceiverId")]
        public User? Receiver { get; set; }

        [ForeignKey("GroupId")]
        public Group? Group { get; set; }

        public List<MessageReadReceipt> ReadReceipts { get; set; } = new();


    }
}
