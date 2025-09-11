import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import { FaHome, FaUserFriends, FaCommentAlt, FaBell, FaUser, FaCog, FaQuestionCircle, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
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
      <div className="navbar bg-base-100/95 backdrop-blur-md shadow-lg border-b border-base-300/50 fixed top-0 left-0 right-0 z-50 h-16 px-4">
        
        {/* Logo */}
        <div className="navbar-start">
          <button 
            className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center gap-2"
            onClick={handleLogoClick}
          >
            <span className="text-2xl">🎭</span>
            <span className="hidden sm:block">MemeStream</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-center hidden lg:flex">
          <div className="flex items-center gap-1">
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

        {/* Profile & Mobile Menu */}
        <div className="navbar-end">
          {/* Theme Switcher - Desktop */}
          <div className="hidden lg:block mr-2">
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-base-100 border-b border-base-300 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4">
              
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
              <div className="space-y-2 mb-4">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive(item.path) 
                        ? 'bg-primary/20 text-primary border border-primary/30' 
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="text-lg" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <div className="bg-error text-error-content rounded-full px-2 py-1 text-xs font-bold">
                        {item.count > 9 ? '9+' : item.count}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Theme Switcher - Mobile */}
              <div className="mb-4">
                <div className="flex items-center justify-center">
                  <ThemeSwitcher />
                </div>
              </div>

              {/* Profile Actions */}
              <div className="space-y-2 pt-4 border-t border-base-300">
                <button 
                  onClick={() => handleNavClick('/profile')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
                >
                  <FaUser />
                  Profile
                </button>
                <button 
                  onClick={() => handleNavClick('/settings')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
                >
                  <FaCog />
                  Settings
                </button>
                <button 
                  onClick={() => handleNavClick('/help')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
                >
                  <FaQuestionCircle />
                  Help & Support
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-error hover:bg-error/10 transition-colors"
                >
                  <FaSignOutAlt />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};