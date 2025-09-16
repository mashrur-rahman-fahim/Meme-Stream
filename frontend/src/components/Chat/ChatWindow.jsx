import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

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
  onFetchReactions, // Add this new prop
  currentChatId // You might need this if your MessageList uses it
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
      {/* Chat header */}
      <div className="bg-base-200 p-4 border-b border-base-300 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{chatName}</h2>
          <p className="text-sm text-gray-500">
            {chatType === 'private' ? 'Private conversation' : 'Group chat'}
          </p>
        </div>
        {chatType === 'group' && (
          <button 
            onClick={onToggleGroupManagement}
            className="btn btn-ghost btn-sm"
            title="Manage Group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
      
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
        onFetchReactions={onFetchReactions} // Pass the new prop
        currentChat={currentChat} // Make sure this is passed if MessageList needs it
      />
      
      {/* Message input */}
      <MessageInput
        message={message}
        onTyping={onTyping}
        onSend={onSend}
        onFileUpload={onFileUpload}
      />
    </div>
  );
};

export default ChatWindow;