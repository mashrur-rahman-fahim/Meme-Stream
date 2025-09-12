using System;
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
        private static readonly Dictionary<int, string> UserConnections = new();

        public NotificationHub(INotificationService notificationService, ILogger<NotificationHub> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User.GetUserId();
            UserConnections[userId] = Context.ConnectionId;
            
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
            
            // Send initial unread count
            var unreadCount = await _notificationService.GetUnreadCountAsync(userId);
            await Clients.Caller.SendAsync("UpdateUnreadCount", unreadCount);
            
            // Send recent notifications
            var recentNotifications = await _notificationService.GetRecentNotificationsAsync(userId, 5);
            await Clients.Caller.SendAsync("ReceiveRecentNotifications", recentNotifications);
            
            _logger.LogInformation("User {UserId} connected to notifications hub", userId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = Context.User.GetUserId();
            UserConnections.Remove(userId);
            
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
            
            _logger.LogInformation("User {UserId} disconnected from notifications hub", userId);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task MarkAsRead(int notificationId)
        {
            var userId = Context.User.GetUserId();
            var success = await _notificationService.MarkAsReadAsync(notificationId, userId);
            
            if (success)
            {
                var unreadCount = await _notificationService.GetUnreadCountAsync(userId);
                await Clients.Caller.SendAsync("UpdateUnreadCount", unreadCount);
                await Clients.Caller.SendAsync("NotificationRead", notificationId);
            }
        }

        public async Task MarkAllAsRead()
        {
            var userId = Context.User.GetUserId();
            var success = await _notificationService.MarkAllAsReadAsync(userId);
            
            if (success)
            {
                await Clients.Caller.SendAsync("UpdateUnreadCount", 0);
                await Clients.Caller.SendAsync("AllNotificationsRead");
            }
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
        public static async Task SendNotificationToUser(IHubContext<NotificationHub> hubContext, int userId, object notification)
        {
            await hubContext.Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", notification);
            
            // Also update unread count
            if (UserConnections.ContainsKey(userId))
            {
                await hubContext.Clients.Client(UserConnections[userId]).SendAsync("IncrementUnreadCount");
            }
        }

        // Send notification to multiple users
        public static async Task SendNotificationToUsers(IHubContext<NotificationHub> hubContext, List<int> userIds, object notification)
        {
            foreach (var userId in userIds)
            {
                await SendNotificationToUser(hubContext, userId, notification);
            }
        }
    }
}