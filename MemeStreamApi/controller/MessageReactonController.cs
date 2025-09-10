using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
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
            .ToListAsync();

        return Ok(reactions);
    }

    [HttpPost]
    public async Task<IActionResult> AddReaction([FromBody] MessageReacton reacton)
    {
        _context.MessageReactons.Add(reacton);
        await _context.SaveChangesAsync();
        return Ok(reacton);
    }
}
