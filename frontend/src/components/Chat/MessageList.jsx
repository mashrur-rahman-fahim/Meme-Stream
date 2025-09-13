import React from "react";

const MessageList = ({
  chatLog,
  currentUserId,
  reactions,
  readMap,
  otherTyping,
  chatContainerRef,
  messagesEndRef,
  chatType,
  onReactToMessage,
  onEditMessage,
  onDeleteMessage
}) => {
  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 bg-base-100"
      style={{ scrollBehavior: "smooth" }}
    >
      {chatLog.map((entry, idx) => {
        const isSender = entry.senderId === currentUserId;
        
        return (
          <div key={entry.id || idx} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
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
                      onClick={() => onReactToMessage(entry.id, emoji)}
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
                          if (newContent) onEditMessage(entry.id, newContent);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-red-400"
                        onClick={() => onDeleteMessage(entry.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {isSender && readMap[entry.id]?.length > 0 && (
                <div className="text-xs text-right text-green-500 mt-1">
                  {chatType === "group" ? (
                    <span title={readMap[entry.id].join(", ")}>Seen by {readMap[entry.id].length}</span>
                  ) : (
                    readMap[entry.id].includes(parseInt(currentChat)) && "Seen"
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
  );
};

export default MessageList;