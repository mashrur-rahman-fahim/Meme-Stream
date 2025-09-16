import React, { useState, useEffect, useRef } from 'react';
import './ChatStatusIndicator.css';

const ChatStatusIndicator = ({
  userId,
  lastSeen,
  isOnline,
  isTyping,
  typingUsers = [],
  chatType = 'private', // 'private' or 'group'
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const [localIsOnline, setLocalIsOnline] = useState(isOnline);
  const [localLastSeen, setLocalLastSeen] = useState(lastSeen);
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const indicatorRef = useRef(null);

  // Update current time every minute for relative time calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Update local state when props change
  useEffect(() => {
    setLocalIsOnline(isOnline);
  }, [isOnline]);

  useEffect(() => {
    setLocalLastSeen(lastSeen);
  }, [lastSeen]);

  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Never';

    const now = currentTime;
    const seen = new Date(lastSeenDate);
    const diffInMinutes = Math.floor((now - seen) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      return seen.toLocaleDateString();
    }
  };

  const formatTypingUsers = (users) => {
    if (!users || users.length === 0) return '';

    if (users.length === 1) {
      return `${users[0].userName} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`;
    } else {
      return `${users[0].userName} and ${users.length - 1} other${users.length > 2 ? 's' : ''} are typing...`;
    }
  };

  const getPresenceColor = () => {
    if (localIsOnline) return '#10b981'; // green
    if (localLastSeen) {
      const now = currentTime;
      const seen = new Date(localLastSeen);
      const diffInMinutes = Math.floor((now - seen) / (1000 * 60));

      if (diffInMinutes < 5) return '#f59e0b'; // amber - recently active
      if (diffInMinutes < 30) return '#ef4444'; // red - offline recently
    }
    return '#6b7280'; // gray - long offline or never seen
  };

  const getPresenceLabel = () => {
    if (localIsOnline) return 'Online';
    if (localLastSeen) {
      const now = currentTime;
      const seen = new Date(localLastSeen);
      const diffInMinutes = Math.floor((now - seen) / (1000 * 60));

      if (diffInMinutes < 5) return 'Recently active';
      return `Last seen ${formatLastSeen(localLastSeen)}`;
    }
    return 'Offline';
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // For group chats, show typing indicators for multiple users
  if (chatType === 'group' && typingUsers.length > 0) {
    return (
      <div className={`chat-status-indicator group-typing ${size}`}>
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="typing-text">{formatTypingUsers(typingUsers)}</span>
        </div>
      </div>
    );
  }

  // For private chats, show typing indicator
  if (chatType === 'private' && isTyping) {
    return (
      <div className={`chat-status-indicator private-typing ${size}`}>
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="typing-text">typing...</span>
        </div>
      </div>
    );
  }

  // Regular presence indicator
  return (
    <div className={`chat-status-indicator presence ${size}`}>
      <div
        ref={indicatorRef}
        className="presence-indicator"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`presence-dot ${localIsOnline ? 'online' : 'offline'}`}
          style={{ backgroundColor: getPresenceColor() }}
        >
          {localIsOnline && <div className="pulse-ring"></div>}
        </div>

        {size !== 'small' && (
          <span className="presence-label">{getPresenceLabel()}</span>
        )}

        {showTooltip && (
          <div className="presence-tooltip">
            <div className="tooltip-content">
              <div className="tooltip-status">
                <div
                  className="tooltip-dot"
                  style={{ backgroundColor: getPresenceColor() }}
                ></div>
                <span>{getPresenceLabel()}</span>
              </div>
              {localLastSeen && !localIsOnline && (
                <div className="tooltip-detail">
                  Last active: {formatLastSeen(localLastSeen)}
                </div>
              )}
            </div>
            <div className="tooltip-arrow"></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced typing indicator for message input areas
export const TypingIndicator = ({ typingUsers, chatType = 'private' }) => {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const formatTypingMessage = () => {
    if (chatType === 'private') {
      return 'typing...';
    }

    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    } else {
      return `${typingUsers[0].userName} and ${typingUsers.length - 1} other${typingUsers.length > 2 ? 's' : ''} are typing...`;
    }
  };

  return (
    <div className="typing-indicator-container">
      <div className="typing-bubble">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="typing-message">{formatTypingMessage()}</span>
      </div>
    </div>
  );
};

// Presence badge for avatars
export const PresenceBadge = ({
  isOnline,
  lastSeen,
  size = 'medium',
  showPulse = true
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getPresenceColor = () => {
    if (isOnline) return '#10b981';
    if (lastSeen) {
      const now = currentTime;
      const seen = new Date(lastSeen);
      const diffInMinutes = Math.floor((now - seen) / (1000 * 60));

      if (diffInMinutes < 5) return '#f59e0b';
      if (diffInMinutes < 30) return '#ef4444';
    }
    return '#6b7280';
  };

  return (
    <div className={`presence-badge ${size} ${isOnline ? 'online' : 'offline'}`}>
      <div
        className="badge-dot"
        style={{ backgroundColor: getPresenceColor() }}
      >
        {isOnline && showPulse && <div className="badge-pulse"></div>}
      </div>
    </div>
  );
};

// Connection status indicator for the app
export const ConnectionStatusIndicator = ({
  isConnected,
  reconnecting = false,
  lastConnected
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="connection-status-indicator">
      <div
        className={`connection-banner ${reconnecting ? 'reconnecting' : 'disconnected'}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="connection-icon">
          {reconnecting ? '🔄' : '⚠️'}
        </div>
        <div className="connection-message">
          {reconnecting ? 'Reconnecting...' : 'Connection lost'}
        </div>
        <div className="connection-toggle">
          {showDetails ? '▼' : '▶'}
        </div>
      </div>

      {showDetails && (
        <div className="connection-details">
          <p>
            {reconnecting
              ? 'Attempting to reconnect to the server. Your messages will be sent once the connection is restored.'
              : 'Unable to connect to the server. Please check your internet connection.'}
          </p>
          {lastConnected && (
            <p className="last-connected">
              Last connected: {new Date(lastConnected).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatStatusIndicator;