import { createContext, useState } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [unread, setUnread] = useState({}); // { userId: count, groupId: count }

  const incrementUnread = (key) => {
    setUnread((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  const clearUnread = (key) => {
    setUnread((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  return (
    <ChatContext.Provider value={{ unread, incrementUnread, clearUnread }}>
      {children}
    </ChatContext.Provider>
  );
};
