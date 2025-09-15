import React from "react";

const MessageInput = ({ message, onTyping, onSend, onFileUpload }) => {
  return (
    <div className="p-4 bg-base-200 border-t border-base-300">
      <input
        type="file"
        onChange={onFileUpload}
        className="file-input file-input-bordered w-full mb-2"
      />

      <div className="flex gap-2">
        <textarea
          className="textarea textarea-bordered flex-1"
          value={message}
          onChange={onTyping}
          placeholder="Type your message..."
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
        />
        <button className="btn btn-primary" onClick={onSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageInput;