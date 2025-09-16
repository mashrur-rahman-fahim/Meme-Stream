using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.services;
using MemeStreamApi.extensions;
using Microsoft.Extensions.Logging;

namespace MemeStreamApi.hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationHub> _logger;

        // Enhanced connection tracking with metadata
        private static readonly ConcurrentDictionary<int, NotificationConnectionInfo> UserConnections = new();

        // Connection statistics for monitoring
        private static int _totalConnections = 0;
        private static readonly object _statsLock = new object();

        public NotificationHub(INotificationService notificationService, ILogger<NotificationHub> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            try
            {
                var userId = Context.User.GetUserId();
                var connectionId = Context.ConnectionId;

                var connectionInfo = new NotificationConnectionInfo
                {
                    ConnectionId = connectionId,
                    UserId = userId,
                    ConnectedAt = DateTime.UtcNow,
                    LastHeartbeat = DateTime.UtcNow,
                    UserAgent = Context.GetHttpContext()?.Request.Headers["User-Agent"].ToString(),
                    IpAddress = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString()
                };

                UserConnections[userId] = connectionInfo;

                lock (_statsLock)
                {
                    _totalConnections++;
                }

                await Groups.AddToGroupAsync(connectionId, $"user-{userId}");

                // Send connection confirmation
                await Clients.Caller.SendAsync("ConnectionConfirmed", new
                {
                    UserId = userId,
                    ConnectionId = connectionId,
                    ConnectedAt = connectionInfo.ConnectedAt,
                    ServerTime = DateTime.UtcNow
                });

                // Send initial unread count
                var unreadCount = await _notificationService.GetUnreadCountAsync(userId);
                await Clients.Caller.SendAsync("UpdateUnreadCount", unreadCount);

                // Send recent notifications
                var recentNotifications = await _notificationService.GetRecentNotificationsAsync(userId, 5);
                await Clients.Caller.SendAsync("ReceiveRecentNotifications", recentNotifications);

                _logger.LogInformation("User {UserId} connected to notifications hub with connection {ConnectionId}. Total connections: {TotalConnections}",
                    userId, connectionId, _totalConnections);

                await base.OnConnectedAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in OnConnectedAsync for notification hub");
            }
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            try
            {
                var userId = Context.User.GetUserId();
                var connectionId = Context.ConnectionId;

                if (UserConnections.TryRemove(userId, out var connectionInfo))
                {
                    lock (_statsLock)
                    {
                        _totalConnections = Math.Max(0, _totalConnections - 1);
                    }

                    var duration = DateTime.UtcNow - connectionInfo.ConnectedAt;

                    _logger.LogInformation("User {UserId} disconnected from notifications hub connection {ConnectionId}. " +
                        "Duration: {Duration}. Total connections: {TotalConnections}. Exception: {Exception}",
                        userId, connectionId, duration, _totalConnections, exception?.Message);
                }

                await Groups.RemoveFromGroupAsync(connectionId, $"user-{userId}");
                await base.OnDisconnectedAsync(exception);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in OnDisconnectedAsync for notification hub");
            }
        }

        // Heartbeat mechanism
        public async Task Ping()
        {
            try
            {
                var userId = Context.User.GetUserId();
                var connectionId = Context.ConnectionId;

                if (UserConnections.TryGetValue(userId, out var connectionInfo))
                {
                    connectionInfo.LastHeartbeat = DateTime.UtcNow;
                    connectionInfo.HeartbeatCount++;
                }

                await Clients.Caller.SendAsync("Pong", DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Ping for notification hub user {UserId}", Context.User.GetUserId());
            }
        }

        // Get connection statistics (for admin/monitoring)
        public async Task GetConnectionStats()
        {
            try
            {
                var userId = Context.User.GetUserId();

                if (IsAuthorizedForStats(userId))
                {
                    var stats = new
                    {
                        TotalConnections = _totalConnections,
                        ConnectedUsers = UserConnections.Count,
                        Connections = UserConnections.Values.Select(c => new
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

                    await Clients.Caller.SendAsync("ConnectionStats", stats);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetConnectionStats for notification hub");
            }
        }

        // Helper method to check if user is authorized for stats
        private bool IsAuthorizedForStats(int userId)
        {
            // Implement your authorization logic here
            // For now, allow all authenticated users
            return userId > 0;
        }

        // Enhanced error handling wrapper
        private async Task<T> ExecuteWithErrorHandling<T>(Func<Task<T>> operation, string operationName)
        {
            try
            {
                return await operation();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {OperationName} for notification hub user {UserId}", operationName, Context.User.GetUserId());
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
                _logger.LogError(ex, "Error in {OperationName} for notification hub user {UserId}", operationName, Context.User.GetUserId());
                throw new HubException($"An error occurred in {operationName}. Please try again.");
            }
        }

        // Connection info class for tracking
        private class NotificationConnectionInfo
        {
            public string ConnectionId { get; set; } = string.Empty;
            public int UserId { get; set; }
            public DateTime ConnectedAt { get; set; }
            public DateTime LastHeartbeat { get; set; }
            public int HeartbeatCount { get; set; }
            public string? UserAgent { get; set; }
            public string? IpAddress { get; set; }
        }

        public async Task MarkAsRead(int notificationId)
        {
            await ExecuteWithErrorHandling(async () =>
            {
                var userId = Context.User.GetUserId();
                var success = await _notificationService.MarkAsReadAsync(notificationId, userId);

                if (success)
                {
                    var unreadCount = await _notificationService.GetUnreadCountAsync(userId);
                    await Clients.Caller.SendAsync("UpdateUnreadCount", unreadCount);
                    await Clients.Caller.SendAsync("NotificationRead", notificationId);

                    _logger.LogInformation("Notification {NotificationId} marked as read by user {UserId}", notificationId, userId);
                }
                else
                {
                    _logger.LogWarning("Failed to mark notification {NotificationId} as read for user {UserId}", notificationId, userId);
                }
            }, nameof(MarkAsRead));
        }

        public async Task MarkAllAsRead()
        {
            await ExecuteWithErrorHandling(async () =>
            {
                var userId = Context.User.GetUserId();
                var success = await _notificationService.MarkAllAsReadAsync(userId);

                if (success)
                {
                    await Clients.Caller.SendAsync("UpdateUnreadCount", 0);
                    await Clients.Caller.SendAsync("AllNotificationsRead");

                    _logger.LogInformation("All notifications marked as read for user {UserId}", userId);
                }
                else
                {
                    _logger.LogWarning("Failed to mark all notifications as read for user {UserId}", userId);
                }
            }, nameof(MarkAllAsRead));
        }

        public async Task GetUnreadCount()
        {
            var userId = Context.User.GetUserId();
            var count = await _notificationService.GetUnreadCountAsync(userId);
            await Clients.Caller.SendAsync("UpdateUnreadCount", count);
        }

        public async Task GetRecentNotifications(int count = 5)
        {
            var userId = Context.User.GetUserId();
            var notifications = await _notificationService.GetRecentNotificationsAsync(userId, count);
            await Clients.Caller.SendAsync("ReceiveRecentNotifications", notifications);
        }

        // Static method to send notification to specific user
        public static async Task SendNotificationToUser(IHubContext<NotificationHub> hubContext, int userId, object notification, INotificationService notificationService = null)
        {
            await hubContext.Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", notification);
            
            // Also update unread count with actual count from database
            if (notificationService != null)
            {
                var unreadCount = await notificationService.GetUnreadCountAsync(userId);
                await hubContext.Clients.Group($"user-{userId}").SendAsync("UpdateUnreadCount", unreadCount);
            }
        }

        // Send notification to multiple users
        public static async Task SendNotificationToUsers(IHubContext<NotificationHub> hubContext, List<int> userIds, object notification, INotificationService notificationService = null)
        {
            foreach (var userId in userIds)
            {
                await SendNotificationToUser(hubContext, userId, notification, notificationService);
            }
        }
    }
}