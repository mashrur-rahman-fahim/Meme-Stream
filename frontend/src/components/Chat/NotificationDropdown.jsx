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
      <div tabIndex={0} className="mt-3 z-50 card card-compact dropdown-content w-80 bg-base-100 shadow">
        <div className="card-body">
          <div className="flex justify-between items-center mb-2">
            <h3 className="card-title text-sm">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={onClearAllNotifications}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No new notifications
              </div>
            ) : (
              <div className="divide-y divide-base-200">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{notification.senderName}</span>
                      <button onClick={() => onRemoveNotification(notification.id)} className="text-xs">
                        ×
                      </button>
                    </div>
                    <p className="text-sm">{notification.message}</p>
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