import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './ChatMediaGallery.css';

const ChatMediaGallery = ({ chatId, isGroup, onClose, onMediaSelect }) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState(null);
  const galleryRef = useRef(null);
  const loadingRef = useRef(false);

  const pageSize = 20;
  const mediaTypes = [
    { value: 'all', label: 'All Media', icon: '📎' },
    { value: 'image', label: 'Images', icon: '🖼️' },
    { value: 'video', label: 'Videos', icon: '🎥' },
    { value: 'file', label: 'Files', icon: '📄' }
  ];

  // Load media items
  const loadMediaItems = useCallback(async (page = 1, type = selectedType, append = false) => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(page === 1 && !append);
      setError(null);

      const endpoint = `/api/media/gallery/${chatId}`;
      const params = {
        type,
        page,
        pageSize
      };

      const response = await axios.get(endpoint, { params });
      const { items, totalCount: newTotalCount, totalPages: newTotalPages } = response.data;

      if (append && page > 1) {
        setMediaItems(prev => [...prev, ...items]);
      } else {
        setMediaItems(items);
      }

      setTotalCount(newTotalCount);
      setTotalPages(newTotalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading media items:', error);
      setError('Failed to load media items');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [chatId, selectedType]);

  // Initial load
  useEffect(() => {
    loadMediaItems(1, selectedType);
  }, [loadMediaItems, selectedType]);

  // Handle type filter change
  const handleTypeChange = (type) => {
    setSelectedType(type);
    setCurrentPage(1);
    setMediaItems([]);
  };

  // Load more items (infinite scroll)
  const loadMore = () => {
    if (currentPage < totalPages && !loading) {
      loadMediaItems(currentPage + 1, selectedType, true);
    }
  };

  // Scroll handler for infinite loading
  const handleScroll = useCallback(() => {
    if (!galleryRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = galleryRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8 && currentPage < totalPages && !loading) {
      loadMore();
    }
  }, [currentPage, totalPages, loading]);

  useEffect(() => {
    const galleryElement = galleryRef.current;
    if (galleryElement) {
      galleryElement.addEventListener('scroll', handleScroll);
      return () => galleryElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Handle media selection
  const handleMediaClick = (media) => {
    setSelectedMedia(media);
    if (onMediaSelect) {
      onMediaSelect(media);
    }
  };

  // Handle media download
  const handleDownload = async (media) => {
    try {
      const response = await fetch(media.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = media.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Render media item
  const renderMediaItem = (media) => {
    const isImage = media.mediaType === 'image';
    const isVideo = media.mediaType === 'video';

    return (
      <div
        key={media.id}
        className={`media-item ${media.mediaType}`}
        onClick={() => handleMediaClick(media)}
      >
        <div className="media-thumbnail">
          {isImage && (
            <img
              src={media.thumbnailUrl || media.mediaUrl}
              alt={media.fileName}
              loading="lazy"
            />
          )}
          {isVideo && (
            <div className="video-thumbnail">
              {media.thumbnailUrl ? (
                <img src={media.thumbnailUrl} alt={media.fileName} loading="lazy" />
              ) : (
                <div className="video-placeholder">🎥</div>
              )}
              <div className="video-overlay">
                <div className="play-button">▶️</div>
              </div>
            </div>
          )}
          {!isImage && !isVideo && (
            <div className="file-thumbnail">
              <div className="file-icon">📄</div>
              <div className="file-extension">
                {media.fileName.split('.').pop()?.toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <div className="media-info">
          <div className="media-name" title={media.fileName}>
            {media.fileName}
          </div>
          <div className="media-meta">
            <span className="media-size">{formatFileSize(media.fileSize)}</span>
            <span className="media-date">{formatDate(media.sentAt)}</span>
          </div>
          <div className="media-sender">by {media.senderName}</div>
        </div>

        <div className="media-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(media);
            }}
            className="media-action-btn"
            title="Download"
          >
            ⬇️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMedia(media);
            }}
            className="media-action-btn"
            title="View"
          >
            👁️
          </button>
        </div>
      </div>
    );
  };

  // Render media viewer modal
  const renderMediaViewer = () => {
    if (!selectedMedia) return null;

    const isImage = selectedMedia.mediaType === 'image';
    const isVideo = selectedMedia.mediaType === 'video';

    return (
      <div className="media-viewer-overlay" onClick={() => setSelectedMedia(null)}>
        <div className="media-viewer" onClick={(e) => e.stopPropagation()}>
          <div className="media-viewer-header">
            <div className="media-viewer-info">
              <h3>{selectedMedia.fileName}</h3>
              <p>
                {formatFileSize(selectedMedia.fileSize)} •
                Sent by {selectedMedia.senderName} on {formatDate(selectedMedia.sentAt)}
              </p>
            </div>
            <div className="media-viewer-actions">
              <button
                onClick={() => handleDownload(selectedMedia)}
                className="viewer-action-btn"
                title="Download"
              >
                ⬇️
              </button>
              <button
                onClick={() => setSelectedMedia(null)}
                className="viewer-action-btn close"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="media-viewer-content">
            {isImage && (
              <img
                src={selectedMedia.mediaUrl}
                alt={selectedMedia.fileName}
                className="viewer-image"
              />
            )}
            {isVideo && (
              <video
                src={selectedMedia.mediaUrl}
                controls
                className="viewer-video"
                autoPlay
              />
            )}
            {!isImage && !isVideo && (
              <div className="viewer-file">
                <div className="file-preview">
                  <div className="file-icon-large">📄</div>
                  <h4>{selectedMedia.fileName}</h4>
                  <p>{formatFileSize(selectedMedia.fileSize)}</p>
                  <button
                    onClick={() => handleDownload(selectedMedia)}
                    className="download-file-btn"
                  >
                    Download File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-media-gallery">
      <div className="gallery-header">
        <div className="gallery-title">
          <h2>Media Gallery</h2>
          <span className="media-count">
            {totalCount} item{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={onClose} className="close-gallery">
          ✕
        </button>
      </div>

      <div className="gallery-filters">
        {mediaTypes.map((type) => (
          <button
            key={type.value}
            className={`filter-btn ${selectedType === type.value ? 'active' : ''}`}
            onClick={() => handleTypeChange(type.value)}
          >
            <span className="filter-icon">{type.icon}</span>
            <span className="filter-label">{type.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="gallery-error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error}</div>
          <button
            onClick={() => loadMediaItems(1, selectedType)}
            className="retry-btn"
          >
            Retry
          </button>
        </div>
      )}

      <div ref={galleryRef} className="gallery-content">
        {loading && mediaItems.length === 0 ? (
          <div className="gallery-loading">
            <div className="loading-spinner"></div>
            <p>Loading media...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="gallery-empty">
            <div className="empty-icon">🖼️</div>
            <h3>No media found</h3>
            <p>
              {selectedType === 'all'
                ? 'No media has been shared in this chat yet.'
                : `No ${selectedType} files have been shared in this chat yet.`}
            </p>
          </div>
        ) : (
          <>
            <div className="media-grid">
              {mediaItems.map(renderMediaItem)}
            </div>

            {loading && mediaItems.length > 0 && (
              <div className="gallery-loading-more">
                <div className="loading-spinner small"></div>
                <span>Loading more...</span>
              </div>
            )}

            {currentPage >= totalPages && mediaItems.length > 0 && (
              <div className="gallery-end">
                <div className="end-message">
                  You've reached the end of the gallery
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {renderMediaViewer()}
    </div>
  );
};

// Gallery thumbnail component for quick media preview
export const MediaGalleryThumbnail = ({
  chatId,
  isGroup,
  onClick,
  className = '',
  showCount = true
}) => {
  const [recentMedia, setRecentMedia] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentMedia = async () => {
      try {
        const endpoint = `/api/media/gallery/${chatId}`;
        const params = {
          type: 'all',
          page: 1,
          pageSize: 4
        };

        const response = await axios.get(endpoint, { params });
        setRecentMedia(response.data.items);
        setTotalCount(response.data.totalCount);
      } catch (error) {
        console.error('Error loading recent media:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentMedia();
  }, [chatId]);

  if (loading) {
    return (
      <div className={`media-gallery-thumbnail loading ${className}`}>
        <div className="thumbnail-loading">
          <div className="loading-spinner small"></div>
        </div>
      </div>
    );
  }

  if (totalCount === 0) {
    return null;
  }

  return (
    <div
      className={`media-gallery-thumbnail ${className}`}
      onClick={onClick}
      title={`View all ${totalCount} media items`}
    >
      <div className="thumbnail-grid">
        {recentMedia.slice(0, 4).map((media, index) => (
          <div key={media.id} className={`thumbnail-item position-${index}`}>
            {media.mediaType === 'image' ? (
              <img
                src={media.thumbnailUrl || media.mediaUrl}
                alt={media.fileName}
                loading="lazy"
              />
            ) : (
              <div className={`thumbnail-placeholder ${media.mediaType}`}>
                {media.mediaType === 'video' && '🎥'}
                {media.mediaType === 'file' && '📄'}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCount && (
        <div className="thumbnail-overlay">
          <span className="media-count-badge">{totalCount}</span>
        </div>
      )}
    </div>
  );
};

export default ChatMediaGallery;