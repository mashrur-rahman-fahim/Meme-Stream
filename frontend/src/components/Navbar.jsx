import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import './Navbar.css';

export const Navbar = () => {
  const { logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/Login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  const handleNavClick = (section) => {
    console.log('Navigating to:', section);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h2 className="logo" onClick={() => navigate('/')}>
          MemeStream
        </h2>
      </div>

      <div className="navbar-center">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for memes, users, or topics..."
            className="search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="navbar-right">
        <button 
          className="nav-btn active" 
          onClick={() => handleNavClick('home')}
          title="Home"
        >
          🏠
        </button>
        <button 
          className="nav-btn" 
          onClick={() => handleNavClick('friends')}
          title="Friends"
        >
          👥
        </button>
        <button 
          className="nav-btn" 
          onClick={() => handleNavClick('messages')}
          title="Messages"
        >
          💬
        </button>
        <button 
          className="nav-btn" 
          onClick={() => handleNavClick('notifications')}
          title="Notifications"
        >
          🔔
        </button>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </nav>
  );
};