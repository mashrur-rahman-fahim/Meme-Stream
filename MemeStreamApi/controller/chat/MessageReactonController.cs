using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessageReactonController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public MessageReactonController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpGet("{messageId}")]
    public async Task<IActionResult> GetReactions(int messageId)
    {
        var reactions = await _context.MessageReactons
            .Where(r => r.MessageId == messageId)
            .Select(r => new
            {
                r.ReactorId,
                r.Emoji,
                ReactorName = r.Reactor.Name
            })
            .ToListAsync();

        return Ok(reactions);
    }

    [HttpPost]
    public async Task<IActionResult> AddOrToggleReaction([FromBody] MessageReacton incoming)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        if (string.IsNullOrWhiteSpace(incoming.Emoji))
            return BadRequest("Emoji cannot be empty.");

        var existing = await _context.MessageReactons
            .FirstOrDefaultAsync(r => r.MessageId == incoming.MessageId && r.ReactorId == userId);

        if (existing == null)
        {
            // First time reacting
            var newReaction = new MessageReacton
            {
                MessageId = incoming.MessageId,
                ReactorId = userId,
                Emoji = incoming.Emoji
            };

            _context.MessageReactons.Add(newReaction);
            await _context.SaveChangesAsync();

            return Ok(new { status = "added", emoji = newReaction.Emoji });
        }

        if (existing.Emoji == incoming.Emoji)
        {
            // Same emoji — remove reaction
            _context.MessageReactons.Remove(existing);
            await _context.SaveChangesAsync();

            return Ok(new { status = "removed", emoji = incoming.Emoji });
        }

        // Different emoji — update reaction
        existing.Emoji = incoming.Emoji;
        await _context.SaveChangesAsync();

        return Ok(new { status = "updated", emoji = incoming.Emoji });
    }
}
