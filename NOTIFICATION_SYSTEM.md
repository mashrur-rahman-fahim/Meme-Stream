# MemeStream Notification System Documentation

## Overview

The MemeStream notification system provides real-time Facebook-style notifications for user interactions including reactions, comments, shares, and friend requests. The system uses SignalR for real-time communication and includes both backend services and frontend components.

## Architecture

### Backend Components

#### 1. Models

**Notification Model** (`model/Notification.cs`)
```csharp
public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    
    public string Type { get; set; } // "reaction", "comment", "share", "friend_request"
    public string Message { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Related entity references
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public int? FriendRequestId { get; set; }
    public int? ReactorUserId { get; set; }
    public int? CommenterUserId { get; set; }
    public int? SharerUserId { get; set; }
}
```

**NotificationPreference Model** (`model/NotificationPreference.cs`)
```csharp
public class NotificationPreference
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    
    public bool EmailNotifications { get; set; } = true;
    public bool PushNotifications { get; set; } = true;
    public bool ReactionNotifications { get; set; } = true;
    public bool CommentNotifications { get; set; } = true;
    public bool ShareNotifications { get; set; } = true;
    public bool FriendRequestNotifications { get; set; } = true;
}
```

#### 2. Services

**NotificationService** (`services/NotificationService.cs`)

Key Methods:
- `CreateNotificationAsync()` - Creates new notifications
- `GetNotificationsByUserAsync()` - Retrieves user notifications with pagination
- `GetUnreadCountAsync()` - Gets unread notification count
- `MarkAsReadAsync()` - Marks notifications as read
- `MarkAllAsReadAsync()` - Marks all user notifications as read

```csharp
public interface INotificationService
{
    Task<Notification> CreateNotificationAsync(int userId, string type, string message, 
        int? postId = null, int? commentId = null, int? friendRequestId = null, 
        int? reactorUserId = null, int? commenterUserId = null, int? sharerUserId = null);
    
    Task<(List<Notification> notifications, int totalCount)> GetNotificationsByUserAsync(
        int userId, int page = 1, int pageSize = 20);
    
    Task<int> GetUnreadCountAsync(int userId);
    Task<bool> MarkAsReadAsync(int notificationId, int userId);
    Task<bool> MarkAllAsReadAsync(int userId);
}
```

#### 3. SignalR Hub

**NotificationHub** (`hubs/NotificationHub.cs`)

Features:
- Real-time notification delivery
- User group management for targeted messaging
- Connection lifecycle management
- Unread count broadcasting

Key Methods:
```csharp
public class NotificationHub : Hub
{
    public async Task JoinUserGroup(string userId)
    public async Task LeaveUserGroup(string userId)
    
    public static async Task SendNotificationToUser(
        IHubContext<NotificationHub> hubContext, 
        int userId, 
        object notification, 
        INotificationService notificationService = null)
}
```

#### 4. Controller Integration

The notification system is integrated into existing controllers:

**ReactionController**
- Creates notifications when users react to posts
- Notifies post authors about new reactions

**CommentController** 
- Creates notifications for new comments
- Handles reply notifications

**FriendRequestController**
- Notifications for friend request sent/received
- Notifications for friend request accepted/declined

**SharedPostController**
- Notifications when posts are shared

### Frontend Components

#### 1. Notification Context

**NotificationContext** (`context/NotificationContext.jsx`)

State Management:
```javascript
const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  connection: null
};
```

Actions:
- `SET_NOTIFICATIONS` - Set notifications list
- `ADD_NOTIFICATION` - Add new notification
- `SET_UNREAD_COUNT` - Update unread count
- `MARK_AS_READ` - Mark notification as read
- `SET_LOADING` - Set loading state
- `SET_ERROR` - Set error state

#### 2. Notification Bell Component

**NotificationBell** (`components/NotificationBell.jsx`)

Features:
- Red badge showing unread count
- Dropdown with recent notifications
- Real-time updates via SignalR
- Mark as read functionality
- Navigation to relevant pages

#### 3. Notifications Page

**NotificationsPage** (`pages/NotificationsPage.jsx`)

Features:
- Paginated notification list
- Mark all as read functionality
- Filter by notification type
- Responsive design
- Loading states and error handling

## Real-time Communication

### SignalR Connection Flow

1. **Frontend Connection**
   ```javascript
   const connection = new HubConnectionBuilder()
     .withUrl("http://localhost:5000/notificationhub")
     .build();
   
   connection.start();
   ```

2. **User Group Management**
   ```javascript
   connection.invoke("JoinUserGroup", userId.toString());
   ```

3. **Event Listeners**
   ```javascript
   connection.on('ReceiveNotification', (notification) => {
     dispatch({ type: actionTypes.ADD_NOTIFICATION, payload: notification });
   });
   
   connection.on('UpdateUnreadCount', (count) => {
     dispatch({ type: actionTypes.SET_UNREAD_COUNT, payload: count });
   });
   ```

### Backend Broadcasting

When creating notifications:
```csharp
// Create notification in database
var notification = await _notificationService.CreateNotificationAsync(...);

// Broadcast via SignalR
await NotificationHub.SendNotificationToUser(
    _hubContext, 
    userId, 
    notification, 
    _notificationService
);
```

## Notification Types

### 1. Reaction Notifications
- **Trigger**: User reacts to a post
- **Recipient**: Post author
- **Message**: "[User] reacted to your post"
- **Navigation**: Direct to post

### 2. Comment Notifications
- **Trigger**: User comments on a post
- **Recipient**: Post author
- **Message**: "[User] commented on your post"
- **Navigation**: Direct to post with comment highlighted

### 3. Share Notifications
- **Trigger**: User shares a post
- **Recipient**: Original post author
- **Message**: "[User] shared your post"
- **Navigation**: Direct to original post

### 4. Friend Request Notifications
- **Trigger**: Friend request sent/accepted
- **Recipient**: Both users (different messages)
- **Messages**: 
  - "[User] sent you a friend request"
  - "[User] accepted your friend request"
- **Navigation**: Friends page

## Database Schema

### Notifications Table
```sql
CREATE TABLE "Notifications" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL,
    "Type" VARCHAR(50) NOT NULL,
    "Message" TEXT NOT NULL,
    "IsRead" BOOLEAN DEFAULT FALSE,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "PostId" INTEGER NULL,
    "CommentId" INTEGER NULL,
    "FriendRequestId" INTEGER NULL,
    "ReactorUserId" INTEGER NULL,
    "CommenterUserId" INTEGER NULL,
    "SharerUserId" INTEGER NULL,
    
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id"),
    FOREIGN KEY ("PostId") REFERENCES "Posts"("Id"),
    FOREIGN KEY ("CommentId") REFERENCES "Comments"("Id"),
    FOREIGN KEY ("FriendRequestId") REFERENCES "FriendRequests"("Id")
);
```

### NotificationPreferences Table
```sql
CREATE TABLE "NotificationPreferences" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL UNIQUE,
    "EmailNotifications" BOOLEAN DEFAULT TRUE,
    "PushNotifications" BOOLEAN DEFAULT TRUE,
    "ReactionNotifications" BOOLEAN DEFAULT TRUE,
    "CommentNotifications" BOOLEAN DEFAULT TRUE,
    "ShareNotifications" BOOLEAN DEFAULT TRUE,
    "FriendRequestNotifications" BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY ("UserId") REFERENCES "Users"("Id")
);
```

## API Endpoints

### Notification Endpoints

**GET** `/api/notification/user/{userId}?page=1&pageSize=20`
- Get paginated notifications for user
- Returns notifications with sender information

**POST** `/api/notification/mark-read/{notificationId}`
- Mark specific notification as read
- Requires user authentication

**POST** `/api/notification/mark-all-read/{userId}`
- Mark all notifications as read for user
- Requires user authentication

**GET** `/api/notification/unread-count/{userId}`
- Get unread notification count
- Used for badge updates

### SignalR Endpoints

**Hub URL**: `/notificationhub`

**Methods**:
- `JoinUserGroup(userId)` - Join user-specific group
- `LeaveUserGroup(userId)` - Leave user group

**Events**:
- `ReceiveNotification(notification)` - New notification received
- `UpdateUnreadCount(count)` - Unread count updated

## Configuration

### Backend Configuration (`Program.cs`)
```csharp
// Add SignalR
builder.Services.AddSignalR();

// Register services
builder.Services.AddScoped<INotificationService, NotificationService>();

// Configure hub
app.MapHub<NotificationHub>("/notificationhub");
```

### Frontend Configuration
```javascript
// Environment variables
VITE_API_URL=http://localhost:5000
VITE_SIGNALR_URL=http://localhost:5000/notificationhub
```

## Performance Considerations

### Database Optimization
- Indexes on UserId and CreatedAt for efficient queries
- Pagination to handle large notification lists
- Soft deletes for notification history

### SignalR Optimization
- User-specific groups to minimize bandwidth
- Connection pooling for better performance
- Graceful reconnection handling

### Frontend Optimization
- Debounced API calls for mark as read
- Virtual scrolling for large notification lists
- Optimistic updates for better UX

## Testing

### Unit Tests
- NotificationService methods
- SignalR hub functionality
- Frontend context actions

### Integration Tests
- End-to-end notification flow
- Real-time delivery testing
- Cross-browser compatibility

## Troubleshooting

### Common Issues

1. **Notifications not received in real-time**
   - Check SignalR connection status
   - Verify user is in correct group
   - Check network connectivity

2. **Unread count not updating**
   - Ensure `SendNotificationToUser` includes `notificationService` parameter
   - Check frontend event listeners
   - Verify database updates

3. **Missing notifications**
   - Check notification creation logic in controllers
   - Verify database constraints
   - Check user permissions

### Debug Tools
- Browser developer tools for SignalR connection
- Database query logs
- Backend logging for notification creation

## Future Enhancements

1. **Push Notifications**
   - Browser push notifications
   - Mobile app notifications
   - Email notifications

2. **Advanced Features**
   - Notification templates
   - Bulk operations
   - Notification scheduling

3. **Analytics**
   - Notification engagement metrics
   - User interaction tracking
   - Performance monitoring