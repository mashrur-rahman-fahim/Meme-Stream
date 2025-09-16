import React, { useState, useEffect, useRef } from "react";
import { getApiBaseUrl } from "../../utils/api-config";

const ModernMessageList = ({
  chatLog,
  currentUserId,
  reactions,
  readMap,
  chatContainerRef,
  messagesEndRef,
  chatType,
  currentChat,
  theme,
  isDark,
  onReaction,
  onReply,
  onPin,
  onEdit,
  onDelete,
  showMessageOptions,
  setShowMessageOptions
}) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [animatingReactions, setAnimatingReactions] = useState(new Set());
  const [highlightedMessage, setHighlightedMessage] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);

  const API_BASE_URL = getApiBaseUrl().replace("/api", "");
  const messageRefs = useRef({});

  // Enhanced reaction animations
  const handleReactionClick = async (messageId, emoji) => {
    const animationKey = `${messageId}-${emoji}`;
    setAnimatingReactions(prev => new Set(prev).add(animationKey));

    try {
      await onReaction(messageId, emoji, true);

      // Trigger celebration animation for first reaction
      const messageElement = messageRefs.current[messageId];
      if (messageElement) {
        messageElement.classList.add('celebration-animate');
        setTimeout(() => {
          messageElement.classList.remove('celebration-animate');
        }, 1000);
      }
    } catch (error) {
      console.error("Reaction failed:", error);
    } finally {
      setTimeout(() => {
        setAnimatingReactions(prev => {
          const newSet = new Set(prev);
          newSet.delete(animationKey);
          return newSet;
        });
      }, 600);
    }
  };

  // Group reactions by emoji with enhanced data
  const getGroupedReactions = (messageId) => {
    if (!reactions[messageId]) return [];

    const grouped = {};
    reactions[messageId].forEach(reaction => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 1,
          reactors: [reaction.reactorName || `User ${reaction.reactorId}`],
          userReacted: reaction.reactorId === currentUserId,
          reactorIds: [reaction.reactorId]
        };
      } else {
        grouped[reaction.emoji].count++;
        grouped[reaction.emoji].reactors.push(reaction.reactorName || `User ${reaction.reactorId}`);
        grouped[reaction.emoji].reactorIds.push(reaction.reactorId);
        if (reaction.reactorId === currentUserId) {
          grouped[reaction.emoji].userReacted = true;
        }
      }
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  };

  // Format message timestamp with relative time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if messages should be grouped
  const shouldGroupMessage = (currentMsg, previousMsg, index) => {
    if (index === 0 || !previousMsg) return false;

    const timeDiff = new Date(currentMsg.sentAt) - new Date(previousMsg.sentAt);
    const fiveMinutes = 5 * 60 * 1000;

    return (
      currentMsg.senderId === previousMsg.senderId &&
      timeDiff < fiveMinutes &&
      !previousMsg.isDeleted &&
      !currentMsg.isDeleted
    );
  };

  // Render message content based on type
  const renderMessageContent = (message) => {
    if (message.isDeleted) {
      return (
        <div className="deleted-message">
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
          </svg>
          <span>This message was deleted</span>
        </div>
      );
    }


    if (message.type === 'image' || message.type === 'video') {
      return <MediaMessage message={message} API_BASE_URL={API_BASE_URL} />;
    }

    if (message.filePath) {
      return (
        <div className="file-message">
          <div className="file-icon">📎</div>
          <div className="file-info">
            <a
              href={`${API_BASE_URL}/${message.filePath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link"
            >
              {message.fileName}
            </a>
            <div className="file-size">
              {message.fileSize ? formatFileSize(message.fileSize) : ''}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-message">
        {message.replyTo && (
          <div className="reply-preview">
            <div className="reply-line"></div>
            <div className="reply-content">
              <div className="reply-author">Replying to message</div>
              <div className="reply-text">{message.replyTo.content}</div>
            </div>
          </div>
        )}
        <div className="message-text">{message.msg || message.content}</div>
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  // Media message component
  const MediaMessage = ({ message, API_BASE_URL }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
      <div className="media-message">
        {message.type === 'image' ? (
          <img
            src={`${API_BASE_URL}/${message.mediaUrl}`}
            alt="Shared image"
            className={`media-image ${isLoaded ? 'loaded' : ''}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />
        ) : (
          <video
            src={`${API_BASE_URL}/${message.mediaUrl}`}
            controls
            className="media-video"
            poster={message.thumbnail ? `${API_BASE_URL}/${message.thumbnail}` : undefined}
          />
        )}
        {!isLoaded && <div className="media-loading">Loading...</div>}
      </div>
    );
  };

  return (
    <div className="modern-message-list" ref={chatContainerRef}>
      <style jsx>{`
        .modern-message-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
          scroll-behavior: smooth;
          background: var(--chat-background);
          position: relative;
        }

        .message-group {
          margin-bottom: 24px;
          animation: messageSlideIn 0.3s ease-out;
        }

        .message-group.grouped {
          margin-bottom: 8px;
        }

        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-container {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          position: relative;
          padding: 8px 0;
          transition: all 0.2s ease;
        }

        .message-container.own {
          flex-direction: row-reverse;
        }

        .message-container:hover {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 8px 12px;
          margin: 0 -12px;
        }

        .message-container.highlighted {
          background: rgba(var(--chat-primary), 0.1);
          border-radius: 12px;
          padding: 8px 12px;
          margin: 0 -12px;
          animation: messageHighlight 2s ease-out;
        }

        @keyframes messageHighlight {
          0% { background: rgba(var(--chat-primary), 0.3); }
          100% { background: rgba(var(--chat-primary), 0.1); }
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          flex-shrink: 0;
          position: relative;
        }

        .message-avatar.hidden {
          opacity: 0;
        }

        .message-content {
          flex: 1;
          max-width: 60%;
          min-width: 0;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .message-header.hidden {
          display: none;
        }

        .sender-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--chat-primary);
        }

        .message-time {
          font-size: 11px;
          color: rgba(var(--chat-text), 0.5);
          font-weight: 500;
        }

        .message-bubble {
          background: var(--chat-surface);
          border-radius: 16px;
          padding: 12px 16px;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          transition: all 0.2s ease;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .message-bubble.own {
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          border-color: transparent;
        }

        .message-bubble:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .message-bubble.celebration-animate {
          animation: celebrationPulse 1s ease-out;
        }

        @keyframes celebrationPulse {
          0% { transform: scale(1); }
          25% { transform: scale(1.05); box-shadow: 0 0 20px rgba(var(--chat-primary), 0.5); }
          50% { transform: scale(1.02); }
          75% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }

        .text-message {
          line-height: 1.4;
        }

        .message-text {
          font-size: 14px;
        }

        .reply-preview {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border-left: 3px solid var(--chat-accent);
        }

        .reply-line {
          width: 3px;
          background: var(--chat-accent);
          border-radius: 2px;
          flex-shrink: 0;
        }

        .reply-content {
          flex: 1;
          min-width: 0;
        }

        .reply-author {
          font-size: 11px;
          font-weight: 600;
          color: var(--chat-accent);
          margin-bottom: 2px;
        }

        .reply-text {
          font-size: 12px;
          color: rgba(var(--chat-text), 0.8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .deleted-message {
          display: flex;
          align-items: center;
          gap: 8px;
          font-style: italic;
          color: rgba(var(--chat-text), 0.6);
          font-size: 13px;
        }


        .media-message {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          max-width: 300px;
        }

        .media-image {
          width: 100%;
          height: auto;
          max-height: 400px;
          object-fit: cover;
          transition: opacity 0.3s ease;
          cursor: pointer;
        }

        .media-image:hover {
          transform: scale(1.02);
        }

        .media-video {
          width: 100%;
          max-height: 300px;
        }

        .media-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
        }

        .file-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .file-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-link {
          color: var(--chat-primary);
          text-decoration: none;
          font-weight: 500;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-link:hover {
          text-decoration: underline;
        }

        .file-size {
          font-size: 11px;
          color: rgba(var(--chat-text), 0.6);
          margin-top: 2px;
        }

        .message-reactions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .reaction-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          backdrop-filter: blur(10px);
        }

        .reaction-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .reaction-button.user-reacted {
          background: linear-gradient(135deg, rgba(var(--chat-primary), 0.3), rgba(var(--chat-secondary), 0.3));
          border-color: var(--chat-primary);
          box-shadow: 0 0 12px rgba(var(--chat-primary), 0.2);
        }

        .reaction-button.animating {
          animation: reactionBounce 0.6s ease-out;
        }

        @keyframes reactionBounce {
          0% { transform: scale(1); }
          25% { transform: scale(1.3) rotate(-5deg); }
          50% { transform: scale(1.1) rotate(3deg); }
          75% { transform: scale(1.2) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .reaction-emoji {
          font-size: 14px;
        }

        .reaction-count {
          font-weight: 600;
          color: var(--chat-text);
        }

        .message-actions {
          position: absolute;
          top: -16px;
          right: 16px;
          background: rgba(var(--chat-surface), 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 4px;
          display: flex;
          gap: 4px;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.2s ease;
          z-index: 10;
        }

        .message-container:hover .message-actions {
          opacity: 1;
          transform: translateY(0);
        }

        .action-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--chat-text);
        }

        .action-button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }

        .action-button svg {
          width: 16px;
          height: 16px;
        }

        .message-status {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 11px;
          color: rgba(var(--chat-text), 0.6);
        }

        .edit-indicator {
          font-style: italic;
          opacity: 0.7;
        }

        .pin-indicator {
          color: var(--chat-accent);
          font-weight: 600;
        }

        /* Scrollbar styling */
        .modern-message-list::-webkit-scrollbar {
          width: 6px;
        }

        .modern-message-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .modern-message-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .modern-message-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {chatLog.map((message, index) => {
        const isSender = message.senderId === currentUserId;
        const previousMessage = index > 0 ? chatLog[index - 1] : null;
        const isGrouped = shouldGroupMessage(message, previousMessage, index);
        const groupedReactions = getGroupedReactions(message.id);
        const isPinned = pinnedMessages && pinnedMessages.includes(message.id);

        return (
          <div
            key={message.id || index}
            id={`message-${message.id}`}
            ref={el => messageRefs.current[message.id] = el}
            className={`message-group ${isGrouped ? 'grouped' : ''}`}
          >
            <div
              className={`message-container ${isSender ? 'own' : ''} ${
                highlightedMessage === message.id ? 'highlighted' : ''
              }`}
              onMouseEnter={() => setHoveredMessage(message.id)}
              onMouseLeave={() => setHoveredMessage(null)}
            >
              <div className={`message-avatar ${isGrouped ? 'hidden' : ''}`}>
                {!isSender && !isGrouped && (message.senderName || 'U').charAt(0).toUpperCase()}
              </div>

              <div className="message-content">
                <div className={`message-header ${isGrouped ? 'hidden' : ''}`}>
                  {!isSender && (
                    <span className="sender-name">
                      {message.senderName || `User ${message.senderId}`}
                    </span>
                  )}
                  <span className="message-time">
                    {formatMessageTime(message.sentAt)}
                  </span>
                  {isPinned && <span className="pin-indicator">📌</span>}
                </div>

                <div className={`message-bubble ${isSender ? 'own' : ''}`}>
                  {renderMessageContent(message)}

                  {message.editedAt && !message.isDeleted && (
                    <div className="message-status">
                      <span className="edit-indicator">(edited)</span>
                    </div>
                  )}
                </div>

                {groupedReactions.length > 0 && (
                  <div className="message-reactions">
                    {groupedReactions.map((reaction, i) => {
                      const animationKey = `${message.id}-${reaction.emoji}`;
                      const isAnimating = animatingReactions.has(animationKey);

                      return (
                        <button
                          key={i}
                          className={`reaction-button ${
                            reaction.userReacted ? 'user-reacted' : ''
                          } ${isAnimating ? 'animating' : ''}`}
                          title={reaction.reactors.join(", ")}
                          onClick={() => handleReactionClick(message.id, reaction.emoji)}
                        >
                          <span className="reaction-emoji">{reaction.emoji}</span>
                          {reaction.count > 1 && (
                            <span className="reaction-count">{reaction.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {readMap[message.id]?.length > 0 && isSender && (
                  <div className="message-status">
                    {chatType === "group" ? (
                      <span title={readMap[message.id].join(", ")}>
                        ✓ Read by {readMap[message.id].length}
                      </span>
                    ) : (
                      readMap[message.id].includes(parseInt(currentChat)) && (
                        <span>✓ Read</span>
                      )
                    )}
                  </div>
                )}
              </div>

              {!message.isDeleted && hoveredMessage === message.id && (
                <div className="message-actions">
                  <button
                    className="action-button"
                    onClick={() => handleReactionClick(message.id, "👍")}
                    title="Like"
                  >
                    👍
                  </button>

                  <button
                    className="action-button"
                    onClick={() => onReply(message)}
                    title="Reply"
                  >
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M10,9V5L3,12L10,19V14.9C15,14.9 18.5,16.5 21,20C20,15 17,10 10,9Z"/>
                    </svg>
                  </button>

                  <button
                    className="action-button"
                    onClick={() => onPin(message.id)}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <svg viewBox="0 0 24 24">
                      <path fill="currentColor" d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
                    </svg>
                  </button>

                  {isSender && (
                    <>
                      <button
                        className="action-button"
                        onClick={() => onEdit(message.id, message.msg)}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                        </svg>
                      </button>

                      <button
                        className="action-button"
                        onClick={() => onDelete(message.id)}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ModernMessageList;