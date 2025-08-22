using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MemeStreamApi.hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly MemeStreamDbContext _context;
        private static readonly Dictionary<int, string> _userConnections = new Dictionary<int, string>();

        public ChatHub(MemeStreamDbContext context)
        {
            _context = context;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                _userConnections[userId.Value] = Context.ConnectionId;
                
                // Update user's online status and notify friends
                await UpdateUserOnlineStatus(userId.Value, true);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = GetUserId();
            if (userId.HasValue && _userConnections.ContainsKey(userId.Value))
            {
                _userConnections.Remove(userId.Value);
                
                // Update user's online status
                await UpdateUserOnlineStatus(userId.Value, false);
            }
            await base.OnDisconnectedAsync(exception);
        }

        private int? GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private async Task UpdateUserOnlineStatus(int userId, bool isOnline)
        {
            // Get user's friends
            var friendIds = await _context.FriendRequests
                .Where(fr => (fr.SenderId == userId || fr.ReceiverId == userId) && fr.Status == FriendRequest.RequestStatus.Accepted)
                .Select(fr => fr.SenderId == userId ? fr.ReceiverId : fr.SenderId)
                .ToListAsync();

            foreach (var friendId in friendIds)
            {
                if (_userConnections.TryGetValue(friendId, out var connectionId))
                {
                    await Clients.Client(connectionId).SendAsync("UserStatusChanged", userId, isOnline);
                }
            }
        }

        public async Task SendDirectMessage(int receiverId, string content, string[] mentionedUserIds = null)
        {
            var senderId = GetUserId();
            if (!senderId.HasValue) throw new HubException("User not authenticated");

            // Check if users are friends
            var areFriends = await _context.FriendRequests
                .AnyAsync(fr => 
                    ((fr.SenderId == senderId.Value && fr.ReceiverId == receiverId) ||
                     (fr.SenderId == receiverId && fr.ReceiverId == senderId.Value)) &&
                    fr.Status == FriendRequest.RequestStatus.Accepted);

            if (!areFriends)
            {
                // Mark as spam
                var spamMessage = new ChatMessage
                {
                    SenderId = senderId.Value,
                    ReceiverId = receiverId,
                    Content = content,
                    IsSpam = true,
                    Status = MessageStatus.Sent
                };

                _context.ChatMessages.Add(spamMessage);
                await _context.SaveChangesAsync();

                throw new HubException("Message sent to spam folder - users are not friends");
            }

            var message = new ChatMessage
            {
                SenderId = senderId.Value,
                ReceiverId = receiverId,
                Content = content,
                Status = MessageStatus.Sent,
                MentionedUserIds = mentionedUserIds != null ? string.Join(",", mentionedUserIds) : null
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            // Notify receiver if online
            if (_userConnections.TryGetValue(receiverId, out var receiverConnectionId))
            {
                await Clients.Client(receiverConnectionId).SendAsync("ReceiveDirectMessage", message);
            }

            await Clients.Caller.SendAsync("MessageSent", message);
        }

        public async Task CreateGroup(string name, string description, string image, int[] memberIds)
        {
            var creatorId = GetUserId();
            if (!creatorId.HasValue) throw new HubException("User not authenticated");

            var group = new ChatGroup
            {
                Name = name,
                Description = description,
                Image = image,
                CreatedById = creatorId.Value
            };

            _context.ChatGroups.Add(group);
            await _context.SaveChangesAsync();

            // Add creator as admin
            var creatorMember = new ChatGroupMember
            {
                GroupId = group.Id,
                UserId = creatorId.Value,
                IsAdmin = true
            };
            _context.ChatGroupMembers.Add(creatorMember);

            // Add other members
            foreach (var memberId in memberIds.Where(id => id != creatorId.Value))
            {
                // Check if member is friend with creator
                var isFriend = await _context.FriendRequests
                    .AnyAsync(fr => 
                        ((fr.SenderId == creatorId.Value && fr.ReceiverId == memberId) ||
                         (fr.SenderId == memberId && fr.ReceiverId == creatorId.Value)) &&
                        fr.Status == FriendRequest.RequestStatus.Accepted);

                if (isFriend)
                {
                    _context.ChatGroupMembers.Add(new ChatGroupMember
                    {
                        GroupId = group.Id,
                        UserId = memberId
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Notify all members
            var members = await _context.ChatGroupMembers
                .Where(m => m.GroupId == group.Id)
                .Include(m => m.User)
                .ToListAsync();

            foreach (var member in members)
            {
                if (_userConnections.TryGetValue(member.UserId, out var connectionId))
                {
                    await Clients.Client(connectionId).SendAsync("AddedToGroup", group);
                }
            }
        }

        public async Task SendGroupMessage(int groupId, string content, string[] mentionedUserIds = null)
        {
            var senderId = GetUserId();
            if (!senderId.HasValue) throw new HubException("User not authenticated");

            // Check if user is member of the group
            var isMember = await _context.ChatGroupMembers
                .AnyAsync(m => m.GroupId == groupId && m.UserId == senderId.Value);

            if (!isMember) throw new HubException("Not a member of this group");

            var message = new ChatMessage
            {
                SenderId = senderId.Value,
                GroupId = groupId,
                Content = content,
                Status = MessageStatus.Sent,
                MentionedUserIds = mentionedUserIds != null ? string.Join(",", mentionedUserIds) : null
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            // Get all group members
            var memberIds = await _context.ChatGroupMembers
                .Where(m => m.GroupId == groupId)
                .Select(m => m.UserId)
                .ToListAsync();

            // Notify all online members
            foreach (var memberId in memberIds)
            {
                if (_userConnections.TryGetValue(memberId, out var connectionId))
                {
                    await Clients.Client(connectionId).SendAsync("ReceiveGroupMessage", message);
                }
            }
        }

        public async Task AddReaction(int messageId, string emoji)
        {
            var userId = GetUserId();
            if (!userId.HasValue) throw new HubException("User not authenticated");

            var reaction = new MessageReaction
            {
                MessageId = messageId,
                UserId = userId.Value,
                Emoji = emoji
            };

            _context.MessageReactions.Add(reaction);
            await _context.SaveChangesAsync();

            // Get message to notify relevant users
            var message = await _context.ChatMessages
                .Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message != null)
            {
                var notifyUserIds = new List<int> { message.SenderId };
                
                if (message.GroupId.HasValue)
                {
                    // Notify all group members for group messages
                    var groupMemberIds = await _context.ChatGroupMembers
                        .Where(m => m.GroupId == message.GroupId.Value)
                        .Select(m => m.UserId)
                        .ToListAsync();
                    
                    notifyUserIds.AddRange(groupMemberIds);
                }
                else if (message.ReceiverId.HasValue)
                {
                    // For direct messages, notify both participants
                    notifyUserIds.Add(message.ReceiverId.Value);
                }

                // Notify online users
                foreach (var notifyUserId in notifyUserIds.Distinct())
                {
                    if (_userConnections.TryGetValue(notifyUserId, out var connectionId))
                    {
                        await Clients.Client(connectionId).SendAsync("MessageReacted", messageId, userId.Value, emoji);
                    }
                }
            }
        }

        public async Task MarkAsRead(int messageId)
        {
            var userId = GetUserId();
            if (!userId.HasValue) throw new HubException("User not authenticated");

            var message = await _context.ChatMessages.FindAsync(messageId);
            if (message == null) throw new HubException("Message not found");

            // Check if user is the receiver
            if (message.ReceiverId != userId && 
                (!message.GroupId.HasValue || !await _context.ChatGroupMembers
                    .AnyAsync(m => m.GroupId == message.GroupId && m.UserId == userId)))
            {
                throw new HubException("Not authorized to mark this message as read");
            }

            message.ReadAt = DateTime.UtcNow;
            message.Status = MessageStatus.Read;
            await _context.SaveChangesAsync();

            // Notify sender that message was read
            if (_userConnections.TryGetValue(message.SenderId, out var senderConnectionId))
            {
                await Clients.Client(senderConnectionId).SendAsync("MessageRead", messageId, userId.Value);
            }
        }

        public async Task MarkAsDelivered(int messageId)
        {
            var userId = GetUserId();
            if (!userId.HasValue) throw new HubException("User not authenticated");

            var message = await _context.ChatMessages.FindAsync(messageId);
            if (message == null) throw new HubException("Message not found");

            // Check if user is the receiver
            if (message.ReceiverId != userId && 
                (!message.GroupId.HasValue || !await _context.ChatGroupMembers
                    .AnyAsync(m => m.GroupId == message.GroupId && m.UserId == userId)))
            {
                throw new HubException("Not authorized to mark this message as delivered");
            }

            message.DeliveredAt = DateTime.UtcNow;
            message.Status = MessageStatus.Delivered;
            await _context.SaveChangesAsync();

            // Notify sender that message was delivered
            if (_userConnections.TryGetValue(message.SenderId, out var senderConnectionId))
            {
                await Clients.Client(senderConnectionId).SendAsync("MessageDelivered", messageId);
            }
        }
    }
}