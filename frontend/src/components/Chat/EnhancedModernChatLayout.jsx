import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
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

// Enhanced Modern Chat Components
import ModernChatSidebar from "./ModernChatSidebar";
import ModernChatWindow from "./ModernChatWindow";
import ModernGroupManagement from "./ModernGroupManagement";
import ModernCreateGroup from "./ModernCreateGroup";
import VoiceMessageRecorder from "./VoiceMessageRecorder";
import ChatThemeSelector from "./ChatThemeSelector";
import MessageSearchPanel from "./MessageSearchPanel";
import EmojiPicker from "./EmojiPicker";

const EnhancedModernChatLayout = () => {
  // Core state
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
  const [reactions, setReactions] = useState({});
  const [readMap, setReadMap] = useState({});
  const [connection, setConnection] = useState(null);
  const [connectionError, setConnectionError] = useState("");

  // Enhanced UI state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [chatTheme, setChatTheme] = useState('default');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Typing and presence
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userPresence, setUserPresence] = useState({});

  // Message features
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [messageThreads, setMessageThreads] = useState({});

  // Media and attachments
  const [mediaGallery, setMediaGallery] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [voiceMessages, setVoiceMessages] = useState([]);

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
  const typingTimeoutRef = useRef({});

  // Theme definitions
  const themes = {
    default: {
      name: 'Default',
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1F2937'
    },
    dark: {
      name: 'Dark Mode',
      primary: '#6366F1',
      secondary: '#059669',
      accent: '#D97706',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9'
    },
    ocean: {
      name: 'Ocean Blue',
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      accent: '#8B5CF6',
      background: '#F0F9FF',
      surface: '#E0F2FE',
      text: '#0C4A6E'
    },
    sunset: {
      name: 'Sunset',
      primary: '#F97316',
      secondary: '#EF4444',
      accent: '#EC4899',
      background: '#FFF7ED',
      surface: '#FFEDD5',
      text: '#9A3412'
    },
    forest: {
      name: 'Forest Green',
      primary: '#059669',
      secondary: '#65A30D',
      accent: '#CA8A04',
      background: '#F0FDF4',
      surface: '#DCFCE7',
      text: '#14532D'
    }
  };

  // Apply theme
  useEffect(() => {
    const theme = themes[chatTheme] || themes.default;
    const root = document.documentElement;

    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        root.style.setProperty(`--chat-${key}`, value);
      }
    });

    // Apply dark mode class
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [chatTheme, isDarkMode]);

  // Enhanced typing status handler
  const handleTypingStart = useCallback((userId, userName) => {
    setTypingUsers(prev => ({
      ...prev,
      [userId]: { name: userName, timestamp: Date.now() }
    }));

    // Clear existing timeout
    if (typingTimeoutRef.current[userId]) {
      clearTimeout(typingTimeoutRef.current[userId]);
    }

    // Set new timeout
    typingTimeoutRef.current[userId] = setTimeout(() => {
      setTypingUsers(prev => {
        const newTyping = { ...prev };
        delete newTyping[userId];
        return newTyping;
      });
      delete typingTimeoutRef.current[userId];
    }, 3000);
  }, []);

  const handleTypingStop = useCallback((userId) => {
    setTypingUsers(prev => {
      const newTyping = { ...prev };
      delete newTyping[userId];
      return newTyping;
    });

    if (typingTimeoutRef.current[userId]) {
      clearTimeout(typingTimeoutRef.current[userId]);
      delete typingTimeoutRef.current[userId];
    }
  }, []);

  // Enhanced presence management
  const updateUserPresence = useCallback((userId, status, lastSeen = null) => {
    setUserPresence(prev => ({
      ...prev,
      [userId]: {
        status, // online, away, busy, offline
        lastSeen: lastSeen || Date.now(),
        timestamp: Date.now()
      }
    }));

    if (status === 'online') {
      setOnlineUsers(prev => new Set([...prev, userId]));
    } else {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, []);

  // Voice message handler
  const handleVoiceMessage = async (audioBlob, duration) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('duration', duration.toString());

      if (chatType === "private") {
        formData.append("receiverId", currentChat);
      } else {
        formData.append("groupId", currentChat);
      }

      const response = await axios.post("http://localhost:5216/api/VoiceMessage/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      const voiceMessage = {
        id: response.data.id,
        senderId: currentUserId,
        type: 'voice',
        audioUrl: response.data.audioUrl,
        duration: duration,
        sentAt: new Date(),
        waveform: response.data.waveform || []
      };

      setChatLog(prev => [...prev, voiceMessage]);
      setVoiceMessages(prev => [...prev, voiceMessage]);

      const chatKey = chatType === "group" ? `group-${currentChat}` : currentChat.toString();
      updateLatestMessage(chatKey, "🎤 Voice message", "You", new Date());

    } catch (error) {
      console.error("Voice message upload failed:", error);
      alert("Failed to send voice message");
    }
  };

  // Message search functionality
  const searchMessages = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const endpoint = chatType === "group"
        ? `http://localhost:5216/api/GroupMessage/search/${currentChat}`
        : `http://localhost:5216/api/PrivateMessage/search/${currentChat}`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { query: query.trim() }
      });

      setSearchResults(response.data.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.senderName,
        sentAt: msg.sentAt,
        relevanceScore: msg.relevanceScore
      })));
    } catch (error) {
      console.error("Message search failed:", error);
      setSearchResults([]);
    }
  };

  // Enhanced message reactions with animations
  const handleEnhancedReaction = async (messageId, emoji, animation = true) => {
    try {
      await reactToMessage(messageId, emoji);

      if (animation) {
        // Add reaction animation
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.classList.add('reaction-animate');
          setTimeout(() => {
            messageElement.classList.remove('reaction-animate');
          }, 600);
        }
      }
    } catch (error) {
      console.error("Enhanced reaction failed:", error);
    }
  };

  // Message threading/replies
  const handleReplyToMessage = (message) => {
    setReplyingTo({
      id: message.id,
      content: message.msg || message.content,
      senderName: message.senderName || `User ${message.senderId}`,
      sentAt: message.sentAt
    });
  };

  const handleSendReply = () => {
    if (!message.trim() || !replyingTo) return;

    const replyMessage = {
      content: message.trim(),
      replyTo: replyingTo.id,
      type: 'reply'
    };

    if (chatType === "group") {
      sendGroupMessage(`group-${currentChat}`, message, replyMessage);
    } else {
      sendPrivateMessage(currentChat.toString(), message, replyMessage);
    }

    setMessage("");
    setReplyingTo(null);
  };

  // Pin/unpin messages
  const handlePinMessage = async (messageId) => {
    try {
      const response = await axios.post(
        `http://localhost:5216/api/Message/${messageId}/pin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.isPinned) {
        setPinnedMessages(prev => [...prev, messageId]);
      } else {
        setPinnedMessages(prev => prev.filter(id => id !== messageId));
      }
    } catch (error) {
      console.error("Pin message failed:", error);
    }
  };

  // Media gallery handler
  const handleMediaUpload = async (file, type = 'image') => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    if (chatType === "private") formData.append("receiverId", currentChat);
    if (chatType === "group") formData.append("groupId", currentChat);

    try {
      const response = await axios.post("http://localhost:5216/api/Media/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      const mediaMessage = {
        id: response.data.id,
        senderId: currentUserId,
        type: type,
        mediaUrl: response.data.mediaUrl,
        fileName: file.name,
        fileSize: file.size,
        sentAt: new Date(),
        thumbnail: response.data.thumbnail
      };

      setChatLog(prev => [...prev, mediaMessage]);
      setMediaGallery(prev => [...prev, mediaMessage]);

      const chatKey = chatType === "group" ? `group-${currentChat}` : currentChat.toString();
      updateLatestMessage(chatKey, type === 'image' ? "📷 Image" : "📹 Video", "You", new Date());

    } catch (error) {
      console.error("Media upload failed:", error);
    }
  };

  // Initialize user data and connection
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
        console.error("Failed to fetch current user from API:", error);

        try {
          if (token) {
            const decoded = jwtDecode(token);
            const userId =
              decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
              decoded.nameid ||
              decoded.sub;

            if (userId) {
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

  // Enhanced scroll behavior
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
      block: "end"
    });
  };

  // Auto-scroll logic
  const isScrolledToBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  return (
    <div className={`enhanced-chat-layout ${isDarkMode ? 'dark' : ''} ${chatTheme}`}>
      <style jsx>{`
        .enhanced-chat-layout {
          display: flex;
          height: 100vh;
          background: var(--chat-background);
          color: var(--chat-text);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .enhanced-chat-layout.dark {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
        }

        .reaction-animate {
          animation: reactionPulse 0.6s ease-out;
        }

        @keyframes reactionPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
          100% { transform: scale(1); }
        }

        .sidebar-transition {
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .chat-window-transition {
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .floating-panel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--chat-surface);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1000;
          animation: panelSlideIn 0.3s ease-out;
        }

        @keyframes panelSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -60%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(var(--chat-primary), 0.1);
          border-radius: 20px;
          margin: 8px 0;
          animation: typingFadeIn 0.3s ease;
        }

        @keyframes typingFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .presence-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--chat-surface);
          position: absolute;
          bottom: 0;
          right: 0;
          animation: presencePulse 2s infinite;
        }

        .presence-indicator.online { background: #10B981; }
        .presence-indicator.away { background: #F59E0B; }
        .presence-indicator.busy { background: #EF4444; }
        .presence-indicator.offline { background: #6B7280; }

        @keyframes presencePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>

      {/* Enhanced Sidebar */}
      <div className={`sidebar-transition ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
        <ModernChatSidebar
          loading={sidebarLoading}
          error={sidebarError}
          friends={friends}
          groups={groups}
          unreadMap={unreadMap}
          latestMessages={latestMessages}
          notifications={notifications}
          onlineUsers={onlineUsers}
          userPresence={userPresence}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onChatSelect={(chatId, type, name) => {
            setCurrentChat(chatId);
            setChatType(type);
            setChatName(name);
            clearUnread(type === "group" ? `group-${chatId}` : chatId);
          }}
          onCreateGroup={() => setShowCreateGroup(true)}
          onSearchToggle={() => setShowSearch(!showSearch)}
          onThemeToggle={() => setShowThemeSelector(!showThemeSelector)}
          theme={chatTheme}
          isDark={isDarkMode}
        />
      </div>

      {/* Main Chat Window */}
      <div className={`flex-1 chat-window-transition ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
        <ModernChatWindow
          currentChat={currentChat}
          currentUserId={currentUserId}
          chatType={chatType}
          chatName={chatName}
          message={message}
          chatLog={chatLog}
          reactions={reactions}
          readMap={readMap}
          connectionError={connectionError}
          typingUsers={typingUsers}
          onlineUsers={onlineUsers}
          userPresence={userPresence}
          replyingTo={replyingTo}
          pinnedMessages={pinnedMessages}
          messagesEndRef={messagesEndRef}
          chatContainerRef={chatContainerRef}
          theme={chatTheme}
          isDark={isDarkMode}
          onMessageChange={setMessage}
          onSend={replyingTo ? handleSendReply : () => {
            if (chatType === "group") {
              sendGroupMessage(`group-${currentChat}`, message);
            } else {
              sendPrivateMessage(currentChat.toString(), message);
            }
            setMessage("");
          }}
          onFileUpload={handleMediaUpload}
          onVoiceMessage={handleVoiceMessage}
          onReaction={handleEnhancedReaction}
          onReply={handleReplyToMessage}
          onPin={handlePinMessage}
          onEdit={editMessage}
          onDelete={deleteMessage}
          onEmojiToggle={() => setShowEmojiPicker(!showEmojiPicker)}
          onVoiceToggle={() => setShowVoiceRecorder(!showVoiceRecorder)}
          onGroupManage={() => {
            setSelectedGroup({ id: currentChat, name: chatName });
            setShowGroupManagement(true);
          }}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Floating Panels */}
      {showSearch && (
        <div className="floating-panel">
          <MessageSearchPanel
            searchQuery={searchQuery}
            searchResults={searchResults}
            onSearch={searchMessages}
            onClose={() => setShowSearch(false)}
            onResultClick={(messageId) => {
              // Scroll to message logic
              const messageElement = document.getElementById(`message-${messageId}`);
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElement.classList.add('highlight-message');
                setTimeout(() => messageElement.classList.remove('highlight-message'), 2000);
              }
            }}
          />
        </div>
      )}

      {showEmojiPicker && (
        <div className="floating-panel">
          <EmojiPicker
            onEmojiSelect={(emoji) => {
              setMessage(prev => prev + emoji);
              setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {showVoiceRecorder && (
        <div className="floating-panel">
          <VoiceMessageRecorder
            onRecordingComplete={handleVoiceMessage}
            onClose={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {showThemeSelector && (
        <div className="floating-panel">
          <ChatThemeSelector
            currentTheme={chatTheme}
            isDarkMode={isDarkMode}
            themes={themes}
            onThemeChange={setChatTheme}
            onDarkModeToggle={setIsDarkMode}
            onClose={() => setShowThemeSelector(false)}
          />
        </div>
      )}

      {showGroupManagement && selectedGroup && (
        <div className="floating-panel">
          <ModernGroupManagement
            group={selectedGroup}
            token={token}
            onClose={() => setShowGroupManagement(false)}
            onUpdate={() => {
              // Refresh groups logic
            }}
          />
        </div>
      )}

      {showCreateGroup && (
        <div className="floating-panel">
          <ModernCreateGroup
            token={token}
            friends={friends}
            onGroupCreated={(newGroup) => {
              setGroups(prev => [...prev, newGroup]);
              setShowCreateGroup(false);
              setCurrentChat(newGroup.id);
              setChatType('group');
              setChatName(newGroup.name);
            }}
            onClose={() => setShowCreateGroup(false)}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedModernChatLayout;