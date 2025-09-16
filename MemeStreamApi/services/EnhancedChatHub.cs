using Microsoft.AspNetCore.SignalR;
using MemeStreamApi.data;
using MemeStreamApi.model;
using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

public class EnhancedChatHub : Hub
{
    private readonly MemeStreamDbContext _context;
    private readonly ILogger<EnhancedChatHub> _logger;
    private readonly IServiceProvider _serviceProvider;

    // Enhanced connection tracking with comprehensive metadata
    private static readonly ConcurrentDictionary<string, EnhancedConnectionInfo> UserConnections = new();

    // Connection pool for better resource management
    private static readonly ConcurrentDictionary<string, ConnectionPool> ConnectionPools = new();

    // Message queue for offline scenarios
    private static readonly ConcurrentDictionary<string, ConcurrentQueue<QueuedMessage>> MessageQueues = new();

    // Performance monitoring
    private static int _totalConnections = 0;
    private static int _totalMessages = 0;
    private static long _totalUptime = 0;
    private static readonly object _statsLock = new object();

    // Circuit breaker for external dependencies
    private static readonly ConcurrentDictionary<string, CircuitBreaker> CircuitBreakers = new();

    // Configuration
    private static readonly TimeSpan HeartbeatTimeout = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan ConnectionTimeout = TimeSpan.FromSeconds(60);
    private const int MaxRetryAttempts = 3;
    private static readonly int MaxQueuedMessages = 100;

    public EnhancedChatHub(MemeStreamDbContext context, ILogger<EnhancedChatHub> logger, IServiceProvider serviceProvider)
    {
        _context = context;
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    #region Connection Management

    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        var userId = Context.UserIdentifier;
        var httpContext = Context.GetHttpContext();

        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Connection attempted without user identification: {ConnectionId}", connectionId);
                Context.Abort();
                return;
            }

            var connectionInfo = new EnhancedConnectionInfo
            {
                ConnectionId = connectionId,
                UserId = userId,
                ConnectedAt = DateTime.UtcNow,
                LastHeartbeat = DateTime.UtcNow,
                LastActivity = DateTime.UtcNow,
                UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
                IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
                Features = ParseFeatures(httpContext?.Request.Headers["X-Features"].ToString()),
                ClientVersion = httpContext?.Request.Headers["X-Client-Version"].ToString() ?? "1.0.0",
                Transport = GetTransportType(Context),
                IsHealthy = true,
                MessagesSent = 0,
                MessagesReceived = 0,
                ReconnectCount = 0
            };

            // Check for existing connection and handle gracefully
            if (UserConnections.TryGetValue(userId, out var existingConnection))
            {
                _logger.LogInformation("Replacing existing connection for user {UserId}: {OldConnectionId} -> {NewConnectionId}",
                    userId, existingConnection.ConnectionId, connectionId);

                connectionInfo.ReconnectCount = existingConnection.ReconnectCount + 1;

                // Notify old connection about replacement (if different)
                if (existingConnection.ConnectionId != connectionId)
                {
                    try
                    {
                        await Clients.Client(existingConnection.ConnectionId).SendAsync("ConnectionReplaced", new
                        {
                            NewConnectionId = connectionId,
                            Reason = "New connection established"
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug("Could not notify old connection: {Error}", ex.Message);
                    }
                }
            }

            UserConnections[userId] = connectionInfo;

            lock (_statsLock)
            {
                _totalConnections++;
            }

            // Initialize connection pool for user if needed
            if (!ConnectionPools.ContainsKey(userId))
            {
                ConnectionPools[userId] = new ConnectionPool(userId);
            }

            // Initialize message queue for user if needed
            if (!MessageQueues.ContainsKey(userId))
            {
                MessageQueues[userId] = new ConcurrentQueue<QueuedMessage>();
            }

            // Send connection confirmation with server capabilities
            await Clients.Caller.SendAsync("ConnectionConfirmed", new
            {
                UserId = userId,
                ConnectionId = connectionId,
                ConnectedAt = connectionInfo.ConnectedAt,
                ServerTime = DateTime.UtcNow,
                ServerCapabilities = GetServerCapabilities(),
                ReconnectCount = connectionInfo.ReconnectCount
            });

            // Process any queued messages
            await ProcessQueuedMessagesAsync(userId);

            _logger.LogInformation("Enhanced connection established for user {UserId} with connection {ConnectionId}. " +
                "Transport: {Transport}, Features: {Features}, Total connections: {TotalConnections}",
                userId, connectionId, connectionInfo.Transport, string.Join(",", connectionInfo.Features),
                _totalConnections);

            await base.OnConnectedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OnConnectedAsync for connection {ConnectionId}", connectionId);
            Context.Abort();
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        var userId = Context.UserIdentifier;

        try
        {
            if (!string.IsNullOrEmpty(userId) && UserConnections.TryRemove(userId, out var connectionInfo))
            {
                var duration = DateTime.UtcNow - connectionInfo.ConnectedAt;

                lock (_statsLock)
                {
                    _totalConnections = Math.Max(0, _totalConnections - 1);
                    _totalUptime += (long)duration.TotalMilliseconds;
                }

                // Log comprehensive disconnection information
                _logger.LogInformation("Enhanced disconnection for user {UserId} from connection {ConnectionId}. " +
                    "Duration: {Duration}, Messages sent: {MessagesSent}, Messages received: {MessagesReceived}, " +
                    "Transport: {Transport}, Exception: {Exception}, Total connections: {TotalConnections}",
                    userId, connectionId, duration, connectionInfo.MessagesSent, connectionInfo.MessagesReceived,
                    connectionInfo.Transport, exception?.Message, _totalConnections);

                // Clean up connection pool if no active connections
                await CleanupUserResourcesAsync(userId);
            }

            await base.OnDisconnectedAsync(exception);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OnDisconnectedAsync for connection {ConnectionId}", connectionId);
        }
    }

    #endregion

    #region Health Monitoring

    public async Task Ping()
    {
        var userId = Context.UserIdentifier;
        var connectionId = Context.ConnectionId;

        try
        {
            if (UserConnections.TryGetValue(userId, out var connectionInfo))
            {
                connectionInfo.LastHeartbeat = DateTime.UtcNow;
                connectionInfo.LastActivity = DateTime.UtcNow;
                connectionInfo.HeartbeatCount++;
                connectionInfo.IsHealthy = true;
            }

            await Clients.Caller.SendAsync("Pong", new
            {
                ServerTime = DateTime.UtcNow,
                ConnectionId = connectionId,
                Uptime = GetConnectionUptime(userId)
            });

            _logger.LogDebug("Heartbeat processed for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing heartbeat for user {UserId}", userId);
        }
    }

    public async Task GetConnectionStats()
    {
        var userId = Context.UserIdentifier;

        try
        {
            if (!IsAuthorizedForStats(userId))
            {
                await Clients.Caller.SendAsync("AccessDenied", "Insufficient permissions for connection statistics");
                return;
            }

            var stats = new
            {
                TotalConnections = _totalConnections,
                ConnectedUsers = UserConnections.Count,
                TotalMessages = _totalMessages,
                TotalUptime = _totalUptime,
                Connections = UserConnections.Values.Select(c => new
                {
                    c.UserId,
                    c.ConnectionId,
                    c.ConnectedAt,
                    c.LastHeartbeat,
                    c.LastActivity,
                    c.HeartbeatCount,
                    c.MessagesSent,
                    c.MessagesReceived,
                    c.Transport,
                    c.ClientVersion,
                    c.Features,
                    c.IsHealthy,
                    c.ReconnectCount,
                    ConnectionDuration = DateTime.UtcNow - c.ConnectedAt,
                    TimeSinceLastHeartbeat = DateTime.UtcNow - c.LastHeartbeat,
                    TimeSinceLastActivity = DateTime.UtcNow - c.LastActivity
                }).ToList()
            };

            await Clients.Caller.SendAsync("ConnectionStats", stats);
            _logger.LogInformation("Connection statistics provided to user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error providing connection statistics to user {UserId}", userId);
        }
    }

    public async Task GetHealthStatus()
    {
        var userId = Context.UserIdentifier;

        try
        {
            var healthStatus = new
            {
                IsHealthy = true,
                ServerTime = DateTime.UtcNow,
                DatabaseConnected = await CheckDatabaseHealth(),
                CircuitBreakerStates = GetCircuitBreakerStates(),
                ActiveConnections = _totalConnections,
                QueuedMessages = GetTotalQueuedMessages(),
                MemoryUsage = GetMemoryUsage()
            };

            await Clients.Caller.SendAsync("HealthStatus", healthStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error providing health status to user {UserId}", userId);
            await Clients.Caller.SendAsync("HealthStatus", new { IsHealthy = false, Error = ex.Message });
        }
    }

    #endregion

    #region Enhanced Messaging

    public async Task SendPrivateMessage(string receiverUserId, string message)
    {
        await ExecuteWithCircuitBreaker("SendPrivateMessage", async () =>
        {
            var senderId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(senderId))
            {
                throw new HubException("User not authenticated");
            }

            // Enhanced validation
            var validationResult = ValidateMessage(message);
            if (!validationResult.IsValid)
            {
                throw new HubException($"Invalid message: {validationResult.ErrorMessage}");
            }

            // Check rate limits
            if (!await CheckRateLimit(senderId, "SendPrivateMessage"))
            {
                throw new HubException("Rate limit exceeded. Please slow down.");
            }

            var newMessage = new Message
            {
                SenderId = int.Parse(senderId),
                ReceiverId = int.Parse(receiverUserId),
                Content = message.Trim(),
                SentAt = DateTime.UtcNow
            };

            // Enhanced database operation with retry
            await ExecuteWithRetry(async () =>
            {
                _context.Messages.Add(newMessage);
                await _context.SaveChangesAsync();
            }, "SavePrivateMessage");

            // Update connection statistics
            UpdateConnectionStats(senderId, sent: true);

            lock (_statsLock)
            {
                _totalMessages++;
            }

            _logger.LogInformation("Private message sent from {SenderId} to {ReceiverId} with ID {MessageId}",
                senderId, receiverUserId, newMessage.Id);

            // Enhanced delivery with fallback
            var deliveryTasks = new List<Task>();

            // Send to receiver if online
            if (UserConnections.TryGetValue(receiverUserId, out var receiverConnection))
            {
                deliveryTasks.Add(Clients.Client(receiverConnection.ConnectionId).SendAsync("ReceiveMessage",
                    senderId, message, newMessage.Id, newMessage.SentAt));

                UpdateConnectionStats(receiverUserId, received: true);
            }
            else
            {
                // Queue message for when user comes online
                await QueueMessageForUser(receiverUserId, new QueuedMessage
                {
                    Type = "PrivateMessage",
                    FromUserId = senderId,
                    Content = message,
                    MessageId = newMessage.Id,
                    SentAt = newMessage.SentAt,
                    QueuedAt = DateTime.UtcNow
                });

                _logger.LogDebug("Message queued for offline user {ReceiverId}", receiverUserId);
            }

            // Confirm to sender
            deliveryTasks.Add(Clients.Caller.SendAsync("MessageDelivered", new
            {
                MessageId = newMessage.Id,
                SentAt = newMessage.SentAt,
                DeliveryStatus = UserConnections.ContainsKey(receiverUserId) ? "Delivered" : "Queued"
            }));

            await Task.WhenAll(deliveryTasks);

        });
    }

    public async Task SendGroupMessage(string groupName, string message)
    {
        await ExecuteWithCircuitBreaker("SendGroupMessage", async () =>
        {
            var senderId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(senderId))
            {
                throw new HubException("User not authenticated");
            }

            var validationResult = ValidateMessage(message);
            if (!validationResult.IsValid)
            {
                throw new HubException($"Invalid message: {validationResult.ErrorMessage}");
            }

            if (!await CheckRateLimit(senderId, "SendGroupMessage"))
            {
                throw new HubException("Rate limit exceeded. Please slow down.");
            }

            var groupId = int.Parse(groupName.Replace("group-", ""));

            // Verify user is member of group
            var isMember = await _context.GroupMemberships
                .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == int.Parse(senderId));

            if (!isMember)
            {
                throw new HubException("You are not a member of this group");
            }

            var newMessage = new Message
            {
                SenderId = int.Parse(senderId),
                GroupId = groupId,
                Content = message.Trim(),
                SentAt = DateTime.UtcNow
            };

            await ExecuteWithRetry(async () =>
            {
                _context.Messages.Add(newMessage);
                await _context.SaveChangesAsync();
            }, "SaveGroupMessage");

            UpdateConnectionStats(senderId, sent: true);

            lock (_statsLock)
            {
                _totalMessages++;
            }

            _logger.LogInformation("Group message sent from {SenderId} to group {GroupId} with ID {MessageId}",
                senderId, groupId, newMessage.Id);

            // Enhanced group delivery
            var groupMembers = await GetGroupMembers(groupId);
            var deliveryTasks = new List<Task>();
            var deliveredCount = 0;
            var queuedCount = 0;

            foreach (var memberId in groupMembers)
            {
                if (UserConnections.TryGetValue(memberId, out var memberConnection))
                {
                    deliveryTasks.Add(Clients.Client(memberConnection.ConnectionId).SendAsync("ReceiveGroupMessage",
                        senderId, message, newMessage.Id, newMessage.SentAt, groupId));

                    UpdateConnectionStats(memberId, received: true);
                    deliveredCount++;
                }
                else
                {
                    // Queue for offline members
                    await QueueMessageForUser(memberId, new QueuedMessage
                    {
                        Type = "GroupMessage",
                        FromUserId = senderId,
                        Content = message,
                        MessageId = newMessage.Id,
                        SentAt = newMessage.SentAt,
                        GroupId = groupId,
                        QueuedAt = DateTime.UtcNow
                    });
                    queuedCount++;
                }
            }

            // Confirm to sender
            deliveryTasks.Add(Clients.Caller.SendAsync("GroupMessageDelivered", new
            {
                MessageId = newMessage.Id,
                SentAt = newMessage.SentAt,
                DeliveredCount = deliveredCount,
                QueuedCount = queuedCount,
                TotalMembers = groupMembers.Count
            }));

            await Task.WhenAll(deliveryTasks);

        });
    }

    public async Task SendTypingStatus(int receiverUserId, bool isTyping)
    {
        await ExecuteWithErrorHandling(async () =>
        {
            var senderId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(senderId))
            {
                throw new HubException("User not authenticated");
            }

            if (UserConnections.TryGetValue(receiverUserId.ToString(), out var receiverConnection))
            {
                await Clients.Client(receiverConnection.ConnectionId).SendAsync("ReceiveTypingStatus",
                    int.Parse(senderId), isTyping);

                _logger.LogDebug("Typing status sent from {SenderId} to {ReceiverId}: {IsTyping}",
                    senderId, receiverUserId, isTyping);
            }

        }, nameof(SendTypingStatus));
    }

    #endregion

    #region Message Queue Management

    private async Task ProcessQueuedMessagesAsync(string userId)
    {
        if (!MessageQueues.TryGetValue(userId, out var queue))
            return;

        var processedCount = 0;
        var maxProcess = 10; // Process up to 10 messages at once

        while (queue.TryDequeue(out var queuedMessage) && processedCount < maxProcess)
        {
            try
            {
                if (queuedMessage.Type == "PrivateMessage")
                {
                    await Clients.Caller.SendAsync("ReceiveMessage",
                        queuedMessage.FromUserId, queuedMessage.Content, queuedMessage.MessageId, queuedMessage.SentAt);
                }
                else if (queuedMessage.Type == "GroupMessage")
                {
                    await Clients.Caller.SendAsync("ReceiveGroupMessage",
                        queuedMessage.FromUserId, queuedMessage.Content, queuedMessage.MessageId,
                        queuedMessage.SentAt, queuedMessage.GroupId);
                }

                processedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing queued message for user {UserId}", userId);
                // Re-queue the message
                queue.Enqueue(queuedMessage);
                break;
            }
        }

        if (processedCount > 0)
        {
            _logger.LogInformation("Processed {Count} queued messages for user {UserId}", processedCount, userId);
        }
    }

    private async Task QueueMessageForUser(string userId, QueuedMessage message)
    {
        if (!MessageQueues.TryGetValue(userId, out var queue))
        {
            queue = new ConcurrentQueue<QueuedMessage>();
            MessageQueues[userId] = queue;
        }

        // Prevent queue overflow
        if (queue.Count >= MaxQueuedMessages)
        {
            // Remove oldest message
            queue.TryDequeue(out _);
            _logger.LogWarning("Message queue full for user {UserId}, oldest message discarded", userId);
        }

        queue.Enqueue(message);
    }

    #endregion

    #region Circuit Breaker Pattern

    private async Task<T> ExecuteWithCircuitBreaker<T>(string operationName, Func<Task<T>> operation)
    {
        var circuitBreaker = GetOrCreateCircuitBreaker(operationName);

        if (circuitBreaker.State == CircuitBreakerState.Open)
        {
            if (DateTime.UtcNow - circuitBreaker.LastFailureTime < circuitBreaker.Timeout)
            {
                throw new HubException($"Service temporarily unavailable: {operationName}");
            }

            // Try to close circuit
            circuitBreaker.State = CircuitBreakerState.HalfOpen;
        }

        try
        {
            var result = await operation();

            // Success - reset circuit breaker
            if (circuitBreaker.State == CircuitBreakerState.HalfOpen)
            {
                circuitBreaker.State = CircuitBreakerState.Closed;
                circuitBreaker.FailureCount = 0;
            }

            return result;
        }
        catch (Exception ex)
        {
            // Failure - update circuit breaker
            circuitBreaker.FailureCount++;
            circuitBreaker.LastFailureTime = DateTime.UtcNow;

            if (circuitBreaker.FailureCount >= circuitBreaker.FailureThreshold)
            {
                circuitBreaker.State = CircuitBreakerState.Open;
                _logger.LogWarning("Circuit breaker opened for operation {OperationName} after {FailureCount} failures",
                    operationName, circuitBreaker.FailureCount);
            }

            throw;
        }
    }

    private async Task ExecuteWithCircuitBreaker(string operationName, Func<Task> operation)
    {
        await ExecuteWithCircuitBreaker(operationName, async () =>
        {
            await operation();
            return 0; // Dummy return value
        });
    }

    private CircuitBreaker GetOrCreateCircuitBreaker(string operationName)
    {
        return CircuitBreakers.GetOrAdd(operationName, _ => new CircuitBreaker
        {
            FailureThreshold = 5,
            Timeout = TimeSpan.FromMinutes(1)
        });
    }

    #endregion

    #region Rate Limiting

    private static readonly ConcurrentDictionary<string, RateLimiter> RateLimiters = new();

    private async Task<bool> CheckRateLimit(string userId, string operation)
    {
        var key = $"{userId}:{operation}";
        var rateLimiter = RateLimiters.GetOrAdd(key, _ => new RateLimiter
        {
            MaxRequests = GetMaxRequestsForOperation(operation),
            TimeWindow = TimeSpan.FromMinutes(1)
        });

        var now = DateTime.UtcNow;

        // Clean old timestamps
        rateLimiter.Timestamps.RemoveWhere(t => now - t > rateLimiter.TimeWindow);

        if (rateLimiter.Timestamps.Count >= rateLimiter.MaxRequests)
        {
            _logger.LogWarning("Rate limit exceeded for user {UserId} operation {Operation}", userId, operation);
            return false;
        }

        rateLimiter.Timestamps.Add(now);
        return true;
    }

    private static int GetMaxRequestsForOperation(string operation)
    {
        return operation switch
        {
            "SendPrivateMessage" => 60, // 60 messages per minute
            "SendGroupMessage" => 100,   // 100 group messages per minute
            "SendTypingStatus" => 30,    // 30 typing updates per minute
            _ => 30
        };
    }

    #endregion

    #region Utility Methods

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

    private async Task ExecuteWithRetry(Func<Task> operation, string operationName, int maxAttempts = MaxRetryAttempts)
    {
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await operation();
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts && IsRetryableException(ex))
            {
                _logger.LogWarning("Retryable error in {OperationName} (attempt {Attempt}/{MaxAttempts}): {Error}",
                    operationName, attempt, maxAttempts, ex.Message);

                await Task.Delay(TimeSpan.FromMilliseconds(100 * Math.Pow(2, attempt - 1))); // Exponential backoff
            }
        }
    }

    private static bool IsRetryableException(Exception ex)
    {
        // Add logic to determine if exception is retryable
        return ex is TimeoutException || ex.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase);
    }

    private MessageValidationResult ValidateMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return new MessageValidationResult { IsValid = false, ErrorMessage = "Message cannot be empty" };
        }

        if (message.Length > 2000)
        {
            return new MessageValidationResult { IsValid = false, ErrorMessage = "Message too long (max 2000 characters)" };
        }

        // Add more validation as needed
        return new MessageValidationResult { IsValid = true };
    }

    private void UpdateConnectionStats(string userId, bool sent = false, bool received = false)
    {
        if (UserConnections.TryGetValue(userId, out var connectionInfo))
        {
            connectionInfo.LastActivity = DateTime.UtcNow;
            if (sent) connectionInfo.MessagesSent++;
            if (received) connectionInfo.MessagesReceived++;
        }
    }

    private async Task<List<string>> GetGroupMembers(int groupId)
    {
        return await _context.GroupMemberships
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => gm.UserId.ToString())
            .ToListAsync();
    }

    private static List<string> ParseFeatures(string? featuresHeader)
    {
        if (string.IsNullOrEmpty(featuresHeader))
            return new List<string>();

        return featuresHeader.Split(',', StringSplitOptions.RemoveEmptyEntries)
                           .Select(f => f.Trim())
                           .ToList();
    }

    private static string GetTransportType(HubCallerContext context)
    {
        // This is a simplified approach - in real implementation, you'd access the transport info
        return "Enhanced"; // Could be WebSocket, SSE, LongPolling, etc.
    }

    private static Dictionary<string, object> GetServerCapabilities()
    {
        return new Dictionary<string, object>
        {
            ["heartbeat"] = true,
            ["messageQueue"] = true,
            ["circuitBreaker"] = true,
            ["rateLimiting"] = true,
            ["enhancedLogging"] = true,
            ["connectionStats"] = true,
            ["version"] = "2.0.0"
        };
    }

    private TimeSpan? GetConnectionUptime(string userId)
    {
        if (UserConnections.TryGetValue(userId, out var connectionInfo))
        {
            return DateTime.UtcNow - connectionInfo.ConnectedAt;
        }
        return null;
    }

    private async Task<bool> CheckDatabaseHealth()
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1");
            return true;
        }
        catch
        {
            return false;
        }
    }

    private Dictionary<string, string> GetCircuitBreakerStates()
    {
        return CircuitBreakers.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.State.ToString()
        );
    }

    private int GetTotalQueuedMessages()
    {
        return MessageQueues.Values.Sum(q => q.Count);
    }

    private object GetMemoryUsage()
    {
        var process = System.Diagnostics.Process.GetCurrentProcess();
        return new
        {
            WorkingSet = process.WorkingSet64,
            PrivateMemory = process.PrivateMemorySize64,
            GCMemory = GC.GetTotalMemory(false)
        };
    }

    private bool IsAuthorizedForStats(string? userId)
    {
        // Implement your authorization logic here
        return !string.IsNullOrEmpty(userId);
    }

    private async Task CleanupUserResourcesAsync(string userId)
    {
        // Clean up connection pools
        if (ConnectionPools.TryGetValue(userId, out var pool))
        {
            // Keep pool for a while in case of quick reconnection
            _ = Task.Delay(TimeSpan.FromMinutes(5)).ContinueWith(_ =>
            {
                ConnectionPools.TryRemove(userId, out var _);
            });
        }

        // Clean up empty message queues after delay
        if (MessageQueues.TryGetValue(userId, out var queue) && queue.IsEmpty)
        {
            _ = Task.Delay(TimeSpan.FromMinutes(1)).ContinueWith(_ =>
            {
                if (MessageQueues.TryGetValue(userId, out var q) && q.IsEmpty && !UserConnections.ContainsKey(userId))
                {
                    MessageQueues.TryRemove(userId, out var _);
                }
            });
        }

        await Task.CompletedTask;
    }

    #endregion

    #region Data Models

    private class EnhancedConnectionInfo
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public DateTime ConnectedAt { get; set; }
        public DateTime LastHeartbeat { get; set; }
        public DateTime LastActivity { get; set; }
        public int HeartbeatCount { get; set; }
        public string? UserAgent { get; set; }
        public string? IpAddress { get; set; }
        public List<string> Features { get; set; } = new();
        public string ClientVersion { get; set; } = "1.0.0";
        public string Transport { get; set; } = "Unknown";
        public bool IsHealthy { get; set; } = true;
        public long MessagesSent { get; set; }
        public long MessagesReceived { get; set; }
        public int ReconnectCount { get; set; }
    }

    private class QueuedMessage
    {
        public string Type { get; set; } = string.Empty;
        public string FromUserId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int MessageId { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime QueuedAt { get; set; }
        public int? GroupId { get; set; }
    }

    private class ConnectionPool
    {
        public string UserId { get; set; }
        public List<string> ConnectionIds { get; set; } = new();
        public DateTime LastUsed { get; set; } = DateTime.UtcNow;

        public ConnectionPool(string userId)
        {
            UserId = userId;
        }
    }

    private class CircuitBreaker
    {
        public CircuitBreakerState State { get; set; } = CircuitBreakerState.Closed;
        public int FailureCount { get; set; } = 0;
        public int FailureThreshold { get; set; } = 5;
        public DateTime LastFailureTime { get; set; }
        public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(1);
    }

    private enum CircuitBreakerState
    {
        Closed,
        Open,
        HalfOpen
    }

    private class RateLimiter
    {
        public HashSet<DateTime> Timestamps { get; set; } = new();
        public int MaxRequests { get; set; }
        public TimeSpan TimeWindow { get; set; }
    }

    private enum MessageType
    {
        Text,
        Image,
        File,
        System
    }

    private class MessageValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }

    #endregion
}