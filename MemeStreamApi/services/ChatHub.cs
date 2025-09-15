using Microsoft.AspNetCore.SignalR;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;

public class ChatHub : Hub
{
    private readonly MemeStreamDbContext _context;
    private static ConcurrentDictionary<string, string> userConnections = new();

    public ChatHub(MemeStreamDbContext context)
    {
        _context = context;
    }

    public override Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
            userConnections[userId] = Context.ConnectionId;

        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (userId != null)
            userConnections.TryRemove(userId, out _);

        return base.OnDisconnectedAsync(exception);
    }

    public async Task SendPrivateMessage(string receiverUserId, string message)
    {
        var senderId = Context.UserIdentifier;
        if (senderId == null) return;

        var newMessage = new Message
        {
            SenderId = int.Parse(senderId),
            ReceiverId = int.Parse(receiverUserId),
            Content = message,
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(newMessage);
        await _context.SaveChangesAsync();

        // Send full payload including messageId and sentAt
        if (userConnections.TryGetValue(receiverUserId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveMessage", senderId, message, newMessage.Id, newMessage.SentAt);
        }

        await Clients.Client(Context.ConnectionId).SendAsync("ReceiveMessage", senderId, message, newMessage.Id, newMessage.SentAt);
    }

    public async Task SendGroupMessage(string groupName, string message)
    {
        var senderId = Context.UserIdentifier;
        if (senderId == null) return;

        var groupId = int.Parse(groupName.Replace("group-", ""));

        var newMessage = new Message
        {
            SenderId = int.Parse(senderId),
            GroupId = groupId,
            Content = message,
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(newMessage);
        await _context.SaveChangesAsync();

        await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", senderId, message, newMessage.Id, newMessage.SentAt);
    }

    public async Task SendTypingStatus(int receiverUserId, bool isTyping)
    {
        var senderId = Context.UserIdentifier;
        if (senderId == null) return;

        if (userConnections.TryGetValue(receiverUserId.ToString(), out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveTypingStatus", int.Parse(senderId), isTyping);
        }
    }

    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    /* public async Task ReactToMessage(int messageId, string emoji)
    {
        try
        {
            var userId = int.Parse(Context.UserIdentifier);

            var existing = await _context.MessageReactons
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.ReactorId == userId);

            string status;

            if (existing == null)
            {
                var newReaction = new MessageReacton
                {
                    MessageId = messageId,
                    ReactorId = userId,
                    Emoji = emoji
                };

                _context.MessageReactons.Add(newReaction);
                status = "added";
            }
            else if (existing.Emoji == emoji)
            {
                _context.MessageReactons.Remove(existing);
                status = "removed";
            }
            else
            {
                existing.Emoji = emoji;
                status = "updated";
            }

            await _context.SaveChangesAsync();

            await Clients.All.SendAsync("ReceiveReaction", new
            {
                MessageId = messageId,
                ReactorId = userId,
                Emoji = emoji,
                Status = status
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ ReactToMessage failed: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"🔍 Inner exception: {ex.InnerException.Message}");
            }
            throw;
        }
    }
     */


    /* public async Task ReactToMessage(int messageId, string emoji)
    {
        try
        {
            Console.WriteLine($"🔍 ReactToMessage called: messageId={messageId}, emoji={emoji}");

            var userIdStr = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userIdStr))
            {
                Console.WriteLine("❌ User not authenticated");
                throw new HubException("User not authenticated");
            }

            var userId = int.Parse(userIdStr);
            Console.WriteLine($"🔍 User ID: {userId}");

            // Validate message exists
            var messageExists = await _context.Messages.AnyAsync(m => m.Id == messageId);
            if (!messageExists)
            {
                Console.WriteLine($"❌ Message {messageId} does not exist");
                throw new HubException($"Message {messageId} not found");
            }

            // Validate user exists
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                Console.WriteLine($"❌ User {userId} does not exist");
                throw new HubException($"User {userId} not found");
            }

            var existing = await _context.MessageReactons
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.ReactorId == userId);

            Console.WriteLine($"🔍 Existing reaction: {(existing != null ? $"found (emoji: {existing.Emoji})" : "not found")}");

            string status;

            if (existing == null)
            {
                Console.WriteLine($"🔍 Adding new reaction");
                var newReaction = new MessageReacton
                {
                    MessageId = messageId,
                    ReactorId = userId,
                    Emoji = emoji
                };

                _context.MessageReactons.Add(newReaction);
                status = "added";
            }
            else if (existing.Emoji == emoji)
            {
                Console.WriteLine($"🔍 Removing existing reaction");
                _context.MessageReactons.Remove(existing);
                status = "removed";
            }
            else
            {
                Console.WriteLine($"🔍 Updating reaction from {existing.Emoji} to {emoji}");
                existing.Emoji = emoji;
                status = "updated";
            }

            var saveResult = await _context.SaveChangesAsync();
            Console.WriteLine($"🔍 Save changes result: {saveResult} rows affected");

            await Clients.All.SendAsync("ReceiveReaction", new
            {
                MessageId = messageId,
                ReactorId = userId,
                Emoji = emoji,
                Status = status
            });

            Console.WriteLine($"✅ Reaction processed successfully: {status}");
        }
        catch (DbUpdateException dbEx)
        {
            Console.WriteLine($"❌ Database update failed: {dbEx.Message}");
            if (dbEx.InnerException != null)
            {
                Console.WriteLine($"🔍 Inner DB exception: {dbEx.InnerException.Message}");
            }
            throw new HubException("Database error occurred");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ ReactToMessage failed: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"🔍 Inner exception: {ex.InnerException.Message}");
                Console.WriteLine($"🔍 Stack trace: {ex.InnerException.StackTrace}");
            }
            throw;
        }
    }
     */

public async Task ReactToMessage(int messageId, string emoji)
{
    try
    {
        Console.WriteLine($"🔍 ReactToMessage called: messageId={messageId}, emoji={emoji}");
        
        var userId = int.Parse(Context.UserIdentifier);
        Console.WriteLine($"🔍 User ID: {userId}");

        var existing = await _context.MessageReactons
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.ReactorId == userId);

        string status;
        MessageReacton reactionToBroadcast = null;

        if (existing == null)
        {
            Console.WriteLine($"🔍 Adding new reaction");
            var newReaction = new MessageReacton
            {
                MessageId = messageId,
                ReactorId = userId,
                Emoji = emoji
            };

            _context.MessageReactons.Add(newReaction);
            status = "added";
            reactionToBroadcast = newReaction;
        }
        else if (existing.Emoji == emoji)
        {
            Console.WriteLine($"🔍 Removing existing reaction");
            _context.MessageReactons.Remove(existing);
            status = "removed";
            reactionToBroadcast = existing; // Send the removed reaction for clients to remove
        }
        else
        {
            Console.WriteLine($"🔍 Updating reaction from {existing.Emoji} to {emoji}");
            existing.Emoji = emoji;
            status = "updated";
            reactionToBroadcast = existing;
        }

        await _context.SaveChangesAsync();
        Console.WriteLine($"🔍 Save changes result: 1 row affected");

        // Broadcast to all clients with proper reaction data
        await Clients.All.SendAsync("ReceiveReaction", new
        {
            MessageId = messageId,
            ReactorId = userId,
            Emoji = emoji,
            Status = status,
            // Include the actual reaction object for complete data
            Reaction = reactionToBroadcast
        });

        Console.WriteLine($"✅ Reaction processed successfully: {status}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ ReactToMessage failed: {ex.Message}");
        if (ex.InnerException != null)
        {
            Console.WriteLine($"🔍 Inner exception: {ex.InnerException.Message}");
            Console.WriteLine($"🔍 Stack trace: {ex.InnerException.StackTrace}");
        }
        throw;
    }
}
    public async Task EditMessage(int messageId, string newContent)
    {
        var userId = int.Parse(Context.UserIdentifier);
        var message = await _context.Messages.FindAsync(messageId);

        if (message == null || message.SenderId != userId) return;

        message.Content = newContent;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await Clients.All.SendAsync("ReceiveMessageEdit", messageId, newContent, message.EditedAt);
    }

    public async Task DeleteMessage(int messageId)
    {
        var userId = int.Parse(Context.UserIdentifier);
        var message = await _context.Messages.FindAsync(messageId);

        if (message == null || message.SenderId != userId) return;

        message.IsDeleted = true;
        await _context.SaveChangesAsync();

        await Clients.All.SendAsync("ReceiveMessageDelete", messageId);
    }

    public async Task MarkAsRead(int messageId)
    {
        var userId = int.Parse(Context.UserIdentifier);

        var alreadySeen = await _context.MessageReadReceipts
            .AnyAsync(r => r.MessageId == messageId && r.UserId == userId);

        if (!alreadySeen)
        {
            var receipt = new MessageReadReceipt
            {
                MessageId = messageId,
                UserId = userId,
                SeenAt = DateTime.UtcNow
            };

            _context.MessageReadReceipts.Add(receipt);
            await _context.SaveChangesAsync();

            await Clients.All.SendAsync("ReceiveReadReceipt", messageId, userId);
        }
    }





}
