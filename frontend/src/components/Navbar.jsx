import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import { FaHome, FaUserFriends, FaCommentAlt, FaBell, FaUser, FaSignOutAlt, FaBars, FaTimes, FaSearch, FaUserCircle, FaCog } from 'react-icons/fa';
import api from '../utils/axios';
import ThemeSwitcher from './ThemeSwitcher';
import NotificationBell from './NotificationBell';


export const Navbar = () => {
  const { logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  // Fetch user data and notifications
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await api.get('/User/profile');
        setCurrentUser(userRes.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const fetchNotificationCounts = async () => {
      try {
        const friendRequestRes = await api.get('/FriendRequest/get/friend-requests');
        setFriendRequestCount(friendRequestRes.data.length || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUserData();
    fetchNotificationCounts();
  }, []);

  // Search functionality
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setSearchLoading(true);
      try {
        const response = await api.get(`/User/${query}`);
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      navigate(`/profile/${searchResults[0].id}`);
      setSearchQuery('');
      setSearchResults([]);
      setSearchOpen(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  // Navigation items
  const navItems = [
    { 
      path: '/', 
      icon: FaHome, 
      label: 'Home',
      count: 0
    },
    { 
      path: '/friends', 
      icon: FaUserFriends, 
      label: 'Friends',
      count: friendRequestCount
    },
    { 
      path: '/Chat', 
      icon: FaCommentAlt, 
      label: 'Chat',
      count: 0
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    setIsProfileOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        // Only close if we're on desktop (not mobile search overlay)
        if (!mobileSearchRef.current || !mobileSearchRef.current.contains(event.target)) {
          setSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <>
      {/* Mobile touch improvements */}
      <style jsx>{`
        @media (max-width: 640px) {
          .mobile-search-button {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          .mobile-search-input {
            -webkit-appearance: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          .mobile-search-result {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
        }
      `}</style>

      {/* Facebook-Style Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-50 h-14">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-3 items-center h-14">
            
            {/* Left Section: Logo + Search */}
            <div className="flex items-center gap-3">
              {/* Logo */}
              <button 
                className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => navigate('/')}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {currentUser?.image ? (
                    <img 
                      src={currentUser.image} 
                      alt={currentUser?.name || 'User'} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block text-xl font-bold text-blue-600 dark:text-blue-400">MemeStream</span>
              </button>
              
              {/* Desktop Search */}
              <div className="hidden sm:block ml-2" ref={searchRef}>
                <div className="relative">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="text"
                        placeholder="Find your meme squad... 🔍"
                        className="w-60 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-colors"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => setSearchOpen(true)}
                      />
                    </div>
                  </form>
                  
                  {/* Search Results Dropdown */}
                  {(searchOpen && (searchResults.length > 0 || (searchQuery && !searchLoading))) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                      {searchLoading ? (
                        <div className="p-4 text-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <p className="text-sm text-gray-500 mt-2">Searching...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div>
                          {searchResults.slice(0, 8).map((user) => (
                            <button
                              key={user.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUserClick(user.id);
                              }}
                              className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              type="button"
                            >
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                {user.image ? (
                                  <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <FaUserCircle className="text-gray-500 text-lg" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                                {user.bio && <p className="text-sm text-gray-500 truncate">{user.bio}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : searchQuery && !searchLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          <FaSearch className="mx-auto text-xl mb-2 opacity-50" />
                          <p>No meme legends match "{searchQuery}" 🤷‍♂️</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Section: Navigation Icons (Facebook Style) */}
            <div className="flex items-center justify-center">
              <div className="hidden lg:flex items-center">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    className={`relative p-3 mx-2 rounded-lg transition-all duration-200 min-w-[60px] ${
                      isActive(item.path)
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <item.icon className="text-xl mx-auto" />
                    {item.count > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                        {item.count > 9 ? '9+' : item.count}
                      </div>
                    )}
                    {isActive(item.path) && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Section: User Actions */}
            <div className="flex items-center justify-end gap-2">
              {/* Mobile Search Button */}
              <button
                className="mobile-search-button p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors sm:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchOpen(!searchOpen);
                }}
                type="button"
                onTouchStart={(e) => e.stopPropagation()}
              >
                <FaSearch className="text-gray-600 dark:text-gray-400 text-sm" />
              </button>

              {/* Theme Switcher */}
              <div className="hidden lg:block">
                <ThemeSwitcher />
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {currentUser?.image ? (
                      <img 
                        src={currentUser.image} 
                        alt={currentUser?.name || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          {currentUser?.image ? (
                            <img 
                              src={currentUser.image} 
                              alt={currentUser?.name || 'User'} 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold">
                              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {currentUser?.name || 'User'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {currentUser?.email}
                          </p>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="space-y-1">
                        <button
                          onClick={() => { navigate('/Profile'); setIsProfileOpen(false); }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <FaUser className="text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-900 dark:text-white">Profile</span>
                        </button>
                        <button
                          onClick={() => { navigate('/friends'); setIsProfileOpen(false); }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <FaUserFriends className="text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-900 dark:text-white">Friends</span>
                        </button>
                        <button
                          onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <FaCog className="text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-900 dark:text-white">Settings</span>
                        </button>
                        
                        <hr className="border-gray-200 dark:border-gray-700 my-2" />
                        
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400"
                        >
                          <FaSignOutAlt />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <FaTimes className="text-gray-600 dark:text-gray-400" /> : <FaBars className="text-gray-600 dark:text-gray-400" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSearchOpen(false);
            }}
          />
          <div className="absolute top-14 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="p-4" ref={mobileSearchRef} onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Find your meme squad... 🔍"
                    className="mobile-search-input w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    autoFocus
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                  />
                </div>
              </form>

              {/* Mobile Search Results */}
              {(searchResults.length > 0 || (searchQuery && !searchLoading)) && (
                <div className="mt-4 max-h-80 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-500 mt-2">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.slice(0, 8).map((user) => (
                        <button
                          key={user.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUserClick(user.id);
                          }}
                          className="mobile-search-result w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 text-left rounded-lg"
                          type="button"
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                            {user.image ? (
                              <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <FaUserCircle className="text-gray-500 text-lg" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                            {user.bio && <p className="text-sm text-gray-500 truncate">{user.bio}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery && !searchLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <FaSearch className="mx-auto text-xl mb-2 opacity-50" />
                      <p>No meme legends match "{searchQuery}" 🤷‍♂️</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-14 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="p-4">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isActive(item.path)
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <item.icon className="text-xl" />
                    <span className="font-medium">{item.label}</span>
                    {item.count > 0 && (
                      <div className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                        {item.count > 9 ? '9+' : item.count}
                      </div>
                    )}
                  </button>
                ))}
                
                {/* Theme Switcher for Mobile */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <div className="flex items-center justify-center">
                    <ThemeSwitcher />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};