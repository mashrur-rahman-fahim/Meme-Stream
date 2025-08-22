using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;


namespace MemeStreamApi.model
{
    public class ChatGroup
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int CreatedById { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Image { get; set; } = string.Empty;
        
        [ForeignKey("CreatedById")]
        public User CreatedBy { get; set; }
        
        public List<ChatGroupMember> Members { get; set; } = new List<ChatGroupMember>();
    }
}