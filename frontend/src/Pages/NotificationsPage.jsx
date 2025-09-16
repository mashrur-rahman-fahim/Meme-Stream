import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { FaHeart, FaComment, FaUserPlus, FaAt, FaShare, FaUsers, FaBell, FaEllipsisV, FaTrash, FaCheck, FaCheckDouble, FaLaughSquint } from 'react-icons/fa';
import { Navbar } from '../components/Navbar';

const NotificationsPage = () => {
  const {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // all, unread, read
  const [showActions, setShowActions] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getNotificationIcon = (type) => {
    const iconProps = { size: 16, className: "notification-type-icon sm:text-lg md:text-xl" };

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

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInSeconds / 3600);
    const diffInDays = Math.floor(diffInSeconds / 86400);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationDate.toLocaleDateString();
  };

  const filteredNotifications = notifications?.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  }) || [];

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleDeleteNotification = async (id, event) => {
    event.stopPropagation();
    await deleteNotification(id);
    setShowActions(null);
  };

  const handleMarkAsRead = async (id, event) => {
    event.stopPropagation();
    await markAsRead(id);
    setShowActions(null);
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="pt-16 sm:pt-18 md:pt-20 pb-4 sm:pb-6 md:pb-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header */}
          <div className="card bg-base-100 shadow-lg border border-base-300 mb-4 sm:mb-5 md:mb-6">
            <div className="card-body p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-base-content flex items-center gap-2 sm:gap-3">
                  <FaBell className="text-primary text-base sm:text-lg md:text-xl" />
                  <span className="hidden sm:inline">Notifications</span>
                  <span className="sm:hidden">Alerts</span>
                  {unreadCount > 0 && (
                    <span className="badge badge-primary badge-xs sm:badge-sm">
                      {unreadCount}
                    </span>
                  )}
                </h1>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="btn btn-outline btn-xs sm:btn-sm w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <FaCheckDouble className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                    <span className="hidden sm:inline">Mark all as read</span>
                    <span className="sm:hidden">Mark all read</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="tabs tabs-bordered overflow-x-auto scrollbar-hide">
                <button
                  className={`tab tab-sm sm:tab-md text-xs sm:text-sm whitespace-nowrap ${filter === 'all' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  <span className="hidden sm:inline">All ({notifications?.length || 0})</span>
                  <span className="sm:hidden">All ({notifications?.length || 0})</span>
                </button>
                <button
                  className={`tab tab-sm sm:tab-md text-xs sm:text-sm whitespace-nowrap ${filter === 'unread' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  <span className="hidden sm:inline">Unread ({unreadCount})</span>
                  <span className="sm:hidden">New ({unreadCount})</span>
                </button>
                <button
                  className={`tab tab-sm sm:tab-md text-xs sm:text-sm whitespace-nowrap ${filter === 'read' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('read')}
                >
                  <span className="hidden sm:inline">Read ({(notifications?.length || 0) - unreadCount})</span>
                  <span className="sm:hidden">Read ({(notifications?.length || 0) - unreadCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="card bg-base-100 shadow-lg border border-base-300">
                <div className="card-body p-6 sm:p-8 text-center">
                  <span className="loading loading-spinner loading-md sm:loading-lg text-primary"></span>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-base-content/70">Loading notifications...</p>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="card bg-base-100 shadow-lg border border-base-300">
                <div className="card-body p-8 sm:p-10 md:p-12 text-center">
                  <FaBell size={32} className="sm:text-4xl md:text-5xl mx-auto text-base-content/30 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-base-content/70 mb-2">
                    {filter === 'all' ? 'No notifications yet' :
                     filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
                  </h3>
                  <p className="text-sm sm:text-base text-base-content/50 max-w-sm mx-auto">
                    {filter === 'all' ? 'Stay tuned! You\'ll get notified when something interesting happens.' :
                     filter === 'unread' ? 'You\'re all caught up!' : 'Check back later for more notifications.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`card bg-base-100 shadow-md border border-base-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/20 ${
                    !notification.isRead ? 'border-l-2 sm:border-l-4 border-l-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="card-body p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                          !notification.isRead ? 'bg-primary/20' : 'bg-base-200'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs sm:text-sm leading-relaxed break-words ${
                              !notification.isRead ? 'font-medium text-base-content' : 'text-base-content/80'
                            }`}>
                              {notification.message}
                            </p>

                            <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                              <span className="text-xs text-base-content/60">
                                {formatTime(notification.createdAt)}
                              </span>

                              {!notification.isRead && (
                                <span className="badge badge-primary badge-xs">
                                  New
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowActions(showActions === notification.id ? null : notification.id);
                              }}
                              className="btn btn-ghost btn-xs sm:btn-sm btn-circle opacity-60 hover:opacity-100"
                            >
                              <FaEllipsisV size={10} className="sm:text-xs" />
                            </button>

                            {showActions === notification.id && (
                              <div className="absolute right-0 top-8 z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-2 min-w-32 sm:min-w-40">
                                {!notification.isRead && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                    className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-base-200 flex items-center gap-2"
                                  >
                                    <FaCheck size={10} className="sm:text-xs" />
                                    <span className="hidden sm:inline">Mark as read</span>
                                    <span className="sm:hidden">Read</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteNotification(notification.id, e)}
                                  className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-error hover:bg-error/10 flex items-center gap-2"
                                >
                                  <FaTrash size={10} className="sm:text-xs" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close actions menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowActions(null)}
        />
      )}
    </div>
  );
};

export default NotificationsPage;