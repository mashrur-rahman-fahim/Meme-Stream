import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../../context/create_verify_context";
import { ChatContext } from "../../../context/ChatContext";
import { Navbar } from "../Navbar";
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
} from "../../services/signalRService";
import GroupManagementSidebar from "./GroupManagementSidebar";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import CreateGroupPopup from "./CreateGroupPopup";
// Enhanced Components
import ChatMessageSearch from "./ChatMessageSearch";
import ChatStatusIndicator, { ConnectionStatusIndicator } from "./ChatStatusIndicator";
import ChatMediaGallery from "./ChatMediaGallery";
import ChatThemeSelector from "./ChatThemeSelector";
import MessageReply, { ReplyComposer } from "./MessageReply"; 

const ChatLayout = () => {
  const { isVerified, loading, logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [pageReady, setPageReady] = useState(false);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState("");
  const [currentChat, setCurrentChat] = useState(null);
  const [chatType, setChatType] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatName, setChatName] = useState("");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactions, setReactions] = useState({});
  const [readMap, setReadMap] = useState({});
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [connection, setConnection] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Enhanced chat features state
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [chatTheme, setChatTheme] = useState('default');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userPresence, setUserPresence] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); 

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

  // Route protection effect
  useEffect(() => {
    if (isVerified === false && !loading) {
      navigate("/auth");
    } else if (isVerified === true && !pageReady) {
      setTimeout(() => setPageReady(true), 100);
    }
  }, [isVerified, navigate, loading, pageReady]);
  
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

  // Handle group creation
  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [...prev, newGroup]);
    handleChatSelect(newGroup.id, 'group', newGroup.name);
  };

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

  // Function to fetch reactions for a message
  const fetchReactionsForMessage = async (messageId) => {
    try {
      const response = await axios.get(`http://localhost:5216/api/MessageReacton/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200) {
        const reactionsData = response.data;
        setReactions(prev => ({
          ...prev,
          [messageId]: reactionsData
        }));
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  // Reaction handling functions
  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await reactToMessage(messageId, emoji);
    } catch (error) {
      console.error("Reaction failed:", error);
      throw error;
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await editMessage(messageId, newContent);
    } catch (error) {
      console.error("Edit failed:", error);
      alert("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete message");
    }
  };

  // Enhanced feature handlers

  const handleReply = (message, replyText) => {
    if (replyText) {
      // Send reply with reference to original message
      const replyContent = `@${message.senderName || `User ${message.senderId}`}: ${replyText}`;
      if (chatType === "group") {
        sendGroupMessage(`group-${currentChat}`, replyContent);
      } else {
        sendPrivateMessage(currentChat.toString(), replyContent);
      }
    } else {
      // Just set reply mode
      setReplyingTo(message);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleScrollToMessage = (messageId, isThread = false) => {
    // Find message and scroll to it
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight message briefly
      messageElement.classList.add('highlight-message');
      setTimeout(() => {
        messageElement.classList.remove('highlight-message');
      }, 2000);
    }
  };

  const handleThemeChange = (newTheme) => {
    setChatTheme(newTheme);
    // Apply theme to document root
    document.documentElement.setAttribute('data-chat-theme', newTheme);
  };

  const handleDarkModeToggle = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark', !isDarkMode);
  };

  const handleMediaSelect = (media) => {
    // Handle media selection from gallery
    console.log('Media selected:', media);
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
        
        // Fetch reactions for each message
        history.forEach(message => {
          if (message.id) {
            fetchReactionsForMessage(message.id);
          }
        });
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

/*         // UPDATED: Proper reaction handling
        conn.on("ReceiveReaction", (reactionData) => {
          console.log("Received reaction update:", reactionData);
          
          setReactions(prev => {
            const newReactions = { ...prev };
            const messageId = reactionData.MessageId;
            
            if (reactionData.Status === "removed") {
              // Remove reaction
              if (newReactions[messageId]) {
                newReactions[messageId] = newReactions[messageId].filter(
                  r => !(r.reactorId === reactionData.ReactorId && r.emoji === reactionData.Emoji)
                );
              }
            } else {
              // Add or update reaction
              if (!newReactions[messageId]) {
                newReactions[messageId] = [];
              }
              
              // Remove existing reaction from this user
              newReactions[messageId] = newReactions[messageId].filter(
                r => r.reactorId !== reactionData.ReactorId
              );
              
              // Add new reaction
              if (reactionData.Status === "added" || reactionData.Status === "updated") {
                newReactions[messageId].push({
                  reactorId: reactionData.ReactorId,
                  emoji: reactionData.Emoji,
                  reactorName: `User ${reactionData.ReactorId}`
                });
              }
            }
            
            return newReactions;
          });
        }); */

        // Update the ReceiveReaction handler
conn.on("ReceiveReaction", (reactionData) => {
  console.log("Received reaction update:", reactionData);
  
  setReactions(prev => {
    const newReactions = { ...prev };
    const messageId = reactionData.MessageId;
    
    if (reactionData.Status === "removed") {
      // Remove reaction - filter out this user's reaction for this emoji
      if (newReactions[messageId]) {
        newReactions[messageId] = newReactions[messageId].filter(
          r => !(r.reactorId === reactionData.ReactorId && r.emoji === reactionData.Emoji)
        );
        
        // If no reactions left, remove the message entry entirely
        if (newReactions[messageId].length === 0) {
          delete newReactions[messageId];
        }
      }
    } else {
      // Add or update reaction
      if (!newReactions[messageId]) {
        newReactions[messageId] = [];
      }
      
      // Remove existing reaction from this user (for update case)
      newReactions[messageId] = newReactions[messageId].filter(
        r => r.reactorId !== reactionData.ReactorId
      );
      
      // Add new reaction
      if (reactionData.Status === "added" || reactionData.Status === "updated") {
        newReactions[messageId].push({
          reactorId: reactionData.ReactorId,
          emoji: reactionData.Emoji,
          reactorName: `User ${reactionData.ReactorId}`
        });
      }
    }
    
    return newReactions;
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

        // Enhanced SignalR handlers
        conn.on("ReceiveMediaMessage", (mediaData) => {
          const shouldAutoScroll = isScrolledToBottom();

          setChatLog((prev) => {
            const messageExists = prev.some(m => m.id === mediaData.messageId);
            if (messageExists) return prev;

            return [
              ...prev,
              {
                id: mediaData.messageId,
                senderId: mediaData.senderId,
                msg: `${mediaData.mediaType === 'image' ? '🖼️' : mediaData.mediaType === 'video' ? '🎥' : '📎'} ${mediaData.fileName}`,
                sentAt: mediaData.sentAt,
                isMediaMessage: true,
                mediaData: mediaData
              },
            ];
          });

          if (shouldAutoScroll || mediaData.senderId === userIdRef.current) {
            setTimeout(scrollToBottom, 100);
          }
        });

        conn.on("UserPresenceUpdate", (userId, isOnline, lastSeen) => {
          setUserPresence(prev => ({
            ...prev,
            [userId]: { isOnline, lastSeen }
          }));

          if (isOnline) {
            setOnlineUsers(prev => [...new Set([...prev, userId])]);
          } else {
            setOnlineUsers(prev => prev.filter(id => id !== userId));
          }
        });

        conn.on("ReceiveTypingStatus", (senderId, isTyping, senderName) => {
          if (senderId !== userIdRef.current) {
            setTypingUsers(prev => {
              if (isTyping) {
                const existing = prev.find(u => u.userId === senderId);
                if (existing) return prev;
                return [...prev, { userId: senderId, userName: senderName || `User ${senderId}` }];
              } else {
                return prev.filter(u => u.userId !== senderId);
              }
            });
          }
        });

        // Add connection state handlers for debugging
        conn.onclose((error) => {
          console.error("SignalR connection closed:", error);
          setConnectionError("Connection lost. Reconnecting...");
        });

        conn.onreconnecting((error) => {
          console.error("SignalR reconnecting:", error);
          setConnectionError("Reconnecting...");
        });

        conn.onreconnected((connectionId) => {
          console.log("SignalR reconnected:", connectionId);
          setConnectionError("");
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
        connectionRef.current.off("ReceiveMediaMessage");
        connectionRef.current.off("UserPresenceUpdate");
        connectionRef.current.off("ReceiveTypingStatus");
        connectionRef.current.off("onclose");
        connectionRef.current.off("onreconnecting");
        connectionRef.current.off("onreconnected");
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

  const handleSend = () => {
    if (!message.trim()) {
      console.log("Empty message, not sending");
      return;
    }
  
    console.log("Sending message:", {
      currentChat,
      chatType,
      message,
      currentUserId
    });
    
    if (chatType === "group") {
      sendGroupMessage(`group-${currentChat}`, message);
    } else {
      sendPrivateMessage(currentChat.toString(), message);
    }
  
    const chatKey = chatType === "group" ? `group-${currentChat}` : currentChat.toString();
    updateLatestMessage(
      chatKey,
      message,
      "You",
      new Date()
    );
  
    setMessage("");
    if (chatType === "private") sendTypingStatus(currentChat, false);
    
    setTimeout(scrollToBottom, 50);
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

  const totalUnread = Object.values(unreadMap).reduce((sum, count) => sum + count, 0);

  // Loading and verification checks
  if (loading || isVerified === null || (isVerified === true && !pageReady)) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVerified === false) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-base-200 animate-fadeIn ${isDarkMode ? 'dark' : ''}`} data-chat-theme={chatTheme}>
      <Navbar />

      <div className="pt-16 flex h-[calc(100vh-4rem)] bg-base-100">
      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator
        isConnected={connection?.state === 'Connected'}
        reconnecting={connection?.state === 'Reconnecting'}
        lastConnected={connection?.lastConnected}
      />

      {/* Sidebar on the left */}
      <ChatSidebar
        loading={sidebarLoading}
        error={sidebarError}
        friends={friends}
        groups={groups}
        unreadMap={unreadMap}
        latestMessages={latestMessages}
        totalUnread={totalUnread}
        notifications={notifications}
        onChatSelect={handleChatSelect}
        onClearAllNotifications={clearAllNotifications}
        onRemoveNotification={removeNotification}
        onCreateGroup={() => setShowCreateGroup(true)}
        // Enhanced props
        userPresence={userPresence}
        onlineUsers={onlineUsers}
      />

      {/* Main chat area on the right */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Chat Header */}
        {currentChat && (
          <div className="bg-base-200 p-4 border-b border-base-300 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{chatName}</h2>
              {chatType === 'private' && friends.find(f => f.id === currentChat) && (
                <ChatStatusIndicator
                  userId={currentChat}
                  isOnline={userPresence[currentChat]?.isOnline}
                  lastSeen={userPresence[currentChat]?.lastSeen}
                  typingUsers={typingUsers}
                  chatType={chatType}
                  size="medium"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMessageSearch(true)}
                className="btn btn-ghost btn-sm"
                title="Search Messages"
              >
                🔍
              </button>
              <button
                onClick={() => setShowMediaGallery(true)}
                className="btn btn-ghost btn-sm"
                title="Media Gallery"
              >
                🖼️
              </button>
              <button
                onClick={() => setShowThemeSelector(true)}
                className="btn btn-ghost btn-sm"
                title="Theme Settings"
              >
                🎨
              </button>
              {chatType === 'group' && (
                <button
                  onClick={toggleGroupManagement}
                  className="btn btn-ghost btn-sm"
                  title="Group Settings"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        )}

        <ChatWindow
          currentChat={currentChat}
          currentUserId={currentUserId}
          chatType={chatType}
          chatName={chatName}
          message={message}
          chatLog={chatLog}
          otherTyping={otherTyping}
          reactions={reactions}
          readMap={readMap}
          connectionError={connectionError}
          messagesEndRef={messagesEndRef}
          chatContainerRef={chatContainerRef}
          onToggleGroupManagement={toggleGroupManagement}
          onTyping={handleTyping}
          onSend={handleSend}
          onFileUpload={handleFileUpload}
          onReactToMessage={handleReactToMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onFetchReactions={fetchReactionsForMessage}
          // Enhanced props
          replyingTo={replyingTo}
          onReply={handleReply}
          onCancelReply={handleCancelReply}
          onScrollToMessage={handleScrollToMessage}
          typingUsers={typingUsers}
          userPresence={userPresence}
        />

        {/* Reply Composer */}
        {replyingTo && (
          <ReplyComposer
            replyingTo={replyingTo}
            onSend={(replyText) => handleReply(replyingTo, replyText)}
            onCancel={handleCancelReply}
            placeholder="Type your reply..."
          />
        )}
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
      
      {/* Create Group Popup */}
      {showCreateGroup && (
        <CreateGroupPopup
          token={token}
          onGroupCreated={handleGroupCreated}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {/* Enhanced Modal Components */}
      {showMessageSearch && (
        <ChatMessageSearch
          chatId={currentChat}
          isGroup={chatType === 'group'}
          onMessageSelect={handleScrollToMessage}
          onClose={() => setShowMessageSearch(false)}
        />
      )}

      {showMediaGallery && (
        <ChatMediaGallery
          chatId={currentChat}
          isGroup={chatType === 'group'}
          onMediaSelect={handleMediaSelect}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

      {showThemeSelector && (
        <ChatThemeSelector
          currentTheme={chatTheme}
          isDarkMode={isDarkMode}
          onThemeChange={handleThemeChange}
          onDarkModeToggle={handleDarkModeToggle}
          onClose={() => setShowThemeSelector(false)}
        />
      )}

      </div>
    </div>
  );
}

export default ChatLayout;