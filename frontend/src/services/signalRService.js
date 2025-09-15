import * as signalR from "@microsoft/signalr";
import { getWebSocketUrl } from "../utils/api-config";

let connection = null;

export const startSignalRConnection = async (
  token,
  onPrivateMessage,
  onGroupMessage,
  onNotify,
  onTypingStatus,
  onReactionUpdate, // Add this new callback for reaction updates
  onMessageEdit,    // Add this for message edits
  onMessageDelete,  // Add this for message deletion
  onReadReceipt     // Add this for read receipts
) => {
  const webSocketUrl = getWebSocketUrl();
  console.log('Connecting to SignalR chat hub at:', `${webSocketUrl}/chathub`);
  
  // Check if we're in production (Render.com has WebSocket issues)
  const isProduction = webSocketUrl.includes('onrender.com') || webSocketUrl.includes('render.com');
  
  const connectionOptions = {
    accessTokenFactory: () => token,
  };
  
  // For production, skip WebSockets due to proxy issues
  if (isProduction) {
    console.log('Production environment detected - using fallback transports for chat');
    connectionOptions.transport = signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling;
  }

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${webSocketUrl}/chathub`, connectionOptions)
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // Message handlers
  connection.on("ReceiveMessage", (senderId, message, messageId, sentAt) => {
    console.log("Received private message:", { senderId, message, messageId, sentAt });
    if (onPrivateMessage) onPrivateMessage(senderId, message, messageId, sentAt);
    if (onNotify) onNotify({ type: "private", senderId, message });
  });

  connection.on("ReceiveGroupMessage", (senderId, message, messageId, sentAt) => {
    console.log("Received group message:", { senderId, message, messageId, sentAt });
    if (onGroupMessage) onGroupMessage(senderId, message, messageId, sentAt);
    if (onNotify) onNotify({ type: "group", senderId, message });
  });

  connection.on("ReceiveTypingStatus", (senderId, isTyping) => {
    console.log("Received typing status:", { senderId, isTyping });
    if (onTypingStatus) onTypingStatus(senderId, isTyping);
  });

  // Reaction handler - updated to receive object
  connection.on("ReceiveReaction", (reactionData) => {
    console.log("Received reaction update:", reactionData);
    if (onReactionUpdate) onReactionUpdate(reactionData);
  });

  // Message edit handler
  connection.on("ReceiveMessageEdit", (messageId, newContent, editedAt) => {
    console.log("Received message edit:", { messageId, newContent, editedAt });
    if (onMessageEdit) onMessageEdit(messageId, newContent, editedAt);
  });

  // Message delete handler
  connection.on("ReceiveMessageDelete", (messageId) => {
    console.log("Received message delete:", messageId);
    if (onMessageDelete) onMessageDelete(messageId);
  });

  // Read receipt handler
  connection.on("ReceiveReadReceipt", (messageId, userId) => {
    console.log("Received read receipt:", { messageId, userId });
    if (onReadReceipt) onReadReceipt(messageId, userId);
  });

  // Connection state handlers
  connection.onclose((error) => {
    console.error("SignalR connection closed:", error);
  });

  connection.onreconnecting((error) => {
    console.warn("SignalR reconnecting:", error);
  });

  connection.onreconnected((connectionId) => {
    console.log("SignalR reconnected:", connectionId);
  });

  try {
    await connection.start();
    console.log("SignalR connected successfully");
    return connection;
  } catch (err) {
    console.error("SignalR connection failed:", err);
    return null;
  }
};

// Get current connection
export const getConnection = () => {
  return connection;
};

// Check if connection is ready
export const isConnected = () => {
  return connection && connection.state === signalR.HubConnectionState.Connected;
};

// Message actions with proper error handling
export const sendPrivateMessage = async (receiverId, message) => {
  if (isConnected()) {
    try {
      await connection.invoke("SendPrivateMessage", receiverId, message);
    } catch (error) {
      console.error("Failed to send private message:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const sendGroupMessage = async (groupName, message) => {
  if (isConnected()) {
    try {
      await connection.invoke("SendGroupMessage", groupName, message);
    } catch (error) {
      console.error("Failed to send group message:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const joinGroup = async (groupName) => {
  if (isConnected()) {
    try {
      await connection.invoke("JoinGroup", groupName);
      console.log("Joined group:", groupName);
    } catch (error) {
      console.error("Failed to join group:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const leaveGroup = async (groupName) => {
  if (isConnected()) {
    try {
      await connection.invoke("LeaveGroup", groupName);
      console.log("Left group:", groupName);
    } catch (error) {
      console.error("Failed to leave group:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const sendTypingStatus = async (receiverId, isTyping) => {
  if (isConnected()) {
    try {
      await connection.invoke("SendTypingStatus", receiverId, isTyping);
    } catch (error) {
      console.error("Failed to send typing status:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const reactToMessage = async (messageId, emoji) => {
  if (isConnected()) {
    try {
      console.log("Sending reaction:", { messageId, emoji });
      await connection.invoke("ReactToMessage", messageId, emoji);
    } catch (error) {
      console.error("Failed to react to message:", error);
      throw error;
    }
  } else {
    console.error("SignalR connection not ready");
    throw new Error("Connection not ready");
  }
};

export const editMessage = async (messageId, newContent) => {
  if (isConnected()) {
    try {
      await connection.invoke("EditMessage", messageId, newContent);
    } catch (error) {
      console.error("Failed to edit message:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const deleteMessage = async (messageId) => {
  if (isConnected()) {
    try {
      await connection.invoke("DeleteMessage", messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

export const markMessageAsRead = async (messageId) => {
  if (isConnected()) {
    try {
      await connection.invoke("MarkAsRead", messageId);
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      throw error;
    }
  } else {
    throw new Error("Connection not ready");
  }
};

// Disconnect function
export const disconnect = async () => {
  if (connection) {
    try {
      await connection.stop();
      console.log("SignalR connection stopped");
    } catch (error) {
      console.error("Failed to stop connection:", error);
    }
  }
};

// Reconnect function
export const reconnect = async () => {
  if (connection) {
    try {
      await connection.start();
      console.log("SignalR reconnected");
      return true;
    } catch (error) {
      console.error("Failed to reconnect:", error);
      return false;
    }
  }
  return false;
};