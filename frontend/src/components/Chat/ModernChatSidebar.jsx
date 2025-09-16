import React, { useState, useEffect } from "react";

const ModernChatSidebar = ({
  loading,
  error,
  friends,
  groups,
  unreadMap,
  latestMessages,
  notifications,
  onlineUsers,
  userPresence,
  collapsed,
  onToggleCollapse,
  onChatSelect,
  onCreateGroup,
  onSearchToggle,
  onThemeToggle,
  theme,
  isDark
}) => {
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState({ friends: [], groups: [] });

  // Filter friends and groups based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems({ friends, groups });
      return;
    }

    const query = searchQuery.toLowerCase();
    const filteredFriends = friends.filter(friend =>
      friend.name.toLowerCase().includes(query)
    );
    const filteredGroups = groups.filter(group =>
      group.name.toLowerCase().includes(query)
    );

    setFilteredItems({ friends: filteredFriends, groups: filteredGroups });
  }, [searchQuery, friends, groups]);

  const formatMessagePreview = (content) => {
    if (!content) return "";
    return content.length > 30 ? content.substring(0, 30) + "..." : content;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPresenceStatus = (userId) => {
    return userPresence[userId]?.status || 'offline';
  };

  const getTotalUnread = () => {
    return Object.values(unreadMap).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className={`modern-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="header-content">
            {!collapsed && <h1 className="app-title">MemeStream Chat</h1>}
            <button onClick={onToggleCollapse} className="collapse-btn">
              <svg className={`collapse-icon ${collapsed ? 'rotated' : ''}`} viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          {!collapsed && <p>Loading chats...</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`modern-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="header-content">
            {!collapsed && <h1 className="app-title">MemeStream Chat</h1>}
            <button onClick={onToggleCollapse} className="collapse-btn">
              <svg className={`collapse-icon ${collapsed ? 'rotated' : ''}`} viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          {!collapsed && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-sidebar ${collapsed ? 'collapsed' : ''} ${isDark ? 'dark' : ''}`}>
      <style jsx>{`
        .modern-sidebar {
          background: linear-gradient(180deg, var(--chat-surface) 0%, rgba(var(--chat-surface), 0.95) 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          height: 100vh;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }

        .modern-sidebar.dark {
          background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
          border-right: 1px solid rgba(148, 163, 184, 0.1);
        }

        .modern-sidebar.collapsed {
          width: 64px;
        }

        .sidebar-header {
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .app-title {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          white-space: nowrap;
        }

        .collapse-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .collapse-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .collapse-icon {
          width: 16px;
          height: 16px;
          transition: transform 0.3s ease;
          color: var(--chat-text);
        }

        .collapse-icon.rotated {
          transform: rotate(180deg);
        }

        .controls-section {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-container {
          position: relative;
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: var(--chat-text);
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.15);
          border-color: var(--chat-primary);
          box-shadow: 0 0 0 3px rgba(var(--chat-primary), 0.1);
        }

        .search-input::placeholder {
          color: rgba(var(--chat-text), 0.6);
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: rgba(var(--chat-text), 0.6);
        }

        .control-buttons {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          flex: 1;
          padding: 10px;
          background: rgba(var(--chat-primary), 0.1);
          border: 1px solid rgba(var(--chat-primary), 0.3);
          border-radius: 8px;
          color: var(--chat-primary);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .control-btn:hover {
          background: rgba(var(--chat-primary), 0.2);
          transform: translateY(-1px);
        }

        .control-btn svg {
          width: 16px;
          height: 16px;
        }

        .tabs-container {
          padding: 16px 16px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab-buttons {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 16px;
        }

        .tab-btn {
          flex: 1;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(var(--chat-text), 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
          position: relative;
        }

        .tab-btn.active {
          background: var(--chat-primary);
          color: white;
          box-shadow: 0 2px 8px rgba(var(--chat-primary), 0.3);
        }

        .tab-btn:not(.active):hover {
          color: var(--chat-text);
          background: rgba(255, 255, 255, 0.1);
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--chat-accent);
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          min-width: 16px;
          text-align: center;
          animation: badgePulse 2s infinite;
        }

        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .chat-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 16px 16px;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid transparent;
          position: relative;
        }

        .chat-item:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateX(4px);
        }

        .chat-item.has-unread {
          background: rgba(var(--chat-primary), 0.1);
          border-color: rgba(var(--chat-primary), 0.3);
        }

        .avatar-container {
          position: relative;
          flex-shrink: 0;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .avatar.group {
          background: linear-gradient(135deg, var(--chat-secondary), var(--chat-accent));
        }

        .presence-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--chat-surface);
        }

        .presence-indicator.online { background: #10B981; }
        .presence-indicator.away { background: #F59E0B; }
        .presence-indicator.busy { background: #EF4444; }
        .presence-indicator.offline { background: #6B7280; }

        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--chat-text);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .online-indicator {
          width: 6px;
          height: 6px;
          background: #10B981;
          border-radius: 50%;
          animation: onlinePulse 2s infinite;
        }

        @keyframes onlinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .chat-preview {
          font-size: 12px;
          color: rgba(var(--chat-text), 0.7);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chat-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .chat-time {
          font-size: 11px;
          color: rgba(var(--chat-text), 0.5);
          font-weight: 500;
        }

        .unread-badge {
          background: var(--chat-primary);
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          min-width: 18px;
          text-align: center;
          animation: unreadPulse 2s infinite;
        }

        @keyframes unreadPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: rgba(var(--chat-text), 0.6);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 14px;
          font-weight: 500;
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 40px 20px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(var(--chat-primary), 0.3);
          border-top: 3px solid var(--chat-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-text {
          color: #EF4444;
          font-size: 14px;
          text-align: center;
        }

        /* Collapsed state adjustments */
        .modern-sidebar.collapsed .search-container,
        .modern-sidebar.collapsed .control-buttons,
        .modern-sidebar.collapsed .tab-buttons,
        .modern-sidebar.collapsed .chat-info,
        .modern-sidebar.collapsed .chat-meta {
          display: none;
        }

        .modern-sidebar.collapsed .chat-item {
          justify-content: center;
          padding: 12px 8px;
        }

        .modern-sidebar.collapsed .controls-section {
          padding: 8px;
        }

        .modern-sidebar.collapsed .chat-list {
          padding: 0 8px 16px;
        }

        /* Scrollbar styling */
        .chat-list::-webkit-scrollbar {
          width: 4px;
        }

        .chat-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .chat-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }

        .chat-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Header */}
      <div className="sidebar-header">
        <div className="header-content">
          {!collapsed && <h1 className="app-title">MemeStream Chat</h1>}
          <button onClick={onToggleCollapse} className="collapse-btn">
            <svg className={`collapse-icon ${collapsed ? 'rotated' : ''}`} viewBox="0 0 24 24">
              <path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/>
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Controls Section */}
          <div className="controls-section">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="control-buttons">
              <button className="control-btn" onClick={onSearchToggle}>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                Search
              </button>

              <button className="control-btn" onClick={onThemeToggle}>
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12,18V6A6,6 0 0,1 18,12A6,6 0 0,1 12,18Z"/>
                </svg>
                Theme
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
                onClick={() => setActiveTab('chats')}
              >
                Chats
                {getTotalUnread() > 0 && (
                  <span className="notification-badge">{getTotalUnread()}</span>
                )}
              </button>
              <button
                className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => setActiveTab('groups')}
              >
                Groups
              </button>
            </div>
          </div>
        </>
      )}

      {/* Chat List */}
      <div className="chat-list">
        {activeTab === 'chats' && (
          <>
            {!collapsed && (
              <button
                onClick={onCreateGroup}
                className="control-btn"
                style={{ width: '100%', marginBottom: '16px' }}
              >
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                </svg>
                Create Group
              </button>
            )}

            {filteredItems.friends.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                {!collapsed && <div className="empty-text">No friends yet</div>}
              </div>
            ) : (
              filteredItems.friends.map((friend) => {
                const unreadCount = unreadMap[friend.id] || 0;
                const latestMessage = latestMessages[friend.id];
                const isOnline = onlineUsers.has(friend.id);
                const presence = getPresenceStatus(friend.id);

                return (
                  <div
                    key={friend.id}
                    onClick={() => onChatSelect(friend.id, 'private', friend.name)}
                    className={`chat-item ${unreadCount > 0 ? 'has-unread' : ''}`}
                  >
                    <div className="avatar-container">
                      <div className="avatar">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`presence-indicator ${presence}`}></div>
                    </div>

                    {!collapsed && (
                      <>
                        <div className="chat-info">
                          <div className="chat-name">
                            {friend.name}
                            {isOnline && <div className="online-indicator"></div>}
                          </div>
                          {latestMessage && (
                            <div className="chat-preview">
                              {formatMessagePreview(latestMessage.content)}
                            </div>
                          )}
                        </div>

                        <div className="chat-meta">
                          {latestMessage && (
                            <div className="chat-time">
                              {formatTime(latestMessage.timestamp)}
                            </div>
                          )}
                          {unreadCount > 0 && (
                            <div className="unread-badge">{unreadCount}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === 'groups' && (
          <>
            {filteredItems.groups.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                {!collapsed && <div className="empty-text">No groups yet</div>}
              </div>
            ) : (
              filteredItems.groups.map((group) => {
                const groupKey = `group-${group.id}`;
                const unreadCount = unreadMap[groupKey] || 0;
                const latestMessage = latestMessages[groupKey];

                return (
                  <div
                    key={group.id}
                    onClick={() => onChatSelect(group.id, 'group', group.name)}
                    className={`chat-item ${unreadCount > 0 ? 'has-unread' : ''}`}
                  >
                    <div className="avatar-container">
                      <div className="avatar group">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {!collapsed && (
                      <>
                        <div className="chat-info">
                          <div className="chat-name">{group.name}</div>
                          {latestMessage ? (
                            <div className="chat-preview">
                              {formatMessagePreview(latestMessage.content)}
                            </div>
                          ) : (
                            <div className="chat-preview">
                              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>

                        <div className="chat-meta">
                          {latestMessage && (
                            <div className="chat-time">
                              {formatTime(latestMessage.timestamp)}
                            </div>
                          )}
                          {unreadCount > 0 && (
                            <div className="unread-badge">{unreadCount}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModernChatSidebar;