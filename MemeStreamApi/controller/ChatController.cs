using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public ChatController(MemeStreamDbContext context)
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

    [HttpPost("group")]
    public async Task<IActionResult> CreateGroup([FromBody] Group group)
    {
        group.CreatedById = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
        group.CreatedAt = DateTime.UtcNow;

        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        return Ok(group);
    }

    [HttpPost("group/{groupId}/add")]
    public async Task<IActionResult> AddUserToGroup(int groupId, [FromBody] int userId)
    {
        var exists = await _context.GroupMemberships
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

        if (exists)
            return BadRequest("User already in group");

        var membership = new GroupMembership
        {
            GroupId = groupId,
            UserId = userId
        };

        _context.GroupMemberships.Add(membership);
        await _context.SaveChangesAsync();

        return Ok(membership);
    }

    [HttpGet("group/{groupId}/messages")]
    public async Task<IActionResult> GetGroupMessages(int groupId)
    {
        var messages = await _context.Messages
            .Where(m => m.GroupId == groupId)
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        return Ok(messages);
    }

    [HttpGet("group/{groupId}/members")]
    public async Task<IActionResult> GetGroupMembers(int groupId)
    {
        var members = await _context.GroupMemberships
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => new { gm.User.Id, gm.User.Name })
            .ToListAsync();

        return Ok(members);
    }

    [HttpDelete("group/{groupId}/remove/{userId}")]
    public async Task<IActionResult> RemoveUserFromGroup(int groupId, int userId)
    {
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        var group = await _context.Groups.FindAsync(groupId);
        if (group == null || group.CreatedById != currentUserId)
            return Unauthorized("Only the group creator can remove members.");

        var membership = await _context.GroupMemberships
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

        if (membership == null)
            return NotFound("User not in group.");

        _context.GroupMemberships.Remove(membership);
        await _context.SaveChangesAsync();

        return Ok("User removed.");
    }


    [HttpPost("upload")]
    [Authorize]
    public async Task<IActionResult> UploadFile(IFormFile file, int? receiverId, int? groupId)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var fileName = Path.GetFileName(file.FileName);
            var filePath = Path.Combine("Uploads", Guid.NewGuid() + "_" + fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var chatFile = new ChatFile
            {
                SenderId = userId,
                ReceiverId = receiverId,
                GroupId = groupId,
                FileName = fileName,
                FilePath = filePath
            };

            _context.ChatFiles.Add(chatFile);
            await _context.SaveChangesAsync();

            return Ok(chatFile);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Upload failed: " + ex.Message);
            return StatusCode(500, "Internal Server Error");
        }
    }





}
