using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

public class ChatHub : Hub
{
    private static ConcurrentDictionary<string, string> userConnections = new();

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
        if (userConnections.TryGetValue(receiverUserId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveMessage", Context.UserIdentifier, message);
        }
    }

    public async Task SendGroupMessage(string groupName, string message)
    {
        await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", Context.UserIdentifier, message);
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
