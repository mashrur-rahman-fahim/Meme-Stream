using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MemeStreamApi.model
{
    public class Reaction
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public int UserId { get; set; }
        public enum ReactionType
        {
            Laugh
        }   
        public ReactionType Type { get; set; } = ReactionType.Laugh;
        public Post Post { get; set; }
        public User User { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
      
    }
}