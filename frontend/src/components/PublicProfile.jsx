import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Navbar } from "./Navbar";
import { PostCard } from "./PostCard";
import api from "../utils/axios";
import { FaUserPlus, FaUserTimes, FaClock, FaUserCheck, FaArrowLeft, FaUserCircle } from "react-icons/fa";
import toast from "react-hot-toast";

export const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isVerified, loading: verifyLoading } = useContext(VerifyContext);
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isVerified === false && !verifyLoading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, verifyLoading]);

  useEffect(() => {
    if (isVerified && userId) {
      fetchCurrentUser();
      fetchProfile();
    }
  }, [isVerified, userId]);

  const fetchCurrentUser = async () => {
    try {
      const userRes = await api.get("/User/profile");
      setCurrentUser(userRes.data);
    } catch (error) {
      console.error("Error fetching current user data:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/User/profile/${userId}`);
      setProfile(response.data);
      
      // Fetch user's posts
      await fetchPosts();
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 404) {
        toast.error("User not found");
        navigate("/");
      } else {
        toast.error("Error loading profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await api.get(`/Post/user/${userId}`);
      // Use allPosts which includes both original and shared posts, sorted by date
      setPosts(response.data.allPosts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      setActionLoading(true);
      await api.post("/FriendRequest/send", { receiverId: parseInt(userId) });
      toast.success("Friend request sent!");
      // Refresh profile to update friendship status
      fetchProfile();
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Remove ${profile.name} from friends?`)) return;
    
    try {
      setActionLoading(true);
      await api.delete(`/FriendRequest/unfriend/${userId}`);
      toast.success(`${profile.name} removed from friends`);
      // Refresh profile to update friendship status
      fetchProfile();
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setActionLoading(true);
      // Accept the friend request from this user
      await api.post("/FriendRequest/accept", { senderId: parseInt(userId) });
      toast.success("Friend request accepted!");
      // Refresh profile to update friendship status
      fetchProfile();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    try {
      setActionLoading(true);
      // Decline the friend request from this user
      await api.post("/FriendRequest/decline", { senderId: parseInt(userId) });
      toast.success("Friend request declined");
      // Refresh profile to update friendship status
      fetchProfile();
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error("Failed to decline friend request");
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButton = () => {
    if (!profile || profile.isOwnProfile) return null;

    const buttonClass = "btn btn-primary flex items-center gap-2";
    const disabledClass = "btn btn-disabled flex items-center gap-2";

    switch (profile.friendshipStatus) {
      case "Friend":
        return (
          <button
            onClick={handleUnfriend}
            disabled={actionLoading}
            className="btn btn-outline btn-error flex items-center gap-2"
          >
            <FaUserTimes />
            {actionLoading ? "Removing..." : "Unfriend"}
          </button>
        );
      case "Request Sent":
        return (
          <button disabled className={disabledClass}>
            <FaClock />
            Request Sent
          </button>
        );
      case "Request Received":
        return (
          <div className="flex gap-2">
            <button
              onClick={handleAcceptRequest}
              disabled={actionLoading}
              className={buttonClass}
            >
              <FaUserCheck />
              {actionLoading ? "Processing..." : "Accept"}
            </button>
            <button
              onClick={handleDeclineRequest}
              disabled={actionLoading}
              className="btn btn-outline btn-error flex items-center gap-2"
            >
              <FaUserTimes />
              {actionLoading ? "Processing..." : "Decline"}
            </button>
          </div>
        );
      case "None":
      case "Request Declined":
        return (
          <button
            onClick={handleSendFriendRequest}
            disabled={actionLoading || !profile.canSendRequest}
            className={profile.canSendRequest ? buttonClass : disabledClass}
          >
            <FaUserPlus />
            {actionLoading ? "Sending..." : "Add Friend"}
          </button>
        );
      default:
        return null;
    }
  };

  if (verifyLoading || isVerified === null) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div className="loading loading-bars loading-lg text-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-base-content mb-4">User Not Found</h2>
            <button onClick={() => navigate("/")} className="btn btn-primary">
              <FaArrowLeft className="mr-2" />
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm gap-2"
            >
              <FaArrowLeft />
              Back
            </button>
          </div>

          {/* Profile Header */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                
                {/* Profile Picture */}
                <div className="avatar">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full ring-4 ring-primary ring-offset-base-100 ring-offset-2 bg-base-200">
                    {profile.image ? (
                      <img src={profile.image} alt={profile.name} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaUserCircle className="text-6xl md:text-8xl text-base-content/40" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="text-center md:text-left flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-base-content mb-2">
                    {profile.name}
                  </h1>
                  
                  {profile.bio && (
                    <p className="text-base-content/80 text-lg mb-4 max-w-lg">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <div className={`badge ${
                      profile.friendshipStatus === "Friend" ? "badge-success" : 
                      profile.friendshipStatus === "Request Sent" ? "badge-warning" :
                      profile.friendshipStatus === "Request Received" ? "badge-info" :
                      profile.friendshipStatus === "Own Profile" ? "badge-primary" :
                      "badge-ghost"
                    }`}>
                      {profile.friendshipStatus}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center md:justify-start">
                    {renderActionButton()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-base-content">Posts</h2>
                <div className="text-sm text-base-content/60">
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </div>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl text-base-content/20 mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-base-content mb-2">No posts yet</h3>
                  <p className="text-base-content/70">
                    {profile.isOwnProfile ? "Share your first meme!" : `${profile.name} hasn't posted anything yet.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentUser && posts.map((post) => (
                    <PostCard
                      key={`post-${post.id}`}
                      post={post}
                      currentUser={currentUser}
                      onEdit={null} // Don't allow editing on public profiles
                      onDelete={null} // Don't allow deleting on public profiles
                      onUnshare={null} // Don't allow unsharing on public profiles
                      onChange={() => fetchPosts()} // Refresh posts if needed
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};