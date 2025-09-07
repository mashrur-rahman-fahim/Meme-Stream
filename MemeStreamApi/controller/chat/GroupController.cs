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
            
            // Check if user is a member of the group
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

    [HttpGet("{groupId}/non-members")]
    public async Task<IActionResult> GetNonMembers(int groupId)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if user is admin or co-admin of the group
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

    [HttpPost("{groupId}/add-user")]
    public async Task<IActionResult> AddUserToGroup(int groupId, [FromBody] int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if current user is admin or co-admin of the group
            var hasPermission = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId && 
                               (gm.Group.CreatedById == currentUserId || gm.IsCoAdmin));
            
            if (!hasPermission)
                return Unauthorized("Only group admins can add members");

            var exists = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (exists)
                return BadRequest("User already in group");

            // Check if user exists
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

    [HttpDelete("{groupId}/remove-user/{userId}")]
    public async Task<IActionResult> RemoveUserFromGroup(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if current user is admin or co-admin of the group OR if user is removing themselves
            var isSelfRemoval = userId == currentUserId;
            var hasPermission = isSelfRemoval || await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUserId && 
                               (gm.Group.CreatedById == currentUserId || gm.IsCoAdmin));
            
            if (!hasPermission)
                return Unauthorized("You don't have permission to remove this user");

            // Prevent admin from removing themselves if they're the only admin
            if (userId == currentUserId)
            {
                var userMembership = await _context.GroupMemberships
                    .Include(gm => gm.Group)
                    .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
                
                if (userMembership != null && userMembership.Group.CreatedById == userId)
                {
                    // Admin is trying to leave - check if there are other admins
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

    [HttpPut("{groupId}")]
    public async Task<IActionResult> UpdateGroup(int groupId, [FromBody] UpdateGroupDto dto)
    {
        try
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if user is a member of the group
            var isMember = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
            
            if (!isMember)
                return Unauthorized("You are not a member of this group");

            var group = await _context.Groups.FindAsync(groupId);
            if (group == null)
                return NotFound("Group not found");

            // Only allow name/description updates for all members
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

    [HttpPost("{groupId}/promote/{userId}")]
    public async Task<IActionResult> PromoteToCoAdmin(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if current user is admin of the group
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

    [HttpPost("{groupId}/demote/{userId}")]
    public async Task<IActionResult> DemoteFromCoAdmin(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if current user is admin of the group
            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);
            
            if (!isAdmin)
                return Unauthorized("Only group admin can demote co-admins");

            // Prevent admin from demoting themselves
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

    [HttpDelete("{groupId}")]
    public async Task<IActionResult> DeleteGroup(int groupId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if current user is admin of the group
            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);
            
            if (!isAdmin)
                return Unauthorized("Only group admin can delete the group");

            var group = await _context.Groups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == groupId);

            if (group == null)
                return NotFound("Group not found");

            // Remove all memberships first
            _context.GroupMemberships.RemoveRange(group.Members);
            
            // Remove the group
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

    [HttpPost("{groupId}/transfer-admin/{userId}")]
    public async Task<IActionResult> TransferAdmin(int groupId, int userId)
    {
        try
        {
            var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            
            // Check if current user is admin of the group
            var isAdmin = await _context.Groups
                .AnyAsync(g => g.Id == groupId && g.CreatedById == currentUserId);
            
            if (!isAdmin)
                return Unauthorized("Only group admin can transfer admin rights");

            // Check if target user is a member
            var targetMembership = await _context.GroupMemberships
                .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId);

            if (targetMembership == null)
                return NotFound("User not in group");

            var group = await _context.Groups.FindAsync(groupId);
            if (group == null)
                return NotFound("Group not found");

            // Transfer admin rights
            group.CreatedById = userId;
            
            // Ensure the new admin is also a co-admin
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