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
  const [showEditModal, setShowEditModal] = useState(null);
  const [editText, setEditText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(null);

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
    setEditText(entry.msg);
    setShowEditModal(entry.id);
  };

  const handleEditSubmit = (messageId) => {
    if (editText && editText.trim() !== "") {
      onEditMessage(messageId, editText.trim());
    }
    setShowEditModal(null);
    setEditText("");
  };

  const handleEditCancel = () => {
    setShowEditModal(null);
    setEditText("");
  };

  const handleDeleteClick = (messageId) => {
    setShowDeleteModal(messageId);
  };

  const handleDeleteConfirm = (messageId) => {
    onDeleteMessage(messageId);
    setShowDeleteModal(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(null);
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

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: modalSlideIn 0.3s ease-out;
        }

        .modal-content {
          background: linear-gradient(135deg, #1f2937, #111827);
          border: 1px solid #374151;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          animation: modalSlideIn 0.3s ease-out;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #374151;
        }

        .modal-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        }

        .modal-icon.delete {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }

        .modal-textarea {
          width: 100%;
          min-height: 80px;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 8px;
          padding: 12px;
          color: #f9fafb;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 20px;
          font-family: inherit;
        }

        .modal-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-textarea::placeholder {
          color: #9ca3af;
        }

        .modal-message {
          color: #d1d5db;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-button {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          min-width: 70px;
        }

        .modal-button.primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }

        .modal-button.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .modal-button.danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .modal-button.danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .modal-button.secondary {
          background: #374151;
          color: #d1d5db;
          border: 1px solid #4b5563;
        }

        .modal-button.secondary:hover {
          background: #4b5563;
          color: #f9fafb;
        }

        .char-counter {
          text-align: right;
          font-size: 12px;
          color: #9ca3af;
          margin-top: -16px;
          margin-bottom: 16px;
        }

        .char-counter.warning {
          color: #f59e0b;
        }

        .char-counter.danger {
          color: #ef4444;
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

      {/* Edit Message Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={handleEditCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="m18.5 2.5 a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h3 className="modal-title">Edit Message</h3>
            </div>
            
            <textarea
              className="modal-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Enter your updated message..."
              autoFocus
              maxLength={1000}
            />
            
            <div className={`char-counter ${editText.length > 800 ? 'warning' : ''} ${editText.length > 950 ? 'danger' : ''}`}>
              {editText.length}/1000
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-button secondary" 
                onClick={handleEditCancel}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary" 
                onClick={() => handleEditSubmit(showEditModal)}
                disabled={!editText.trim() || editText.length > 1000}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                </svg>
              </div>
              <h3 className="modal-title">Delete Message</h3>
            </div>
            
            <p className="modal-message">
              Are you sure you want to delete this message? This action cannot be undone and the message will be removed for everyone in the chat.
            </p>
            
            <div className="modal-actions">
              <button 
                className="modal-button secondary" 
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button 
                className="modal-button danger" 
                onClick={() => handleDeleteConfirm(showDeleteModal)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;