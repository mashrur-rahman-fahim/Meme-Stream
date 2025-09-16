import React, { useState, useEffect, useRef } from 'react';
import { FaPalette, FaCheck, FaRandom, FaSearch, FaTimes, FaMoon, FaSun, FaHeart } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState('dim');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const themes = [
    { name: 'dim', emoji: '🌙', label: 'Dim Vibes', description: 'For night owls & memers', category: 'dark', popular: true },
    { name: 'light', emoji: '☀️', label: 'Light Mode', description: 'Basic but clean', category: 'light', popular: true },
    { name: 'dark', emoji: '🌚', label: 'Dark Mode', description: 'Classic darkness', category: 'dark', popular: true },
    { name: 'cupcake', emoji: '🧁', label: 'Cupcake', description: 'Sweet & cute', category: 'light', popular: true },
    { name: 'cyberpunk', emoji: '🤖', label: 'Cyberpunk', description: 'Neon meme energy', category: 'fun' },
    { name: 'synthwave', emoji: '🌆', label: 'Synthwave', description: 'Retro future vibes', category: 'fun' },
    { name: 'dracula', emoji: '🧛', label: 'Dracula', description: 'Vampire approved', category: 'dark' },
    { name: 'halloween', emoji: '🎃', label: 'Halloween', description: 'Spooky season', category: 'fun' },
    { name: 'valentine', emoji: '💝', label: 'Valentine', description: 'Love is in the air', category: 'fun' },
    { name: 'retro', emoji: '📼', label: 'Retro', description: 'Old school cool', category: 'fun' },
    { name: 'bumblebee', emoji: '🐝', label: 'Bumblebee', description: 'Buzz buzz energy', category: 'light' },
    { name: 'emerald', emoji: '💚', label: 'Emerald', description: 'Green machine', category: 'nature' },
    { name: 'corporate', emoji: '💼', label: 'Corporate', description: 'Professional vibes', category: 'professional' },
    { name: 'garden', emoji: '🌺', label: 'Garden', description: 'Natural beauty', category: 'nature' },
    { name: 'forest', emoji: '🌲', label: 'Forest', description: 'Nature lover', category: 'nature' },
    { name: 'aqua', emoji: '🌊', label: 'Aqua', description: 'Ocean waves', category: 'nature' },
    { name: 'lofi', emoji: '🎧', label: 'Lo-fi', description: 'Chill study vibes', category: 'fun' },
    { name: 'pastel', emoji: '🌈', label: 'Pastel', description: 'Soft & dreamy', category: 'light' },
    { name: 'fantasy', emoji: '🧚', label: 'Fantasy', description: 'Magical realm', category: 'fun' },
    { name: 'wireframe', emoji: '📐', label: 'Wireframe', description: 'Minimal design', category: 'professional' },
    { name: 'black', emoji: '⚫', label: 'Black', description: 'Pure darkness', category: 'dark' },
    { name: 'luxury', emoji: '✨', label: 'Luxury', description: 'Premium feels', category: 'professional' },
    { name: 'cmyk', emoji: '🖨️', label: 'CMYK', description: 'Print ready', category: 'professional' },
    { name: 'autumn', emoji: '🍂', label: 'Autumn', description: 'Fall season', category: 'nature' },
    { name: 'business', emoji: '📊', label: 'Business', description: 'Work mode', category: 'professional' },
    { name: 'acid', emoji: '🌋', label: 'Acid', description: 'Trippy colors', category: 'fun' },
    { name: 'lemonade', emoji: '🍋', label: 'Lemonade', description: 'Sweet & sour', category: 'light' },
    { name: 'night', emoji: '🌃', label: 'Night', description: 'City lights', category: 'dark' },
    { name: 'coffee', emoji: '☕', label: 'Coffee', description: 'Caffeine powered', category: 'professional' },
    { name: 'winter', emoji: '❄️', label: 'Winter', description: 'Cold but cozy', category: 'nature' },
    { name: 'nord', emoji: '🏔️', label: 'Nord', description: 'Nordic minimalism', category: 'professional' },
    { name: 'sunset', emoji: '🌅', label: 'Sunset', description: 'Golden hour', category: 'nature' },
  ];

  const categories = [
    { id: 'all', label: 'All Themes', icon: FaPalette },
    { id: 'popular', label: 'Popular', icon: FaHeart },
    { id: 'dark', label: 'Dark', icon: FaMoon },
    { id: 'light', label: 'Light', icon: FaSun },
    { id: 'professional', label: 'Professional', icon: '💼' },
    { id: 'fun', label: 'Fun & Meme', icon: '🎭' },
    { id: 'nature', label: 'Nature', icon: '🌿' },
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('memestream-theme') || 'dim';
    const savedFavorites = JSON.parse(localStorage.getItem('memestream-favorites') || '["dim", "dark", "light", "cyberpunk"]');
    setCurrentTheme(savedTheme);
    setFavorites(savedFavorites);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      // Focus search input when dropdown opens
      setTimeout(() => searchRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('memestream-theme', themeName);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleRandomTheme = () => {
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    handleThemeChange(randomTheme.name);
  };

  const toggleFavorite = (themeName) => {
    const newFavorites = favorites.includes(themeName)
      ? favorites.filter(fav => fav !== themeName)
      : [...favorites, themeName];
    setFavorites(newFavorites);
    localStorage.setItem('memestream-favorites', JSON.stringify(newFavorites));
  };

  const getCurrentThemeData = () => {
    return themes.find(theme => theme.name === currentTheme) || themes[0];
  };

  const getFilteredThemes = () => {
    let filtered = themes;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(theme => 
        theme.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        theme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        theme.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (activeCategory === 'popular') {
      filtered = filtered.filter(theme => theme.popular);
    } else if (activeCategory === 'favorites') {
      filtered = filtered.filter(theme => favorites.includes(theme.name));
    } else if (activeCategory !== 'all') {
      filtered = filtered.filter(theme => theme.category === activeCategory);
    }

    return filtered;
  };

  const filteredThemes = getFilteredThemes();

  return (
    <div className="dropdown dropdown-end" ref={dropdownRef}>
      <div 
        tabIndex={0} 
        role="button" 
        className="btn btn-ghost btn-circle hover:bg-base-300 transition-all duration-300 group relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative">
          <FaPalette className="text-xl group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 text-xs">
            {getCurrentThemeData().emoji}
          </span>
        </div>
      </div>
      
      {isOpen && (
        <div
          className="dropdown-content mt-3 z-[100] shadow-2xl bg-base-100 border border-base-300 rounded-2xl w-72 sm:w-80 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-base-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <FaPalette className="text-primary text-sm sm:text-base" />
                <span className="font-bold text-sm sm:text-base">
                  <span className="hidden sm:inline">Theme Switcher</span>
                  <span className="sm:hidden">Themes</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRandomTheme}
                  className="btn btn-xs btn-outline btn-primary hover:scale-110 transition-transform"
                  title="Random Theme"
                >
                  <FaRandom className="text-xs" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-xs btn-ghost hover:scale-110 transition-transform"
                  title="Close"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search themes..."
                className="input input-xs sm:input-sm input-bordered w-full pl-7 sm:pl-8 pr-7 sm:pr-8 text-xs sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 text-xs" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* Current Theme Display */}
          <div className="p-3 sm:p-4 bg-primary/5">
            <div className="flex items-center gap-2 sm:gap-3 bg-primary/10 border border-primary/30 rounded-lg p-2 sm:p-3">
              <span className="text-lg sm:text-2xl">{getCurrentThemeData().emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary text-sm sm:text-base truncate">{getCurrentThemeData().label}</p>
                <p className="text-xs text-base-content/70 truncate">{getCurrentThemeData().description}</p>
              </div>
              <button
                onClick={() => toggleFavorite(currentTheme)}
                className={`btn btn-xs btn-circle flex-shrink-0 ${favorites.includes(currentTheme) ? 'btn-error' : 'btn-ghost'}`}
                title={favorites.includes(currentTheme) ? 'Remove from favorites' : 'Add to favorites'}
              >
                <FaHeart className={`text-xs ${favorites.includes(currentTheme) ? 'text-white' : 'text-base-content/50'}`} />
              </button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="px-3 sm:px-4 py-2 border-b border-base-300">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
              {categories.map((category) => {
                const Icon = typeof category.icon === 'string' ? null : category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`btn btn-xs whitespace-nowrap flex-shrink-0 text-xs ${
                      activeCategory === category.id
                        ? 'btn-primary'
                        : 'btn-ghost'
                    }`}
                  >
                    {Icon ? <Icon className="text-xs mr-1" /> : <span className="mr-1">{category.icon}</span>}
                    {category.label}
                  </button>
                );
              })}
              {favorites.length > 0 && (
                <button
                  onClick={() => setActiveCategory('favorites')}
                  className={`btn btn-xs whitespace-nowrap flex-shrink-0 text-xs ${
                    activeCategory === 'favorites'
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                >
                  <FaHeart className="text-xs mr-1" />
                  <span className="hidden sm:inline">Favorites ({favorites.length})</span>
                  <span className="sm:hidden">♥ {favorites.length}</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Theme List - Vertical Scroll */}
          <div className="flex-1 overflow-y-auto">
            {filteredThemes.length > 0 ? (
              <div className="space-y-1 p-2">
                {filteredThemes.map((theme) => (
                  <div
                    key={theme.name}
                    className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 mx-1 sm:mx-2 rounded-lg transition-all duration-200 cursor-pointer hover:translate-x-1 hover:shadow-md ${
                      currentTheme === theme.name
                        ? 'bg-primary/20 text-primary border-2 border-primary/40 shadow-lg'
                        : 'hover:bg-base-200 border border-base-300/30'
                    }`}
                    onClick={() => handleThemeChange(theme.name)}
                  >
                    <span className="text-lg sm:text-2xl flex-shrink-0">{theme.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{theme.label}</p>
                        {theme.popular && (
                          <span className="badge badge-xs badge-primary hidden sm:inline-flex">Popular</span>
                        )}
                        {currentTheme === theme.name && (
                          <FaCheck className="text-primary text-xs sm:text-sm ml-auto flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs opacity-70 truncate">{theme.description}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(theme.name);
                        }}
                        className={`btn btn-xs btn-circle transition-all hover:scale-110 ${
                          favorites.includes(theme.name) ? 'btn-error' : 'btn-ghost'
                        }`}
                        title={favorites.includes(theme.name) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <FaHeart className={`text-xs ${
                          favorites.includes(theme.name) ? 'text-white' : 'text-base-content/40'
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-base-content/70 mb-3">No themes found</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('all');
                  }}
                  className="btn btn-sm btn-outline btn-primary"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-base-300 text-center">
            <p className="text-xs text-base-content/60">
              🎨 {filteredThemes.length} theme{filteredThemes.length !== 1 ? 's' : ''} available 🎨
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;