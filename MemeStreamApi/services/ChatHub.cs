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

public async Task ReactToMessage(int messageId, string emoji)
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
