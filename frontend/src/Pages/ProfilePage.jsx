import React, { useContext, useEffect, useState, useCallback } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import feedService from "../services/feedService";
import { PostCard } from "../components/PostCard";
import {
  FaUserEdit,
  FaClipboardList,
  FaUserCircle,
  FaUserFriends,
} from "react-icons/fa";

export const ProfilePage = () => {
  const [user, setUser] = useState({ name: "", email: "", bio: "", image: "" });
  const [editingUser, setEditingUser] = useState({ name: "", email: "", bio: "", image: "" });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { isVerified, verifyUser, loading: verifyLoading } = useContext(VerifyContext);
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !verifyLoading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, verifyLoading]);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userRes = await api.get("/User/profile");
      setUser(userRes.data);
      setEditingUser(userRes.data);

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

  useEffect(() => {
    if (isVerified) {
      fetchUserData();
    }
  }, [isVerified, fetchUserData]);

  const handleProfileUpdate = useCallback(async (e) => {
    e.preventDefault();
    try {
      await api.put("/User/profile", editingUser);
      setUser(editingUser);
      setIsEditModalOpen(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    }
  }, [editingUser]);

  const handleDeletePost = useCallback(async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await api.delete(`/Post/delete/${postId}`);
        setPosts(prevPosts => prevPosts.filter((p) => p.id !== postId));
        alert("Post deleted successfully!");
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post.");
      }
    }
  }, []);

  const handleEditPost = useCallback((postId, currentContent) => {
    alert(`Editing Post ID: ${postId}\nCurrent Content: ${currentContent}`);
  }, []);

  const openEditModal = useCallback(() => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  }, [user]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  }, []);

  if (loading || verifyLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-300">
        <div className="loading loading-bars loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-base-300 min-h-screen">
      <div className="max-w-5xl mx-auto">
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
                  className="btn btn-secondary"
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
                    user={user}
                    formatDate={formatDate}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-200">
            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
            <h3 className="font-bold text-2xl text-base-content mb-4">Edit Profile</h3>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Name</span></label>
                <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className="input input-bordered w-full bg-base-200" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Email</span></label>
                <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="input input-bordered w-full bg-base-200" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Bio</span></label>
                <textarea value={editingUser.bio} onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })} className="textarea textarea-bordered w-full h-24 bg-base-200"></textarea>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Profile Image URL</span></label>
                <input type="url" value={editingUser.image} onChange={(e) => setEditingUser({ ...editingUser, image: e.target.value })} className="input input-bordered w-full bg-base-600" />
              </div>
              <div className="modal-action">
                <button type="submit" className="btn btn-primary w-full">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
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