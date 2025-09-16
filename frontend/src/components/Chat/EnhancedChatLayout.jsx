import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { ChatContext } from "../../../context/ChatContext";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import globalSignalRManager from "../../services/GlobalSignalRManager";
import globalNotificationManager from "../../services/GlobalNotificationManager";
import GroupManagementSidebar from "./GroupManagementSidebar";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import CreateGroupPopup from "./CreateGroupPopup";

// Connection status component
const ConnectionStatus = ({ connectionState, isConnected, metrics }) => {
  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    return connectionState === 'CONNECTED' ? 'text-green-500' : 'text-yellow-500';
  };

  const getStatusIcon = () => {
    if (!isConnected) return '🔴';
    return connectionState === 'CONNECTED' ? '🟢' : '🟡';
  };

  return (
    <div className={`flex items-center space-x-2 text-xs ${getStatusColor()}`}>
      <span>{getStatusIcon()}</span>
      <span>{connectionState}</span>
      {metrics && (
        <span className="text-gray-500">
          ({metrics.messagesSent || 0}↑ {metrics.messagesReceived || 0}↓)
        </span>
      )}
    </div>
  );
};

const EnhancedChatLayout = () => {
  // Basic state
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
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Enhanced connection state
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [connectionMetrics, setConnectionMetrics] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Notification state
  const [notificationState, setNotificationState] = useState('DISCONNECTED');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  // Refs
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const userIdRef = useRef(currentUserId);
  const isInitializedRef = useRef(false);
  const eventHandlerIds = useRef([]);

  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  // Initialize enhanced WebSocket connections
  useEffect(() => {
    const initializeConnections = async () => {
      if (!token || isInitializedRef.current) return;

      console.log('🚀 EnhancedChatLayout: Initializing connections...');
      setIsInitializing(true);

      try {
        // Setup connection state handlers
        const chatStateHandlerId = globalSignalRManager.addConnectionStateHandler((state, data) => {
          console.log('🔄 Chat connection state:', state, data);
          setConnectionState(state);
          setIsConnected(state === 'CONNECTED');

          if (state === 'CONNECTED') {
            setConnectionError("");
            // Get connection metrics
            const status = globalSignalRManager.getStatus();
            setConnectionMetrics(status.metrics);
          } else if (state === 'FAILED') {
            setConnectionError(data?.error?.message || 'Connection failed');
          }
        });

        const notificationStateUnsubscribe = globalNotificationManager.onStateChange((state, status) => {
          console.log('🔔 Notification state:', state, status);
          setNotificationState(state);
          if (status) {
            setUnreadNotifications(status.unreadCount);
          }
        });

        // Setup message event handlers
        const messageHandlerId = globalSignalRManager.addEventListener('ReceiveMessage',
          (senderId, msg, messageId, sentAt, senderName) => {
            console.log('📨 Received private message:', { senderId, msg, messageId, sentAt });

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
              currentChat?.toString() || senderId,
              msg,
              senderName || `User ${senderId}`,
              sentAt
            );

            if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
              setTimeout(scrollToBottom, 100);
            }

            // Play sound or show notification if not current chat
            if (currentChat?.toString() !== senderId) {
              incrementUnread(senderId);
              addNotification({
                type: 'private',
                senderId,
                senderName: senderName || `User ${senderId}`,
                message: msg,
                timestamp: new Date(sentAt),
                chatKey: senderId
              });
            }
          }
        );

        const groupMessageHandlerId = globalSignalRManager.addEventListener('ReceiveGroupMessage',
          (senderId, msg, messageId, sentAt, senderName, groupId) => {
            console.log('📨 Received group message:', { senderId, msg, messageId, sentAt, groupId });

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

            const chatKey = `group-${groupId || currentChat}`;
            updateLatestMessage(
              chatKey,
              msg,
              senderName || `User ${senderId}`,
              sentAt
            );

            if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
              setTimeout(scrollToBottom, 100);
            }

            // Notification for groups not currently viewed
            if (currentChat?.toString() !== groupId?.toString()) {
              incrementUnread(chatKey);
              addNotification({
                type: 'group',
                senderId,
                senderName: senderName || `User ${senderId}`,
                message: msg,
                groupId: groupId,
                timestamp: new Date(sentAt),
                chatKey: chatKey
              });
            }
          }
        );

        const typingHandlerId = globalSignalRManager.addEventListener('ReceiveTypingStatus',
          (senderId, isTyping) => {
            console.log('⌨️ Typing status:', { senderId, isTyping });
            if (senderId !== userIdRef.current) {
              setOtherTyping(isTyping);
            }
          }
        );

        const reactionHandlerId = globalSignalRManager.addEventListener('ReceiveReaction',
          (reactionData) => {
            console.log('👍 Received reaction:', reactionData);

            setReactions(prev => {
              const newReactions = { ...prev };
              const messageId = reactionData.MessageId;

              if (reactionData.Status === "removed") {
                if (newReactions[messageId]) {
                  newReactions[messageId] = newReactions[messageId].filter(
                    r => !(r.reactorId === reactionData.ReactorId && r.emoji === reactionData.Emoji)
                  );

                  if (newReactions[messageId].length === 0) {
                    delete newReactions[messageId];
                  }
                }
              } else {
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
          }
        );

        // Store handler IDs for cleanup
        eventHandlerIds.current = [
          messageHandlerId,
          groupMessageHandlerId,
          typingHandlerId,
          reactionHandlerId,
          chatStateHandlerId
        ];

        // Initialize connections with pre-warming
        console.log('🔌 Initializing chat connection...');
        await globalSignalRManager.initialize(token, {
          preWarm: true,
          enableCircuitBreaker: true,
          enableHealthMonitoring: true,
          enableMessageQueuing: true
        });

        console.log('🔔 Initializing notification connection...');
        await globalNotificationManager.connect(token);

        console.log('✅ Connections initialized successfully');
        isInitializedRef.current = true;

        // Cleanup function
        return () => {
          console.log('🧹 Cleaning up connections...');

          // Remove event handlers
          eventHandlerIds.current.forEach(id => {
            if (typeof id === 'function') {
              id(); // Unsubscribe function
            } else {
              globalSignalRManager.removeEventListener('ReceiveMessage', id);
              globalSignalRManager.removeEventListener('ReceiveGroupMessage', id);
              globalSignalRManager.removeEventListener('ReceiveTypingStatus', id);
              globalSignalRManager.removeEventListener('ReceiveReaction', id);
            }
          });

          if (notificationStateUnsubscribe) {
            notificationStateUnsubscribe();
          }
        };

      } catch (error) {
        console.error('❌ Connection initialization failed:', error);
        setConnectionError(error.message);
        setConnectionState('FAILED');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeConnections();

    // Cleanup on unmount
    return () => {
      if (isInitializedRef.current) {
        console.log('🔌 Disconnecting on unmount...');
        globalSignalRManager.disconnect().catch(console.error);
        globalNotificationManager.disconnect().catch(console.error);
      }
    };
  }, [token]);

  // Fetch current user ID with enhanced error handling
  useEffect(() => {
    const getCurrentUserId = async () => {
      if (!token) return;

      try {
        const response = await axios.get("http://localhost:5216/api/User/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userId = response.data.id || response.data.userId;
        if (userId) {
          setCurrentUserId(userId);
          console.log('👤 Current user ID:', userId);
        } else {
          throw new Error("User ID not found in profile response");
        }
      } catch (error) {
        console.error("❌ Failed to fetch user from API, trying token decode:", error);

        try {
          if (token) {
            const decoded = jwtDecode(token);
            const userId =
              decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
              decoded.nameid ||
              decoded.sub;

            if (userId) {
              console.log("✅ Got user ID from token:", userId);
              setCurrentUserId(parseInt(userId));
            }
          }
        } catch (decodeError) {
          console.error("❌ Failed to decode token:", decodeError);
          setConnectionError("Authentication failed");
        }
      }
    };

    getCurrentUserId();
  }, [token]);

  // Fetch sidebar data with error handling
  useEffect(() => {
    const fetchSidebarData = async () => {
      if (!token) return;

      try {
        setSidebarLoading(true);
        setSidebarError("");

        const [friendsRes, groupsRes] = await Promise.all([
          axios.get("http://localhost:5216/api/friendrequest/get/friends", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5216/api/chat/my-groups", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        const formattedFriends = friendsRes.data.map(friend => ({
          id: friend.friendId || friend.FriendId,
          name: friend.friendName || friend.FriendName
        }));

        setFriends(formattedFriends);
        setGroups(groupsRes.data);

        console.log(`✅ Loaded ${formattedFriends.length} friends and ${groupsRes.data.length} groups`);

      } catch (err) {
        console.error("❌ Error fetching chat data:", err);
        setSidebarError("Failed to load chat data");
      } finally {
        setSidebarLoading(false);
      }
    };

    fetchSidebarData();
  }, [token]);

  // Enhanced message history fetching
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentChat || !currentUserId || !isConnected) return;

      try {
        console.log(`📚 Fetching history for ${chatType} chat ${currentChat}`);

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

        console.log(`✅ Loaded ${history.length} messages`);

      } catch (err) {
        console.error("❌ Error fetching message history:", err);
        setConnectionError("Failed to load message history");
      }
    };

    fetchHistory();
  }, [currentChat, currentUserId, chatType, isConnected, token]);

  // Enhanced message handlers
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !isConnected) return;

    const messageContent = message.trim();
    setMessage(""); // Clear input immediately for better UX

    try {
      if (chatType === "private") {
        await globalSignalRManager.sendPrivateMessage(currentChat.toString(), messageContent);
      } else if (chatType === "group") {
        await globalSignalRManager.sendGroupMessage(`group-${currentChat}`, messageContent);
      }

      console.log(`✅ Message sent via ${chatType} chat`);

    } catch (error) {
      console.error("❌ Failed to send message:", error);
      setMessage(messageContent); // Restore message on failure
      setConnectionError("Failed to send message: " + error.message);

      // Show user-friendly error
      alert("Failed to send message. Please check your connection and try again.");
    }
  }, [message, isConnected, chatType, currentChat]);

  const handleReactToMessage = useCallback(async (messageId, emoji) => {
    if (!isConnected) {
      alert("Cannot react: connection not available");
      return;
    }

    try {
      await globalSignalRManager.reactToMessage(messageId, emoji);
      console.log(`✅ Reaction sent: ${emoji} to message ${messageId}`);
    } catch (error) {
      console.error("❌ Reaction failed:", error);
      alert("Failed to react to message");
    }
  }, [isConnected]);

  const handleTypingStatus = useCallback(async (isTyping) => {
    if (!isConnected || chatType !== "private") return;

    try {
      await globalSignalRManager.sendTypingStatus(parseInt(currentChat), isTyping);
    } catch (error) {
      console.error("❌ Typing status failed:", error);
    }
  }, [isConnected, chatType, currentChat]);

  // Utility functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isScrolledToBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  const fetchReactionsForMessage = async (messageId) => {
    try {
      const response = await axios.get(`http://localhost:5216/api/MessageReacton/${messageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        setReactions(prev => ({
          ...prev,
          [messageId]: response.data
        }));
      }
    } catch (error) {
      console.error('❌ Failed to fetch reactions:', error);
    }
  };

  // Chat selection handler
  const handleChatSelect = (chatId, type, name) => {
    console.log("💬 Chat selected:", chatId, type, name);
    setCurrentChat(chatId);
    setChatType(type);
    setChatName(name);

    const chatKey = type === "group" ? `group-${chatId}` : chatId;
    clearUnread(chatKey);

    setShowGroupManagement(false);
    setConnectionError("");
  };

  // Connection retry handler
  const handleRetryConnection = async () => {
    if (isInitializing) return;

    console.log("🔄 Retrying connection...");
    setConnectionError("");
    setIsInitializing(true);

    try {
      await globalSignalRManager.connect(token);
      await globalNotificationManager.connect(token);
    } catch (error) {
      console.error("❌ Retry failed:", error);
      setConnectionError("Retry failed: " + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  // Debug connection status
  const handleShowConnectionDebug = () => {
    const chatStatus = globalSignalRManager.getStatus();
    const notificationStatus = globalNotificationManager.getStatus();

    console.log("🔍 Connection Debug Info:", {
      chat: chatStatus,
      notifications: notificationStatus
    });

    alert(`Connection Debug:\n\nChat: ${chatStatus.connectionState}\nNotifications: ${notificationStatus.state}\n\nCheck console for full details.`);
  };

  // Render loading state
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Initializing Enhanced Chat...</h2>
          <p className="text-gray-500 mt-2">Setting up secure connections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Enhanced Connection Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-800">Enhanced MemeStream Chat</h1>
            <ConnectionStatus
              connectionState={connectionState}
              isConnected={isConnected}
              metrics={connectionMetrics}
            />
          </div>

          <div className="flex items-center space-x-2">
            {/* Notification status */}
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <span>🔔</span>
              <span>{notificationState}</span>
              {unreadNotifications > 0 && (
                <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                  {unreadNotifications}
                </span>
              )}
            </div>

            {/* Action buttons */}
            {!isConnected && (
              <button
                onClick={handleRetryConnection}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                disabled={isInitializing}
              >
                {isInitializing ? "Connecting..." : "Retry"}
              </button>
            )}

            <button
              onClick={handleShowConnectionDebug}
              className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
              title="Debug Info"
            >
              🔍
            </button>
          </div>
        </div>

        {/* Error banner */}
        {connectionError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3">
            <div className="flex items-center">
              <span className="text-red-700 text-sm font-medium">Connection Error:</span>
              <span className="text-red-600 text-sm ml-2">{connectionError}</span>
              <button
                onClick={() => setConnectionError("")}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main chat area with top padding for status bar */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="w-1/4 bg-white shadow-lg">
          <ChatSidebar
            friends={friends}
            groups={groups}
            loading={sidebarLoading}
            error={sidebarError}
            onChatSelect={handleChatSelect}
            currentChat={currentChat}
            chatType={chatType}
            onCreateGroup={() => setShowCreateGroup(true)}
            unreadMap={unreadMap}
            latestMessages={latestMessages}
          />
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              <ChatWindow
                currentChat={currentChat}
                chatType={chatType}
                chatName={chatName}
                chatLog={chatLog}
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
                onReactToMessage={handleReactToMessage}
                onTypingStatus={handleTypingStatus}
                otherTyping={otherTyping}
                reactions={reactions}
                readMap={readMap}
                currentUserId={currentUserId}
                messagesEndRef={messagesEndRef}
                chatContainerRef={chatContainerRef}
                isConnected={isConnected}
                onToggleGroupManagement={() => setShowGroupManagement(!showGroupManagement)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-600 mb-2">
                  Enhanced MemeStream Chat
                </h2>
                <p className="text-gray-500">Select a friend or group to start chatting</p>
                <div className="mt-4 text-sm text-gray-400">
                  Connection: {isConnected ? "🟢 Ready" : "🔴 Not Ready"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group management sidebar */}
        {showGroupManagement && (
          <div className="w-1/4">
            <GroupManagementSidebar
              group={selectedGroup}
              onClose={() => setShowGroupManagement(false)}
              onGroupUpdate={() => {
                // Refresh groups
                // handleGroupUpdate();
              }}
            />
          </div>
        )}
      </div>

      {/* Create group popup */}
      {showCreateGroup && (
        <CreateGroupPopup
          friends={friends}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(newGroup) => {
            setGroups(prev => [...prev, newGroup]);
            handleChatSelect(newGroup.id, 'group', newGroup.name);
            setShowCreateGroup(false);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedChatLayout;