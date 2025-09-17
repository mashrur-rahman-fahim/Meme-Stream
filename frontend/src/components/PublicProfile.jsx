import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context";
import { Navbar } from "./Navbar";
import { PostCard } from "./PostCard";
import api from "../utils/axios";
import laughScoreService from "../services/laughScoreService";
import {
  FaUserPlus,
  FaUserTimes,
  FaClock,
  FaUserCheck,
  FaArrowLeft,
  FaUserCircle,
  FaClipboardList,
  FaUserFriends,
  FaLaugh,
  FaTrophy
} from "react-icons/fa";
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
  const [activeTab, setActiveTab] = useState("posts");
  const [laughScore, setLaughScore] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

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
      const [profileRes, postsRes, laughScoreRes, leaderboardRes] = await Promise.all([
        api.get(`/User/profile/${userId}`),
        api.get(`/Post/user/${userId}`),
        laughScoreService.getDetailedScore(userId),
        laughScoreService.getLeaderboard(10)
      ]);

      setProfile(profileRes.data);
      setPosts(postsRes.data.allPosts || []);

      if (laughScoreRes.success) {
        setLaughScore(laughScoreRes.data);
      }

      if (leaderboardRes.success) {
        const leaderboardData = leaderboardRes.data?.leaderboard || leaderboardRes.data || [];
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      }
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

    const buttonClass = "btn btn-outline btn-primary btn-xs xs:btn-sm sm:btn-md text-xs sm:text-sm";
    const disabledClass = "btn btn-disabled btn-xs xs:btn-sm sm:btn-md text-xs sm:text-sm";

    switch (profile.friendshipStatus) {
      case "Friend":
        return (
          <button
            onClick={handleUnfriend}
            disabled={actionLoading}
            className="btn btn-outline btn-error btn-xs xs:btn-sm sm:btn-md text-xs sm:text-sm"
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
              className="btn btn-outline btn-error btn-xs xs:btn-sm sm:btn-md text-xs sm:text-sm"
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
    <div className="bg-base-300 min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto pt-16 sm:pt-18 md:pt-20 px-2 sm:px-4 lg:px-6">
        <div className="bg-base-200 shadow-lg rounded-lg sm:rounded-b-lg">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-6">
              <div className="avatar flex-shrink-0">
                <div className="w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full ring-2 sm:ring-3 md:ring-4 ring-primary ring-offset-base-100 ring-offset-1 sm:ring-offset-2 bg-base-100">
                  {profile.image ? (
                    <img src={profile.image} alt={profile.name} className="rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-base-content flex items-center justify-center w-full h-full">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-base-content break-words">{profile.name}</h1>
                <p className="text-base-content/60 mt-1 text-xs xs:text-sm sm:text-base truncate">{profile.email}</p>
                {profile.bio && (
                  <p className="text-base-content/80 mt-2 sm:mt-3 max-w-full sm:max-w-lg text-xs xs:text-sm sm:text-base leading-relaxed">{profile.bio}</p>
                )}
                <div className="mt-2 sm:mt-3">
                  <div className={`badge badge-sm sm:badge-md ${
                    profile.friendshipStatus === "Friend" ? "badge-success" :
                    profile.friendshipStatus === "Request Sent" ? "badge-warning" :
                    profile.friendshipStatus === "Request Received" ? "badge-info" :
                    "badge-ghost"
                  }`}>
                    {profile.friendshipStatus}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-full sm:w-auto">
                {renderActionButton()}
              </div>
            </div>
          </div>
          <div className="px-2 sm:px-4 md:px-6 mt-2 sm:mt-3 md:mt-4 border-t border-base-content/10">
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 overflow-x-auto scrollbar-hide pb-1">
              <TabButton
                icon={<FaClipboardList />}
                label="Posts"
                isActive={activeTab === "posts"}
                onClick={() => setActiveTab("posts")}
              />
              <TabButton
                icon={<FaUserCircle />}
                label="About"
                isActive={activeTab === "about"}
                onClick={() => setActiveTab("about")}
              />
              <TabButton
                icon={<FaTrophy />}
                label="Leaderboard"
                isActive={activeTab === "leaderboard"}
                onClick={() => setActiveTab("leaderboard")}
              />
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          {activeTab === "posts" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {posts?.length === 0 ? (
                <div className="mt-4 sm:mt-5 text-center text-base-content">
                  <div className="text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4">📝</div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-xs sm:text-sm md:text-base text-base-content/60">
                    {profile.isOwnProfile ? "Share your first meme!" : `${profile.name} hasn't posted anything yet.`}
                  </p>
                </div>
              ) : (
                currentUser && posts?.map((post) => (
                  <PostCard
                    key={`${post.isShared ? "shared" : "post"}-${post.id}`}
                    post={post}
                    currentUser={currentUser}
                    onEdit={null}
                    onDelete={null}
                    onUnshare={null}
                    onChange={() => fetchPosts()}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="bg-base-100 rounded-lg p-3 sm:p-4 md:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-base-content mb-3 sm:mb-4 flex items-center gap-2">
                  <FaUserCircle className="text-primary text-base sm:text-lg md:text-xl" />
                  About {profile.name}
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="font-medium text-base-content mb-2 text-xs sm:text-sm md:text-base">Bio</h3>
                    <p className="text-base-content/70 text-xs sm:text-sm md:text-base leading-relaxed">
                      {profile.bio || "No bio available yet."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-base-content mb-2 text-xs sm:text-sm md:text-base">Member Since</h3>
                    <p className="text-base-content/70 text-xs sm:text-sm md:text-base">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : "Recently joined"}
                    </p>
                  </div>
                </div>
              </div>

              {laughScore && (
                <div className="bg-base-100 rounded-lg p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <FaLaugh className="text-primary text-base sm:text-lg md:text-xl" />
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold text-base-content">Comedy Level</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">{laughScore.totalScore}</span>
                          <span className="text-base-content/60 text-sm sm:text-base md:text-lg">points</span>
                        </div>
                        <div className="text-sm sm:text-base md:text-lg font-medium text-primary">
                          {laughScore.funninessLevel}
                        </div>
                      </div>

                      <div className="bg-base-200 rounded-lg p-2 sm:p-3 md:p-4">
                        <h3 className="font-medium text-base-content mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">Activity Breakdown</h3>
                        <div className="grid grid-cols-2 gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Posts:</span>
                            <span className="font-medium">{laughScore.totalPosts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Reactions:</span>
                            <span className="font-medium">{laughScore.uniqueReactions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Shares:</span>
                            <span className="font-medium">{laughScore.uniqueShares}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Comments:</span>
                            <span className="font-medium">{laughScore.uniqueComments}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="bg-base-200 rounded-lg p-2 sm:p-3 md:p-4">
                        <h3 className="font-medium text-base-content mb-2 text-xs sm:text-sm md:text-base">Performance</h3>
                        <div className="text-xs sm:text-sm text-base-content/70">
                          <p>Average per meme: <span className="font-medium">{laughScore.averageScorePerMeme?.toFixed(1) || 0} pts</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="text-center mb-3 sm:mb-4 md:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-base-content flex items-center justify-center gap-2">
                  <FaTrophy className="text-yellow-500 text-lg sm:text-xl md:text-2xl" />
                  <span className="hidden sm:inline">Comedy Leaderboard</span>
                  <span className="sm:hidden">Leaderboard</span>
                </h2>
                <p className="text-base-content/60 mt-1 text-xs sm:text-sm md:text-base">The funniest users on MemeStream</p>
              </div>

              {!Array.isArray(leaderboard) || leaderboard.length === 0 ? (
                <div className="text-center text-base-content">
                  <div className="text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4">🏆</div>
                  <p className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4">No leaderboard data available</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {leaderboard.map((userItem, index) => (
                    <div
                      key={userItem.userId || userItem.id}
                      className={`p-2 sm:p-3 md:p-4 rounded-lg border flex items-center justify-between ${
                        (userItem.userId || userItem.id) === parseInt(userId)
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-base-100 border-base-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                        <div className={`text-sm sm:text-lg md:text-2xl font-bold w-5 sm:w-6 md:w-8 text-center flex-shrink-0 ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-yellow-600' :
                          'text-base-content/60'
                        }`}>
                          {index + 1}
                        </div>

                        <div className="avatar flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-base-200">
                            {userItem.image ? (
                              <img src={userItem.image} alt={userItem.name} className="rounded-full object-cover" />
                            ) : (
                              <span className="text-xs sm:text-sm md:text-lg flex items-center justify-center w-full h-full">
                                {userItem.name?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-base-content text-xs sm:text-sm md:text-base truncate">
                            {userItem.name}
                            {(userItem.userId || userItem.id) === parseInt(userId) && (
                              <span className="ml-1 sm:ml-2 text-xs text-primary">(This User)</span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-primary truncate">
                            {userItem.funninessLevel}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm sm:text-lg md:text-2xl font-bold text-primary">{userItem.laughScore}</div>
                        <div className="text-xs text-base-content/60">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium sm:font-semibold border-b-2 sm:border-b-3 md:border-b-4 transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap min-w-0 ${
      isActive
        ? "border-primary text-primary"
        : "border-transparent text-base-content/70 hover:text-base-content"
    }`}
  >
    <span className="text-xs sm:text-sm md:text-base flex-shrink-0">{icon}</span>
    <span className="hidden sm:inline truncate">{label}</span>
    <span className="sm:hidden text-xs truncate">{label.split(' ')[0]}</span>
  </button>
);