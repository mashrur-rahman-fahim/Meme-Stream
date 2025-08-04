using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MemeStreamApi.model
{
    public class Post
    {
        public int Id { get; set; }
        public string Image { get; set; } = string.Empty;
        public string Content { get; set; }=string.Empty;
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        
        
    }
}