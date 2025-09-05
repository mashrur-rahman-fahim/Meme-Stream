import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Post } from "../components/Post";
import { FriendRequest } from "../components/FriendRequest";
import { Feed } from "../components/Feed";
import { Navbar } from "../components/Navbar";

export const HomePage = () => {
  const { isVerified, verifyUser, loading, logout } = useContext(VerifyContext);
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, loading]);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

return (
  <div className="min-h-screen bg-base-200">
    <Navbar />
    
    <div className="pt-20">
      <div className="text-center py-6 border-b border-base-300">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          MemeStream
        </h1>
        <p className="text-base-content/70 text-base mt-1">
          Your Daily Dose of Memes with Smart Feed Algorithm
        </p>
      </div>
      
      <div className="flex min-h-screen gap-4 px-4">
        {/* Left Sidebar - Create Post */}
        <div className="w-80 flex-shrink-0 space-y-4 bg-base-300/50">
          <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-header bg-gradient-to-r from-primary to-secondary p-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-primary-content flex items-center">
                Create Post
              </h2>
            </div>
            <div className="card-body p-4 border-t border-base-300">
              <Post />
            </div>
          </div>
        </div>
        
        {/* Middle - Feed */}
        <div className="flex-1">
          <div className="card bg-base-100 shadow-md border border-base-300 min-h-full">
            <div className="card-header bg-gradient-to-r from-primary to-secondary p-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-primary-content flex items-center">
                Feed
              </h2>
            </div>
            <div className="card-body p-4 border-t border-base-300">
              <Feed />
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - Friend Requests */}
        <div className="w-80 flex-shrink-0 space-y-4 bg-base-300/50">
          <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-header bg-gradient-to-r from-primary to-secondary p-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-primary-content flex items-center">
                Friend Requests
              </h2>
            </div>
            <div className="card-body p-4 border-t border-base-300">
              <FriendRequest />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};