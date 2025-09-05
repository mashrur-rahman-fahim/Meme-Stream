import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';

export const Navbar = () => {
  const { logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/Login');
  };

  const handleNavClick = (section, route) => {
    console.log('Navigating to:', section);
    if (route) {
      navigate(route);
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  // Helper function to check if current route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="navbar bg-white/95 backdrop-blur-xl shadow-lg border-b border-base-200 fixed top-0 left-0 right-0 z-50 h-16">
      {/* Left section - Logo */}
      <div className="navbar-start">
        <h2 
          className="text-2xl font-black bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center gap-2 hover:drop-shadow-lg"
          onClick={handleLogoClick}
        >
          MemeStream
          <span className="text-xl animate-bounce">📱</span>
        </h2>
      </div>

      {/* Right section - Navigation buttons */}
      <div className="navbar-end">
        <div className="flex items-center gap-2">
          {/* Home Button */}
          <div className="tooltip tooltip-bottom" data-tip="Home">
            <button 
              className={`btn btn-circle btn-ghost text-lg hover:bg-pink-100 hover:text-pink-500 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md ${
                isActive('/') ? 'bg-pink-100 text-pink-500 ring-2 ring-pink-200' : ''
              }`}
              onClick={() => handleNavClick('home', '/')}
            >
              🏠
            </button>
          </div>

          {/* Friends Button */}
          <div className="tooltip tooltip-bottom" data-tip="Friends">
            <button 
              className={`btn btn-circle btn-ghost text-lg hover:bg-pink-100 hover:text-pink-500 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md ${
                isActive('/friends') ? 'bg-pink-100 text-pink-500 ring-2 ring-pink-200' : ''
              }`}
              onClick={() => handleNavClick('friends', '/friends')}
            >
              👥
            </button>
          </div>

          {/* Messages Button */}
          <div className="tooltip tooltip-bottom" data-tip="Messages">
            <button 
              className={`btn btn-circle btn-ghost text-lg hover:bg-pink-100 hover:text-pink-500 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md ${
                isActive('/messages') ? 'bg-pink-100 text-pink-500 ring-2 ring-pink-200' : ''
              }`}
              onClick={() => handleNavClick('messages', '/messages')}
            >
              💬
            </button>
          </div>

          {/* Notifications Button with Badge */}
          <div className="tooltip tooltip-bottom" data-tip="Notifications">
            <div className="indicator">
              <span className="indicator-item badge badge-error badge-sm animate-pulse shadow-lg">3</span>
              <button 
                className={`btn btn-circle btn-ghost text-lg hover:bg-pink-100 hover:text-pink-500 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md ${
                  isActive('/notifications') ? 'bg-pink-100 text-pink-500 ring-2 ring-pink-200' : ''
                }`}
                onClick={() => handleNavClick('notifications', '/notifications')}
              >
                🔔
              </button>
            </div>
          </div>

          {/* Profile Dropdown */}
          <div className="dropdown dropdown-end">
            <div 
              tabIndex={0} 
              role="button" 
              className="btn btn-ghost btn-circle avatar"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="w-8 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl">
                U
              </div>
            </div>
            <ul 
              tabIndex={0} 
              className={`menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-2xl bg-white/95 backdrop-blur-xl rounded-box w-52 border border-base-200 ${
                isProfileOpen ? 'block' : ''
              }`}
            >
              <li>
                <button 
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="justify-between hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 rounded-lg w-full text-left"
                >
                  Profile
                  <span className="badge badge-primary badge-sm animate-pulse">New</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    navigate('/settings');
                    setIsProfileOpen(false);
                  }}
                  className="hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 rounded-lg w-full text-left"
                >
                  Settings
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    navigate('/help');
                    setIsProfileOpen(false);
                  }}
                  className="hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 rounded-lg w-full text-left"
                >
                  Help
                </button>
              </li>
              <li><hr className="my-2 border-base-300" /></li>
              <li>
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsProfileOpen(false);
                  }}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 rounded-lg w-full text-left"
                >
                  🚪 Logout
                </button>
              </li>
            </ul>
          </div>

          {/* Divider */}
          <div className="divider divider-horizontal mx-1"></div>

          {/* Alternative Standalone Logout Button (uncomment if you prefer this style) */}
          {/* 
          <button 
            className="btn btn-sm bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            onClick={handleLogout}
          >
            <span className="text-sm">🚪</span>
            Logout
          </button>
          */}
        </div>
      </div>

      {/* Mobile Menu Button (for responsive design) */}
      <div className="navbar-end lg:hidden">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-2xl bg-white/95 backdrop-blur-xl rounded-box w-52 border border-base-200">
            <li>
              <button 
                onClick={() => navigate('/')}
                className={`hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 w-full text-left ${
                  isActive('/') ? 'bg-pink-100 text-pink-500' : ''
                }`}
              >
                🏠 Home
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/friends')}
                className={`hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 w-full text-left ${
                  isActive('/friends') ? 'bg-pink-100 text-pink-500' : ''
                }`}
              >
                👥 Friends
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/messages')}
                className={`hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 w-full text-left ${
                  isActive('/messages') ? 'bg-pink-100 text-pink-500' : ''
                }`}
              >
                💬 Messages
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/notifications')}
                className={`hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 w-full text-left ${
                  isActive('/notifications') ? 'bg-pink-100 text-pink-500' : ''
                }`}
              >
                🔔 Notifications
              </button>
            </li>
            <li><hr className="my-2 border-base-300" /></li>
            <li>
              <button 
                onClick={() => navigate('/profile')}
                className={`hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 w-full text-left ${
                  isActive('/profile') ? 'bg-pink-100 text-pink-500' : ''
                }`}
              >
                Profile
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/settings')}
                className={`hover:bg-pink-50 hover:text-pink-500 transition-colors duration-200 w-full text-left ${
                  isActive('/settings') ? 'bg-pink-100 text-pink-500' : ''
                }`}
              >
                Settings
              </button>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className="text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 w-full text-left"
              >
                🚪 Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};