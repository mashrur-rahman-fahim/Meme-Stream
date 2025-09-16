using Microsoft.AspNetCore.SignalR;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;

public class ChatHub : Hub
{
    private readonly MemeStreamDbContext _context;
    private readonly ILogger<ChatHub> _logger;

    // Enhanced connection tracking with metadata
    private static ConcurrentDictionary<string, ConnectionInfo> userConnections = new();

    // Connection statistics for monitoring
    private static int _totalConnections = 0;
    private static readonly object _statsLock = new object();

    public ChatHub(MemeStreamDbContext context, ILogger<ChatHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        var connectionId = Context.ConnectionId;

        try
        {
            if (userId != null)
            {
                var connectionInfo = new ConnectionInfo
                {
                    ConnectionId = connectionId,
                    UserId = userId,
                    ConnectedAt = DateTime.UtcNow,
                    LastHeartbeat = DateTime.UtcNow,
                    UserAgent = Context.GetHttpContext()?.Request.Headers["User-Agent"].ToString(),
                    IpAddress = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString()
                };

                userConnections[userId] = connectionInfo;

                lock (_statsLock)
                {
                    _totalConnections++;
                }

                _logger.LogInformation("User {UserId} connected with connection {ConnectionId}. Total connections: {TotalConnections}",
                    userId, connectionId, _totalConnections);

                // Send welcome message to confirm connection
                await Clients.Client(connectionId).SendAsync("ConnectionConfirmed", new
                {
                    UserId = userId,
                    ConnectionId = connectionId,
                    ConnectedAt = connectionInfo.ConnectedAt,
                    ServerTime = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OnConnectedAsync for user {UserId}", userId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        var connectionId = Context.ConnectionId;

        try
        {
            if (userId != null && userConnections.TryRemove(userId, out var connectionInfo))
            {
                lock (_statsLock)
                {
                    _totalConnections = Math.Max(0, _totalConnections - 1);
                }

                var duration = DateTime.UtcNow - connectionInfo.ConnectedAt;

                _logger.LogInformation("User {UserId} disconnected from connection {ConnectionId}. " +
                    "Duration: {Duration}. Total connections: {TotalConnections}. Exception: {Exception}",
                    userId, connectionId, duration, _totalConnections, exception?.Message);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OnDisconnectedAsync for user {UserId}", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Heartbeat mechanism - client sends ping, server responds with pong
    public async Task Ping()
    {
        var userId = Context.UserIdentifier;
        var connectionId = Context.ConnectionId;

        try
        {
            if (userId != null && userConnections.TryGetValue(userId, out var connectionInfo))
            {
                connectionInfo.LastHeartbeat = DateTime.UtcNow;
                connectionInfo.HeartbeatCount++;
            }

            await Clients.Client(connectionId).SendAsync("Pong", DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Ping for user {UserId}", userId);
        }
    }

    // Get connection statistics (for admin/monitoring)
    public async Task GetConnectionStats()
    {
        var userId = Context.UserIdentifier;

        try
        {
            if (IsAuthorizedForStats(userId))
            {
                var stats = new
                {
                    TotalConnections = _totalConnections,
                    ConnectedUsers = userConnections.Count,
                    Connections = userConnections.Values.Select(c => new
                    {
                        c.UserId,
                        c.ConnectionId,
                        c.ConnectedAt,
                        c.LastHeartbeat,
                        c.HeartbeatCount,
                        ConnectionDuration = DateTime.UtcNow - c.ConnectedAt,
                        TimeSinceLastHeartbeat = DateTime.UtcNow - c.LastHeartbeat
                    }).ToList()
                };

                await Clients.Client(Context.ConnectionId).SendAsync("ConnectionStats", stats);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetConnectionStats for user {UserId}", userId);
        }
    }

    // Helper method to check if user is authorized for stats (implement your logic)
    private bool IsAuthorizedForStats(string? userId)
    {
        // Implement your authorization logic here
        // For now, allow all authenticated users
        return !string.IsNullOrEmpty(userId);
    }

    // Enhanced error handling wrapper for all hub methods
    private async Task<T> ExecuteWithErrorHandling<T>(Func<Task<T>> operation, string operationName)
    {
        try
        {
            return await operation();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {OperationName} for user {UserId}", operationName, Context.UserIdentifier);
            throw new HubException($"An error occurred in {operationName}. Please try again.");
        }
    }

    private async Task ExecuteWithErrorHandling(Func<Task> operation, string operationName)
    {
        try
        {
            await operation();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {OperationName} for user {UserId}", operationName, Context.UserIdentifier);
            throw new HubException($"An error occurred in {operationName}. Please try again.");
        }
    }

    // Connection info class for tracking
    private class ConnectionInfo
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public DateTime ConnectedAt { get; set; }
        public DateTime LastHeartbeat { get; set; }
        public int HeartbeatCount { get; set; }
        public string? UserAgent { get; set; }
        public string? IpAddress { get; set; }
    }

    public async Task SendPrivateMessage(string receiverUserId, string message)
    {
        await ExecuteWithErrorHandling(async () =>
        {
            var senderId = Context.UserIdentifier;
            if (senderId == null)
            {
                throw new HubException("User not authenticated");
            }

            // Validate message content
            if (string.IsNullOrWhiteSpace(message) || message.Length > 1000)
            {
                throw new HubException("Invalid message content");
            }

            var newMessage = new Message
            {
                SenderId = int.Parse(senderId),
                ReceiverId = int.Parse(receiverUserId),
                Content = message.Trim(),
                SentAt = DateTime.UtcNow
            };

            _context.Messages.Add(newMessage);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Private message sent from {SenderId} to {ReceiverId}", senderId, receiverUserId);

            // Send to receiver if connected
            if (userConnections.TryGetValue(receiverUserId, out var receiverConnection))
            {
                await Clients.Client(receiverConnection.ConnectionId).SendAsync("ReceiveMessage",
                    senderId, message, newMessage.Id, newMessage.SentAt);
            }

            // Confirm to sender
            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveMessage",
                senderId, message, newMessage.Id, newMessage.SentAt);

        }, nameof(SendPrivateMessage));
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
        await ExecuteWithErrorHandling(async () =>
        {
            var senderId = Context.UserIdentifier;
            if (senderId == null)
            {
                throw new HubException("User not authenticated");
            }

            if (userConnections.TryGetValue(receiverUserId.ToString(), out var receiverConnection))
            {
                await Clients.Client(receiverConnection.ConnectionId).SendAsync("ReceiveTypingStatus",
                    int.Parse(senderId), isTyping);
            }

        }, nameof(SendTypingStatus));
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
