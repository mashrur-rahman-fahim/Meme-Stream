import * as signalR from "@microsoft/signalr";

let connection = null;

export const startSignalRConnection = async (token, onPrivateMessage, onGroupMessage) => {
  connection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5216/chathub", {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.on("ReceiveMessage", (senderId, message) => {
    if (onPrivateMessage) onPrivateMessage(senderId, message);
  });

  connection.on("ReceiveGroupMessage", (senderId, message) => {
    if (onGroupMessage) onGroupMessage(senderId, message);
  });

  try {
    await connection.start();
    console.log("SignalR connected");
  } catch (err) {
    console.error("SignalR connection failed:", err);
  }
};

export const sendPrivateMessage = async (receiverId, message) => {
  if (connection) {
    await connection.invoke("SendPrivateMessage", receiverId, message);
  }
};

export const sendGroupMessage = async (groupName, message) => {
  if (connection) {
    await connection.invoke("SendGroupMessage", groupName, message);
  }
};

export const joinGroup = async (groupName) => {
  if (connection) {
    await connection.invoke("JoinGroup", groupName);
  }
};

export const leaveGroup = async (groupName) => {
  if (connection) {
    await connection.invoke("LeaveGroup", groupName);
  }
};
