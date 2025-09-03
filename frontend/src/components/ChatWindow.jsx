import React, { useEffect, useState } from "react";
import {
  startSignalRConnection,
  sendPrivateMessage,
  sendGroupMessage,
  joinGroup,
} from "../services/signalRService";

const ChatWindow = ({ token, receiverId, groupName }) => {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    startSignalRConnection(token,
      (senderId, msg) => {
        setChatLog(prev => [...prev, { senderId, msg }]);
      },
      (senderId, msg) => {
        setChatLog(prev => [...prev, { senderId, msg }]);
      }
    );

    if (groupName) joinGroup(groupName);
  }, [token, groupName]);

  const handleSend = () => {
    if (groupName) sendGroupMessage(groupName, message);
    else sendPrivateMessage(receiverId, message);
    setMessage("");
  };

  return (
    <div className="p-4 bg-base-200 rounded shadow w-full max-w-md">
      <div className="overflow-y-auto h-64 mb-2 border border-base-300 rounded">
        {chatLog.map((entry, idx) => (
          <div key={idx} className="text-sm p-1">
            <strong>{entry.senderId}:</strong> {entry.msg}
          </div>
        ))}
      </div>
      <textarea
        className="textarea textarea-bordered w-full mb-2"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button className="btn btn-primary w-full" onClick={handleSend}>
        Send
      </button>
    </div>
  );
};

export default ChatWindow;
