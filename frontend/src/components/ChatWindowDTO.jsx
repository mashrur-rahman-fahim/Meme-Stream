import React, { useEffect, useState, useContext, useRef } from "react";
import api from "../utils/axios";
import { getApiBaseUrl } from "../utils/api-config";
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
import { useSearchParams } from "react-router-dom";

const ChatWindowDTO = ({ token, receiverId, groupName, currentUserId }) => {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactions, setReactions] = useState({});
  const [readMap, setReadMap] = useState({});
  const { incrementUnread, clearUnread, addNotification, updateLatestMessage } = useContext(ChatContext);
  const [searchParams] = useSearchParams();
  const anchorMessageId = parseInt(searchParams.get("msg"));
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const ding = new Audio("/sounds/ding.mp3");
  const connectionRef = useRef(null);

  const userIdRef = useRef(currentUserId);
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isScrolledToBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  useEffect(() => {
    const key = receiverId || `group-${groupName}`;

    const fetchHistory = async () => {
      try {
        const res = await api.get(
          groupName
            ? `/chat/group/${groupName.replace("group-", "")}/messages`
            : `/chat/private/${receiverId}`,
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
        (senderId, msg, messageId, sentAt, senderName) => {
          const shouldAutoScroll = isScrolledToBottom();

          setChatLog((prev) => {
            const messageExists = prev.some(m => m.id === messageId);
            if (messageExists) return prev;
            return [
              ...prev,
              { id: messageId, senderId: parseInt(senderId), msg, sentAt },
            ];
          });

          updateLatestMessage(
            receiverId.toString(),
            msg,
            senderName || `User ${senderId}`,
            sentAt
          );

          if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
            setTimeout(scrollToBottom, 100);
          }
        },
        (senderId, msg, messageId, sentAt, senderName, groupId) => {
          const shouldAutoScroll = isScrolledToBottom();

          setChatLog((prev) => {
            const messageExists = prev.some(m => m.id === messageId);
            if (messageExists) return prev;
            return [
              ...prev,
              { id: messageId, senderId: parseInt(senderId), msg, sentAt },
            ];
          });

          updateLatestMessage(
            `group-${groupId || groupName.replace("group-", "")}`,
            msg,
            senderName || `User ${senderId}`,
            sentAt
          );

          if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
            setTimeout(scrollToBottom, 100);
          }
        },
        ({ type, senderId, message, senderName, groupId, timestamp }) => {
          const notifyKey = type === "private" ? senderId : `group-${groupId || groupName}`;
          incrementUnread(notifyKey);

          addNotification({
            type,
            senderId,
            senderName: senderName || `User ${senderId}`,
            message,
            groupId,
            timestamp: timestamp || new Date(),
            chatKey: notifyKey
          });

          if (document.visibilityState !== "visible") {
            ding.play();
          }
        },
        (senderId, isTyping) => {
          if (senderId !== userIdRef.current) {
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
    if (anchorMessageId && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(scrollToBottom, 100);
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

    if (groupName) {
      sendGroupMessage(groupName, message);
    } else {
      sendPrivateMessage(receiverId, message);
    }

    const chatKey = groupName ? `group-${groupName.replace("group-", "")}` : receiverId.toString();
    updateLatestMessage(chatKey, message, "You", new Date());

    setMessage("");
    if (receiverId) sendTypingStatus(receiverId, false);
    setTimeout(scrollToBottom, 50);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (receiverId) formData.append("receiverId", receiverId);
    if (groupName) formData.append("groupId", groupName.replace("group-", ""));

    try {
      const res = await api.post("/chat/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

      const chatKey = groupName ? `group-${groupName.replace("group-", "")}` : receiverId.toString();
      updateLatestMessage(chatKey, "📎 File", "You", new Date());

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  return (
    <div className="p-4 bg-base-200 rounded shadow w-full max-w-md">
      <div
        ref={chatContainerRef}
        className="overflow-y-auto h-64 mb-2 border border-base-300 rounded px-2 py-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {chatLog.map((entry, idx) => {
          const isSender = entry.senderId === userIdRef.current;
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
                      href={`${getApiBaseUrl().replace('/api', '')}/${entry.filePath}`}
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

        <div ref={messagesEndRef} />
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
        onKeyPress={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <button className="btn btn-primary w-full" onClick={handleSend}>
        Send
      </button>
    </div>
  );
};

export default ChatWindowDTO;
