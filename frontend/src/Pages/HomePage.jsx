import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Post } from "../components/Post";
import { FriendsList } from "../components/FriendsList";
import { Feed } from "../components/Feed";
import { Navbar } from "../components/Navbar";

export const HomePage = () => {
  const { isVerified, loading, logout } = useContext(VerifyContext);
  const navigate = useNavigate();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    if (isVerified === false && !loading) {
      navigate("/auth");
    } else if (isVerified === true && !pageReady) {
      // Give components time to mount and start fetching data
      // This prevents showing the page until everything is ready
      setTimeout(() => setPageReady(true), 100);
    }
  }, [isVerified, navigate, loading, pageReady]);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  // Show loading while authentication is in progress OR page is not ready yet
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
<<<<<<< HEAD
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 px-1 sm:px-2 lg:px-3">
            
            {/* Left Sidebar - Hidden on mobile, visible on lg+ */}
            <div className="hidden lg:block lg:w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
=======
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 px-2 sm:px-4 lg:h-[calc(100vh-6rem)] scrollbar-hide">
            
            {/* Left Sidebar - Hidden on mobile, visible on lg+ */}
            <div className="hidden lg:block lg:w-80 flex-shrink-0 group overflow-y-auto scrollbar-hide">
              <div>
>>>>>>> ea631ac38a4b4403b1f522a17a07367803227679
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

            {/* Main Feed Container */}
            <div className="flex-1 min-w-0 lg:overflow-y-auto lg:scrollbar-hide">
              {/* Mobile Create Post Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="w-full bg-base-100 hover:bg-base-200 border border-base-300 rounded-lg p-4 flex items-center gap-3 transition-colors"
                >
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-content font-bold">U</span>
                    </div>
                  </div>
                  <span className="text-base-content/70">What's on your mind?</span>
                </button>
              </div>

              {/* Posts Feed */}
              <Feed />
            </div>

<<<<<<< HEAD
            {/* Right Sidebar - Friends List - Hidden on mobile */}
            <div className="hidden xl:block xl:w-80 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
=======
            {/* Right Sidebar - Friend Requests - Hidden on mobile */}
            <div className="hidden xl:block xl:w-80 flex-shrink-0 lg:overflow-y-auto scrollbar-hide">
              <div>
>>>>>>> ea631ac38a4b4403b1f522a17a07367803227679
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