import React, { useState, useEffect, useRef } from "react";
import ModernMessageList from "./ModernMessageList";
import ModernMessageInput from "./ModernMessageInput";

const ModernChatWindow = ({
  currentChat,
  currentUserId,
  chatType,
  chatName,
  message,
  chatLog,
  reactions,
  readMap,
  connectionError,
  typingUsers,
  onlineUsers,
  userPresence,
  replyingTo,
  pinnedMessages,
  messagesEndRef,
  chatContainerRef,
  theme,
  isDark,
  onMessageChange,
  onSend,
  onFileUpload,
  onVoiceMessage,
  onReaction,
  onReply,
  onPin,
  onEdit,
  onDelete,
  onEmojiToggle,
  onVoiceToggle,
  onGroupManage,
  onCancelReply
}) => {
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);

  const recordingIntervalRef = useRef(null);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypingText = () => {
    const typingUsersList = Object.entries(typingUsers)
      .filter(([userId]) => parseInt(userId) !== currentUserId)
      .map(([_, userData]) => userData.name);

    if (typingUsersList.length === 0) return null;
    if (typingUsersList.length === 1) return `${typingUsersList[0]} is typing...`;
    if (typingUsersList.length === 2) return `${typingUsersList[0]} and ${typingUsersList[1]} are typing...`;
    return `${typingUsersList[0]} and ${typingUsersList.length - 1} others are typing...`;
  };

  const getOnlineCount = () => {
    return onlineUsers.size;
  };

  const getPinnedMessagesCount = () => {
    return pinnedMessages ? pinnedMessages.length : 0;
  };

  if (!currentChat || !currentUserId) {
    return (
      <div className="modern-chat-window-empty">
        <style jsx>{`
          .modern-chat-window-empty {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--chat-background) 0%, rgba(var(--chat-surface), 0.8) 100%);
            position: relative;
            overflow: hidden;
          }

          .empty-content {
            text-align: center;
            max-width: 400px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 24px;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: fadeInUp 0.6s ease-out;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .empty-icon {
            font-size: 64px;
            margin-bottom: 24px;
            background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: iconFloat 3s ease-in-out infinite;
          }

          @keyframes iconFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          .empty-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--chat-text);
            margin-bottom: 12px;
          }

          .empty-subtitle {
            font-size: 16px;
            color: rgba(var(--chat-text), 0.7);
            line-height: 1.5;
          }

          .floating-elements {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }

          .floating-element {
            position: absolute;
            opacity: 0.1;
            animation: float 20s linear infinite;
          }

          .floating-element:nth-child(1) {
            top: 20%;
            left: 10%;
            animation-delay: 0s;
          }

          .floating-element:nth-child(2) {
            top: 60%;
            right: 15%;
            animation-delay: 5s;
          }

          .floating-element:nth-child(3) {
            bottom: 30%;
            left: 20%;
            animation-delay: 10s;
          }

          @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
            50% { opacity: 0.3; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
          }
        `}</style>

        <div className="floating-elements">
          <div className="floating-element">💬</div>
          <div className="floating-element">🎉</div>
          <div className="floating-element">✨</div>
        </div>

        <div className="empty-content">
          <div className="empty-icon">💬</div>
          <h2 className="empty-title">Welcome to MemeStream Chat</h2>
          <p className="empty-subtitle">
            Select a conversation from the sidebar to start chatting with your friends and groups.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-chat-window ${isDark ? 'dark' : ''} theme-${theme}`}>
      <style jsx>{`
        .modern-chat-window {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--chat-background);
          position: relative;
          overflow: hidden;
        }

        .chat-header {
          background: linear-gradient(135deg, var(--chat-surface) 0%, rgba(var(--chat-surface), 0.95) 100%);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
          position: relative;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .chat-avatar {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: white;
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          border: 2px solid rgba(255, 255, 255, 0.2);
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chat-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(var(--chat-primary), 0.3);
        }

        .chat-avatar.group {
          background: linear-gradient(135deg, var(--chat-secondary), var(--chat-accent));
        }

        .header-info {
          flex: 1;
          min-width: 0;
        }

        .chat-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--chat-text);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .verified-badge {
          width: 16px;
          height: 16px;
          background: var(--chat-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
        }

        .chat-subtitle {
          font-size: 14px;
          color: rgba(var(--chat-text), 0.7);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .online-count {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          color: #10B981;
          font-weight: 500;
        }

        .online-dot {
          width: 6px;
          height: 6px;
          background: #10B981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--chat-text);
          position: relative;
        }

        .header-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .header-btn svg {
          width: 18px;
          height: 18px;
        }

        .header-btn.has-notification::after {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: var(--chat-accent);
          border-radius: 50%;
          border: 2px solid var(--chat-surface);
        }

        .connection-error {
          background: linear-gradient(135deg, #FEF3C7, #FDE68A);
          border: 1px solid #F59E0B;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #92400E;
          font-size: 14px;
          font-weight: 500;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-icon {
          font-size: 16px;
        }

        .close-error {
          background: none;
          border: none;
          color: #92400E;
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
        }

        .pinned-messages-bar {
          background: rgba(var(--chat-accent), 0.1);
          border-bottom: 1px solid rgba(var(--chat-accent), 0.2);
          padding: 8px 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--chat-accent);
          font-weight: 500;
        }

        .typing-indicator {
          background: rgba(var(--chat-primary), 0.1);
          border-top: 1px solid rgba(var(--chat-primary), 0.2);
          padding: 8px 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--chat-primary);
          animation: typingSlideIn 0.3s ease;
        }

        @keyframes typingSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-dots {
          display: flex;
          gap: 2px;
        }

        .typing-dot {
          width: 4px;
          height: 4px;
          background: var(--chat-primary);
          border-radius: 50%;
          animation: typingBounce 1.4s ease-in-out infinite;
        }

        .typing-dot:nth-child(1) { animation-delay: 0ms; }
        .typing-dot:nth-child(2) { animation-delay: 200ms; }
        .typing-dot:nth-child(3) { animation-delay: 400ms; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        .recording-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(239, 68, 68, 0.1);
          backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: recordingPulse 2s ease-in-out infinite;
        }

        @keyframes recordingPulse {
          0%, 100% { background: rgba(239, 68, 68, 0.1); }
          50% { background: rgba(239, 68, 68, 0.2); }
        }

        .recording-content {
          text-align: center;
          color: var(--chat-text);
        }

        .recording-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: recordingBounce 1s ease-in-out infinite;
        }

        @keyframes recordingBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .recording-text {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .recording-time {
          font-size: 24px;
          font-weight: 700;
          color: #EF4444;
          margin-bottom: 24px;
          font-family: 'Courier New', monospace;
        }

        .recording-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .recording-btn {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .recording-btn.stop {
          background: #EF4444;
          color: white;
        }

        .recording-btn.stop:hover {
          background: #DC2626;
          transform: scale(1.05);
        }

        .recording-btn.cancel {
          background: rgba(255, 255, 255, 0.1);
          color: var(--chat-text);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .recording-btn.cancel:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .media-preview {
          position: absolute;
          bottom: 80px;
          left: 24px;
          right: 24px;
          background: var(--chat-surface);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 100;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .preview-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 12px;
        }

        .preview-title {
          font-weight: 600;
          color: var(--chat-text);
        }

        .preview-close {
          background: none;
          border: none;
          color: var(--chat-text);
          cursor: pointer;
          font-size: 18px;
        }

        .preview-content {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-left">
          <div
            className={`chat-avatar ${chatType === 'group' ? 'group' : ''}`}
            onClick={() => setShowChatInfo(!showChatInfo)}
          >
            {chatName.charAt(0).toUpperCase()}
          </div>

          <div className="header-info">
            <div className="chat-title">
              {chatName}
              {chatType === 'group' && <span className="verified-badge">✓</span>}
            </div>
            <div className="chat-subtitle">
              {chatType === 'private' ? (
                <>
                  <span>Private conversation</span>
                  {onlineUsers.has(currentChat) && (
                    <div className="online-count">
                      <div className="online-dot"></div>
                      online
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span>Group chat</span>
                  <div className="online-count">
                    <div className="online-dot"></div>
                    {getOnlineCount()} online
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="header-actions">
          {getPinnedMessagesCount() > 0 && (
            <button className="header-btn has-notification" title={`${getPinnedMessagesCount()} pinned messages`}>
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
              </svg>
            </button>
          )}

          <button className="header-btn" onClick={onEmojiToggle} title="Add emoji">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,2C6.486,2,2,6.486,2,12s4.486,10,10,10s10-4.486,10-10S17.514,2,12,2z M12,20c-4.411,0-8-3.589-8-8s3.589-8,8-8s8,3.589,8,8S16.411,20,12,20z"/>
              <circle fill="currentColor" cx="8.5" cy="10.5" r="1.5"/>
              <circle fill="currentColor" cx="15.5" cy="10.5" r="1.5"/>
              <path fill="currentColor" d="M12,18c2.28,0,4.22-1.66,5-4H7C7.78,16.34,9.72,18,12,18z"/>
            </svg>
          </button>

          <button className="header-btn" onClick={onVoiceToggle} title="Voice message">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
            </svg>
          </button>

          {chatType === 'group' && (
            <button className="header-btn" onClick={onGroupManage} title="Group settings">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
              </svg>
            </button>
          )}

          <button className="header-btn" title="More options">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="connection-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span>{connectionError}</span>
          </div>
          <button className="close-error" onClick={() => {}}>×</button>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {getPinnedMessagesCount() > 0 && (
        <div className="pinned-messages-bar">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
          </svg>
          <span>{getPinnedMessagesCount()} pinned message{getPinnedMessagesCount() !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Messages */}
      <ModernMessageList
        chatLog={chatLog}
        currentUserId={currentUserId}
        reactions={reactions}
        readMap={readMap}
        chatContainerRef={chatContainerRef}
        messagesEndRef={messagesEndRef}
        chatType={chatType}
        currentChat={currentChat}
        theme={theme}
        isDark={isDark}
        onReaction={onReaction}
        onReply={onReply}
        onPin={onPin}
        onEdit={onEdit}
        onDelete={onDelete}
        showMessageOptions={showMessageOptions}
        setShowMessageOptions={setShowMessageOptions}
      />

      {/* Typing Indicator */}
      {getTypingText() && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
          <span>{getTypingText()}</span>
        </div>
      )}

      {/* Media Preview */}
      {mediaPreview && (
        <div className="media-preview">
          <div className="preview-header">
            <span className="preview-title">Preview</span>
            <button className="preview-close" onClick={() => setMediaPreview(null)}>×</button>
          </div>
          <div className="preview-content">
            <img src={mediaPreview} alt="Preview" className="preview-image" />
          </div>
        </div>
      )}

      {/* Message Input */}
      <ModernMessageInput
        message={message}
        replyingTo={replyingTo}
        theme={theme}
        isDark={isDark}
        onMessageChange={onMessageChange}
        onSend={onSend}
        onFileUpload={onFileUpload}
        onVoiceMessage={onVoiceMessage}
        onEmojiToggle={onEmojiToggle}
        onCancelReply={onCancelReply}
        isRecording={isRecording}
        setIsRecording={setIsRecording}
      />

      {/* Recording Overlay */}
      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-content">
            <div className="recording-icon">🎤</div>
            <div className="recording-text">Recording voice message...</div>
            <div className="recording-time">{formatRecordingTime(recordingTime)}</div>
            <div className="recording-actions">
              <button
                className="recording-btn stop"
                onClick={() => setIsRecording(false)}
              >
                Stop & Send
              </button>
              <button
                className="recording-btn cancel"
                onClick={() => setIsRecording(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernChatWindow;