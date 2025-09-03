import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VerifyContext } from '../../context/create_verify_context';
import { Post } from '../components/Post';
import { Navbar } from '../components/Navbar';
import './HomePage.css';

export const HomePage = () => {
    const { isVerified, verifyUser, loading, logout } = useContext(VerifyContext);
    const navigate = useNavigate();

    useEffect(() => {
        verifyUser();
    }, []);

    useEffect(() => {
        if (!isVerified && !loading) {
            navigate('/Login');
        }
    }, [isVerified, navigate, loading]);

    const handleLogout = () => {
        logout();
        navigate('/Login');
    };

    if (loading) {
        return (
            <div className="homepage-container">
                <Navbar />
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Loading your feed...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="homepage-container">
            <Navbar />

            <div className="homepage-header">
                <div className="welcome-section">
                    <h1 className="homepage-title">Welcome to MemeStream</h1>
                    <p className="homepage-subtitle">Connect, share, and discover amazing content</p>
                </div>

                <div className="user-status-card">
                    <div className="status-info">
                        <div className="status-avatar">👤</div>
                        <div className="status-details">
                            <h3>Your Account Status</h3>
                            <div className="status-text">
                                <div className="status-indicator"></div>
                                {isVerified ? 'Verified User' : 'Verification Pending'}
                            </div>
                        </div>
                    </div>
                    <div className="action-buttons">
                        <button className="btn-secondary">Edit Profile</button>
                        <button className="btn-primary" onClick={handleLogout}>
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="homepage-content">
                {/* Left Sidebar */}
                <div className="left-sidebar">
                    <div className="sidebar-card">
                        <h3 className="sidebar-title">Quick Access</h3>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">🏠</div>
                            <span>Home</span>
                        </div>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">👥</div>
                            <span>Friends</span>
                        </div>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">🎭</div>
                            <span>Meme Groups</span>
                        </div>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">🔥</div>
                            <span>Trending</span>
                        </div>
                        {/* Removed Saved Posts */}
                    </div>

                    <div className="sidebar-card">
                        <h3 className="sidebar-title">Categories</h3>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">😂</div>
                            <span>Funny Memes</span>
                        </div>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">🎮</div>
                            <span>Gaming</span>
                        </div>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">🐱</div>
                            <span>Animals</span>
                        </div>
                        <div className="sidebar-item">
                            <div className="sidebar-icon">💻</div>
                            <span>Tech</span>
                        </div>
                    </div>
                </div>

                {/* Center Feed */}
                <div className="center-feed">
                    <div className="feed-header">
                        <div className="create-post">
                            <div className="user-avatar">U</div>
                            <input
                                type="text"
                                placeholder="What's on your mind?"
                                className="post-input"
                            />
                        </div>
                        <div className="post-actions">
                            <button className="post-action">🖼️ Photo/Video</button>
                            <button className="post-action">😊 Feeling/Activity</button>
                            {/* Removed Check in */}
                        </div>
                    </div>

                    <div className="posts-container">
                        <div className="post-wrapper">
                            <Post />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="right-sidebar">
                    {/* Removed Online Friends */}
                    {/* Removed Suggested Groups */}
                </div>
            </div>
        </div>
    );
};
