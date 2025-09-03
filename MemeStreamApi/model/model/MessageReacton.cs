using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{
    public class MessageReacton
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public int ReactorId { get; set; }
        public string Emoji { get; set; } = string.Empty;

        [ForeignKey("MessageId")]
        public Message Message { get; set; }

        [ForeignKey("ReactorId")]
        public User Reactor { get; set; }
    }
}