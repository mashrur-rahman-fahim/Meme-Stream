import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import {
  startSignalRConnection,
  sendPrivateMessage,
  sendGroupMessage,
  joinGroup,
  sendTypingStatus,
  reactToMessage,
  editMessage,
  deleteMessage,
  markMessageAsRead,
} from "../services/signalRService";
import { ChatContext } from "../../context/ChatContext";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

const ChatWindow = ({ token, receiverId, groupName, currentUserId }) => {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactions, setReactions] = useState({});
  const [readMap, setReadMap] = useState({});
  const { incrementUnread, clearUnread } = useContext(ChatContext);
  const [searchParams] = useSearchParams();
  const anchorMessageId = parseInt(searchParams.get("msg"));
  const scrollRef = useRef(null);
  const ding = new Audio("/sounds/ding.mp3");
  const connectionRef = useRef(null);

  useEffect(() => {
    const key = receiverId || `group-${groupName}`;

    const fetchHistory = async () => {
      try {
        const res = await axios.get(
          groupName
            ? `http://localhost:5216/api/chat/group/${groupName.replace("group-", "")}/messages`
            : `http://localhost:5216/api/chat/private/${receiverId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const history = res.data.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          msg: m.content,
          fileName: m.fileName,
          filePath: m.filePath,
          sentAt: m.sentAt,
          editedAt: m.editedAt,
          isDeleted: m.isDeleted,
        }));
        setChatLog(history);
      } catch (err) {
        console.error("Error fetching message history:", err);
      }
    };

    const initConnection = async () => {
      const conn = await startSignalRConnection(
        token,
        (senderId, msg, messageId, sentAt) => {
          // Add message to chat log immediately
          setChatLog((prev) => [
            ...prev,
            {
              id: messageId || Date.now(),
              senderId,
              msg,
              sentAt: sentAt || new Date().toISOString(),
            },
          ]);
        },
        (senderId, msg, messageId, sentAt) => {
          // Add group message to chat log immediately
          setChatLog((prev) => [
            ...prev,
            {
              id: messageId || Date.now(),
              senderId,
              msg,
              sentAt: sentAt || new Date().toISOString(),
            },
          ]);
        },
        ({ type, senderId, message }) => {
          const notifyKey = type === "private" ? senderId : `group-${groupName}`;
          incrementUnread(notifyKey);
          toast.success(`New ${type} message from ${senderId}`, {
            duration: 3000,
            position: "bottom-right",
          });
          if (document.visibilityState !== "visible") {
            ding.play();
          }
        },
        (senderId, isTyping) => {
          if (senderId !== currentUserId) {
            setOtherTyping(isTyping);
          }
        }
      );

      connectionRef.current = conn;

      conn.on("ReceiveReaction", (messageId, userId, emoji) => {
        setReactions((prev) => {
          const existing = prev[messageId] || [];
          return {
            ...prev,
            [messageId]: [...existing, { userId, emoji }],
          };
        });
      });

      conn.on("ReceiveMessageEdit", (messageId, newContent, editedAt) => {
        setChatLog((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, msg: newContent, editedAt } : msg
          )
        );
      });

      conn.on("ReceiveMessageDelete", (messageId) => {
        setChatLog((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, msg: "[deleted]", isDeleted: true } : msg
          )
        );
      });

      conn.on("ReceiveReadReceipt", (messageId, userId) => {
        setReadMap((prev) => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), userId],
        }));
      });

      const waitUntilConnected = () =>
        new Promise((resolve) => {
          const check = () => {
            if (conn.state === "Connected") resolve();
            else setTimeout(check, 50);
          };
          check();
        });

      await waitUntilConnected();

      if (groupName) {
        await joinGroup(groupName);
      }

      clearUnread(key);
    };

    fetchHistory();
    initConnection();

    // Cleanup function
    return () => {
      if (connectionRef.current) {
        connectionRef.current.off("ReceiveReaction");
        connectionRef.current.off("ReceiveMessageEdit");
        connectionRef.current.off("ReceiveMessageDelete");
        connectionRef.current.off("ReceiveReadReceipt");
      }
    };
  }, [token, receiverId, groupName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [chatLog]);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (receiverId) {
      sendTypingStatus(receiverId, true);
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        sendTypingStatus(receiverId, false);
      }, 1000);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;

    // Add message to chat log immediately for instant feedback
    const tempMessageId = Date.now();
    setChatLog((prev) => [
      ...prev,
      {
        id: tempMessageId,
        senderId: currentUserId,
        msg: message,
        sentAt: new Date().toISOString(),
      },
    ]);

    // Send message via SignalR
    if (groupName) {
      sendGroupMessage(groupName, message);
    } else {
      sendPrivateMessage(receiverId, message);
    }

    setMessage("");
    if (receiverId) sendTypingStatus(receiverId, false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (receiverId) formData.append("receiverId", receiverId);
    if (groupName) formData.append("groupId", groupName.replace("group-", ""));

    try {
      const res = await axios.post("http://localhost:5216/api/chat/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Add file message to chat log immediately
      setChatLog((prev) => [
        ...prev,
        {
          id: res.data.id,
          senderId: res.data.senderId,
          fileName: res.data.fileName,
          filePath: res.data.filePath,
          sentAt: res.data.sentAt,
        },
      ]);

      toast.success(`File sent: ${res.data.fileName}`);
    } catch (err) {
      toast.error("Upload failed");
      console.error(err);
    }
  };

  return (
    <div className="p-4 bg-base-200 rounded shadow w-full max-w-md">
      <div className="overflow-y-auto h-64 mb-2 border border-base-300 rounded px-2 py-1">
        {chatLog.map((entry, idx) => {
          const isSender = entry.senderId === currentUserId;
          const ref = entry.id === anchorMessageId ? scrollRef : null;

          return (
            <div key={entry.id || idx} ref={ref} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  isSender ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                }`}
              >
                {entry.msg && <div>{entry.msg}</div>}

                {entry.filePath && (
                  <div className="mt-2">
                    <a
                      href={`http://localhost:5216/${entry.filePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      📎 {entry.fileName}
                    </a>
                  </div>
                )}

                <div className="text-xs text-right opacity-70 mt-1">
                  {new Date(entry.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {entry.editedAt && !entry.isDeleted && (
                    <span className="ml-2 italic opacity-50">(edited)</span>
                  )}
                </div>

                {reactions[entry.id]?.length > 0 && (
                  <div className="flex gap-1 mt-1 text-sm">
                    {reactions[entry.id].map((r, i) => (
                      <span key={i}>{r.emoji}</span>
                    ))}
                  </div>
                )}

                {!entry.isDeleted && (
                  <div className="flex gap-2 mt-1">
                    {["👍", "😂", "❤️"].map((emoji) => (
                      <button
                        key={emoji}
                        className="text-xs"
                        onClick={() => reactToMessage(entry.id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                    {isSender && (
                      <>
                        <button
                          className="text-xs text-yellow-300"
                          onClick={() => {
                            const newContent = prompt("Edit message:", entry.msg);
                            if (newContent) editMessage(entry.id, newContent);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-xs text-red-400"
                          onClick={() => deleteMessage(entry.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}

                {isSender && readMap[entry.id]?.length > 0 && (
                  <div className="text-xs text-right text-green-500 mt-1">
                    {groupName ? (
                      <span title={readMap[entry.id].join(", ")}>Seen by {readMap[entry.id].length}</span>
                    ) : (
                      readMap[entry.id].includes(receiverId) && "Seen"
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="text-xs text-gray-500 italic mt-1">Typing...</div>
        )}
      </div>

      <input
        type="file"
        onChange={handleFileUpload}
        className="file-input file-input-bordered w-full mb-2"
      />

      <textarea
        className="textarea textarea-bordered w-full mb-2"
        value={message}
        onChange={handleTyping}
        placeholder="Type your message..."
      />
      <button className="btn btn-primary w-full" onClick={handleSend}>
        Send
      </button>
    </div>
  );
};

export default ChatWindow;