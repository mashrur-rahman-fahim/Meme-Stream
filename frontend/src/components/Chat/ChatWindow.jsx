import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { TypingIndicator } from "./ChatStatusIndicator";

const ChatWindow = ({
  currentChat,
  currentUserId,
  chatType,
  chatName,
  message,
  chatLog,
  otherTyping,
  reactions,
  readMap,
  connectionError,
  messagesEndRef,
  chatContainerRef,
  onToggleGroupManagement,
  onTyping,
  onSend,
  onFileUpload,
  onReactToMessage,
  onEditMessage,
  onDeleteMessage,
  onFetchReactions,
  // Enhanced props
  replyingTo,
  onReply,
  onCancelReply,
  onScrollToMessage,
  typingUsers,
  userPresence,
  currentChatId
}) => {
  if (!currentChat || !currentUserId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base-200">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold mb-2">Welcome to Chat</h2>
          <p className="text-gray-500">
            Select a conversation from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      
      {/* Connection error banner */}
      {connectionError && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm">{connectionError}</p>
            <button onClick={() => setConnectionError("")} className="text-yellow-700 hover:text-yellow-900">
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Chat messages */}
      <MessageList
        chatLog={chatLog}
        currentUserId={currentUserId}
        reactions={reactions}
        readMap={readMap}
        otherTyping={otherTyping}
        chatContainerRef={chatContainerRef}
        messagesEndRef={messagesEndRef}
        chatType={chatType}
        onReactToMessage={onReactToMessage}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onFetchReactions={onFetchReactions}
        currentChat={currentChat}
        // Enhanced props
        onReply={onReply}
        onScrollToMessage={onScrollToMessage}
        replyingTo={replyingTo}
        userPresence={userPresence}
      />

      {/* Enhanced Typing Indicator */}
      <TypingIndicator
        typingUsers={typingUsers}
        chatType={chatType}
      />

      {/* Message input */}
      <MessageInput
        message={message}
        onTyping={onTyping}
        onSend={onSend}
        onFileUpload={onFileUpload}
        // Enhanced props
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
      />

    </div>
  );
};

export default ChatWindow;