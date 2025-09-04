import React, { useContext, useEffect, useState } from "react";
import { VerifyContext } from "../../context/create_verify_context";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import feedService from "../services/feedService";

export const ProfilePage = () => {
  const [user, setUser] = useState({
    name: "",
    email: "",
    bio: "",
    image: "",
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" or "edit"

  const {
    isVerified,
    verifyUser,
    loading: verifyLoading,
  } = useContext(VerifyContext);
  const navigate = useNavigate();

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !verifyLoading) {
      navigate("/auth");
    }
  }, [isVerified, navigate, verifyLoading]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Fetch user profile
        const userRes = await api.get("/User/profile");
        setUser(userRes.data);

        // Fetch user posts (including shared posts)
        const postsRes = await feedService.getUserPosts();
        if (postsRes.success) {
          setPosts(postsRes.data.allPosts || []);
        }
      } catch (error) {
        console.log("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isVerified) {
      fetchUserData();
    }
  }, [isVerified]);

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      await api.delete("/User/delete");
      localStorage.removeItem("token");
      navigate("/auth");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/User/profile", user);
      alert("Profile updated successfully!");
    } catch (error) {
      console.log("Error updating profile:", error);
      alert("Failed to update profile");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="loading loading-spinner loading-lg text-green-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card bg-slate-600/50 backdrop-blur-md border border-slate-500/50 mb-6">
          <div className="card-body p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile Image */}
              <div className="avatar">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold text-slate-100 mb-2">
                  {user.name}
                </h1>
                <p className="text-slate-300 mb-2">{user.email}</p>
                {user.bio && (
                  <p className="text-slate-400 max-w-md">{user.bio}</p>
                )}
                <div className="flex gap-2 mt-4 justify-center md:justify-start">
                  <div className="stat bg-slate-700/50 rounded-lg px-4 py-2">
                    <div className="stat-value text-lg text-green-400">
                      {posts.length}
                    </div>
                    <div className="stat-desc text-slate-300">Posts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs tabs-boxed bg-slate-600/50 mb-6">
          <button
            className={`tab ${activeTab === "posts" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            📝 My Posts
          </button>
          <button
            className={`tab ${activeTab === "edit" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            ⚙️ Edit Profile
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "posts" ? (
          // Posts Tab
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-4">
              My Posts & Shared Posts
            </h2>

            {posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  No posts yet!
                </h3>
                <p className="text-slate-300 mb-6">
                  Start sharing some memes to see them here.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="btn bg-green-500 hover:bg-green-600 text-white border-none"
                >
                  Go to Home
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={`${post.isShared ? "shared" : "post"}-${post.id}`}
                    className="card bg-slate-600/50 backdrop-blur-md border border-slate-500/50"
                  >
                    <div className="card-body p-4">
                      {/* Post Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Show if it's a shared post */}
                          {post.isShared && (
                            <div className="w-full mb-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-blue-400">🔄</span>
                                <span className="font-medium text-blue-400">
                                  You shared this post
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-400">
                                  {formatDate(post.createdAt)}
                                </span>
                              </div>
                              {post.originalPost && (
                                <div className="text-xs text-slate-400 mt-1">
                                  Originally by {post.originalPost.user.name} •{" "}
                                  {formatDate(post.originalPost.createdAt)}
                                </div>
                              )}
                            </div>
                          )}

                          {!post.isShared && (
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                                  {user.image ? (
                                    <img
                                      src={user.image}
                                      alt={user.name}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    user.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-100">
                                  {user.name}
                                </span>
                                <p className="text-xs text-slate-400">
                                  {formatDate(post.createdAt)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {post.isShared ? (
                            <div className="badge badge-info badge-sm">
                              Shared
                            </div>
                          ) : (
                            <div className="badge badge-success badge-sm">
                              Original
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="mb-4">
                        {post.content && (
                          <p className="text-slate-200 leading-relaxed mb-3">
                            {post.content}
                          </p>
                        )}
                        {post.image && (
                          <div className="rounded-lg overflow-hidden">
                            <img
                              src={post.image}
                              alt="Post content"
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Edit Profile Tab
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-4">
              Edit Profile
            </h2>

            <div className="card bg-slate-600/50 backdrop-blur-md border border-slate-500/50">
              <div className="card-body p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-slate-300">Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className="input input-bordered bg-slate-700 border-slate-600 text-slate-100"
                      value={user.name}
                      onChange={(e) =>
                        setUser({ ...user, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-slate-300">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="input input-bordered bg-slate-700 border-slate-600 text-slate-100"
                      value={user.email}
                      onChange={(e) =>
                        setUser({ ...user, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-slate-300">Bio</span>
                    </label>
                    <textarea
                      placeholder="Tell us about yourself"
                      className="textarea textarea-bordered bg-slate-700 border-slate-600 text-slate-100 h-24"
                      value={user.bio}
                      onChange={(e) =>
                        setUser({ ...user, bio: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-slate-300">
                        Profile Image URL
                      </span>
                    </label>
                    <input
                      type="url"
                      placeholder="Enter image URL"
                      className="input input-bordered bg-slate-700 border-slate-600 text-slate-100"
                      value={user.image}
                      onChange={(e) =>
                        setUser({ ...user, image: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-control mt-6">
                    <button
                      type="submit"
                      className="btn bg-green-500 hover:bg-green-600 text-white border-none"
                    >
                      Update Profile
                    </button>
                  </div>
                </form>

                <div className="divider text-slate-400"></div>

                <div className="form-control">
                  <button
                    onClick={handleDelete}
                    className="btn btn-error text-white"
                  >
                    Delete Account
                  </button>
                  <div className="label">
                    <span className="label-text-alt text-slate-400">
                      This action cannot be undone
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
