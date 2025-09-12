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
  const messagesEndRef = useRef(null); // New ref for auto-scroll
  const chatContainerRef = useRef(null); // Ref for chat container
  const ding = new Audio("/sounds/ding.mp3");
  const connectionRef = useRef(null);
  
  // Create a ref for currentUserId to avoid stale closures
  const userIdRef = useRef(currentUserId);
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check if user is scrolled to bottom (to decide whether to auto-scroll)
  const isScrolledToBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50; // 50px tolerance
  };

  useEffect(() => {
    console.log("ChatWindow mounted with:", { receiverId, groupName, currentUserId });
    
    const key = receiverId || `group-${groupName}`;

    const fetchHistory = async () => {
      try {
        console.log("Fetching message history for:", key);
        const res = await axios.get(
          groupName
            ? `http://localhost:5216/api/GroupMessage/group/${groupName.replace("group-", "")}/messages`
            : `http://localhost:5216/api/PrivateMessage/private/${receiverId}`,
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
        console.log("Fetched history:", history.length, "messages");
        setChatLog(history);
      } catch (err) {
        console.error("Error fetching message history:", err);
      }
    };

    const initConnection = async () => {
      const conn = await startSignalRConnection(
        token,
        (senderId, msg, messageId, sentAt) => {
          console.log("Received private message:", { senderId, msg, messageId, sentAt });
          
          // Check if user is scrolled to bottom before adding new message
          const shouldAutoScroll = isScrolledToBottom();
          
          // Add message to chat log from server response only
          setChatLog((prev) => {
            const messageExists = prev.some(m => m.id === messageId);
            if (messageExists) {
              console.log("Message already exists, skipping:", messageId);
              return prev;
            }
            
            console.log("Adding new private message to chat log:", messageId);
            return [
              ...prev,
              {
                id: messageId,
                senderId: parseInt(senderId),
                msg,
                sentAt: sentAt,
              },
            ];
          });

          // Auto-scroll if user was at bottom or if it's their own message
          if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
            setTimeout(scrollToBottom, 100);
          }
        },
        (senderId, msg, messageId, sentAt) => {
          console.log("Received group message:", { senderId, msg, messageId, sentAt });
          
          // Check if user is scrolled to bottom before adding new message
          const shouldAutoScroll = isScrolledToBottom();
          
          // Add group message to chat log from server response only
          setChatLog((prev) => {
            const messageExists = prev.some(m => m.id === messageId);
            if (messageExists) {
              console.log("Group message already exists, skipping:", messageId);
              return prev;
            }
            
            console.log("Adding new group message to chat log:", messageId);
            return [
              ...prev,
              {
                id: messageId,
                senderId: parseInt(senderId),
                msg,
                sentAt: sentAt,
              },
            ];
          });

          // Auto-scroll if user was at bottom or if it's their own message
          if (shouldAutoScroll || parseInt(senderId) === userIdRef.current) {
            setTimeout(scrollToBottom, 100);
          }
        },
        ({ type, senderId, message }) => {
          console.log("Notification received:", { type, senderId, message });
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
          console.log("Typing status:", { senderId, isTyping });
          if (senderId !== userIdRef.current) {
            setOtherTyping(isTyping);
          }
        }
      );

      connectionRef.current = conn;

      conn.on("ReceiveReaction", (messageId, userId, emoji) => {
        console.log("Reaction received:", { messageId, userId, emoji });
        setReactions((prev) => {
          const existing = prev[messageId] || [];
          return {
            ...prev,
            [messageId]: [...existing, { userId, emoji }],
          };
        });
      });

      conn.on("ReceiveMessageEdit", (messageId, newContent, editedAt) => {
        console.log("Message edit received:", { messageId, newContent, editedAt });
        setChatLog((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, msg: newContent, editedAt } : msg
          )
        );
      });

      conn.on("ReceiveMessageDelete", (messageId) => {
        console.log("Message delete received:", messageId);
        setChatLog((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, msg: "[deleted]", isDeleted: true } : msg
          )
        );
      });

      conn.on("ReceiveReadReceipt", (messageId, userId) => {
        console.log("Read receipt received:", { messageId, userId });
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
      console.log("ChatWindow cleanup");
      if (connectionRef.current) {
        connectionRef.current.off("ReceiveReaction");
        connectionRef.current.off("ReceiveMessageEdit");
        connectionRef.current.off("ReceiveMessageDelete");
        connectionRef.current.off("ReceiveReadReceipt");
      }
    };
  }, [token, receiverId, groupName]);

  useEffect(() => {
    console.log("Chat log updated:", chatLog.length, "messages");
    
    // Scroll to anchor message if specified in URL
    if (anchorMessageId && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    
    // Auto-scroll to bottom on initial load and when new messages arrive
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
    if (!message.trim()) {
      console.log("Empty message, not sending");
      return;
    }

    console.log("Sending message:", message);
    
    // Send message via SignalR only (NO immediate chatLog addition)
    if (groupName) {
      sendGroupMessage(groupName, message);
    } else {
      sendPrivateMessage(receiverId, message);
    }

    setMessage("");
    if (receiverId) sendTypingStatus(receiverId, false);
    
    // Auto-scroll to bottom after sending (optimistic)
    setTimeout(scrollToBottom, 50);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Uploading file:", file.name);

    const formData = new FormData();
    formData.append("file", file);
    if (receiverId) formData.append("receiverId", receiverId);
    if (groupName) formData.append("groupId", groupName.replace("group-", ""));

    try {
      const res = await axios.post("http://localhost:5216/api/FileUpload/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("File upload successful:", res.data);

      // Add file message to chat log from server response
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
      
      // Auto-scroll after file upload
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("File upload failed:", err);
      toast.error("Upload failed");
    }
  };

  return (
    <div className="p-4 bg-base-200 rounded shadow w-full max-w-md">
      {/* Chat container with ref for scroll detection */}
      <div 
        ref={chatContainerRef}
        className="overflow-y-auto h-64 mb-2 border border-base-300 rounded px-2 py-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {chatLog.map((entry, idx) => {
          const isSender = entry.senderId === userIdRef.current;
          
          // Debug: Check for misclassifications
          if (entry.senderId !== userIdRef.current && entry.senderId === currentUserId) {
            console.warn("Misclassified message:", entry);
          }
          
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
        
        {/* Invisible element at the bottom for auto-scrolling */}
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

export default ChatWindow;