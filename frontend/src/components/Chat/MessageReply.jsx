import React, { useState, useRef, useEffect } from 'react';
import './MessageReply.css';

const MessageReply = ({
  message,
  onReply,
  onCancelReply,
  replyingTo,
  onScrollToMessage,
  currentUserId,
  showFullThread = false,
  isThreadView = false
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(showFullThread);
  const replyInputRef = useRef(null);

  useEffect(() => {
    if (showReplyInput && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [showReplyInput]);

  const handleReplyClick = () => {
    if (onReply) {
      onReply(message);
    } else {
      setShowReplyInput(true);
    }
  };

  const handleSendReply = () => {
    if (replyText.trim() && onReply) {
      onReply(message, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const handleCancelReply = () => {
    setShowReplyInput(false);
    setReplyText('');
    if (onCancelReply) {
      onCancelReply();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    } else if (e.key === 'Escape') {
      handleCancelReply();
    }
  };

  const formatReplyPreview = (content, maxLength = 50) => {
    if (!content) return 'Message';

    // Remove HTML tags and extra whitespace
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();

    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }

    return cleanContent.substring(0, maxLength) + '...';
  };

  const getMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'file': return '📎';
      default: return null;
    }
  };

  const renderReplyToIndicator = () => {
    if (!message.replyTo) return null;

    return (
      <div
        className="reply-to-indicator"
        onClick={() => onScrollToMessage && onScrollToMessage(message.replyTo.id)}
      >
        <div className="reply-line"></div>
        <div className="reply-content">
          <div className="reply-sender">{message.replyTo.senderName}</div>
          <div className="reply-preview">
            {getMessageTypeIcon(message.replyTo.messageType)}
            {formatReplyPreview(message.replyTo.content)}
          </div>
        </div>
      </div>
    );
  };

  const renderReplies = () => {
    if (!message.replies || message.replies.length === 0) return null;

    const visibleReplies = showReplies ? message.replies : message.replies.slice(0, 2);
    const hasMoreReplies = message.replies.length > 2 && !showReplies;

    return (
      <div className="message-replies">
        {visibleReplies.map((reply) => (
          <div key={reply.id} className="reply-message">
            <div className="reply-avatar">
              {reply.senderName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="reply-bubble">
              <div className="reply-header">
                <span className="reply-sender-name">{reply.senderName}</span>
                <span className="reply-time">
                  {new Date(reply.sentAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="reply-text">
                {getMessageTypeIcon(reply.messageType)}
                {reply.content}
              </div>
            </div>
          </div>
        ))}

        {hasMoreReplies && (
          <button
            className="show-more-replies"
            onClick={() => setShowReplies(true)}
          >
            Show {message.replies.length - 2} more replies
          </button>
        )}

        {showReplies && message.replies.length > 2 && (
          <button
            className="show-less-replies"
            onClick={() => setShowReplies(false)}
          >
            Show less
          </button>
        )}
      </div>
    );
  };

  const renderReplyInput = () => {
    if (!showReplyInput) return null;

    return (
      <div className="reply-input-container">
        <div className="replying-to">
          <span>Replying to {message.senderName}</span>
          <button onClick={handleCancelReply} className="cancel-reply">✕</button>
        </div>
        <div className="reply-input-wrapper">
          <textarea
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your reply..."
            className="reply-input"
            rows="2"
          />
          <div className="reply-actions">
            <button
              onClick={handleCancelReply}
              className="reply-action cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSendReply}
              className="reply-action send"
              disabled={!replyText.trim()}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`message-reply-container ${isThreadView ? 'thread-view' : ''}`}>
      {renderReplyToIndicator()}

      <div className="message-content">
        {!isThreadView && (
          <div className="message-actions">
            <button
              onClick={handleReplyClick}
              className="reply-button"
              title="Reply to this message"
            >
              ↩️
            </button>
          </div>
        )}
      </div>

      {renderReplies()}
      {renderReplyInput()}

      {message.replies && message.replies.length > 0 && !isThreadView && (
        <div className="thread-summary">
          <button
            className="view-thread"
            onClick={() => onScrollToMessage && onScrollToMessage(message.id, true)}
          >
            View thread ({message.replies.length} replies)
          </button>
        </div>
      )}
    </div>
  );
};

// Thread view component for detailed conversation
export const ThreadView = ({
  rootMessage,
  replies,
  onSendReply,
  onClose,
  currentUserId,
  onScrollToMessage
}) => {
  const [replyText, setReplyText] = useState('');
  const replyInputRef = useRef(null);

  useEffect(() => {
    if (replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, []);

  const handleSendReply = () => {
    if (replyText.trim() && onSendReply) {
      onSendReply(rootMessage, replyText.trim());
      setReplyText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="thread-view-overlay">
      <div className="thread-view-container">
        <div className="thread-header">
          <div className="thread-title">
            <span>Thread</span>
            <span className="thread-count">{replies.length + 1} messages</span>
          </div>
          <button onClick={onClose} className="close-thread">✕</button>
        </div>

        <div className="thread-messages">
          {/* Root message */}
          <div className="thread-message root-message">
            <div className="message-avatar">
              {rootMessage.senderName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="message-bubble">
              <div className="message-header">
                <span className="sender-name">{rootMessage.senderName}</span>
                <span className="message-time">
                  {formatMessageTime(rootMessage.sentAt)}
                </span>
              </div>
              <div className="message-text">{rootMessage.content}</div>
            </div>
          </div>

          {/* Replies */}
          {replies.map((reply) => (
            <div key={reply.id} className="thread-message">
              <div className="message-avatar">
                {reply.senderName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="message-bubble">
                <div className="message-header">
                  <span className="sender-name">{reply.senderName}</span>
                  <span className="message-time">
                    {formatMessageTime(reply.sentAt)}
                  </span>
                </div>
                <div className="message-text">{reply.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="thread-reply-input">
          <div className="reply-input-wrapper">
            <textarea
              ref={replyInputRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Reply to thread..."
              className="thread-input"
              rows="3"
            />
            <button
              onClick={handleSendReply}
              className="send-thread-reply"
              disabled={!replyText.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reply composer for inline replies
export const ReplyComposer = ({
  replyingTo,
  onSend,
  onCancel,
  placeholder = "Type your reply...",
  autoFocus = true
}) => {
  const [replyText, setReplyText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSend = () => {
    if (replyText.trim() && onSend) {
      onSend(replyText.trim());
      setReplyText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const formatReplyPreview = (content, maxLength = 40) => {
    if (!content) return 'Message';
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent.length <= maxLength
      ? cleanContent
      : cleanContent.substring(0, maxLength) + '...';
  };

  if (!replyingTo) return null;

  return (
    <div className="reply-composer">
      <div className="replying-to-header">
        <div className="replying-to-content">
          <span className="replying-label">Replying to {replyingTo.senderName}</span>
          <span className="replying-preview">
            {formatReplyPreview(replyingTo.content)}
          </span>
        </div>
        <button onClick={onCancel} className="cancel-reply-composer">✕</button>
      </div>

      <div className="reply-composer-input">
        <textarea
          ref={inputRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="composer-textarea"
          rows="2"
        />
        <div className="composer-actions">
          <button onClick={onCancel} className="composer-cancel">
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="composer-send"
            disabled={!replyText.trim()}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageReply;