import React, { useContext, useEffect, useState, useCallback } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import feedService from "../services/feedService";
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
} from "react-icons/fa";

export const ProfilePage = () => {
  const [user, setUser] = useState({ name: "", email: "", bio: "", image: "" });
  const [posts, setPosts] = useState([]);
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
      const userRes = await api.get("/User/profile");
      setUser(userRes.data);

      const postsRes = await feedService.getUserPosts();
      if (postsRes.success) {
        setPosts(postsRes.data.allPosts || []);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content animate-pulse">Loading...</p>
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
        <div className="loading loading-bars loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-base-300 min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-20">
        <div className="bg-base-200 shadow-lg rounded-b-lg">
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="avatar">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full ring-4 ring-primary ring-offset-base-100 ring-offset-2 bg-base-100">
                  {user.image ? (
                    <img src={user.image} alt={user.name} />
                  ) : (
                    <span className="text-6xl text-base-content flex items-center justify-center w-full h-full">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl font-bold text-base-content">{user.name}</h1>
                <p className="text-base-content/60 mt-1">{user.email}</p>
                {user.bio && (
                  <p className="text-base-content/80 mt-3 max-w-lg">{user.bio}</p>
                )}
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={openEditModal}
                  className="btn btn-outline btn-primary"
                >
                  <FaUserEdit />
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
          <div className="px-4 md:px-6 mt-4 border-t border-base-content/10">
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === "posts" && (
            <div className="grid grid-cols-1 gap-6">
              {posts?.length === 0 ? (
                <div className="mt-5 text-center text-base-content text-xl">
                  No posts to show
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
                    onChange={fetchUserData} // to refresh the page when needed
                  />
                ))
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
    className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-4 transition-all duration-300 ${isActive
      ? "border-primary text-primary"
      : "border-transparent text-base-content/70 hover:text-base-content"
      }`}
  >
    {icon}
    {label}
  </button>
);