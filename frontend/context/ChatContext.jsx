import { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [unreadMap, setUnreadMap] = useState({}); 

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

  return (
    <ChatContext.Provider value={{ unreadMap, incrementUnread, clearUnread }}>
      {children}
    </ChatContext.Provider>
  );
};
