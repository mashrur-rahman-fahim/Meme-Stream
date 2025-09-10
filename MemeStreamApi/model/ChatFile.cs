public class ChatFile
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public int? ReceiverId { get; set; }
    public int? GroupId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
