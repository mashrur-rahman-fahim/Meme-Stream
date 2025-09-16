import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../utils/axios";
import { ChatContext } from "../../context/ChatContext";
import ChatNotificationItem from "./ChatNotificationItem";

const ChatSidebarDTO = () => {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const token = localStorage.getItem("token");
  
  const { 
    notifications, 
    removeNotification, 
    clearAllNotifications, 
    unreadMap, 
    latestMessages 
  } = useContext(ChatContext);

  const totalUnread = Object.values(unreadMap).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch friends
        const friendsRes = await api.get("/friendrequest/get/friends");
        
        const formattedFriends = friendsRes.data.map(friend => ({
          id: friend.friendId || friend.FriendId,
          name: friend.friendName || friend.FriendName
        }));
        setFriends(formattedFriends);
        
        // Fetch groups
        const groupsRes = await api.get("/chat/my-groups");
        setGroups(groupsRes.data);
        
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // Helper to format message preview
  const formatMessagePreview = (content) => {
    if (!content) return "";
    return content.length > 20 ? content.substring(0, 20) + "..." : content;
  };

  if (loading) {
    return (
      <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Chats</h2>
          <div className="w-10 h-10"></div>
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
          <div className="w-10 h-10"></div>
        </div>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Chats</h2>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle btn-sm relative">
            <div className="indicator">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {totalUnread > 0 && (
                <span className="badge badge-xs badge-primary indicator-item">
                  {totalUnread}
                </span>
              )}
            </div>
          </label>
          <div tabIndex={0} className="mt-3 z-50 card card-compact dropdown-content w-80 bg-base-100 shadow">
            <div className="card-body">
              <div className="flex justify-between items-center mb-2">
                <h3 className="card-title text-sm">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y divide-base-200">
                    {notifications.map((notification) => (
                      <ChatNotificationItem
                        key={notification.id}
                        notification={notification}
                        onClose={() => removeNotification(notification.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex-1">
        <h3 className="text-sm font-semibold mb-2">Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-500">No friends yet</p>
        ) : (
          friends.map((friend) => {
            const unreadCount = unreadMap[friend.id] || 0;
            const latestMessage = latestMessages[friend.id];
            
            return (
              <Link
                key={friend.id}
                to={`/chat/private/${friend.id}`}
                className="block p-2 rounded hover:bg-base-300 mb-2 w-full text-left transition-colors relative group"
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
                    
                    {/* Show message preview ONLY if there are unread messages */}
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
              </Link>
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
              <Link
                key={group.id}
                to={`/chat/group/${group.id}`}
                className="block p-2 rounded hover:bg-base-300 mb-2 w-full text-left transition-colors relative group"
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
                        {/* Show message preview ONLY if there are unread messages */}
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
              </Link>
            );
          })
        )}
      </div>

      <Link 
        to="/groups/create" 
        className="btn btn-primary btn-sm w-full mb-4"
      >
        + Create Group
      </Link>
    </div>
  );
};

export default ChatSidebarDTO;