import React, { useState, useEffect, useContext, useRef } from "react";
import { ChatContext } from "../../context/ChatContext";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  startSignalRConnection,
  sendPrivateMessage,
  sendGroupMessage,
  joinGroup,
  sendTypingStatus,
  reactToMessage,
  editMessage,
  deleteMessage,
  markMessageAsRead,
} from "../services/signalRService";
import GroupManagementSidebar from "./GroupManagementSidebar";

const ChatLayoutDTO = () => {
  // State for sidebar
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState("");
  
  // State for chat window
  const [currentChat, setCurrentChat] = useState(null);
  const [chatType, setChatType] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatName, setChatName] = useState("");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactions, setReactions] = useState({});
  const [readMap, setReadMap] = useState({});
  
  // State for group management sidebar
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Connection state
  const [connection, setConnection] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  
  const token = localStorage.getItem("token");
  const { 
    notifications, 
    removeNotification, 
    clearAllNotifications, 
    unreadMap, 
    latestMessages,
    incrementUnread, 
    clearUnread, 
    addNotification, 
    updateLatestMessage 
  } = useContext(ChatContext);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const connectionRef = useRef(null);
  const userIdRef = useRef(currentUserId);
  
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  // Fetch current user ID
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const response = await axios.get("http://localhost:5216/api/User/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data.id) {
          setCurrentUserId(response.data.id);
        } else if (response.data.userId) {
          setCurrentUserId(response.data.userId);
        } else {
          throw new Error("User ID not found in profile response");
        }
      } catch (error) {
        console.error("Failed to fetch current user from API, trying to decode token:", error);
        
        try {
          if (token) {
            const decoded = jwtDecode(token);
            const userId = 
              decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
              decoded.nameid ||
              decoded.sub;
              
            if (userId) {
              console.log("Got user ID from token:", userId);
              setCurrentUserId(parseInt(userId));
            }
          }
        } catch (decodeError) {
          console.error("Failed to decode token:", decodeError);
        }
      }
    };

    if (token) {
      getCurrentUserId();
    }
  }, [token]);

  // Fetch friends and groups for sidebar
  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        setSidebarLoading(true);
        
        const friendsRes = await axios.get("http://localhost:5216/api/friendrequest/get/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const formattedFriends = friendsRes.data.map(friend => ({
          id: friend.friendId || friend.FriendId,
          name: friend.friendName || friend.FriendName
        }));
        setFriends(formattedFriends);
        
        const groupsRes = await axios.get("http://localhost:5216/api/chat/my-groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroups(groupsRes.data);
        
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setSidebarError("Failed to load chat data");
      } finally {
        setSidebarLoading(false);
      }
    };

    if (token) {
      fetchSidebarData();
    }
  }, [token]);

  // Handle chat selection from sidebar
  const handleChatSelect = (chatId, type, name) => {
    console.log("Chat selected:", chatId, type, name);
    setCurrentChat(chatId);
    setChatType(type);
    setChatName(name);
    
    const chatKey = type === "group" ? `group-${chatId}` : chatId;
    clearUnread(chatKey);
    
    setShowGroupManagement(false);
    setConnectionError("");
  };

  // Function to toggle group management sidebar
  const toggleGroupManagement = () => {
    if (chatType === 'group') {
      setSelectedGroup({
        id: currentChat,
        name: chatName
      });
      setShowGroupManagement(!showGroupManagement);
    }
  };
  
  // Function to handle group updates
  const handleGroupUpdate = () => {
    const fetchSidebarData = async () => {
      try {
        const groupsRes = await axios.get("http://localhost:5216/api/chat/my-groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroups(groupsRes.data);
      } catch (err) {
        console.error("Error refreshing groups:", err);
      }
    };
    
    if (token) {
      fetchSidebarData();
    }
  };

  // Chat window functionality
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isScrolledToBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  // Fetch message history and setup SignalR connection
  useEffect(() => {
    if (!currentChat || !currentUserId) return;
    
    const key = chatType === "private" ? currentChat : `group-${currentChat}`;

    const fetchHistory = async () => {
      try {
        const res = await axios.get(
          chatType === "group"
            ? `http://localhost:5216/api/GroupMessage/group/${currentChat}/messages`
            : `http://localhost:5216/api/PrivateMessage/private/${currentChat}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const history = res.data.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          msg: m.content,
          fileName: m.fileName,
          filePath: m.filePath,
          sentAt: m.sentAt,
          editedAt: m.editedAt,
          isDeleted: m.isDeleted,
        }));
        setChatLog(history);
      } catch (err) {
        console.error("Error fetching message history:", err);
      }
    };

    const initConnection = async () => {
      try {
        const conn = await startSignalRConnection(
          token,
          (senderId, msg, messageId, sentAt, senderName) => {
            const shouldAutoScroll = isScrolledToBottom();
            
            setChatLog((prev) => {
              const messageExists = prev.some(m => m.id === messageId);
              if (messageExists) return prev;
              
              return [
                ...prev,
                {
                  id: messageId,
                  senderId: parseInt(senderId),
                  msg,
                  sentAt: sentAt,
                },
              ];
            });

            updateLatestMessage(
              currentChat.toString(),
              msg,
              senderName || `User ${senderId}`,
              sentAt
            );

            if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
              setTimeout(scrollToBottom, 100);
            }
          },
          (senderId, msg, messageId, sentAt, senderName, groupId) => {
            const shouldAutoScroll = isScrolledToBottom();
            
            setChatLog((prev) => {
              const messageExists = prev.some(m => m.id === messageId);
              if (messageExists) return prev;
              
              return [
                ...prev,
                {
                  id: messageId,
                  senderId: parseInt(senderId),
                  msg,
                  sentAt: sentAt,
                },
              ];
            });

            updateLatestMessage(
              `group-${groupId || currentChat}`,
              msg,
              senderName || `User ${senderId}`,
              sentAt
            );

            if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
              setTimeout(scrollToBottom, 100);
            }
          },
          ({ type, senderId, message, senderName, groupId, timestamp }) => {
            const notifyKey = type === "private" ? senderId : `group-${groupId || currentChat}`;
            incrementUnread(notifyKey);
            
            addNotification({
              type,
              senderId,
              senderName: senderName || `User ${senderId}`,
              message: message,
              groupId: groupId,
              timestamp: timestamp || new Date(),
              chatKey: notifyKey
            });
          },
          (senderId, isTyping) => {
            if (senderId !== userIdRef.current) {
              setOtherTyping(isTyping);
            }
          }
        );

        connectionRef.current = conn;
        setConnection(conn);

        conn.on("ReceiveReaction", (messageId, userId, emoji) => {
          setReactions((prev) => {
            const existing = prev[messageId] || [];
            return {
              ...prev,
              [messageId]: [...existing, { userId, emoji }],
            };
          });
        });

        conn.on("ReceiveMessageEdit", (messageId, newContent, editedAt) => {
          setChatLog((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, msg: newContent, editedAt } : msg
            )
          );
        });

        conn.on("ReceiveMessageDelete", (messageId) => {
          setChatLog((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, msg: "[deleted]", isDeleted: true } : msg
            )
          );
        });

        conn.on("ReceiveReadReceipt", (messageId, userId) => {
          setReadMap((prev) => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), userId],
          }));
        });

        const waitUntilConnected = () =>
          new Promise((resolve) => {
            const check = () => {
              if (conn.state === "Connected") resolve();
              else setTimeout(check, 50);
            };
            check();
          });

        await waitUntilConnected();

        if (chatType === "group") {
          try {
            await joinGroup(`group-${currentChat}`);
          } catch (joinError) {
            console.error("Failed to join group:", joinError);
            setConnectionError("Group connection limited. You can view messages but may not be able to send.");
          }
        }

        clearUnread(key);
        setConnectionError("");
      } catch (error) {
        console.error("Failed to initialize SignalR connection:", error);
        setConnectionError("Failed to establish real-time connection. Some features may not work.");
      }
    };

    fetchHistory();
    initConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.off("ReceiveReaction");
        connectionRef.current.off("ReceiveMessageEdit");
        connectionRef.current.off("ReceiveMessageDelete");
        connectionRef.current.off("ReceiveReadReceipt");
        connectionRef.current = null;
        setConnection(null);
      }
    };
  }, [token, currentChat, chatType, currentUserId]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [chatLog]);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (chatType === "private") {
      sendTypingStatus(currentChat, true);
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        sendTypingStatus(currentChat, false);
      }, 1000);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      if (chatType === "group") {
        await sendGroupMessage(`group-${currentChat}`, message);
      } else {
        await sendPrivateMessage(currentChat, message);
      }

      const chatKey = chatType === "group" ? `group-${currentChat}` : currentChat.toString();
      updateLatestMessage(chatKey, message, "You", new Date());

      setMessage("");
      if (chatType === "private") sendTypingStatus(currentChat, false);
      
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error("Failed to send message:", error);
      setConnectionError("Failed to send message. Please try again.");
      
      try {
        if (chatType === "group") {
          await axios.post(
            `http://localhost:5216/api/GroupMessage/send`,
            { groupId: currentChat, content: message },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          await axios.post(
            `http://localhost:5216/api/PrivateMessage/send`,
            { receiverId: currentChat, content: message },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        const newMessage = {
          id: Date.now(),
          senderId: currentUserId,
          msg: message,
          sentAt: new Date().toISOString()
        };
        
        setChatLog(prev => [...prev, newMessage]);
        setMessage("");
        setTimeout(scrollToBottom, 50);
        
      } catch (apiError) {
        console.error("Fallback API send also failed:", apiError);
        setConnectionError("Failed to send message through all methods.");
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (chatType === "private") formData.append("receiverId", currentChat);
    if (chatType === "group") formData.append("groupId", currentChat);

    try {
      const res = await axios.post("http://localhost:5216/api/FileUpload/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setChatLog((prev) => [
        ...prev,
        {
          id: res.data.id,
          senderId: res.data.senderId,
          fileName: res.data.fileName,
          filePath: res.data.filePath,
          sentAt: res.data.sentAt,
        },
      ]);

      const chatKey = chatType === "group" ? `group-${currentChat}` : currentChat.toString();
      updateLatestMessage(chatKey, "📎 File", "You", new Date());

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  const formatMessagePreview = (content) => {
    if (!content) return "";
    return content.length > 20 ? content.substring(0, 20) + "..." : content;
  };

  const totalUnread = Object.values(unreadMap).reduce((sum, count) => sum + count, 0);

  // Continue to the return statement in the next message...
  // Render sidebar
const renderSidebar = () => {
    if (sidebarLoading) {
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
  
    if (sidebarError) {
      return (
        <div className="w-64 bg-base-200 p-4 border-r border-base-300 h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Chats</h2>
          </div>
          <div className="alert alert-error">
            <span>{sidebarError}</span>
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
                        <div key={notification.id} className="p-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{notification.senderName}</span>
                            <button onClick={() => removeNotification(notification.id)} className="text-xs">
                              ×
                            </button>
                          </div>
                          <p className="text-sm">{notification.message}</p>
                        </div>
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
                <div
                  key={friend.id}
                  onClick={() => handleChatSelect(friend.id, 'private', friend.name)}
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
                  onClick={() => handleChatSelect(group.id, 'group', group.name)}
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
  
        <button 
          onClick={() => window.location.href = "/groups/create"}
          className="btn btn-primary btn-sm w-full mb-4"
        >
          + Create Group
        </button>
      </div>
    );
  };
  
  // Render chat window
  const renderChatWindow = () => {
    if (!currentChat || !currentUserId) {
      return (
        <div className="flex-1 flex items-center justify-center bg-base-200">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Chat</h2>
            <p className="text-gray-500">
              Select a conversation from the sidebar to start chatting
            </p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="bg-base-200 p-4 border-b border-base-300 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{chatName}</h2>
            <p className="text-sm text-gray-500">
              {chatType === 'private' ? 'Private conversation' : 'Group chat'}
            </p>
          </div>
          {chatType === 'group' && (
            <button 
              onClick={toggleGroupManagement}
              className="btn btn-ghost btn-sm"
              title="Manage Group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Connection error banner */}
        {connectionError && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm">{connectionError}</p>
              <button onClick={() => setConnectionError("")} className="text-yellow-700 hover:text-yellow-900">
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Chat messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-base-100"
          style={{ scrollBehavior: "smooth" }}
        >
          {chatLog.map((entry, idx) => {
            const isSender = entry.senderId === userIdRef.current;
            
            return (
              <div key={entry.id || idx} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    isSender ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                  }`}
                >
                  {entry.msg && <div>{entry.msg}</div>}
  
                  {entry.filePath && (
                    <div className="mt-2">
                      <a
                        href={`http://localhost:5216/${entry.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        📎 {entry.fileName}
                      </a>
                    </div>
                  )}
  
                  <div className="text-xs text-right opacity-70 mt-1">
                    {new Date(entry.sentAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {entry.editedAt && !entry.isDeleted && (
                      <span className="ml-2 italic opacity-50">(edited)</span>
                    )}
                  </div>
  
                  {reactions[entry.id]?.length > 0 && (
                    <div className="flex gap-1 mt-1 text-sm">
                      {reactions[entry.id].map((r, i) => (
                        <span key={i}>{r.emoji}</span>
                      ))}
                    </div>
                  )}
  
                  {!entry.isDeleted && (
                    <div className="flex gap-2 mt-1">
                      {["👍", "😂", "❤️"].map((emoji) => (
                        <button
                          key={emoji}
                          className="text-xs"
                          onClick={() => reactToMessage(entry.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                      {isSender && (
                        <>
                          <button
                            className="text-xs text-yellow-300"
                            onClick={() => {
                              const newContent = prompt("Edit message:", entry.msg);
                              if (newContent) editMessage(entry.id, newContent);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-red-400"
                            onClick={() => deleteMessage(entry.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
  
                  {isSender && readMap[entry.id]?.length > 0 && (
                    <div className="text-xs text-right text-green-500 mt-1">
                      {chatType === "group" ? (
                        <span title={readMap[entry.id].join(", ")}>Seen by {readMap[entry.id].length}</span>
                      ) : (
                        readMap[entry.id].includes(parseInt(currentChat)) && "Seen"
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          <div ref={messagesEndRef} />
          
          {otherTyping && (
            <div className="text-xs text-gray-500 italic mt-1">Typing...</div>
          )}
        </div>
  
        {/* Message input */}
        <div className="p-4 bg-base-200 border-t border-base-300">
          <input
            type="file"
            onChange={handleFileUpload}
            className="file-input file-input-bordered w-full mb-2"
          />
  
          <div className="flex gap-2">
            <textarea
              className="textarea textarea-bordered flex-1"
              value={message}
              onChange={handleTyping}
              placeholder="Type your message..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
            />
            <button className="btn btn-primary" onClick={handleSend}>
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Main return statement
  return (
    <div className="flex h-screen bg-base-100">
      {/* Sidebar on the left */}
      {renderSidebar()}
      
      {/* Main chat area on the right */}
      <div className="flex-1 flex flex-col">
        {renderChatWindow()}
      </div>
      
      {/* Group Management Sidebar */}
      {showGroupManagement && (
        <GroupManagementSidebar
          group={selectedGroup}
          token={token}
          onClose={() => setShowGroupManagement(false)}
          onGroupUpdate={handleGroupUpdate}
        />
      )}
    </div>
  );
}
export default ChatLayoutDTO;
