import { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [unreadMap, setUnreadMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [latestMessages, setLatestMessages] = useState({}); // Simple storage

  const incrementUnread = (key) => {
    setUnreadMap((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  const clearUnread = (key) => {
    setUnreadMap((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      ...notification
    };
    
    setNotifications((prev) => {
      const newNotifications = [newNotification, ...prev].slice(0, 10);
      return newNotifications;
    });
    
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (notificationId) => {
    setNotifications((prev) => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Simple function to update latest message
  const updateLatestMessage = (chatKey, message, senderName) => {
    setLatestMessages((prev) => ({
      ...prev,
      [chatKey]: {
        content: message,
        senderName: senderName || 'User',
        timestamp: new Date()
      }
    }));
  };

  return (
    <ChatContext.Provider value={{ 
      unreadMap, 
      incrementUnread, 
      clearUnread,
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications,
      latestMessages,
      updateLatestMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
};