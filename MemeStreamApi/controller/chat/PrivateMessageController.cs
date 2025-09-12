using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PrivateMessageController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public PrivateMessageController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] Message message)
    {
        var senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
        message.SenderId = senderId;
        message.SentAt = DateTime.UtcNow;

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        return Ok(message);
    }

    [HttpGet("private/{userId}")]
    public async Task<IActionResult> GetPrivateMessages(int userId)
    {
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
        var messages = await _context.Messages
            .Where(m => (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                        (m.SenderId == userId && m.ReceiverId == currentUserId))
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        return Ok(messages);
    }
}