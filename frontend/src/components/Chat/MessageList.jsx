import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "../../utils/api-config"; 

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
  onDeleteMessage,
  currentChat,
  onFetchReactions
}) => {
  // Get API base URL and remove /api suffix for file downloads
  const API_BASE_URL = getApiBaseUrl().replace("/api", "");
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [animatingReactions, setAnimatingReactions] = useState(new Set());
  const [showReactionMenu, setShowReactionMenu] = useState(null);
  const [localReactions, setLocalReactions] = useState({});

  // Debug logging
  useEffect(() => {
    console.log("Reactions updated:", localReactions);
  }, [localReactions]);

  // Sync local reactions with parent reactions
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  const handleReactionClick = async (messageId, emoji) => {
    console.log("Reaction click:", messageId, emoji, "by user:", currentUserId);
    
    if (reactingMessageId === messageId) return;
    
    setReactingMessageId(messageId);
    setShowReactionMenu(null);
    
    // Check if user already reacted with this emoji
    const existingReaction = localReactions[messageId]?.find(
      r => r.reactorId === currentUserId && r.emoji === emoji
    );

    // Optimistic update - show reaction immediately
    const tempReactionId = Date.now();
    setLocalReactions(prev => {
      const newReactions = { ...prev };
      
      if (!newReactions[messageId]) {
        newReactions[messageId] = [];
      }
      
      if (existingReaction) {
        // Remove reaction optimistically
        newReactions[messageId] = newReactions[messageId].filter(
          r => !(r.reactorId === currentUserId && r.emoji === emoji)
        );
        
        // If no reactions left, remove the message entry
        if (newReactions[messageId].length === 0) {
          delete newReactions[messageId];
        }
      } else {
        // Remove any existing reaction from this user (for replacement)
        newReactions[messageId] = newReactions[messageId].filter(
          r => r.reactorId !== currentUserId
        );
        
        // Add new reaction optimistically
        newReactions[messageId].push({
          id: tempReactionId,
          reactorId: currentUserId,
          emoji: emoji,
          reactorName: "You",
          isOptimistic: true
        });
      }
      
      return newReactions;
    });

    const animationKey = `${messageId}-${emoji}`;
    setAnimatingReactions(prev => new Set(prev).add(animationKey));
    
    try {
      await onReactToMessage(messageId, emoji);
      
      // Remove optimistic reaction after successful server call
      // The real update should come via SignalR
      setLocalReactions(prev => {
        const newReactions = { ...prev };
        if (newReactions[messageId]) {
          newReactions[messageId] = newReactions[messageId].filter(
            r => !r.isOptimistic || r.id !== tempReactionId
          );
          
          if (newReactions[messageId].length === 0) {
            delete newReactions[messageId];
          }
        }
        return newReactions;
      });
    } catch (error) {
      console.error("Reaction failed:", error);
      // Revert optimistic update on error
      setLocalReactions(prev => {
        const newReactions = { ...prev };
        if (existingReaction) {
          // Restore the removed reaction
          if (!newReactions[messageId]) {
            newReactions[messageId] = [];
          }
          newReactions[messageId].push(existingReaction);
        } else {
          // Remove the added reaction
          if (newReactions[messageId]) {
            newReactions[messageId] = newReactions[messageId].filter(
              r => !r.isOptimistic || r.id !== tempReactionId
            );
          }
        }
        return newReactions;
      });
      alert(`Failed to ${existingReaction ? 'remove' : 'add'} reaction: ${error.message}`);
    } finally {
      setReactingMessageId(null);
      setTimeout(() => {
        setAnimatingReactions(prev => {
          const newSet = new Set(prev);
          newSet.delete(animationKey);
          return newSet;
        });
      }, 600);
    }
  };

  const handleEditClick = (entry) => {
    const newContent = prompt("Edit message:", entry.msg);
    if (newContent && newContent.trim() !== entry.msg) {
      onEditMessage(entry.id, newContent.trim());
    }
  };

  const handleDeleteClick = (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      onDeleteMessage(messageId);
    }
  };

  // Fetch reactions when a message becomes visible
  useEffect(() => {
    chatLog.forEach(entry => {
      if (entry.id && !localReactions[entry.id] && onFetchReactions) {
        onFetchReactions(entry.id);
      }
    });
  }, [chatLog, localReactions, onFetchReactions]);

  // Group reactions by emoji to show counts and check if current user reacted
  const getGroupedReactions = (messageId) => {
    if (!localReactions[messageId]) return [];
    
    const grouped = {};
    localReactions[messageId].forEach(reaction => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 1,
          reactors: [reaction.reactorName || `User ${reaction.reactorId}`],
          userReacted: reaction.reactorId === currentUserId
        };
      } else {
        grouped[reaction.emoji].count++;
        grouped[reaction.emoji].reactors.push(reaction.reactorName || `User ${reaction.reactorId}`);
        if (reaction.reactorId === currentUserId) {
          grouped[reaction.emoji].userReacted = true;
        }
      }
    });
    
    return Object.values(grouped);
  };

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 bg-base-100"
      style={{ scrollBehavior: "smooth" }}
      onClick={() => setShowReactionMenu(null)}
    >
      <style jsx>{`
        @keyframes reactionPop {
          0% { transform: scale(1) rotate(0deg); }
          20% { transform: scale(1.3) rotate(-5deg); }
          40% { transform: scale(1.1) rotate(3deg); }
          60% { transform: scale(1.2) rotate(-2deg); }
          80% { transform: scale(1.05) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        @keyframes reactionBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          25% { transform: translateY(-8px) scale(1.1); }
          50% { transform: translateY(-4px) scale(1.05); }
          75% { transform: translateY(-2px) scale(1.02); }
        }
        
        @keyframes reactionGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
        }
        
        @keyframes reactionShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: scale(0.8) translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        
        .message-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          margin-bottom: 4px;
        }
        
        .action-button {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(55, 65, 81, 0.9);
          border: 1px solid rgba(75, 85, 99, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          position: relative;
          overflow: visible;
        }
        
        .action-button:hover {
          background: rgba(75, 85, 99, 0.9);
          border-color: rgba(156, 163, 175, 0.8);
          transform: scale(1.1);
        }
        
        .action-button:active {
          transform: scale(0.95);
        }
        
        .action-button svg, .action-button span {
          color: #e5e7eb;
          font-size: 14px;
        }
        
        .reaction-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: rgba(31, 41, 55, 0.95);
          border: 1px solid rgba(75, 85, 99, 0.8);
          border-radius: 20px;
          padding: 12px 8px;
          backdrop-filter: blur(20px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: slideIn 0.2s ease-out;
          z-index: 1000;
          margin-bottom: 8px;
        }
        
        .reaction-emoji {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;
        }
        
        .reaction-emoji:hover {
          background: rgba(75, 85, 99, 0.8);
          transform: scale(1.2);
        }
        
        .reaction-display {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          backdrop-filter: blur(10px);
        }
        
        .reaction-display:hover {
          transform: scale(1.05);
          animation: reactionGlow 1s ease-in-out infinite;
        }
        
        .reaction-display.user-reacted {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4)) !important;
          border: 1px solid rgba(59, 130, 246, 0.6);
          animation: reactionShake 0.5s ease-in-out;
        }
        
        .reaction-display.just-added {
          animation: reactionBounce 0.8s ease-out;
        }
        
        .typing-animation {
          display: inline-block;
          animation: typing 1.4s ease-in-out infinite;
        }
        
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
      `}</style>
      
      {chatLog.map((entry, idx) => {
        const isSender = entry.senderId === currentUserId;
        const groupedReactions = getGroupedReactions(entry.id);
        const userHasReacted = groupedReactions.some(r => r.userReacted);
        
        return (
          <div key={entry.id || idx} className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                isSender ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
              }`}
            >
              {entry.msg && !entry.isDeleted && <div>{entry.msg}</div>}
              
              {entry.isDeleted && (
                <div className="italic text-gray-500">Message deleted</div>
              )}

              {entry.filePath && (
                <div className="mt-2">
                  <a
                    href={`${API_BASE_URL}/${entry.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 transition-colors"
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

              {groupedReactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 text-sm">
                  {groupedReactions.map((reaction, i) => {
                    const animationKey = `${entry.id}-${reaction.emoji}`;
                    const isAnimating = animatingReactions.has(animationKey);
                    
                    return (
                      <span 
                        key={i}
                        className={`reaction-display px-2 py-1 rounded-full cursor-pointer select-none transition-all ${
                          reaction.userReacted 
                            ? 'user-reacted' 
                            : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                        } ${isAnimating ? 'just-added' : ''}`}
                        title={reaction.reactors.join(", ")}
                        onClick={() => handleReactionClick(entry.id, reaction.emoji)}
                        style={{
                          animation: isAnimating ? 'reactionBounce 0.8s ease-out' : 'none'
                        }}
                      >
                        <span className="mr-1">{reaction.emoji}</span>
                        {reaction.count > 1 && (
                          <span className="text-xs font-medium">{reaction.count}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {!entry.isDeleted && (
                <div className="message-actions">
                  {/* Add Reaction Button */}
                  <div 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactionMenu(showReactionMenu === entry.id ? null : entry.id);
                    }}
                    title="Add reaction"
                    style={{ position: 'relative' }}
                  >
                    <span style={{ fontSize: '16px' }}>😀</span>
                    
                    {showReactionMenu === entry.id && (
                      <div className="reaction-menu">
                        {["👍", "😂", "❤️", "😫", "🔥", "🎉"].map((emoji) => (
                          <div
                            key={emoji}
                            className="reaction-emoji"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactionClick(entry.id, emoji);
                            }}
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {isSender && (
                    <>
                      {/* Edit Button */}
                      <div
                        className="action-button"
                        onClick={() => handleEditClick(entry)}
                        title="Edit message"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="m18.5 2.5 a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </div>
                      
                      {/* Delete Button */}
                      <div
                        className="action-button"
                        onClick={() => handleDeleteClick(entry.id)}
                        title="Delete message"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isSender && readMap[entry.id]?.length > 0 && (
                <div className="text-xs text-right text-green-400 mt-1 transition-colors">
                  {chatType === "group" ? (
                    <span title={readMap[entry.id].join(", ")}>
                      ✓ Seen by {readMap[entry.id].length}
                    </span>
                  ) : (
                    readMap[entry.id].includes(parseInt(currentChat)) && "✓ Seen"
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      <div ref={messagesEndRef} />
      
      {otherTyping && (
        <div className="text-xs text-gray-500 italic mt-1">
          <span className="typing-animation">💭</span>
          {" "}
          {typeof otherTyping === 'string' ? otherTyping : 'Typing...'}
        </div>
      )}
    </div>
  );
};

export default MessageList;