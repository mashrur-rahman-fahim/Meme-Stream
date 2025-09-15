using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupMembershipController : ControllerBase
{
    private readonly MemeStreamDbContext _context;

    public GroupMembershipController(MemeStreamDbContext context)
    {
        _context = context;
    }

    [HttpGet("group/{groupId}/non-members")]
    public async Task<IActionResult> GetNonMembers(int groupId)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var hasPermission = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId &&
                               (gm.Group.CreatedById == userId || gm.IsCoAdmin));

            if (!hasPermission)
                return Unauthorized("Only group admins can access this information");

            var nonMembers = await _context.Users
                .Where(u => !_context.GroupMemberships.Any(gm => gm.GroupId == groupId && gm.UserId == u.Id))
                .Select(u => new { u.Id, u.Name })
                .ToListAsync();

            return Ok(nonMembers);
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error fetching non-members: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPost("group/{groupId}/add")]
    public async Task<IActionResult> AddUserToGroup(int groupId, [FromBody] int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var hasPermission = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId &&
                               (gm.Group.CreatedById == currentUserId || gm.IsCoAdmin));

            if (!hasPermission)
                return Unauthorized("Only group admins can add members");

            var exists = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (exists)
                return BadRequest("User already in group");

            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
                return NotFound("User not found");

            var membership = new GroupMembership
            {
                GroupId = groupId,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            };

            _context.GroupMemberships.Add(membership);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User added successfully", userId });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error adding user to group: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpDelete("group/{groupId}/remove/{userId}")]
    public async Task<IActionResult> RemoveUserFromGroup(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isSelfRemoval = userId == currentUserId;
            var hasPermission = isSelfRemoval || await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId &&
                               (gm.Group.CreatedById == currentUserId || gm.IsCoAdmin));

            if (!hasPermission)
                return Unauthorized("You don't have permission to remove this user");

            if (userId == currentUserId)
            {
                var userMembership = await _context.GroupMemberships
                    .Include(gm => gm.Group)
                    .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

                if (userMembership != null && userMembership.Group.CreatedById == userId)
                {
                    var otherAdmins = await _context.GroupMemberships
                        .Where(gm => gm.GroupId == groupId && gm.UserId != userId && gm.IsCoAdmin)
                        .ToListAsync();

                    if (!otherAdmins.Any())
                    {
                        return BadRequest("You are the only admin. Assign another admin before leaving or delete the group.");
                    }
                }
            }

            var membership = await _context.GroupMemberships
                .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (membership == null)
                return NotFound("User not in group");

            _context.GroupMemberships.Remove(membership);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User removed successfully", userId });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error removing user from group: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPost("group/{groupId}/promote/{userId}")]
    public async Task<IActionResult> PromoteToCoAdmin(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);

            if (!isAdmin)
                return Unauthorized("Only group admin can promote members");

            var membership = await _context.GroupMemberships
                .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (membership == null)
                return NotFound("User not in group");

            if (membership.IsCoAdmin)
                return BadRequest("User is already a co-admin");

            membership.IsCoAdmin = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User promoted to co-admin successfully", userId });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error promoting user: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPost("group/{groupId}/demote/{userId}")]
    public async Task<IActionResult> DemoteFromCoAdmin(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);

            if (!isAdmin)
                return Unauthorized("Only group admin can demote co-admins");

            if (userId == currentUserId)
                return BadRequest("Admin cannot demote themselves");

            var membership = await _context.GroupMemberships
                .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (membership == null)
                return NotFound("User not in group");

            if (!membership.IsCoAdmin)
                return BadRequest("User is not a co-admin");

            membership.IsCoAdmin = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User demoted from co-admin successfully", userId });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error demoting user: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }

    [HttpPost("group/{groupId}/transfer-admin/{userId}")]
    public async Task<IActionResult> TransferAdmin(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);

            if (!isAdmin)
                return Unauthorized("Only group admin can transfer admin rights");

            var targetMembership = await _context.GroupMemberships
                .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (targetMembership == null)
                return NotFound("User not in group");

            var group = await _context.Groups.FindAsync(groupId);
            if (group == null)
                return NotFound("Group not found");

            group.CreatedById = userId;
            targetMembership.IsCoAdmin = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Admin rights transferred successfully", newAdminId = userId });
        }
        catch (Exception ex)
        {
            Console.WriteLine("❌ Error transferring admin rights: " + ex.Message);
            return StatusCode(500, "Internal Server Error: " + ex.Message);
        }
    }
}