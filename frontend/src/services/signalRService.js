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
  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${getWebSocketUrl()}/chathub`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.on("ReceiveMessage", (senderId, message) => {
    if (onPrivateMessage) onPrivateMessage(senderId, message);
    if (onNotify) onNotify({ type: "private", senderId, message });
  });

  connection.on("ReceiveGroupMessage", (senderId, message) => {
    if (onGroupMessage) onGroupMessage(senderId, message);
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


