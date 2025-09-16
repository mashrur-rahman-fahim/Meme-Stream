using System.Collections.Generic;

namespace MemeStreamApi.Models
{
    public class CreateGroupDto
    {
        public string Name { get; set; }
        public List<int> MemberIds { get; set; } = new List<int>();
    }
}