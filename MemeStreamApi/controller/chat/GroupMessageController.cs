using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupMessageController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public GroupMessageController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpGet("group/{groupId}/messages")]
    public async Task<IActionResult> GetGroupMessages(int groupId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            var isMember = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId);
            
            if (!isMember)
                return Unauthorized("You are not a member of this group");

            var messages = await _context.Messages
                .Where(m => m.GroupId == groupId && !m.IsDeleted)
                .Include(m => m.Sender)
                .Select(m => new 
                {
                    m.Id,
                    m.SenderId,
                    SenderName = m.Sender.Name,
                    m.Content,
                    m.SentAt,
                    m.EditedAt,
                    m.IsDeleted,
                    m.GroupId,
                    ReadByCount = m.ReadReceipts.Count
                })
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            return Ok(messages);
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error fetching group messages: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }
}