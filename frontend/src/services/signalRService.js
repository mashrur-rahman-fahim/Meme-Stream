import * as signalR from "@microsoft/signalr";
import { getWebSocketUrl } from "../utils/api-config";

let connection = null;

export const startSignalRConnection = async (
  token,
  onPrivateMessage,
  onGroupMessage,
  onNotify,
  onTypingStatus
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

  // Updated to receive full payload
  connection.on("ReceiveMessage", (senderId, message, messageId, sentAt) => {
    if (onPrivateMessage) onPrivateMessage(senderId, message, messageId, sentAt);
    if (onNotify) onNotify({ type: "private", senderId, message });
  });

  connection.on("ReceiveGroupMessage", (senderId, message, messageId, sentAt) => {
    if (onGroupMessage) onGroupMessage(senderId, message, messageId, sentAt);
    if (onNotify) onNotify({ type: "group", senderId, message });
  });

  connection.on("ReceiveTypingStatus", (senderId, isTyping) => {
    if (onTypingStatus) onTypingStatus(senderId, isTyping);
  });

  try {
    await connection.start();
    console.log("SignalR connected");
    return connection;
  } catch (err) {
    console.error("SignalR connection failed:", err);
    return null;
  }
};

// Message actions
export const sendPrivateMessage = async (receiverId, message) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke("SendPrivateMessage", receiverId, message);
  }
};

export const sendGroupMessage = async (groupName, message) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke("SendGroupMessage", groupName, message);
  }
};

export const joinGroup = async (groupName) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke("JoinGroup", groupName);
  }
};

export const leaveGroup = async (groupName) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke("LeaveGroup", groupName);
  }
};

export const sendTypingStatus = async (receiverId, isTyping) => {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    await connection.invoke("SendTypingStatus", receiverId, isTyping);
  }
};

export const reactToMessage = async (messageId, emoji) => {
  if (connection && connection.state === "Connected") {
    await connection.invoke("ReactToMessage", messageId, emoji);
  }
};

export const editMessage = async (messageId, newContent) => {
  if (connection && connection.state === "Connected") {
    await connection.invoke("EditMessage", messageId, newContent);
  }
};

export const deleteMessage = async (messageId) => {
  if (connection && connection.state === "Connected") {
    await connection.invoke("DeleteMessage", messageId);
  }
};

export const markMessageAsRead = async (messageId) => {
  if (connection && connection.state === "Connected") {
    await connection.invoke("MarkAsRead", messageId);
  }
};


