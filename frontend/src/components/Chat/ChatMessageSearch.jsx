import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import './ChatMessageSearch.css';

const ChatMessageSearch = ({ chatId, isGroup, onMessageSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    messageType: 'all',
    sender: 'all'
  });
  const [senders, setSenders] = useState([]);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Memoized search configuration
  const searchConfig = useMemo(() => ({
    minQueryLength: 2,
    debounceDelay: 300,
    maxResults: 50
  }), []);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Load available senders for filter
  useEffect(() => {
    loadSenders();
  }, [chatId, isGroup]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.length >= searchConfig.minQueryLength) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch();
      }, searchConfig.debounceDelay);
    } else {
      setSearchResults([]);
      setCurrentIndex(-1);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, filters]);

  const loadSenders = async () => {
    try {
      const endpoint = isGroup
        ? `/api/chat/group/${chatId.replace('group-', '')}/members`
        : `/api/chat/private/${chatId}/participants`;

      const response = await axios.get(endpoint);
      setSenders(response.data);
    } catch (error) {
      console.error('Error loading senders:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < searchConfig.minQueryLength) {
      return;
    }

    setLoading(true);
    try {
      const endpoint = isGroup
        ? `/api/chat/search/group/${chatId.replace('group-', '')}`
        : `/api/chat/search/private/${chatId}`;

      const params = {
        query: searchQuery.trim(),
        limit: searchConfig.maxResults,
        ...filters
      };

      const response = await axios.get(endpoint, { params });
      setSearchResults(response.data.messages || []);
      setCurrentIndex(-1);
    } catch (error) {
      console.error('Error searching messages:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentIndex(prev =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentIndex(prev =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex >= 0 && searchResults[currentIndex]) {
        handleMessageSelect(searchResults[currentIndex]);
      }
    }
  }, [searchResults, currentIndex, onClose]);

  const handleMessageSelect = (message) => {
    onMessageSelect(message);
    onClose();
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentIndex(-1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => (
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : part
    ));
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'voice': return '🎵';
      case 'file': return '📎';
      default: return '💬';
    }
  };

  return (
    <div className="chat-message-search" onKeyDown={handleKeyDown}>
      <div className="search-header">
        <div className="search-title">
          <span>Search Messages</span>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="search-input-container">
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={clearSearch}>
                ✕
              </button>
            )}
            {loading && (
              <div className="search-spinner">
                <div className="spinner"></div>
              </div>
            )}
          </div>
        </div>

        <div className="search-filters">
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="filter-select"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>

          <select
            value={filters.messageType}
            onChange={(e) => handleFilterChange('messageType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All types</option>
            <option value="text">Text</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="voice">Voice</option>
            <option value="file">Files</option>
          </select>

          {senders.length > 0 && (
            <select
              value={filters.sender}
              onChange={(e) => handleFilterChange('sender', e.target.value)}
              className="filter-select"
            >
              <option value="all">All senders</option>
              {senders.map(sender => (
                <option key={sender.id} value={sender.id}>
                  {sender.userName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="search-results">
        {searchQuery.length > 0 && searchQuery.length < searchConfig.minQueryLength && (
          <div className="search-hint">
            Type at least {searchConfig.minQueryLength} characters to search
          </div>
        )}

        {searchResults.length === 0 && searchQuery.length >= searchConfig.minQueryLength && !loading && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <div className="no-results-text">No messages found</div>
            <div className="no-results-hint">Try different keywords or filters</div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="results-header">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </div>
        )}

        <div className="results-list">
          {searchResults.map((message, index) => (
            <div
              key={message.id}
              className={`search-result-item ${index === currentIndex ? 'highlighted' : ''}`}
              onClick={() => handleMessageSelect(message)}
            >
              <div className="result-sender">
                <div className="sender-avatar">
                  {message.senderName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="sender-info">
                  <div className="sender-name">{message.senderName || 'Unknown'}</div>
                  <div className="message-date">{formatMessageDate(message.sentAt)}</div>
                </div>
              </div>

              <div className="result-content">
                <div className="message-type-indicator">
                  {getMessageTypeIcon(message.messageType)}
                </div>
                <div className="message-preview">
                  {message.messageType === 'text' ? (
                    highlightText(message.content || '', searchQuery)
                  ) : (
                    <span className="media-message">
                      {message.messageType} message
                      {message.fileName && ` - ${message.fileName}`}
                    </span>
                  )}
                </div>
              </div>

              {message.replyTo && (
                <div className="reply-indicator">
                  ↳ Reply to {message.replyTo.senderName}
                </div>
              )}
            </div>
          ))}
        </div>

        {searchResults.length >= searchConfig.maxResults && (
          <div className="results-limit-notice">
            Showing first {searchConfig.maxResults} results. Refine your search for more specific results.
          </div>
        )}
      </div>

      <div className="search-shortcuts">
        <div className="shortcuts-title">Keyboard shortcuts:</div>
        <div className="shortcuts-list">
          <span>↑↓ Navigate</span>
          <span>Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageSearch;