import React, { useState } from "react";

const ChatThemeSelector = ({ currentTheme, isDarkMode, themes, onThemeChange, onDarkModeToggle, onClose }) => {
  const [previewTheme, setPreviewTheme] = useState(currentTheme);

  const applyPreview = (themeKey) => {
    setPreviewTheme(themeKey);

    // Temporarily apply theme for preview
    const theme = themes[themeKey] || themes.default;
    const root = document.documentElement;

    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        root.style.setProperty(`--chat-${key}`, value);
      }
    });
  };

  const handleThemeSelect = (themeKey) => {
    onThemeChange(themeKey);
    onClose();
  };

  const resetPreview = () => {
    setPreviewTheme(currentTheme);

    // Reset to current theme
    const theme = themes[currentTheme] || themes.default;
    const root = document.documentElement;

    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        root.style.setProperty(`--chat-${key}`, value);
      }
    });
  };

  return (
    <div className="theme-selector">
      <style jsx>{`
        .theme-selector {
          width: 450px;
          max-height: 600px;
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

        .selector-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .header-top {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 16px;
        }

        .selector-title {
          font-size: 20px;
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
          font-size: 24px;
          padding: 4px;
          transition: all 0.2s ease;
          border-radius: 6px;
        }

        .close-button:hover {
          color: var(--chat-text);
          background: rgba(255, 255, 255, 0.1);
        }

        .dark-mode-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
        }

        .toggle-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle-icon {
          font-size: 20px;
        }

        .toggle-text {
          font-weight: 600;
          color: var(--chat-text);
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
          background: ${isDarkMode ? 'var(--chat-primary)' : 'rgba(255, 255, 255, 0.2)'};
          border-radius: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .toggle-switch:hover {
          box-shadow: 0 0 12px rgba(var(--chat-primary), 0.3);
        }

        .toggle-knob {
          position: absolute;
          top: 2px;
          left: ${isDarkMode ? '22px' : '2px'};
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .themes-section {
          padding: 20px 24px;
          flex: 1;
          overflow-y: auto;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--chat-text);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-icon {
          font-size: 18px;
        }

        .themes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .theme-card {
          position: relative;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .theme-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .theme-card.active {
          border-color: var(--chat-primary);
          box-shadow: 0 8px 32px rgba(var(--chat-primary), 0.3);
        }

        .theme-card.preview {
          border-color: var(--chat-secondary);
          box-shadow: 0 8px 32px rgba(var(--chat-secondary), 0.3);
        }

        .theme-preview {
          height: 80px;
          border-radius: 8px;
          margin-bottom: 12px;
          position: relative;
          overflow: hidden;
        }

        .theme-preview.default {
          background: linear-gradient(135deg, #3B82F6 0%, #10B981 50%, #F59E0B 100%);
        }

        .theme-preview.dark {
          background: linear-gradient(135deg, #6366F1 0%, #059669 50%, #D97706 100%);
        }

        .theme-preview.ocean {
          background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #8B5CF6 100%);
        }

        .theme-preview.sunset {
          background: linear-gradient(135deg, #F97316 0%, #EF4444 50%, #EC4899 100%);
        }

        .theme-preview.forest {
          background: linear-gradient(135deg, #059669 0%, #65A30D 50%, #CA8A04 100%);
        }

        .theme-preview::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 8px,
            rgba(255, 255, 255, 0.1) 8px,
            rgba(255, 255, 255, 0.1) 16px
          );
        }

        .preview-content {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          bottom: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(20px);
        }

        .preview-icon {
          font-size: 24px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .theme-info {
          text-align: center;
        }

        .theme-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--chat-text);
          margin-bottom: 4px;
        }

        .theme-description {
          font-size: 12px;
          color: rgba(var(--chat-text), 0.7);
          line-height: 1.3;
        }

        .active-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          background: var(--chat-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(var(--chat-primary), 0.4);
        }

        .customization-section {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .custom-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .color-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(var(--chat-text), 0.8);
        }

        .color-input-wrapper {
          position: relative;
          height: 40px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .color-input-wrapper:hover {
          border-color: var(--chat-primary);
          box-shadow: 0 0 0 3px rgba(var(--chat-primary), 0.1);
        }

        .color-input {
          width: 100%;
          height: 100%;
          border: none;
          cursor: pointer;
          background: transparent;
        }

        .color-value {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          text-align: center;
          font-family: 'Courier New', monospace;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
        }

        .action-button {
          flex: 1;
          padding: 12px 16px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-button:hover {
          transform: translateY(-2px);
        }

        .action-button:active {
          transform: translateY(0);
        }

        .action-button.primary {
          background: linear-gradient(135deg, var(--chat-primary), var(--chat-secondary));
          color: white;
          box-shadow: 0 4px 16px rgba(var(--chat-primary), 0.3);
        }

        .action-button.primary:hover {
          box-shadow: 0 8px 24px rgba(var(--chat-primary), 0.4);
        }

        .action-button.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: var(--chat-text);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .action-button.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .background-animation {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 40%, rgba(var(--chat-primary), 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(var(--chat-secondary), 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(var(--chat-accent), 0.08) 0%, transparent 50%);
          animation: backgroundFlow 12s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes backgroundFlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10px, -10px) scale(1.05); }
        }

        /* Scrollbar styling */
        .themes-section::-webkit-scrollbar {
          width: 6px;
        }

        .themes-section::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .themes-section::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .themes-section::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      <div className="background-animation"></div>

      <div className="selector-header">
        <div className="header-top">
          <h3 className="selector-title">Chat Themes</h3>
          <button className="close-button" onClick={() => { resetPreview(); onClose(); }}>×</button>
        </div>

        <div className="dark-mode-toggle" onClick={onDarkModeToggle}>
          <div className="toggle-info">
            <span className="toggle-icon">{isDarkMode ? '🌙' : '☀️'}</span>
            <span className="toggle-text">Dark Mode</span>
          </div>
          <div className="toggle-switch">
            <div className="toggle-knob"></div>
          </div>
        </div>
      </div>

      <div className="themes-section">
        <div className="section-title">
          <span className="section-icon">🎨</span>
          Choose Your Theme
        </div>

        <div className="themes-grid">
          {Object.entries(themes).map(([key, theme]) => (
            <div
              key={key}
              className={`theme-card ${currentTheme === key ? 'active' : ''} ${previewTheme === key ? 'preview' : ''}`}
              onClick={() => handleThemeSelect(key)}
              onMouseEnter={() => applyPreview(key)}
              onMouseLeave={resetPreview}
            >
              {currentTheme === key && (
                <div className="active-indicator">✓</div>
              )}

              <div className={`theme-preview ${key}`}>
                <div className="preview-content">
                  <span className="preview-icon">
                    {key === 'default' && '🎯'}
                    {key === 'dark' && '🌙'}
                    {key === 'ocean' && '🌊'}
                    {key === 'sunset' && '🌅'}
                    {key === 'forest' && '🌲'}
                  </span>
                </div>
              </div>

              <div className="theme-info">
                <div className="theme-name">{theme.name}</div>
                <div className="theme-description">
                  {key === 'default' && 'Clean and modern design'}
                  {key === 'dark' && 'Easy on the eyes'}
                  {key === 'ocean' && 'Cool blues and teals'}
                  {key === 'sunset' && 'Warm oranges and reds'}
                  {key === 'forest' && 'Natural greens'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="customization-section">
          <div className="section-title">
            <span className="section-icon">⚙️</span>
            Customization
          </div>

          <div className="custom-controls">
            <div className="color-control">
              <label className="control-label">Primary Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={themes[previewTheme]?.primary || '#3B82F6'}
                  onChange={(e) => {
                    // Handle custom color change
                    console.log('Primary color changed:', e.target.value);
                  }}
                />
                <div className="color-value">{themes[previewTheme]?.primary || '#3B82F6'}</div>
              </div>
            </div>

            <div className="color-control">
              <label className="control-label">Secondary Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={themes[previewTheme]?.secondary || '#10B981'}
                  onChange={(e) => {
                    // Handle custom color change
                    console.log('Secondary color changed:', e.target.value);
                  }}
                />
                <div className="color-value">{themes[previewTheme]?.secondary || '#10B981'}</div>
              </div>
            </div>

            <div className="color-control">
              <label className="control-label">Accent Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={themes[previewTheme]?.accent || '#F59E0B'}
                  onChange={(e) => {
                    // Handle custom color change
                    console.log('Accent color changed:', e.target.value);
                  }}
                />
                <div className="color-value">{themes[previewTheme]?.accent || '#F59E0B'}</div>
              </div>
            </div>

            <div className="color-control">
              <label className="control-label">Background</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={themes[previewTheme]?.background || '#F8FAFC'}
                  onChange={(e) => {
                    // Handle custom color change
                    console.log('Background color changed:', e.target.value);
                  }}
                />
                <div className="color-value">{themes[previewTheme]?.background || '#F8FAFC'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="action-button secondary"
          onClick={() => { resetPreview(); onClose(); }}
        >
          <span>✕</span>
          Cancel
        </button>
        <button
          className="action-button primary"
          onClick={() => handleThemeSelect(previewTheme)}
        >
          <span>✓</span>
          Apply Theme
        </button>
      </div>
    </div>
  );
};

export default ChatThemeSelector;