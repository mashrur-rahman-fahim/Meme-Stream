public class GroupMessageResponseDto
{
    public int Id { get; set; }
    public string Content { get; set; }
    public DateTime SentAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public UserDto Sender { get; set; }
    public int? GroupId { get; set; }
    public bool IsOwnMessage { get; set; }
    public bool IsRead { get; set; }
    public List<ReadReceiptDto> ReadReceipts { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}

public class ReadReceiptDto
{
    public int UserId { get; set; }
    public DateTime ReadAt { get; set; }
}