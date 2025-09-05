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
  <div className="min-h-screen bg-white">
    <Navbar />

    <div className="pt-20">
      <div className="text-center py-6 border-b border-gray-100">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
          MemeStream
        </h1>
        <p className="text-gray-600 text-base mt-1">
          Your Daily Dose of Memes with Smart Feed Algorithm
        </p>
      </div>

      <div className="flex min-h-screen gap-4 px-4">
        <div className="w-80 flex-shrink-0 space-y-4 bg-gray-50">
          {/* Create Post */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden border-b border-black/70">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 p-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                Create Post
              </h2>
            </div>
            <div className="p-4 border-t border-black/40">
              <Post />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden border-b border-black/70">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 p-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                Friend Requests
              </h2>
            </div>
            <div className="p-4 border-t border-black/40">
              <FriendRequest />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-full overflow-hidden border-b border-black/70">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 p-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                Feed
              </h2>
            </div>
            <div className="p-4 border-t border-black/40">
              <Feed />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

};