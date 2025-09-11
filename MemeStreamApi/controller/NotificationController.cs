using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MemeStreamApi.services;
using MemeStreamApi.model;
using MemeStreamApi.extensions;

namespace MemeStreamApi.controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20, 
            [FromQuery] bool unreadOnly = false)
        {
            var userId = User.GetUserId();
            var notifications = await _notificationService.GetUserNotificationsAsync(userId, page, pageSize, unreadOnly);
            
            return Ok(new
            {
                notifications,
                page,
                pageSize,
                unreadCount = await _notificationService.GetUnreadCountAsync(userId)
            });
        }

        [HttpGet("recent")]
        public async Task<IActionResult> GetRecentNotifications([FromQuery] int count = 5)
        {
            var userId = User.GetUserId();
            var notifications = await _notificationService.GetRecentNotificationsAsync(userId, count);
            
            return Ok(notifications);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = User.GetUserId();
            var count = await _notificationService.GetUnreadCountAsync(userId);
            
            return Ok(new { unreadCount = count });
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = User.GetUserId();
            var success = await _notificationService.MarkAsReadAsync(id, userId);
            
            if (!success)
                return NotFound(new { message = "Notification not found" });
            
            return Ok(new { message = "Notification marked as read" });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = User.GetUserId();
            var success = await _notificationService.MarkAllAsReadAsync(userId);
            
            return Ok(new { message = "All notifications marked as read", success });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = User.GetUserId();
            var success = await _notificationService.DeleteNotificationAsync(id, userId);
            
            if (!success)
                return NotFound(new { message = "Notification not found" });
            
            return Ok(new { message = "Notification deleted" });
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteAllNotifications()
        {
            var userId = User.GetUserId();
            var success = await _notificationService.DeleteAllNotificationsAsync(userId);
            
            return Ok(new { message = "All notifications deleted", success });
        }

        [HttpGet("preferences")]
        public async Task<IActionResult> GetPreferences()
        {
            var userId = User.GetUserId();
            var preferences = await _notificationService.GetUserPreferencesAsync(userId);
            
            return Ok(preferences);
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] NotificationPreferenceDto preferencesDto)
        {
            var userId = User.GetUserId();
            
            var preferences = new NotificationPreference
            {
                EmailNotifications = preferencesDto.EmailNotifications,
                PushNotifications = preferencesDto.PushNotifications,
                InAppNotifications = preferencesDto.InAppNotifications,
                LikeNotifications = preferencesDto.LikeNotifications,
                CommentNotifications = preferencesDto.CommentNotifications,
                FollowNotifications = preferencesDto.FollowNotifications,
                MentionNotifications = preferencesDto.MentionNotifications,
                ShareNotifications = preferencesDto.ShareNotifications,
                FriendRequestNotifications = preferencesDto.FriendRequestNotifications
            };
            
            var updatedPreferences = await _notificationService.UpdateUserPreferencesAsync(userId, preferences);
            
            return Ok(updatedPreferences);
        }

        [HttpPost("test")]
        public async Task<IActionResult> CreateTestNotification()
        {
            var userId = User.GetUserId();
            
            var notification = await _notificationService.CreateNotificationAsync(
                userId,
                "test",
                "This is a test notification",
                "Test Notification",
                null,
                null,
                null,
                "/notifications"
            );
            
            return Ok(notification);
        }
    }

    public class NotificationPreferenceDto
    {
        public bool EmailNotifications { get; set; } = true;
        public bool PushNotifications { get; set; } = true;
        public bool InAppNotifications { get; set; } = true;
        public bool LikeNotifications { get; set; } = true;
        public bool CommentNotifications { get; set; } = true;
        public bool FollowNotifications { get; set; } = true;
        public bool MentionNotifications { get; set; } = true;
        public bool ShareNotifications { get; set; } = true;
        public bool FriendRequestNotifications { get; set; } = true;
    }
}