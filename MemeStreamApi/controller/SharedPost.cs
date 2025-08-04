using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.model;

namespace MemeStreamApi.controller
{
    public class SharedPost
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public Post Post { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public DateTime SharedAt { get; set; }
        
    }
}