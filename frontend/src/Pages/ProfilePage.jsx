import React, { useContext, useEffect, useState, useCallback } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import feedService from "../services/feedService";
import laughScoreService from "../services/laughScoreService";
import { PostCard } from "../components/PostCard";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { Navbar } from "../components/Navbar";
import ProfileEditModal from "../components/ProfileEditModal";
import toast from "react-hot-toast";
import {
  FaUserEdit,
  FaClipboardList,
  FaUserCircle,
  FaUserFriends,
  FaLaugh,
  FaTrophy,
} from "react-icons/fa";

export const ProfilePage = () => {
  const [user, setUser] = useState({ name: "", email: "", bio: "", image: "" });
  const [posts, setPosts] = useState([]);
  const [laughScore, setLaughScore] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // for confirmation modal:
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    confirmText: 'Confirm',
    confirmButtonClass: 'btn-primary',
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const { isVerified, loading: verifyLoading } = useContext(VerifyContext);
  const navigate = useNavigate();

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, postsRes, laughScoreRes, leaderboardRes] = await Promise.all([
        api.get("/User/profile"),
        feedService.getUserPosts(),
        laughScoreService.getDetailedScore(),
        laughScoreService.getLeaderboard(10)
      ]);
      
      console.log("Profile user data:", userRes.data);
      setUser(userRes.data);
      
      if (postsRes.success) {
        setPosts(postsRes.data.allPosts || []);
      }
      
      if (laughScoreRes.success) {
        console.log("LaughScore data received:", laughScoreRes.data);
        setLaughScore(laughScoreRes.data);
      } else {
        console.error("Failed to fetch LaughScore:", laughScoreRes.error);
      }
      
      if (leaderboardRes.success) {
        console.log("Leaderboard response:", leaderboardRes.data);
        // Handle the nested structure - API returns { title, leaderboard }
        const leaderboardData = leaderboardRes.data?.leaderboard || leaderboardRes.data || [];
        console.log("Extracted leaderboard data:", leaderboardData);
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      } else {
        console.error("Failed to fetch leaderboard:", leaderboardRes.error);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Set default values on error
      setLeaderboard([]);
      setLaughScore(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleRecalculateAllScores = async () => {
    const toastId = toast.loading("Recalculating all scores...");
    try {
      const response = await api.post("/LaughScore/recalculate-all");
      if (response.status === 200) {
        toast.success("All scores recalculated successfully!", { id: toastId });
        // Refresh the data to show updated leaderboard
        await fetchUserData();
      }
    } catch (error) {
      console.error("Failed to recalculate scores:", error);
      toast.error("Failed to recalculate scores", { id: toastId });
    }
  };
  
  const handleInitializeMyScore = async () => {
    const toastId = toast.loading("Initializing your score...");
    try {
      const response = await api.post("/LaughScore/initialize");
      if (response.status === 200) {
        toast.success(`Score initialized: ${response.data.laughScore} points!`, { id: toastId });
        // Refresh the data to show updated leaderboard
        await fetchUserData();
      }
    } catch (error) {
      console.error("Failed to initialize score:", error);
      toast.error("Failed to initialize score", { id: toastId });
    }
  };

  // Handle profile update from the modal
  const handleProfileUpdate = useCallback((updatedUser) => {
    setUser(updatedUser);
    // Optionally refresh user data to ensure consistency
    // fetchUserData();
  }, []);

  const handleDeletePost = useCallback(async (postId) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Post',
      message: 'Are you sure you want to permanently delete this post?',
      onConfirm: () => performDeletePost(postId),
      confirmText: 'Delete',
      confirmButtonClass: 'btn-error',
    });
  }, []);

  const performDeletePost = async (postId) => {
    setIsConfirming(true);
    const result = await feedService.deletePost(postId);
    if (result.success) {
      toast.success("Post deleted successfully!");
      fetchUserData();
    } else {
      toast.error(`Failed to delete post`);
    }
    setIsConfirming(false);
    setConfirmState({ isOpen: false });
  };

  const handleUnsharePost = useCallback(async (postId) => {
    setConfirmState({
      isOpen: true,
      title: 'Unshare Post',
      message: 'Are you sure you want to unshare this post?',
      onConfirm: () => performUnsharePost(postId),
      confirmText: 'Unshare',
      confirmButtonClass: 'btn-warning',
    });
  }, []);

  const performUnsharePost = async (postId) => {
    setIsConfirming(true);
    const result = await feedService.unsharePost(postId);
    if (result.success) {
      toast.success("Post unshared successfully!");
      fetchUserData();
    } else {
      toast.error(`Failed to unshare post`);
    }
    setIsConfirming(false);
    setConfirmState({ isOpen: false });
  };

  const handleEditPost = useCallback((postId, currentContent) => {
    alert(`Editing Post ID: ${postId}\nCurrent Content: ${currentContent}`);
  }, []);

  const openEditModal = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  useEffect(() => {
    if (isVerified === false && !verifyLoading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, verifyLoading]);

  useEffect(() => {
    if (isVerified) {
      fetchUserData();
    }
  }, [isVerified, fetchUserData]);

  if (verifyLoading || isVerified === null) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center transition-opacity duration-300">
        <div className="text-center">
          <span className="loading loading-spinner loading-md sm:loading-lg text-primary"></span>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-base-content animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (isVerified === false) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-300">
        <div className="loading loading-bars loading-md sm:loading-lg text-primary"></div>
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
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-base-content flex items-center justify-center w-full h-full">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-base-content break-words">{user.name}</h1>
                <p className="text-base-content/60 mt-1 text-xs xs:text-sm sm:text-base truncate">{user.email}</p>
                {user.bio && (
                  <p className="text-base-content/80 mt-2 sm:mt-3 max-w-full sm:max-w-lg text-xs xs:text-sm sm:text-base leading-relaxed">{user.bio}</p>
                )}
              </div>

              <div className="flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={openEditModal}
                  className="btn btn-outline btn-primary w-full sm:w-auto btn-xs xs:btn-sm sm:btn-md text-xs sm:text-sm"
                >
                  <FaUserEdit className="text-xs xs:text-sm sm:text-base" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </button>
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
                icon={<FaUserFriends />}
                label="Friends"
                isActive={activeTab === "friends"}
                onClick={() => setActiveTab("friends")}
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
                  <p className="text-xs sm:text-sm md:text-base text-base-content/60">Time to share some epic memes! 🔥</p>
                </div>
              ) : (
                posts?.map((post) => (
                  <PostCard
                    key={`${post.isShared ? "shared" : "post"}-${post.id}`}
                    post={post}
                    currentUser={user}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                    onUnshare={handleUnsharePost}
                    onChange={fetchUserData}
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
                  About Me
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="font-medium text-base-content mb-2 text-xs sm:text-sm md:text-base">Bio</h3>
                    <p className="text-base-content/70 text-xs sm:text-sm md:text-base leading-relaxed">
                      {user.bio || "No bio available yet. Time to add some personality! ✨"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-base-content mb-2 text-xs sm:text-sm md:text-base">Member Since</h3>
                    <p className="text-base-content/70 text-xs sm:text-sm md:text-base">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) || "Recently joined"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Comedy Level Section */}
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
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center max-w-xs sm:max-w-sm md:max-w-md mx-auto">
                    <button
                      onClick={handleInitializeMyScore}
                      className="btn btn-primary btn-xs sm:btn-sm md:btn-md text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      Initialize My Score
                    </button>
                    <button
                      onClick={handleRecalculateAllScores}
                      className="btn btn-secondary btn-xs sm:btn-sm md:btn-md text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      Initialize All Scores
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-base-content/60 mt-2 sm:mt-3 leading-relaxed px-4">
                    Initialize your score first to appear in the leaderboard
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {leaderboard.map((userItem, index) => (
                    <div
                      key={userItem.userId || userItem.id}
                      className={`p-2 sm:p-3 md:p-4 rounded-lg border flex items-center justify-between ${
                        (userItem.userId || userItem.id) === user.id
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
                            {(userItem.userId || userItem.id) === user.id && (
                              <span className="ml-1 sm:ml-2 text-xs text-primary">(You)</span>
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

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmButtonClass={confirmState.confirmButtonClass}
        isLoading={isConfirming}
      />

      {/* Modern Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={user}
        onUpdate={handleProfileUpdate}
      />
    </div>
  );
};

const TabButton = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium sm:font-semibold border-b-2 sm:border-b-3 md:border-b-4 transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap min-w-0 ${isActive
      ? "border-primary text-primary"
      : "border-transparent text-base-content/70 hover:text-base-content"
      }`}
  >
    <span className="text-xs sm:text-sm md:text-base flex-shrink-0">{icon}</span>
    <span className="hidden sm:inline truncate">{label}</span>
    <span className="sm:hidden text-xs truncate">{label.split(' ')[0]}</span>
  </button>
);