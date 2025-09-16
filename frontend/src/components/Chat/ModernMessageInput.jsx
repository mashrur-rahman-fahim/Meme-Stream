import React, { useState, useRef, useEffect } from "react";

const ModernMessageInput = ({
  message,
  replyingTo,
  theme,
  isDark,
  onMessageChange,
  onSend,
  onFileUpload,
  onEmojiToggle,
  onCancelReply,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [inputHeight, setInputHeight] = useState('auto');
  const [showSendButton, setShowSendButton] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // 5 lines approximately
      const newHeight = Math.min(scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      setInputHeight(`${newHeight}px`);
    }
  }, [message]);

  // Show/hide send button based on message content
  useEffect(() => {
    setShowSendButton(message.trim().length > 0);
  }, [message]);

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    e.target.value = ''; // Reset input
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') ||
                         file.type.startsWith('video/') ||
                         file.type.startsWith('audio/') ||
                         file.type === 'application/pdf' ||
                         file.type.startsWith('text/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only images, videos, audio, PDF, and text files under 50MB are allowed.');
    }

    // Create preview for files
    const previews = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      type: getFileType(file.type)
    }));

    setPreviewFiles(prev => [...prev, ...previews]);
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
  };

  const removePreviewFile = (id) => {
    setPreviewFiles(prev => {
      const updated = prev.filter(item => item.id !== id);
      // Clean up object URLs
      prev.forEach(item => {
        if (item.preview && item.id === id) {
          URL.revokeObjectURL(item.preview);
        }
      });
      return updated;
    });
  };

  const uploadFiles = async () => {
    for (const previewFile of previewFiles) {
      try {
        await onFileUpload(previewFile.file, previewFile.type);
      } catch (error) {
        console.error('File upload failed:', error);
        alert(`Failed to upload ${previewFile.file.name}`);
      }
    }

    // Clear previews
    previewFiles.forEach(item => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setPreviewFiles([]);
  };



  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Ctrl/Cmd + B for bold, I for italic, etc.
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**', '**'); // Bold
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('*', '*'); // Italic
          break;
        case 'u':
          e.preventDefault();
          insertFormatting('__', '__'); // Underline
          break;
      }
    }
  };

  const insertFormatting = (prefix, suffix) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    const newText = message.substring(0, start) +
                   prefix + selectedText + suffix +
                   message.substring(end);

    onMessageChange({ target: { value: newText } });

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  const handleSend = async () => {
    if (previewFiles.length > 0) {
      await uploadFiles();
    }

    if (message.trim()) {
      onSend();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'pdf': return '📄';
      default: return '📎';
    }
  };

  return (
    <div className={`modern-message-input ${isDragging ? 'dragging' : ''}`}>
      <style jsx>{`
        .modern-message-input {
          background: var(--chat-surface);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px 24px;
          position: relative;
          backdrop-filter: blur(20px);
          transition: all 0.3s ease;
        }

        .modern-message-input.dragging {
          background: rgba(var(--chat-primary), 0.1);
          border-color: var(--chat-primary);
        }

        .drag-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(var(--chat-primary), 0.2);
          backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          border: 2px dashed var(--chat-primary);
          border-radius: 12px;
          margin: 8px;
        }

        .drag-content {
          text-align: center;
          color: var(--chat-primary);
        }

        .drag-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .drag-text {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .drag-subtext {
          font-size: 14px;
          opacity: 0.8;
        }

        .reply-preview {
          background: rgba(var(--chat-accent), 0.1);
          border: 1px solid rgba(var(--chat-accent), 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .reply-line {
          width: 3px;
          height: 32px;
          background: var(--chat-accent);
          border-radius: 2px;
          flex-shrink: 0;
        }

        .reply-content {
          flex: 1;
          min-width: 0;
        }

        .reply-header {
          font-size: 12px;
          color: var(--chat-accent);
          font-weight: 600;
          margin-bottom: 2px;
        }

        .reply-text {
          font-size: 13px;
          color: rgba(var(--chat-text), 0.8);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reply-close {
          background: none;
          border: none;
          color: var(--chat-accent);
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .reply-close:hover {
          background: rgba(var(--chat-accent), 0.2);
        }

        .file-previews {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
          animation: slideDown 0.3s ease;
        }

        .file-preview {
          position: relative;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 200px;
          transition: all 0.2s ease;
        }

        .file-preview:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .file-preview-image {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.1);
        }

        .file-preview-icon {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: rgba(var(--chat-primary), 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .file-preview-info {
          flex: 1;
          min-width: 0;
        }

        .file-preview-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--chat-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 2px;
        }

        .file-preview-size {
          font-size: 10px;
          color: rgba(var(--chat-text), 0.6);
        }

        .file-preview-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #EF4444;
          border: 2px solid var(--chat-surface);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .file-preview-remove:hover {
          background: #DC2626;
          transform: scale(1.1);
        }

        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 8px 12px;
          transition: all 0.2s ease;
          position: relative;
        }

        .input-container:focus-within {
          border-color: var(--chat-primary);
          box-shadow: 0 0 0 3px rgba(var(--chat-primary), 0.1);
          background: rgba(255, 255, 255, 0.08);
        }

        .input-actions-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--chat-text);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          min-height: 20px;
          max-height: 120px;
          padding: 8px 0;
          font-family: inherit;
        }

        .input-textarea::placeholder {
          color: rgba(var(--chat-text), 0.5);
        }

        .input-actions-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: var(--chat-text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .input-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .input-button:active {
          transform: scale(0.95);
        }

        .input-button svg {
          width: 18px;
          height: 18px;
        }

        .input-button.emoji {
          font-size: 18px;
        }

        .input-button.recording {
          background: #EF4444;
          color: white;
          animation: recordingPulse 1.5s ease-in-out infinite;
        }

        @keyframes recordingPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }

        .send-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          opacity: 0;
          transform: scale(0.8);
        }

        .send-button.show {
          opacity: 1;
          transform: scale(1);
        }

        .send-button:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(var(--chat-primary), 0.3);
        }

        .send-button:active {
          transform: scale(0.95);
        }

        .send-button svg {
          width: 18px;
          height: 18px;
          transform: rotate(-90deg);
        }

        .formatting-hint {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: rgba(var(--chat-surface), 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: rgba(var(--chat-text), 0.7);
          margin-bottom: 8px;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.2s ease;
          pointer-events: none;
        }

        .input-container:focus-within .formatting-hint {
          opacity: 1;
          transform: translateY(0);
        }

        .hidden-file-input {
          display: none;
        }

        .typing-indicator-self {
          position: absolute;
          bottom: 100%;
          left: 24px;
          font-size: 11px;
          color: var(--chat-primary);
          padding: 4px 8px;
          background: rgba(var(--chat-primary), 0.1);
          border-radius: 12px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-dots-self {
          display: flex;
          gap: 2px;
        }

        .typing-dot-self {
          width: 3px;
          height: 3px;
          background: var(--chat-primary);
          border-radius: 50%;
          animation: typingBounce 1.4s ease-in-out infinite;
        }

        .typing-dot-self:nth-child(1) { animation-delay: 0ms; }
        .typing-dot-self:nth-child(2) { animation-delay: 200ms; }
        .typing-dot-self:nth-child(3) { animation-delay: 400ms; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <div className="drag-icon">📁</div>
            <div className="drag-text">Drop files here</div>
            <div className="drag-subtext">Images, videos, audio, and documents</div>
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-line"></div>
          <div className="reply-content">
            <div className="reply-header">Replying to message</div>
            <div className="reply-text">{replyingTo.content}</div>
          </div>
          <button className="reply-close" onClick={onCancelReply}>×</button>
        </div>
      )}

      {/* File Previews */}
      {previewFiles.length > 0 && (
        <div className="file-previews">
          {previewFiles.map((item) => (
            <div key={item.id} className="file-preview">
              {item.preview ? (
                <img
                  src={item.preview}
                  alt="Preview"
                  className="file-preview-image"
                />
              ) : (
                <div className="file-preview-icon">
                  {getFileIcon(item.type)}
                </div>
              )}
              <div className="file-preview-info">
                <div className="file-preview-name">{item.file.name}</div>
                <div className="file-preview-size">{formatFileSize(item.file.size)}</div>
              </div>
              <button
                className="file-preview-remove"
                onClick={() => removePreviewFile(item.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Container */}
      <div
        className="input-container"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="formatting-hint">
          <strong>Ctrl+B</strong> Bold • <strong>Ctrl+I</strong> Italic • <strong>Enter</strong> Send • <strong>Shift+Enter</strong> New line
        </div>

        <div className="input-actions-left">
          <button
            className="input-button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z"/>
            </svg>
          </button>

          <button
            className="input-button emoji"
            onClick={onEmojiToggle}
            title="Add emoji"
          >
            😀
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="input-textarea"
          value={message}
          onChange={onMessageChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={{ height: inputHeight }}
        />

        <div className="input-actions-right">

          <button
            className={`send-button ${showSendButton || previewFiles.length > 0 ? 'show' : ''}`}
            onClick={handleSend}
            title="Send message"
          >
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden-file-input"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
      />
    </div>
  );
};

export default ModernMessageInput;