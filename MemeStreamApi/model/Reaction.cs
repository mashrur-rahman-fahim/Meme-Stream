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
        public string Type { get; set; } = string.Empty;
    }
}