using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.controller
{
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

        private int GetUserId()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdClaim);
        }

        [HttpGet("direct-messages/{friendId}")]
        public async Task<IActionResult> GetDirectMessages(int friendId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
        {
            var userId = GetUserId();

            // Verify friendship
            var areFriends = await _context.FriendRequests
                .AnyAsync(fr => 
                    ((fr.SenderId == userId && fr.ReceiverId == friendId) ||
                     (fr.SenderId == friendId && fr.ReceiverId == userId)) &&
                    fr.Status == FriendRequest.RequestStatus.Accepted);

            if (!areFriends)
            {
                return BadRequest("Users are not friends");
            }

            var messages = await _context.ChatMessages
                .Where(m => 
                    (m.SenderId == userId && m.ReceiverId == friendId) ||
                    (m.SenderId == friendId && m.ReceiverId == userId))
                .Include(m => m.Sender)
                .OrderByDescending(m => m.SentAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return Ok(messages.OrderBy(m => m.SentAt));
        }

        [HttpGet("group-messages/{groupId}")]
        public async Task<IActionResult> GetGroupMessages(int groupId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
        {
            var userId = GetUserId();

            // Verify group membership
            var isMember = await _context.ChatGroupMembers
                .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);

            if (!isMember)
            {
                return BadRequest("Not a member of this group");
            }

            var messages = await _context.ChatMessages
                .Where(m => m.GroupId == groupId)
                .Include(m => m.Sender)
                .OrderByDescending(m => m.SentAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return Ok(messages.OrderBy(m => m.SentAt));
        }

        [HttpGet("spam-messages")]
        public async Task<IActionResult> GetSpamMessages()
        {
            var userId = GetUserId();

            var spamMessages = await _context.ChatMessages
                .Where(m => m.ReceiverId == userId && m.IsSpam)
                .Include(m => m.Sender)
                .OrderByDescending(m => m.SentAt)
                .ToListAsync();

            return Ok(spamMessages);
        }

        [HttpGet("user-groups")]
        public async Task<IActionResult> GetUserGroups()
        {
            var userId = GetUserId();

            var groups = await _context.ChatGroupMembers
                .Where(m => m.UserId == userId)
                .Include(m => m.Group)
                .ThenInclude(g => g.Members)
                .ThenInclude(m => m.User)
                .Select(m => m.Group)
                .ToListAsync();

            return Ok(groups);
        }

        [HttpGet("friends-with-chat")]
        public async Task<IActionResult> GetFriendsWithChatStatus()
        {
            var userId = GetUserId();

            var friends = await _context.FriendRequests
                .Where(fr => 
                    (fr.SenderId == userId || fr.ReceiverId == userId) &&
                    fr.Status == FriendRequest.RequestStatus.Accepted)
                .Select(fr => fr.SenderId == userId ? fr.Receiver : fr.Sender)
                .ToListAsync();

            // Get last message for each friend
            var friendsWithChat = friends.Select(async friend =>
            {
                var lastMessage = await _context.ChatMessages
                    .Where(m => 
                        (m.SenderId == userId && m.ReceiverId == friend.Id) ||
                        (m.SenderId == friend.Id && m.ReceiverId == userId))
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                return new
                {
                    Friend = friend,
                    LastMessage = lastMessage,
                    UnreadCount = await _context.ChatMessages
                        .CountAsync(m => 
                            m.SenderId == friend.Id && 
                            m.ReceiverId == userId && 
                            m.ReadAt == null)
                };
            });

            return Ok(await Task.WhenAll(friendsWithChat));
        }

        [HttpPost("remove-from-spam/{messageId}")]
        public async Task<IActionResult> RemoveFromSpam(int messageId)
        {
            var userId = GetUserId();

            var message = await _context.ChatMessages
                .FirstOrDefaultAsync(m => m.Id == messageId && m.ReceiverId == userId && m.IsSpam);

            if (message == null)
            {
                return NotFound("Message not found in spam");
            }

            message.IsSpam = false;
            await _context.SaveChangesAsync();

            return Ok("Message removed from spam");
        }

        [HttpGet("message-reactions/{messageId}")]
        public async Task<IActionResult> GetMessageReactions(int messageId)
        {
            var reactions = await _context.MessageReactions
                .Where(r => r.MessageId == messageId)
                .Include(r => r.User)
                .ToListAsync();

            return Ok(reactions);
        }
    }
}