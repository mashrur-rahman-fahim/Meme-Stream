using System.ComponentModel.DataAnnotations;

namespace MemeStreamApi.model
{
    public class GroupMessageRead
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public DateTime LastReadAt { get; set; }

        // Navigation properties
        public Group Group { get; set; }
        public User User { get; set; }
    }
}