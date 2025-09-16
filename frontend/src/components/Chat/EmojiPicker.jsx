import React, { useState, useEffect, useRef } from "react";

const EmojiPicker = ({ onEmojiSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('frequently-used');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState({});
  const [recentEmojis, setRecentEmojis] = useState([]);

  const searchInputRef = useRef(null);

  const emojiCategories = {
    'frequently-used': {
      name: 'Frequently Used',
      icon: '🕒',
      emojis: []
    },
    'smileys': {
      name: 'Smileys & People',
      icon: '😀',
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
        '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
        '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
        '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
        '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
      ]
    },
    'animals': {
      name: 'Animals & Nature',
      icon: '🐶',
      emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
        '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
        '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
        '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
        '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕'
      ]
    },
    'food': {
      name: 'Food & Drink',
      icon: '🍎',
      emojis: [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
        '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
        '🥬', '🥒', '🌶', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔',
        '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈',
        '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟'
      ]
    },
    'activities': {
      name: 'Activities',
      icon: '⚽',
      emojis: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
        '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
        '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸',
        '🥌', '🎿', '⛷', '🏂', '🪂', '🏋', '🤼', '🤸', '⛹', '🤺',
        '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆'
      ]
    },
    'travel': {
      name: 'Travel & Places',
      icon: '🚗',
      emojis: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐',
        '🛻', '🚚', '🚛', '🚜', '🏍', '🛵', '🚲', '🛴', '🛹', '🛼',
        '🚁', '🛸', '✈', '🛩', '🪂', '🚀', '🛰', '💺', '🛶', '⛵',
        '🚤', '🛥', '🛳', '⛴', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥',
        '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠'
      ]
    },
    'objects': {
      name: 'Objects',
      icon: '💎',
      emojis: [
        '💎', '🔔', '🔕', '🎵', '🎶', '💰', '💴', '💵', '💶', '💷',
        '💸', '💳', '🧾', '💹', '💱', '💲', '⚖', '🦽', '🦼', '⚗',
        '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🔪', '🏺',
        '🗝', '🔑', '🔐', '🔒', '🔓', '🔏', '📝', '✏', '🖋', '🖊',
        '🖌', '🖍', '📄', '📃', '📑', '📊', '📈', '📉', '📋', '📌'
      ]
    },
    'symbols': {
      name: 'Symbols',
      icon: '❤️',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮',
        '✝', '☪', '🕉', '☸', '✡', '🔯', '🕎', '☯', '☦', '🛐',
        '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
        '♑', '♒', '♓', '🆔', '⚛', '🉑', '☢', '☣', '📴', '📳'
      ]
    },
    'flags': {
      name: 'Flags',
      icon: '🏁',
      emojis: [
        '🏁', '🚩', '🎌', '🏴', '🏳', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇦🇫', '🇦🇱',
        '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺',
        '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯',
        '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮'
      ]
    }
  };

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-emojis');
    if (stored) {
      setRecentEmojis(JSON.parse(stored));
      emojiCategories['frequently-used'].emojis = JSON.parse(stored);
    }

    // Focus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Filter emojis based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmojis(emojiCategories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(emojiCategories).forEach(([key, category]) => {
      const matchingEmojis = category.emojis.filter(emoji => {
        return getEmojiName(emoji).toLowerCase().includes(query);
      });

      if (matchingEmojis.length > 0) {
        filtered[key] = {
          ...category,
          emojis: matchingEmojis
        };
      }
    });

    setFilteredEmojis(filtered);
  }, [searchQuery]);

  const getEmojiName = (emoji) => {
    // This is a simplified mapping. In a real app, you'd use a proper emoji database
    const emojiNames = {
      '😀': 'grinning face',
      '😃': 'grinning face with big eyes',
      '😄': 'grinning face with smiling eyes',
      '😁': 'beaming face with smiling eyes',
      '😆': 'grinning squinting face',
      '😅': 'grinning face with sweat',
      '🤣': 'rolling on floor laughing',
      '😂': 'face with tears of joy',
      '🙂': 'slightly smiling face',
      '🙃': 'upside down face',
      '😉': 'winking face',
      '😊': 'smiling face with smiling eyes',
      '😇': 'smiling face with halo',
      '🥰': 'smiling face with hearts',
      '😍': 'smiling face with heart eyes',
      '🤩': 'star struck',
      '😘': 'face blowing a kiss',
      '😗': 'kissing face',
      '😚': 'kissing face with closed eyes',
      '😙': 'kissing face with smiling eyes',
      '😋': 'face savoring food',
      '😛': 'face with tongue',
      '😜': 'winking face with tongue',
      '🤪': 'zany face',
      '😝': 'squinting face with tongue',
      '🤑': 'money mouth face',
      '🤗': 'smiling face with open hands',
      '🤭': 'face with hand over mouth',
      '🤫': 'shushing face',
      '🤔': 'thinking face',
      '🤐': 'zipper mouth face',
      '🤨': 'face with raised eyebrow',
      '😐': 'neutral face',
      '😑': 'expressionless face',
      '😶': 'face without mouth',
      '😏': 'smirking face',
      '😒': 'unamused face',
      '🙄': 'face with rolling eyes',
      '😬': 'grimacing face',
      '🤥': 'lying face',
      '❤️': 'red heart',
      '💛': 'yellow heart',
      '💚': 'green heart',
      '💙': 'blue heart',
      '💜': 'purple heart',
      '🖤': 'black heart',
      '🤍': 'white heart',
      '🤎': 'brown heart',
      '💔': 'broken heart',
      '❣️': 'heart exclamation',
      '💕': 'two hearts',
      '💞': 'revolving hearts',
      '💓': 'beating heart',
      '💗': 'growing heart',
      '💖': 'sparkling heart',
      '💘': 'heart with arrow',
      '💝': 'heart with ribbon',
      '💟': 'heart decoration',
      '👍': 'thumbs up',
      '👎': 'thumbs down',
      '👏': 'clapping hands',
      '🙌': 'raising hands',
      '👌': 'ok hand',
      '✌️': 'victory hand',
      '🤞': 'crossed fingers',
      '🤟': 'love you gesture',
      '🤘': 'sign of horns',
      '🤙': 'call me hand',
      '👈': 'backhand index pointing left',
      '👉': 'backhand index pointing right',
      '👆': 'backhand index pointing up',
      '🔥': 'fire',
      '💯': 'hundred points',
      '⭐': 'star',
      '🌟': 'glowing star',
      '✨': 'sparkles',
      '⚡': 'high voltage',
      '💥': 'collision'
    };

    return emojiNames[emoji] || emoji;
  };

  const handleEmojiClick = (emoji) => {
    // Add to recent emojis
    const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
    setRecentEmojis(updatedRecent);
    localStorage.setItem('recent-emojis', JSON.stringify(updatedRecent));

    // Update frequently used category
    emojiCategories['frequently-used'].emojis = updatedRecent;

    onEmojiSelect(emoji);
  };

  const categoryKeys = Object.keys(searchQuery.trim() ? filteredEmojis : emojiCategories);

  return (
    <div className="emoji-picker">
      <style jsx>{`
        .emoji-picker {
          width: 350px;
          height: 400px;
          background: linear-gradient(135deg, var(--chat-surface) 0%, rgba(var(--chat-surface), 0.95) 100%);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .picker-header {
          padding: 16px 20px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .header-top {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 12px;
        }

        .picker-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--chat-text);
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .close-button {
          background: none;
          border: none;
          color: rgba(var(--chat-text), 0.7);
          cursor: pointer;
          font-size: 20px;
          padding: 4px;
          transition: all 0.2s ease;
          border-radius: 4px;
        }

        .close-button:hover {
          color: var(--chat-text);
          background: rgba(255, 255, 255, 0.1);
        }

        .search-container {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: var(--chat-text);
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.15);
          border-color: var(--chat-primary);
          box-shadow: 0 0 0 3px rgba(var(--chat-primary), 0.1);
        }

        .search-input::placeholder {
          color: rgba(var(--chat-text), 0.5);
        }

        .search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(var(--chat-text), 0.5);
          cursor: pointer;
          font-size: 16px;
          padding: 2px;
          opacity: ${searchQuery ? 1 : 0};
          transition: all 0.2s ease;
        }

        .search-clear:hover {
          color: var(--chat-text);
        }

        .category-tabs {
          display: flex;
          padding: 12px 16px;
          gap: 8px;
          overflow-x: auto;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-tab {
          min-width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 18px;
          position: relative;
        }

        .category-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }

        .category-tab.active {
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          box-shadow: 0 4px 12px rgba(var(--chat-primary), 0.3);
        }

        .category-tab.active::after {
          content: '';
          position: absolute;
          bottom: -13px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: var(--chat-primary);
          border-radius: 50%;
        }

        .emoji-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .emoji-content::-webkit-scrollbar {
          width: 6px;
        }

        .emoji-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .emoji-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .emoji-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(var(--chat-text), 0.8);
          margin-bottom: 12px;
          padding: 0 4px;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
        }

        .emoji-item {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 20px;
          position: relative;
        }

        .emoji-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.2);
          z-index: 10;
        }

        .emoji-item:active {
          transform: scale(1.1);
        }

        .no-results {
          text-align: center;
          padding: 40px 20px;
          color: rgba(var(--chat-text), 0.6);
        }

        .no-results-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .no-results-text {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .no-results-subtext {
          font-size: 14px;
          opacity: 0.7;
        }

        .recent-empty {
          text-align: center;
          padding: 20px;
          color: rgba(var(--chat-text), 0.5);
          font-size: 13px;
        }

        .background-animation {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 30%, rgba(var(--chat-primary), 0.05) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(var(--chat-secondary), 0.05) 0%, transparent 50%);
          animation: backgroundFlow 8s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes backgroundFlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-5px, -5px) scale(1.02); }
        }
      `}</style>

      <div className="background-animation"></div>

      <div className="picker-header">
        <div className="header-top">
          <h3 className="picker-title">Emoji Picker</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="search-container">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!searchQuery && (
        <div className="category-tabs">
          {Object.entries(emojiCategories).map(([key, category]) => (
            <button
              key={key}
              className={`category-tab ${activeCategory === key ? 'active' : ''}`}
              onClick={() => setActiveCategory(key)}
              title={category.name}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      <div className="emoji-content">
        {Object.keys(searchQuery.trim() ? filteredEmojis : emojiCategories).length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <div className="no-results-text">No emojis found</div>
            <div className="no-results-subtext">Try a different search term</div>
          </div>
        ) : (
          (searchQuery.trim() ? Object.entries(filteredEmojis) : [[activeCategory, emojiCategories[activeCategory]]]).map(([key, category]) => (
            <div key={key} className="emoji-section">
              <div className="section-title">{category.name}</div>
              {category.emojis.length === 0 && key === 'frequently-used' ? (
                <div className="recent-empty">
                  Start using emojis to see your frequently used ones here!
                </div>
              ) : (
                <div className="emoji-grid">
                  {category.emojis.map((emoji, index) => (
                    <button
                      key={`${key}-${index}`}
                      className="emoji-item"
                      onClick={() => handleEmojiClick(emoji)}
                      title={getEmojiName(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;