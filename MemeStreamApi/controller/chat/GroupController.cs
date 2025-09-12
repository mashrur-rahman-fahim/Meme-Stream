using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MemeStreamApi.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public GroupController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("Group name is required.");

            var creatorId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var group = new Group
            {
                Name = dto.Name,
                CreatedAt = DateTime.UtcNow,
                CreatedById = creatorId
            };

            _context.Groups.Add(group);
            await _context.SaveChangesAsync();

            var memberIds = dto.MemberIds ?? new List<int>();

            // Always add the creator to the group
            if (!memberIds.Contains(creatorId))
            {
                memberIds.Add(creatorId);
            }

            foreach (var userId in memberIds.Distinct())
            {
                // Check if user exists
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (!userExists)
                {
                    Console.WriteLine($"⚠️ User with ID {userId} does not exist, skipping...");
                    continue;
                }

                _context.GroupMemberships.Add(new GroupMembership
                {
                    GroupId = group.Id,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new { group.Id, group.Name });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Group creation failed: " + ex.Message);
            if (ex.InnerException != null)
            {
                Console.WriteLine("Inner exception: " + ex.InnerException.Message);
            }
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpGet("my-groups")]
    public async Task<IActionResult> GetMyGroups()
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var groups = await _context.GroupMemberships
                .Where(gm => gm.UserId == userId)
                .Include(gm => gm.Group)
                .ThenInclude(g => g.CreatedBy)
                .Select(gm => new
                {
                    gm.Group.Id,
                    gm.Group.Name,
                    gm.Group.CreatedById,
                    IsAdmin = gm.Group.CreatedById == userId,
                    IsCoAdmin = gm.IsCoAdmin,
                    MemberCount = _context.GroupMemberships.Count(g => g.GroupId == gm.GroupId)
                })
                .ToListAsync();

            return Ok(groups);
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error fetching groups: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpGet("{groupId}/details")]
    public async Task<IActionResult> GetGroupDetails(int groupId)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isMember = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (!isMember)
                return Unauthorized("You are not a member of this group");

            var group = await _context.Groups
                .Include(g => g.CreatedBy)
                .Include(g => g.Members)
                    .ThenInclude(gm => gm.User)
                .FirstOrDefaultAsync(g => g.Id == groupId);

            if (group == null)
                return NotFound("Group not found");

            var result = new
            {
                group.Id,
                group.Name,
                group.Description,
                CreatedBy = new { group.CreatedBy.Id, group.CreatedBy.Name },
                IsAdmin = group.CreatedById == userId,
                IsCoAdmin = group.Members.FirstOrDefault(m => m.UserId == userId)?.IsCoAdmin ?? false,
                Members = group.Members.Select(m => new
                {
                    m.User.Id,
                    m.User.Name,
                    IsAdmin = m.User.Id == group.CreatedById,
                    IsCoAdmin = m.IsCoAdmin,
                    JoinedAt = m.JoinedAt
                }).OrderByDescending(m => m.IsAdmin).ThenByDescending(m => m.IsCoAdmin).ThenBy(m => m.Name).ToList()
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error fetching group details: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPut("{groupId}")]
    public async Task<IActionResult> UpdateGroup(int groupId, [FromBody] UpdateGroupDto dto)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isMember = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (!isMember)
                return Unauthorized("You are not a member of this group");

            var group = await _context.Groups.FindAsync(groupId);
            if (group == null)
                return NotFound("Group not found");

            if (!string.IsNullOrEmpty(dto.Name))
                group.Name = dto.Name;

            if (!string.IsNullOrEmpty(dto.Description))
                group.Description = dto.Description;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Group updated successfully", group.Id, group.Name });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error updating group: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpDelete("{groupId}")]
    public async Task<IActionResult> DeleteGroup(int groupId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);

            if (!isAdmin)
                return Unauthorized("Only group admin can delete the group");

            var group = await _context.Groups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == groupId);

            if (group == null)
                return NotFound("Group not found");

            _context.GroupMemberships.RemoveRange(group.Members);
            _context.Groups.Remove(group);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Group deleted successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error deleting group: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }
}