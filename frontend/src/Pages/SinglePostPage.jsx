import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { VerifyContext } from "../../context/create_verify_context.jsx";
import feedService from "../services/feedService";
import { PostCard } from "../components/PostCard";
import toast from 'react-hot-toast';
import { FaArrowLeft, FaSpinner } from "react-icons/fa";

export const SinglePostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { isVerified, verifyUser, loading, user } = useContext(VerifyContext);
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyUser();
  }, []);

  useEffect(() => {
    if (!isVerified && !loading) {
      navigate("/auth");
    }
  }, [isVerified, loading, navigate]);

  useEffect(() => {
    if (isVerified && postId) {
      fetchPost();
    }
  }, [isVerified, postId]);

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await feedService.getSinglePost(postId);
      
      if (result.success) {
        setPost(result.data);
      } else {
        setError(result.error || "Failed to load post");
        toast.error(result.error || "Failed to load post");
      }
    } catch (err) {
      console.error("Error fetching post:", err);
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostChange = () => {
    // Refresh the post data when something changes
    fetchPost();
  };

  const handleEdit = (postId, currentContent) => {
    // For now, just show a toast - you can implement edit functionality later
    toast.success("Edit functionality coming soon!");
  };

  const handleDelete = async (postId) => {
    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;

    try {
      const result = await feedService.deletePost(postId);
      if (result.success) {
        toast.success("Post deleted successfully!");
        navigate("/"); // Redirect to home after deletion
      } else {
        toast.error(result.error || "Failed to delete post");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleUnshare = async (postId) => {
    const confirmed = window.confirm("Are you sure you want to unshare this post?");
    if (!confirmed) return;

    try {
      const result = await feedService.unsharePost(postId);
      if (result.success) {
        toast.success("Post unshared successfully!");
        navigate("/"); // Redirect to home after unshare
      } else {
        toast.error(result.error || "Failed to unshare post");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-4xl text-primary" />
          <p className="text-base-content">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-base-content">Oops! Something went wrong</h1>
          <p className="text-base-content/70">{error}</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate("/")} 
              className="btn btn-primary"
            >
              <FaArrowLeft className="mr-2" />
              Back to Home
            </button>
            <button 
              onClick={fetchPost} 
              className="btn btn-outline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">📭</div>
          <h1 className="text-2xl font-bold text-base-content">Post not found</h1>
          <p className="text-base-content/70">The post you're looking for doesn't exist or has been deleted.</p>
          <button 
            onClick={() => navigate("/")} 
            className="btn btn-primary"
          >
            <FaArrowLeft className="mr-2" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-sm border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="btn btn-ghost btn-sm"
            >
              <FaArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-base-content">Post</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Post Card */}
          <div className="bg-base-100 rounded-lg">
            <PostCard
              post={post}
              currentUser={user}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUnshare={handleUnshare}
              onChange={handlePostChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};