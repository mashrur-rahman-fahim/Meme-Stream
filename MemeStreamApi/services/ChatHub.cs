using Microsoft.AspNetCore.SignalR;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Collections.Concurrent;

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

        if (userConnections.TryGetValue(receiverUserId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveMessage", senderId, message);
        }

        await Clients.Client(Context.ConnectionId).SendAsync("ReceiveMessage", senderId, message);
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

        await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", senderId, message);
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
}
