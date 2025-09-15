using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MemeStreamApi.data;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MemeStreamApi.model;


[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatSidebarController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public ChatSidebarController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpGet("friends")]
    public async Task<IActionResult> GetFriends()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        var friends = await _context.FriendRequests
            .Where(fr => fr.Status == FriendRequest.RequestStatus.Accepted &&
                        (fr.SenderId == userId || fr.ReceiverId == userId))
            .Select(fr => fr.SenderId == userId ? fr.Receiver : fr.Sender)
            .Select(u => new { u.Id, u.Name })
            .ToListAsync();

        return Ok(friends);
    }

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        var groups = await _context.GroupMemberships
            .Where(gm => gm.UserId == userId)
            .Select(gm => new { gm.Group.Id, gm.Group.Name })
            .ToListAsync();

        return Ok(groups);
    }
}
