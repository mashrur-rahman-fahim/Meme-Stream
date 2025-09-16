import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { FaBell, FaTimes, FaHeart, FaComment, FaUserPlus, FaAt, FaShare, FaUsers, FaLaughSquint } from 'react-icons/fa';

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
        return <FaLaughSquint {...iconProps} style={{ color: '#f59e0b' }} />;
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

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll on mobile when dropdown is open
      if (window.innerWidth <= 640) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showDropdown]);

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
        <>
          {/* Mobile Backdrop */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] sm:hidden" onClick={() => setShowDropdown(false)} />

          <div
            ref={dropdownRef}
            className="notification-dropdown absolute top-12 right-0 w-72 sm:w-80 md:w-96 max-h-[70vh] sm:max-h-80 md:max-h-96 bg-base-100 border border-base-300 rounded-lg shadow-xl z-[1000] overflow-hidden flex flex-col"
          >
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-base-300 flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-semibold text-base-content">
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
            </h3>
            <div className="flex gap-1 sm:gap-2 md:gap-3 items-center">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm text-primary hover:text-primary-focus"
                >
                  <span className="hidden sm:inline">Mark all as read</span>
                  <span className="sm:hidden">Mark all</span>
                </button>
              )}
              <button
                onClick={() => {
                  navigate('/notifications');
                  setShowDropdown(false);
                }}
                className="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm text-base-content/60 hover:text-primary"
              >
                See all
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="notifications-list flex-1 overflow-y-auto max-h-64 sm:max-h-80">
            {recentNotifications && recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item flex items-start p-2 sm:p-3 cursor-pointer hover:bg-base-200 transition-colors relative group ${
                    !notification.isRead ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-base-300 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-base-content leading-relaxed m-0 break-words">
                      {notification.message}
                    </p>
                    <span className="text-xs text-base-content/60 mt-1 block">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                    className="delete-btn btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 hover:text-error p-1"
                  >
                    <FaTimes size={10} className="sm:text-xs" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 sm:p-10 text-center text-base-content/60">
                <FaBell
                  size={32}
                  className="sm:text-5xl text-base-content/30 mb-3 sm:mb-4 mx-auto"
                />
                <p className="m-0 text-xs sm:text-sm">No new notifications</p>
              </div>
            )}
          </div>
        </div>
        </>
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

        /* Mobile first - Extra small screens */
        @media (max-width: 480px) {
          .notification-dropdown {
            position: fixed !important;
            top: 60px !important;
            left: 8px !important;
            right: 8px !important;
            width: calc(100vw - 16px) !important;
            max-height: calc(100vh - 80px) !important;
            z-index: 9999 !important;
            border-radius: 12px !important;
            animation: slideInMobile 0.3s ease-out;
            transform-origin: top center;
          }

          .notification-item .delete-btn {
            opacity: 1 !important;
          }

          .notifications-list {
            max-height: calc(100vh - 200px) !important;
          }
        }

        @keyframes slideInMobile {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Small mobile screens */
        @media (min-width: 481px) and (max-width: 640px) {
          .notification-dropdown {
            position: fixed !important;
            top: 60px !important;
            left: 16px !important;
            right: 16px !important;
            width: calc(100vw - 32px) !important;
            max-height: calc(100vh - 80px) !important;
            z-index: 9999 !important;
            animation: slideInMobile 0.3s ease-out;
            transform-origin: top center;
          }

          .notification-item .delete-btn {
            opacity: 1 !important;
          }
        }

        /* Tablet portrait */
        @media (min-width: 641px) and (max-width: 768px) {
          .notification-dropdown {
            width: 360px !important;
            right: -50px !important;
          }
        }

        /* Tablet landscape and small desktop */
        @media (min-width: 769px) and (max-width: 1024px) {
          .notification-dropdown {
            width: 380px !important;
            right: -20px !important;
          }
        }

        /* Large desktop */
        @media (min-width: 1025px) {
          .notification-dropdown {
            width: 384px !important;
            right: 0 !important;
          }
        }

        /* Prevent dropdown from going off screen */
        .notification-dropdown {
          transform-origin: top right;
        }

        /* Ensure proper stacking */
        .notification-bell-container {
          position: relative;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;