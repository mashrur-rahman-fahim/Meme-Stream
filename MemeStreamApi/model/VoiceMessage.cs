using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class VoiceMessage
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

        [Required]
        public int Duration { get; set; } // Duration in seconds

        [Required]
        public long FileSize { get; set; } // File size in bytes

        public string? WaveformData { get; set; } // Comma-separated waveform values

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

        public List<VoiceMessagePlay> Plays { get; set; } = new();
    }

    public class VoiceMessagePlay
    {
        public int Id { get; set; }

        [Required]
        public int VoiceMessageId { get; set; }

        [Required]
        public int UserId { get; set; }

        public DateTime PlayedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("VoiceMessageId")]
        public VoiceMessage VoiceMessage { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; }
    }
}