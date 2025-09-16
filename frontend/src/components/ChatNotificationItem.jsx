import React from 'react';
import { Link } from 'react-router-dom';

const ChatNotificationItem = ({ notification, onClose }) => {
  const getNotificationLink = () => {
    if (notification.type === 'private') {
      return `/chat/private/${notification.senderId}`;
    } else {
      return `/chat/group/${notification.chatKey?.replace('group-', '') || notification.groupId}`;
    }
  };

  const getNotificationIcon = () => {
    if (notification.type === 'private') {
      return '💬';
    } else {
      return '👥';
    }
  };

  return (
    <div className="animate-fadeIn">
      <Link
        to={getNotificationLink()}
        className="block p-3 hover:bg-base-300 rounded-lg transition-colors duration-200"
        onClick={onClose}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl mt-1">{getNotificationIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-sm">
                {notification.senderName || `User ${notification.senderId}`}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {notification.message}
            </p>
            <div className="text-xs text-primary mt-1">
              {notification.type === 'private' ? 'Private message' : 'Group message'}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ChatNotificationItem;