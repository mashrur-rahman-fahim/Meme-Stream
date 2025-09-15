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
    /* 
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
        } */

        [HttpPost]
public async Task<IActionResult> AddOrToggleReaction([FromBody] MessageReacton incoming)
{
    try
    {
        Console.WriteLine($"🔍 API: AddOrToggleReaction called: MessageId={incoming.MessageId}, Emoji={incoming.Emoji}");
        
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
        Console.WriteLine($"🔍 API: User ID: {userId}");

        if (string.IsNullOrWhiteSpace(incoming.Emoji))
            return BadRequest("Emoji cannot be empty.");

        var existing = await _context.MessageReactons
            .FirstOrDefaultAsync(r => r.MessageId == incoming.MessageId && r.ReactorId == userId);

        Console.WriteLine($"🔍 API: Existing reaction: {(existing != null ? $"found (emoji: {existing.Emoji})" : "not found")}");

        if (existing == null)
        {
            Console.WriteLine($"🔍 API: Adding new reaction");
            var newReaction = new MessageReacton
            {
                MessageId = incoming.MessageId,
                ReactorId = userId,
                Emoji = incoming.Emoji
            };

            _context.MessageReactons.Add(newReaction);
            await _context.SaveChangesAsync();

            Console.WriteLine($"✅ API: Reaction added successfully");
            return Ok(new { status = "added", emoji = newReaction.Emoji });
        }

        if (existing.Emoji == incoming.Emoji)
        {
            Console.WriteLine($"🔍 API: Removing existing reaction");
            _context.MessageReactons.Remove(existing);
            await _context.SaveChangesAsync();

            Console.WriteLine($"✅ API: Reaction removed successfully");
            return Ok(new { status = "removed", emoji = incoming.Emoji });
        }

        Console.WriteLine($"🔍 API: Updating reaction from {existing.Emoji} to {incoming.Emoji}");
        existing.Emoji = incoming.Emoji;
        await _context.SaveChangesAsync();

        Console.WriteLine($"✅ API: Reaction updated successfully");
        return Ok(new { status = "updated", emoji = incoming.Emoji });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ API: AddOrToggleReaction failed: {ex.Message}");
        if (ex.InnerException != null)
        {
            Console.WriteLine($"🔍 API: Inner exception: {ex.InnerException.Message}");
        }
        return StatusCode(500, "Internal server error");
    }
}
    



}
