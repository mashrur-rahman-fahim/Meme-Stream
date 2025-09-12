using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;


namespace MemeStreamApi.model
{
    public class Comment
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public int UserId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int? ParentCommentId { get; set; } // For replies
        public Post Post { get; set; }
        public User User { get; set; }
        public Comment? ParentComment { get; set; } // Parent comment (if this is a reply)
        public List<Comment> Replies { get; set; } = new List<Comment>(); // Child replies
    }
}