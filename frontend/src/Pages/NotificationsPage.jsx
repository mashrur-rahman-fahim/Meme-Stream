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
    const iconProps = { size: 20, className: "notification-type-icon" };
    
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
      
      <div className="pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="card bg-base-100 shadow-lg border border-base-300 mb-6">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-base-content flex items-center gap-3">
                  <FaBell className="text-primary" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="badge badge-primary badge-sm">
                      {unreadCount}
                    </span>
                  )}
                </h1>
                
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="btn btn-outline btn-sm"
                  >
                    <FaCheckDouble className="mr-2" />
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="tabs tabs-bordered">
                <button
                  className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({notifications?.length || 0})
                </button>
                <button
                  className={`tab ${filter === 'unread' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  className={`tab ${filter === 'read' ? 'tab-active' : ''}`}
                  onClick={() => setFilter('read')}
                >
                  Read ({(notifications?.length || 0) - unreadCount})
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="card bg-base-100 shadow-lg border border-base-300">
                <div className="card-body p-8 text-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="mt-4 text-base-content/70">Loading notifications...</p>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="card bg-base-100 shadow-lg border border-base-300">
                <div className="card-body p-12 text-center">
                  <FaBell size={48} className="mx-auto text-base-content/30 mb-4" />
                  <h3 className="text-lg font-medium text-base-content/70 mb-2">
                    {filter === 'all' ? 'No notifications yet' : 
                     filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
                  </h3>
                  <p className="text-base-content/50">
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
                    !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          !notification.isRead ? 'bg-primary/20' : 'bg-base-200'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm leading-relaxed ${
                              !notification.isRead ? 'font-medium text-base-content' : 'text-base-content/80'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-3 mt-2">
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
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowActions(showActions === notification.id ? null : notification.id);
                              }}
                              className="btn btn-ghost btn-sm btn-circle opacity-60 hover:opacity-100"
                            >
                              <FaEllipsisV size={12} />
                            </button>

                            {showActions === notification.id && (
                              <div className="absolute right-0 top-8 z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-2 min-w-40">
                                {!notification.isRead && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2"
                                  >
                                    <FaCheck size={12} />
                                    Mark as read
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteNotification(notification.id, e)}
                                  className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2"
                                >
                                  <FaTrash size={12} />
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