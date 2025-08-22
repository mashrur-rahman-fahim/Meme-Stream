using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class ChatGroupMember
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public int UserId { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public bool IsAdmin { get; set; } = false;

        [ForeignKey("GroupId")]
        public ChatGroup Group { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; }
    }
}