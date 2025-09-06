using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class Group
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public int CreatedById { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User CreatedBy { get; set; }

        public ICollection<GroupMembership> Members { get; set; }
    }
}