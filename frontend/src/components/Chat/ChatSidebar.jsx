import React, { useState } from "react";
import NotificationDropdown, { NotificationDropdownContent } from "./NotificationDropdown";

const ChatSidebar = ({
  loading,
  error,
  friends,
  groups,
  unreadMap,
  latestMessages,
  totalUnread,
  notifications,
  onChatSelect,
  onClearAllNotifications,
  onRemoveNotification,
  onCreateGroup
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const formatMessagePreview = (content) => {
    if (!content) return "";
    return content.length > 20 ? content.substring(0, 20) + "..." : content;
  };

  if (loading) {
    return (
      <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Chats</h2>
        </div>
        <div className="flex justify-center items-center h-32">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Chats</h2>
        </div>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Chats</h2>
          <div onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <NotificationDropdown
              totalUnread={totalUnread}
              notifications={notifications}
              onClearAllNotifications={onClearAllNotifications}
              onRemoveNotification={onRemoveNotification}
            />
          </div>
        </div>

        {/* Create Group Button */}
        <button 
          onClick={onCreateGroup}
          className="btn btn-primary btn-sm w-full mb-4"
        >
          + Create Group
        </button>

        <div className="mb-6 flex-1">
          <h3 className="text-sm font-semibold mb-2">Friends ({friends.length})</h3>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-500">No friends yet</p>
          ) : (
            friends.map((friend) => {
              const unreadCount = unreadMap[friend.id] || 0;
              const latestMessage = latestMessages[friend.id];
              
              return (
                <div
                  key={friend.id}
                  onClick={() => onChatSelect(friend.id, 'private', friend.name)}
                  className="block p-2 rounded hover:bg-base-300 mb-2 w-full text-left transition-colors relative group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-sm">{friend.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm truncate">{friend.name}</span>
                      </div>
                      
                      {unreadCount > 0 && latestMessage && (
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {formatMessagePreview(latestMessage.content)}
                        </p>
                      )}
                    </div>
                    
                    {unreadCount > 0 && (
                      <span className="badge badge-primary badge-sm ml-2">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Groups ({groups.length})</h3>
          {groups.length === 0 ? (
            <p className="text-sm text-gray-500">No groups yet</p>
          ) : (
            groups.map((group) => {
              const groupKey = `group-${group.id}`;
              const unreadCount = unreadMap[groupKey] || 0;
              const latestMessage = latestMessages[groupKey];
              
              return (
                <div
                  key={group.id}
                  onClick={() => onChatSelect(group.id, 'group', group.name)}
                  className="block p-2 rounded hover:bg-base-300 mb-2 w-full text-left transition-colors relative group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-secondary text-white rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-sm">{group.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm truncate">{group.name}</span>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          {unreadCount > 0 && latestMessage && (
                            <p className="text-xs text-gray-600 line-clamp-1">
                              {formatMessagePreview(latestMessage.content)}
                            </p>
                          )}
                          <span className="text-xs text-gray-500">
                            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {unreadCount > 0 && (
                          <span className="badge badge-primary badge-sm ml-2">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <NotificationDropdownContent
        notifications={notifications}
        onClearAllNotifications={onClearAllNotifications}
        onRemoveNotification={onRemoveNotification}
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
};

export default ChatSidebar;