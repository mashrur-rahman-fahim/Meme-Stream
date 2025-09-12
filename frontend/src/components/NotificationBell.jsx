import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { FaBell, FaTimes, FaHeart, FaComment, FaUserPlus, FaAt, FaShare, FaUsers } from 'react-icons/fa';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  const {
    unreadCount,
    recentNotifications,
    fetchRecentNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isConnected
  } = useNotifications();

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      fetchRecentNotifications();
      fetchUnreadCount(); // Refresh the count when opening
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setShowDropdown(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (id, event) => {
    event.stopPropagation();
    await deleteNotification(id);
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type) => {
    const iconProps = { size: 16, className: "notification-type-icon" };
    
    switch (type) {
      case 'like':
        return <FaHeart {...iconProps} style={{ color: '#ef4444' }} />;
      case 'comment':
        return <FaComment {...iconProps} style={{ color: '#3b82f6' }} />;
      case 'follow':
        return <FaUserPlus {...iconProps} style={{ color: '#10b981' }} />;
      case 'mention':
        return <FaAt {...iconProps} style={{ color: '#8b5cf6' }} />;
      case 'share':
        return <FaShare {...iconProps} style={{ color: '#f59e0b' }} />;
      case 'friend_request':
        return <FaUsers {...iconProps} style={{ color: '#06b6d4' }} />;
      default:
        return <FaBell {...iconProps} style={{ color: '#6b7280' }} />;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          !event.target.closest('.notification-bell')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notification-bell-container" style={{ position: 'relative' }}>
      <button 
        onClick={toggleDropdown}
        className={`notification-bell btn btn-ghost btn-circle ${showDropdown ? 'btn-active' : ''}`}
        style={{
          position: 'relative',
        }}
      >
        <FaBell 
          size={20} 
          className="text-base-content"
          style={{
            animation: unreadCount > 0 ? 'bell-ring 1s ease-in-out' : 'none'
          }} 
        />
        {unreadCount > 0 && (
          <span 
            className="badge badge-error badge-sm absolute -top-1 -right-1"
            style={{
              fontSize: '10px',
              minWidth: '18px',
              height: '18px',
              lineHeight: '1'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="notification-dropdown absolute top-12 right-0 w-96 max-h-96 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-base-300 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-base-content">
              Notifications
            </h3>
            <div className="flex gap-3 items-center">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="btn btn-ghost btn-sm text-primary hover:text-primary-focus"
                >
                  Mark all as read
                </button>
              )}
              <button 
                onClick={() => {
                  navigate('/notifications');
                  setShowDropdown(false);
                }}
                className="btn btn-ghost btn-sm text-base-content/60 hover:text-primary"
              >
                See all
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="notifications-list flex-1 overflow-y-auto max-h-80">
            {recentNotifications && recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`notification-item flex items-start p-3 cursor-pointer hover:bg-base-200 transition-colors relative ${
                    !notification.isRead ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center mr-3 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-base-content leading-relaxed m-0 break-words">
                      {notification.message}
                    </p>
                    <span className="text-xs text-base-content/60 mt-1 block">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                    className="delete-btn btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 hover:text-error"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-base-content/60">
                <FaBell 
                  size={48} 
                  className="text-base-content/30 mb-4 mx-auto" 
                />
                <p className="m-0">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Styles for animations */}
      <style jsx>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(-10deg); }
          20%, 40% { transform: rotate(10deg); }
        }
        
        .notification-item:hover .delete-btn {
          opacity: 1 !important;
        }
        
        @media (max-width: 640px) {
          .notification-dropdown {
            width: calc(100vw - 32px) !important;
            right: -16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;