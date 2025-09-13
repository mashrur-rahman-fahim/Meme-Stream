import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Post } from "../components/Post";
import { FriendsList } from "../components/FriendsList";
import { Feed } from "../components/Feed";
import { Navbar } from "../components/Navbar";
import api from "../utils/axios";

export const HomePage = () => {
  const { isVerified, loading, logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isVerified === false && !loading) {
      navigate("/auth");
    } else if (isVerified === true && !pageReady) {
      setTimeout(() => setPageReady(true), 100);
    }
  }, [isVerified, navigate, loading, pageReady]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (isVerified) {
        try {
          const response = await api.get('/User/profile');
          setCurrentUser(response.data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [isVerified]);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  if (loading || isVerified === null || (isVerified === true && !pageReady)) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVerified === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base-200 animate-fadeIn">
      <Navbar />

      <div className="pt-16 pb-4">
        {/* Main Container */}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 px-2 sm:px-4 lg:h-[calc(100vh-6rem)] scrollbar-hide">
            
            {/* Left Sidebar */}
            <div className="hidden lg:block lg:w-80 flex-shrink-0 group overflow-y-auto scrollbar-hide">
              <div>
                <div className="card bg-base-100 shadow-lg border border-base-300">
                  <div className="card-body p-4">
                    <h2 className="text-lg font-bold text-base-content mb-3">
                      Create Meme
                    </h2>
                    <Post />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Feed */}
            <div className="flex-1 min-w-0 lg:overflow-y-auto lg:scrollbar-hide">
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="w-full bg-base-100 hover:bg-base-200 border border-base-300 rounded-lg p-4 flex items-center gap-3 transition-colors"
                >
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
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
                  </div>
                  <span className="text-base-content/70">Ready to drop some fire content? 🔥</span>
                </button>
              </div>

              <Feed />
            </div>

            {/* Right Sidebar - Friend Requests - Hidden on mobile */}
            <div className="hidden xl:block xl:w-80 flex-shrink-0 lg:overflow-y-auto scrollbar-hide">
              <div>
                <div className="card bg-base-100 shadow-lg border border-base-300">
                  <div className="card-body p-4">
                    <h2 className="text-lg font-bold text-base-content mb-3">
                      Friends
                    </h2>
                    <FriendsList />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Create Post Modal */}
      {isCreatePostOpen && (
        <div className="modal modal-open lg:hidden">
          <div className="modal-box bg-base-100 max-w-lg mx-auto">
            <button
              onClick={() => setIsCreatePostOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">Create Meme</h3>
            <Post onSuccess={() => setIsCreatePostOpen(false)} />
          </div>
          <div className="modal-backdrop" onClick={() => setIsCreatePostOpen(false)}></div>
        </div>
      )}
    </div>
  );
};
