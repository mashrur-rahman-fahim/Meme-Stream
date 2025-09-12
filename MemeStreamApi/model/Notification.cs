using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class Notification
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Message { get; set; }
        
        [MaxLength(100)]
        public string? Title { get; set; }
        
        public int? RelatedUserId { get; set; }
        
        [ForeignKey("RelatedUserId")]
        public User? RelatedUser { get; set; }
        
        public int? PostId { get; set; }
        
        [ForeignKey("PostId")]
        public Post? Post { get; set; }
        
        public int? CommentId { get; set; }
        
        [ForeignKey("CommentId")]
        public Comment? Comment { get; set; }
        
        [MaxLength(200)]
        public string? ActionUrl { get; set; }
        
        public bool IsRead { get; set; } = false;
        
        public bool IsDeleted { get; set; } = false;
        
        [MaxLength(20)]
        public string Priority { get; set; } = "normal";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ReadAt { get; set; }
    }
}