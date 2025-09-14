import React, { useState, useEffect, useContext, useRef } from "react";
import { ChatContext } from "../../../context/ChatContext";
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
import CreateGroupPopup from "./CreateGroupPopup"; // Import the new component

const ChatLayout = () => {
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
  const [showCreateGroup, setShowCreateGroup] = useState(false); // New state for popup

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

  // Handle group creation
  const handleGroupCreated = (newGroup) => {
    // Add the new group to the groups list
    setGroups(prev => [...prev, newGroup]);
    // Optionally select the new group
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
      sendPrivateMessage(currentChat.toString(), message); // Ensure string conversion
    }
  
    // Update latest message optimistically
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
  
  // Helper function for success handling
  const handleSendSuccess = (responseData) => {
    const newMessage = {
      id: responseData.id || Date.now(),
      senderId: currentUserId,
      msg: message,
      sentAt: new Date().toISOString()
    };
    
    setChatLog(prev => [...prev, newMessage]);
    setMessage("");
    setTimeout(scrollToBottom, 50);
    setConnectionError("");
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

  return (
    <div className="flex h-screen bg-base-100">
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
        onCreateGroup={() => setShowCreateGroup(true)} // Pass function to show popup
      />
      
      {/* Main chat area on the right */}
      <div className="flex-1 flex flex-col">
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
          onReactToMessage={reactToMessage}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
        />
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
    </div>
  );
}

export default ChatLayout;