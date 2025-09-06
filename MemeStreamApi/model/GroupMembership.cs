using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class GroupMembership
    {
        public int Id { get; set; }

        public int GroupId { get; set; }

        public int UserId { get; set; }

        public bool IsCoAdmin { get; set; } = false;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        public Group Group { get; set; }

        public User User { get; set; }
    }
}