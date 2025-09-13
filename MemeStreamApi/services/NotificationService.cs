using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MemeStreamApi.data;
using MemeStreamApi.model;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace MemeStreamApi.services
{
    public interface INotificationService
    {
        Task<Notification> CreateNotificationAsync(int userId, string type, string message, string? title = null, int? relatedUserId = null, int? postId = null, int? commentId = null, string? actionUrl = null);
        Task<List<Notification>> GetUserNotificationsAsync(int userId, int page = 1, int pageSize = 20, bool unreadOnly = false);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<bool> DeleteNotificationAsync(int notificationId, int userId);
        Task<bool> DeleteAllNotificationsAsync(int userId);
        Task<NotificationPreference> GetUserPreferencesAsync(int userId);
        Task<NotificationPreference> UpdateUserPreferencesAsync(int userId, NotificationPreference preferences);
        Task SendBulkNotificationsAsync(List<int> userIds, string type, string message, string? title = null);
        Task<List<Notification>> GetRecentNotificationsAsync(int userId, int count = 5);
    }

    public class NotificationService : INotificationService
    {
        private readonly MemeStreamDbContext _context;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(MemeStreamDbContext context, ILogger<NotificationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Notification> CreateNotificationAsync(int userId, string type, string message, string? title = null, 
            int? relatedUserId = null, int? postId = null, int? commentId = null, string? actionUrl = null)
        {
            try
            {
                // Check user preferences first
                var preferences = await GetUserPreferencesAsync(userId);
                if (!ShouldSendNotification(preferences, type))
                {
                    return null;
                }

                var notification = new Notification
                {
                    UserId = userId,
                    Type = type,
                    Message = message,
                    Title = title,
                    RelatedUserId = relatedUserId,
                    PostId = postId,
                    CommentId = commentId,
                    ActionUrl = actionUrl,
                    CreatedAt = DateTime.UtcNow,
                    Priority = DeterminePriority(type)
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notification for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<Notification>> GetUserNotificationsAsync(int userId, int page = 1, int pageSize = 20, bool unreadOnly = false)
        {
            try
            {
                var query = _context.Notifications
                    .Include(n => n.RelatedUser)
                    .Include(n => n.Post)
                    .Include(n => n.Comment)
                    .Where(n => n.UserId == userId && !n.IsDeleted);

                if (unreadOnly)
                {
                    query = query.Where(n => !n.IsRead);
                }

                return await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications for user {UserId}", userId);
                return new List<Notification>();
            }
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            try
            {
                return await _context.Notifications
                    .CountAsync(n => n.UserId == userId && !n.IsRead && !n.IsDeleted);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread count for user {UserId}", userId);
                return 0;
            }
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            try
            {
                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

                if (notification == null)
                    return false;

                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification {NotificationId} as read", notificationId);
                return false;
            }
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            try
            {
                var notifications = await _context.Notifications
                    .Where(n => n.UserId == userId && !n.IsRead && !n.IsDeleted)
                    .ToListAsync();

                foreach (var notification in notifications)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", userId);
                return false;
            }
        }

        public async Task<bool> DeleteNotificationAsync(int notificationId, int userId)
        {
            try
            {
                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

                if (notification == null)
                    return false;

                notification.IsDeleted = true;
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification {NotificationId}", notificationId);
                return false;
            }
        }

        public async Task<bool> DeleteAllNotificationsAsync(int userId)
        {
            try
            {
                var notifications = await _context.Notifications
                    .Where(n => n.UserId == userId && !n.IsDeleted)
                    .ToListAsync();

                foreach (var notification in notifications)
                {
                    notification.IsDeleted = true;
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all notifications for user {UserId}", userId);
                return false;
            }
        }

        public async Task<NotificationPreference> GetUserPreferencesAsync(int userId)
        {
            try
            {
                var preferences = await _context.NotificationPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (preferences == null)
                {
                    // Create default preferences
                    preferences = new NotificationPreference
                    {
                        UserId = userId,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.NotificationPreferences.Add(preferences);
                    await _context.SaveChangesAsync();
                }

                return preferences;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting preferences for user {UserId}", userId);
                return new NotificationPreference { UserId = userId };
            }
        }

        public async Task<NotificationPreference> UpdateUserPreferencesAsync(int userId, NotificationPreference preferences)
        {
            try
            {
                var existingPreferences = await _context.NotificationPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (existingPreferences == null)
                {
                    preferences.UserId = userId;
                    preferences.UpdatedAt = DateTime.UtcNow;
                    _context.NotificationPreferences.Add(preferences);
                }
                else
                {
                    existingPreferences.EmailNotifications = preferences.EmailNotifications;
                    existingPreferences.PushNotifications = preferences.PushNotifications;
                    existingPreferences.InAppNotifications = preferences.InAppNotifications;
                    existingPreferences.LikeNotifications = preferences.LikeNotifications;
                    existingPreferences.CommentNotifications = preferences.CommentNotifications;
                    existingPreferences.FollowNotifications = preferences.FollowNotifications;
                    existingPreferences.MentionNotifications = preferences.MentionNotifications;
                    existingPreferences.ShareNotifications = preferences.ShareNotifications;
                    existingPreferences.FriendRequestNotifications = preferences.FriendRequestNotifications;
                    existingPreferences.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return existingPreferences ?? preferences;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating preferences for user {UserId}", userId);
                throw;
            }
        }

        public async Task SendBulkNotificationsAsync(List<int> userIds, string type, string message, string? title = null)
        {
            try
            {
                var notifications = new List<Notification>();
                foreach (var userId in userIds)
                {
                    var preferences = await GetUserPreferencesAsync(userId);
                    if (ShouldSendNotification(preferences, type))
                    {
                        notifications.Add(new Notification
                        {
                            UserId = userId,
                            Type = type,
                            Message = message,
                            Title = title,
                            CreatedAt = DateTime.UtcNow,
                            Priority = DeterminePriority(type)
                        });
                    }
                }

                if (notifications.Any())
                {
                    _context.Notifications.AddRange(notifications);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending bulk notifications");
                throw;
            }
        }

        public async Task<List<Notification>> GetRecentNotificationsAsync(int userId, int count = 5)
        {
            try
            {
                return await _context.Notifications
                    .Include(n => n.RelatedUser)
                    .Include(n => n.Post)
                    .Where(n => n.UserId == userId && !n.IsDeleted)
                    .OrderByDescending(n => n.CreatedAt)
                    .Take(count)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recent notifications for user {UserId}", userId);
                return new List<Notification>();
            }
        }

        private bool ShouldSendNotification(NotificationPreference preferences, string type)
        {
            if (!preferences.InAppNotifications)
                return false;

            return type.ToLower() switch
            {
                "like" => preferences.LikeNotifications,
                "comment" => preferences.CommentNotifications,
                "follow" => preferences.FollowNotifications,
                "mention" => preferences.MentionNotifications,
                "share" => preferences.ShareNotifications,
                "friend_request" => preferences.FriendRequestNotifications,
                _ => true
            };
        }

        private string DeterminePriority(string type)
        {
            return type.ToLower() switch
            {
                "mention" => "high",
                "friend_request" => "high",
                "comment" => "normal",
                "like" => "low",
                "follow" => "normal",
                "share" => "normal",
                _ => "normal"
            };
        }
    }
}