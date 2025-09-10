import React, { useState, useEffect, useCallback } from "react";
import feedService from "../services/feedService";
import { PostCard } from "./PostCard";
import api from "../utils/axios";
import toast from "react-hot-toast";

export const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user data
  const fetchCurrentUser = useCallback(async () => {
    try {
      const userRes = await api.get("/User/profile");
      setCurrentUser(userRes.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  const fetchFeed = useCallback(
    async (pageNum = 1, isLoadMore = false) => {
      try {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);

        const result = await feedService.getFeed(pageNum, 20);

        if (result.success) {
          const newPosts = result.data.posts;

          if (isLoadMore) {
            setPosts((prevPosts) => [...prevPosts, ...newPosts]);
          } else {
            setPosts(newPosts);
          }

          setHasMore(newPosts.length === 20);
          setError("");
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error("Error fetching feed:", err);
        setError("Failed to load feed. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, true);
  };

  const refreshFeed = () => {
    setPage(1);
    fetchFeed(1, false);
  };

  // Handler functions for PostCard
  const handleEditPost = useCallback((postId, currentContent) => {
    toast.info(`Edit functionality coming soon!`);
  }, []);

  const handleDeletePost = useCallback(async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const result = await feedService.deletePost(postId);
      if (result.success) {
        toast.success("Post deleted successfully!");
        refreshFeed();
      } else {
        toast.error("Failed to delete post");
      }
    }
  }, []);

  const handleUnsharePost = useCallback(async (postId) => {
    if (window.confirm("Are you sure you want to unshare this post?")) {
      const result = await feedService.unsharePost(postId);
      if (result.success) {
        toast.success("Post unshared successfully!");
        refreshFeed();
      } else {
        toast.error("Failed to unshare post");
      }
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchFeed();
  }, [fetchFeed, fetchCurrentUser]);

  if (loading && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
        <h2 className="text-2xl font-bold text-base-content mb-2">
          Your Smart Feed
        </h2>
        <p className="text-base-content/70">Loading your personalized content...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-base-content">Your Smart Feed</h2>
          <p className="text-sm text-base-content/70">
            Prioritized content from friends and trending posts
          </p>
        </div>
        <button
          onClick={refreshFeed}
          disabled={loading}
          className="btn btn-sm btn-primary"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {posts.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-2xl font-bold text-base-content mb-2">
            No posts in your feed yet!
          </h3>
          <p className="text-base-content/70 mb-6">
            Connect with friends or check back later for new content.
          </p>
          <button
            onClick={refreshFeed}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {currentUser && posts.map((post) => (
              <PostCard
                key={`${post.isShared ? "shared" : "post"}-${post.id}`}
                post={post}
                currentUser={currentUser}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onUnshare={handleUnsharePost}
                onChange={refreshFeed}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn btn-primary"
              >
                {loadingMore ? (
                  <>
                    <div className="loading loading-spinner loading-sm"></div>
                    Loading More...
                  </>
                ) : (
                  "Load More Posts"
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center mt-8 py-6 border-t border-base-300">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-base-content/80 font-medium">
                You've caught up with your feed!
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                Check back later for new content
              </p>
            </div>
          )}
        </>
      )}

      {/* Feed Algorithm Info */}
      <div className="mt-8 p-4 bg-base-200 rounded-lg border border-base-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <h4 className="font-semibold text-base-content">Smart Feed Algorithm</h4>
        </div>
        <ul className="text-sm text-base-content/80 space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            Friend posts get priority, especially recent ones
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            High-engagement content gets boosted
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            Fresh content from all users is mixed in
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            Ranked by relevance, engagement, and freshness
          </li>
        </ul>
      </div>
    </div>
  );
};