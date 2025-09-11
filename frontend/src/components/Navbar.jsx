import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import { FaHome, FaUserFriends, FaCommentAlt, FaBell, FaUser, FaCog, FaQuestionCircle, FaSignOutAlt, FaBars, FaTimes, FaSearch, FaUserCircle } from 'react-icons/fa';
import api from '../utils/axios';
import ThemeSwitcher from './ThemeSwitcher';

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
        // Fetch friend requests count
        const friendRequestRes = await api.get('/FriendRequest/get/friend-requests');
        setFriendRequestCount(friendRequestRes.data.length || 0);
        
        // You can add other notification counts here
        // const notificationRes = await api.get('/Notification/count');
        // setNotificationCount(notificationRes.data.count || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUserData();
    fetchNotificationCounts();

    // Refresh counts periodically
    const interval = setInterval(fetchNotificationCounts, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Search functionality
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  const searchUsers = useCallback(
    debounce(async (query) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        setSearchOpen(false);
        return;
      }
      
      setSearchLoading(true);
      try {
        const response = await api.get(`/FriendRequest/search-users/${encodeURIComponent(query)}`);
        setSearchResults(response.data);
        setSearchOpen(true);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (searchQuery) {
      searchUsers(searchQuery);
    } else {
      setSearchResults([]);
      setSearchOpen(false);
    }
  }, [searchQuery, searchUsers]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      navigate(`/profile/${searchResults[0].id}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (route) => {
    navigate(route);
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { icon: FaHome, path: '/', label: 'Home', tooltip: 'Home' },
    { icon: FaUserFriends, path: '/friends', label: 'Friends', tooltip: 'Friends', count: friendRequestCount },
    { icon: FaCommentAlt, path: '/messages', label: 'Messages', tooltip: 'Messages' },
    { icon: FaBell, path: '/notifications', label: 'Notifications', tooltip: 'Notifications', count: notificationCount },
  ];

  return (
    <>
      <div className="navbar bg-base-100/95 backdrop-blur-md shadow-lg border-b border-base-300/50 fixed top-0 left-0 right-0 z-50 h-16">
        <div className="max-w-7xl mx-auto w-full px-4">
          <div className="flex items-center justify-between w-full">
            
            {/* Left Section: Logo + Desktop Navigation */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <button 
                className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center gap-2 flex-shrink-0"
                onClick={handleLogoClick}
              >
                <span className="text-2xl">🎭</span>
                <span className="hidden sm:block">MemeStream</span>
              </button>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <div key={item.path} className="tooltip tooltip-bottom" data-tip={item.tooltip}>
                    <button 
                      className={`btn btn-ghost btn-circle relative transition-all duration-200 ${
                        isActive(item.path) 
                          ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' 
                          : 'hover:bg-base-300 hover:scale-110'
                      }`}
                      onClick={() => handleNavClick(item.path)}
                    >
                      <item.icon className="text-xl" />
                      {item.count > 0 && (
                        <div className="absolute -top-2 -right-2 bg-error text-error-content rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold animate-pulse">
                          {item.count > 9 ? '9+' : item.count}
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Center Section: Search Bar */}
            <div className="flex-1 max-w-lg mx-4 hidden md:block">
              <div className="relative w-full" ref={searchRef}>
                <form onSubmit={handleSearchSubmit} className="w-full">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 z-10" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="input input-bordered input-sm w-full pl-10 pr-10 bg-base-200/50 backdrop-blur-sm focus:bg-base-100 focus:border-primary transition-all duration-200 rounded-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery && searchResults.length > 0 && setSearchOpen(true)}
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="loading loading-spinner loading-sm text-primary"></div>
                      </div>
                    )}
                  </div>
                </form>

                {/* Search Results Dropdown */}
                {searchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-300 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="p-2">
                        <div className="text-xs text-base-content/50 px-3 py-2 border-b border-base-300">
                          Search Results
                        </div>
                        {searchResults.slice(0, 8).map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleUserClick(user.id)}
                            className="w-full p-3 hover:bg-base-200 rounded-lg transition-colors flex items-center gap-3 text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {user.image ? (
                                <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <FaUserCircle className="text-primary text-lg" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-base-content truncate">{user.name}</p>
                              {user.bio && (
                                <p className="text-xs text-base-content/60 truncate">{user.bio}</p>
                              )}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              user.friendshipStatus === 'Friend' ? 'bg-success/20 text-success' :
                              user.friendshipStatus === 'Request Sent' ? 'bg-warning/20 text-warning' :
                              user.friendshipStatus === 'Request Received' ? 'bg-info/20 text-info' :
                              'bg-base-300 text-base-content/60'
                            }`}>
                              {user.friendshipStatus}
                            </div>
                          </button>
                        ))}
                        {searchResults.length > 8 && (
                          <div className="px-3 py-2 text-center text-xs text-base-content/50 border-t border-base-300">
                            +{searchResults.length - 8} more results
                          </div>
                        )}
                      </div>
                    ) : searchQuery && !searchLoading ? (
                      <div className="p-6 text-center text-base-content/60">
                        <FaSearch className="mx-auto text-2xl mb-2 opacity-50" />
                        <p>No users found for "{searchQuery}"</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Theme + Profile + Mobile Menu */}
            <div className="flex items-center gap-2">
              {/* Theme Switcher - Desktop */}
              <div className="hidden lg:block">
                <ThemeSwitcher />
              </div>
              
              {/* Profile Dropdown - Desktop */}
              <div className="dropdown dropdown-end hidden lg:block">
                <div 
                  tabIndex={0} 
                  role="button" 
                  className="btn btn-ghost btn-circle avatar hover:bg-base-300 transition-colors"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content font-bold shadow-lg">
                    {currentUser?.image ? (
                      <img 
                        src={currentUser.image} 
                        alt={currentUser?.name || 'User'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">
                        {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <ul 
                  tabIndex={0} 
                  className="menu menu-sm dropdown-content mt-3 z-[100] p-3 shadow-2xl bg-base-100 border border-base-300 rounded-2xl w-56"
                >
                  {/* User Info */}
                  <li className="menu-title px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content text-xs font-bold">
                        {currentUser?.image ? (
                          <img 
                            src={currentUser.image} 
                            alt={currentUser?.name || 'User'} 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (currentUser?.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base-content truncate">
                          {currentUser?.name || 'User'}
                        </p>
                        <p className="text-xs text-base-content/60 truncate">
                          {currentUser?.email || 'user@example.com'}
                        </p>
                      </div>
                    </div>
                  </li>
                  <li><hr className="my-2 border-base-300" /></li>
                  
                  <li>
                    <button 
                      onClick={() => handleNavClick('/profile')}
                      className="flex items-center gap-3 hover:bg-primary/10 hover:text-primary transition-colors rounded-lg"
                    >
                      <FaUser />
                      Profile
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleNavClick('/settings')}
                      className="flex items-center gap-3 hover:bg-primary/10 hover:text-primary transition-colors rounded-lg"
                    >
                      <FaCog />
                      Settings
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleNavClick('/help')}
                      className="flex items-center gap-3 hover:bg-primary/10 hover:text-primary transition-colors rounded-lg"
                    >
                      <FaQuestionCircle />
                      Help & Support
                    </button>
                  </li>
                  <li><hr className="my-2 border-base-300" /></li>
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 text-error hover:bg-error/10 hover:text-error transition-colors rounded-lg"
                    >
                      <FaSignOutAlt />
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
              
              {/* Mobile Menu Button */}
              <button 
                className="btn btn-ghost btn-circle lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-base-100 border-b border-base-300 shadow-xl">
            <div className="p-4">
              
              {/* Mobile Search */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
                  <FaSearch className="text-primary" />
                  Search Users
                </h3>
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" />
                    <input
                      type="text"
                      placeholder="Search for users..."
                      className="input input-bordered w-full pl-10 pr-4 rounded-full bg-base-200/50 focus:bg-base-100 focus:border-primary transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="loading loading-spinner loading-sm text-primary"></div>
                      </div>
                    )}
                  </div>
                </form>
                
                {/* Mobile Search Results */}
                {searchQuery && searchResults.length > 0 && (
                  <div className="mt-3 bg-base-100 border border-base-300 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs text-base-content/50 px-3 py-2 border-b border-base-300">
                        Search Results
                      </div>
                      {searchResults.slice(0, 5).map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserClick(user.id)}
                          className="w-full p-3 hover:bg-base-200 rounded-lg transition-colors flex items-center gap-3 text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {user.image ? (
                              <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <FaUserCircle className="text-primary text-lg" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base-content truncate">{user.name}</p>
                            {user.bio && (
                              <p className="text-xs text-base-content/60 truncate">{user.bio}</p>
                            )}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            user.friendshipStatus === 'Friend' ? 'bg-success/20 text-success' :
                            user.friendshipStatus === 'Request Sent' ? 'bg-warning/20 text-warning' :
                            user.friendshipStatus === 'Request Received' ? 'bg-info/20 text-info' :
                            'bg-base-300 text-base-content/60'
                          }`}>
                            {user.friendshipStatus}
                          </div>
                        </button>
                      ))}
                      {searchResults.length > 5 && (
                        <div className="px-3 py-2 text-center text-xs text-base-content/50 border-t border-base-300">
                          +{searchResults.length - 5} more results
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && !searchLoading && (
                  <div className="mt-3 p-4 text-center text-base-content/60 text-sm">
                    <FaSearch className="mx-auto text-xl mb-2 opacity-50" />
                    <p>No users found for "{searchQuery}"</p>
                  </div>
                )}
              </div>

              {/* User Profile Section */}
              <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-content font-bold">
                  {currentUser?.image ? (
                    <img 
                      src={currentUser.image} 
                      alt={currentUser?.name || 'User'} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    (currentUser?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base-content">
                    {currentUser?.name || 'User'}
                  </h3>
                  <p className="text-sm text-base-content/60">
                    {currentUser?.email || 'user@example.com'}
                  </p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-base-content mb-3">Navigation</h3>
                <div className="grid grid-cols-2 gap-2">
                  {navItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`p-4 rounded-xl transition-all duration-200 relative ${
                        isActive(item.path) 
                          ? 'bg-primary text-primary-content shadow-lg scale-105' 
                          : 'bg-base-200 hover:bg-base-300 hover:scale-105'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <item.icon className="text-xl" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {item.count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-error text-error-content rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                          {item.count > 9 ? '9+' : item.count}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Switcher - Mobile */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-base-content mb-3">Theme</h3>
                <div className="flex justify-center">
                  <ThemeSwitcher />
                </div>
              </div>

              {/* Profile Actions */}
              <div className="pt-4 border-t border-base-300">
                <h3 className="text-sm font-semibold text-base-content mb-3">Account</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button 
                    onClick={() => handleNavClick('/profile')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-base-200 hover:bg-base-300 hover:scale-105 transition-all"
                  >
                    <FaUser className="text-lg" />
                    <span className="text-sm font-medium">Profile</span>
                  </button>
                  <button 
                    onClick={() => handleNavClick('/settings')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-base-200 hover:bg-base-300 hover:scale-105 transition-all"
                  >
                    <FaCog className="text-lg" />
                    <span className="text-sm font-medium">Settings</span>
                  </button>
                </div>
                <button 
                  onClick={() => handleNavClick('/help')}
                  className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors mb-3"
                >
                  <FaQuestionCircle />
                  <span className="font-medium">Help & Support</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-error/10 text-error hover:bg-error hover:text-error-content transition-colors"
                >
                  <FaSignOutAlt />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};