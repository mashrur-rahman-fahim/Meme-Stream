using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class MediaMessage
    {
        public int Id { get; set; }

        [Required]
        public int SenderId { get; set; }

        public int? ReceiverId { get; set; } // null for group messages

        public int? GroupId { get; set; } // null for private messages

        public int? MessageId { get; set; } // Link to the main Message entity

        [Required]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string FilePath { get; set; } = string.Empty;

        [StringLength(500)]
        public string? ThumbnailPath { get; set; }

        [Required]
        [StringLength(50)]
        public string MediaType { get; set; } = string.Empty; // image, video, audio, file

        [Required]
        public long FileSize { get; set; } // File size in bytes

        public int? Width { get; set; } // For images and videos

        public int? Height { get; set; } // For images and videos

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; } = false;

        // Navigation properties
        [ForeignKey("SenderId")]
        public User Sender { get; set; }

        [ForeignKey("ReceiverId")]
        public User? Receiver { get; set; }

        [ForeignKey("GroupId")]
        public Group? Group { get; set; }

        [ForeignKey("MessageId")]
        public Message? Message { get; set; }
    }
}