using System.ComponentModel.DataAnnotations.Schema;

namespace MemeStreamApi.model
{

public class MessageReadReceipt
{
    public int Id { get; set; }
    public int MessageId { get; set; }
    public int UserId { get; set; }
    public DateTime SeenAt { get; set; }

    [ForeignKey("MessageId")]
    public Message Message { get; set; }

    [ForeignKey("UserId")]
    public User User { get; set; }
}


}