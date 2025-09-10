import React, { useState, useEffect, useCallback, useRef } from "react";
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
  
  // Refs for infinite scroll
  const observerRef = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    }, {
      root: null,
      rootMargin: '100px',
      threshold: 0
    });
    
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore]);

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
        setError("Failed to load posts. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage, true);
    }
  }, [page, loadingMore, hasMore, fetchFeed]);

  const refreshFeed = () => {
    setPage(1);
    setPosts([]);
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
  }, []);

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Refresh button - Mobile optimized */}
      <div className="flex justify-end mb-4">
        <button
          onClick={refreshFeed}
          disabled={loading}
          className="btn btn-sm btn-ghost btn-circle"
          aria-label="Refresh posts"
        >
          <svg 
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
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
          <div className="text-6xl mb-4">😴</div>
          <h3 className="text-xl font-bold text-base-content mb-2">
            No memes yet
          </h3>
          <p className="text-base-content/70 mb-6">
            Be the first to share something funny!
          </p>
          <button
            onClick={refreshFeed}
            className="btn btn-primary"
          >
            Refresh
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 sm:space-y-6">
            {currentUser && posts.map((post, index) => {
              // Add ref to last post for infinite scroll
              if (index === posts.length - 1) {
                return (
                  <div ref={lastPostElementRef} key={`${post.isShared ? "shared" : "post"}-${post.id}`}>
                    <PostCard
                      post={post}
                      currentUser={currentUser}
                      onEdit={handleEditPost}
                      onDelete={handleDeletePost}
                      onUnshare={handleUnsharePost}
                      onChange={refreshFeed}
                    />
                  </div>
                );
              } else {
                return (
                  <PostCard
                    key={`${post.isShared ? "shared" : "post"}-${post.id}`}
                    post={post}
                    currentUser={currentUser}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                    onUnshare={handleUnsharePost}
                    onChange={refreshFeed}
                  />
                );
              }
            })}
          </div>

          {/* Loading indicator for infinite scroll */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md text-primary"></div>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✨</div>
              <p className="text-base-content/60 text-sm">
                You're all caught up!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};