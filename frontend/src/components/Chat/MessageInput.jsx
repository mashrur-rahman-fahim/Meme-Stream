import React, { useState } from "react";

const MessageInput = ({
  message,
  onTyping,
  onSend,
  onFileUpload,
  replyingTo,
  onCancelReply,
}) => {
  const [showFileOptions, setShowFileOptions] = useState(false);

  const handleMediaUpload = async (e, mediaType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Handle different media types
    if (mediaType === 'image' && file.type.startsWith('image/')) {
      await onFileUpload(e);
    } else if (mediaType === 'video' && file.type.startsWith('video/')) {
      await onFileUpload(e);
    } else {
      await onFileUpload(e);
    }

    setShowFileOptions(false);
  };

  return (
    <div className="p-4 bg-base-200 border-t border-base-300">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="mb-3 p-2 bg-base-100 rounded-lg border-l-4 border-primary">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span className="font-semibold text-primary">
                Replying to {replyingTo.senderName || `User ${replyingTo.senderId}`}
              </span>
              <p className="text-gray-600 truncate max-w-xs">
                {replyingTo.msg || replyingTo.content}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="btn btn-ghost btn-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* File options */}
      {showFileOptions && (
        <div className="mb-3 p-3 bg-base-100 rounded-lg">
          <div className="grid grid-cols-3 gap-2">
            <label className="btn btn-outline btn-sm">
              📷 Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleMediaUpload(e, 'image')}
                className="hidden"
              />
            </label>
            <label className="btn btn-outline btn-sm">
              🎥 Video
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleMediaUpload(e, 'video')}
                className="hidden"
              />
            </label>
            <label className="btn btn-outline btn-sm">
              📎 File
              <input
                type="file"
                onChange={(e) => handleMediaUpload(e, 'file')}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* Media attachment button */}
        <button
          onClick={() => setShowFileOptions(!showFileOptions)}
          className="btn btn-ghost btn-sm"
          title="Attach media"
        >
          📎
        </button>


        {/* Message input */}
        <textarea
          className="textarea textarea-bordered flex-1 resize-none"
          value={message}
          onChange={onTyping}
          placeholder={replyingTo ? "Type your reply..." : "Type your message..."}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          style={{ minHeight: '2.5rem' }}
        />

        {/* Send button */}
        <button
          className="btn btn-primary btn-sm"
          onClick={onSend}
          disabled={!message.trim()}
        >
          {replyingTo ? '↩️' : '➤'}
        </button>
      </div>

      {/* Quick emoji reactions */}
      <div className="flex gap-1 mt-2 justify-center">
        {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              // Quick emoji send
              onTyping({ target: { value: emoji } });
              setTimeout(onSend, 100);
            }}
            className="btn btn-ghost btn-xs hover:btn-primary"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MessageInput;