import React from "react";

const NotificationDropdown = ({
  totalUnread,
  notifications,
  onClearAllNotifications,
  onRemoveNotification
}) => {
  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle btn-sm relative">
        <div className="indicator">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {totalUnread > 0 && (
            <span className="badge badge-xs badge-primary indicator-item">
              {totalUnread}
            </span>
          )}
        </div>
      </label>
      
      {/* This will be positioned outside the sidebar */}
      <div className="dropdown-content hidden absolute">
        {/* This is a placeholder for DaisyUI's JavaScript to work */}
      </div>
    </div>
  );
};

// Separate component for the dropdown content that can be rendered outside the sidebar
export const NotificationDropdownContent = ({
  notifications,
  onClearAllNotifications,
  onRemoveNotification,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-40" 
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="absolute right-4 top-16 z-50 bg-base-100 rounded-box shadow-lg w-80 max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={onClearAllNotifications}
                className="text-sm text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div>
            {notifications.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                No new notifications
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-3 border-b border-base-200 last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{notification.senderName}</span>
                      <button 
                        onClick={() => onRemoveNotification(notification.id)} 
                        className="text-sm btn btn-ghost btn-xs px-2"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;