// components/SidebarChatItem.jsx
import React from 'react';

const SidebarChatItem = ({ 
  chatKey, 
  name, 
  lastMessage, 
  unreadCount, 
  isGroup = false, 
  onClick,
  isActive 
}) => {
  return (
    <div 
      className={`p-3 border-b border-base-300 cursor-pointer hover:bg-base-100 transition-colors ${
        isActive ? 'bg-blue-100' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isGroup ? 'bg-green-400' : 'bg-blue-400'}`}></div>
            <h4 className="font-semibold truncate">{name}</h4>
          </div>
          {lastMessage && (
            <p className="text-sm text-gray-600 truncate mt-1">
              {lastMessage.isOwnMessage ? 'You: ' : ''}
              {lastMessage.message}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
            {unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default SidebarChatItem;