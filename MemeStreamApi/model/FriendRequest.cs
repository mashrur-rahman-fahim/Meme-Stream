using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MemeStreamApi.model
{
    public class FriendRequest
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public int ReceiverId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public User Sender { get; set; }
        public User Receiver { get; set; }
        
        public enum RequestStatus
        {
            Pending,
            Accepted,
            Rejected
        }
        public RequestStatus Status { get; set; } = RequestStatus.Pending;
     
    }
}