import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import feedService from "../services/feedService";
import { PostCard } from "./PostCard";
import { EditPostModal } from "./EditPostModal";
import VirtualScrollFeed from "./VirtualScrollFeed";
import { FeedSkeleton } from "./LoadingSkeleton";
import PostVisibilityTracker from "./PostVisibilityTracker";
import { useDeletePostMutation, useSharePostMutation } from "../hooks/useFeedQuery";
import { useEnhancedFeed } from "../hooks/useEnhancedFeed";
import api from "../utils/axios";
import toast from "react-hot-toast";

export const Feed = () => {
  // Enhanced React Query hooks with seen posts tracking
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error: feedError,
    posts: enhancedPosts,
    unseenPosts,
    seenPosts,
    smartRefresh,
    markPostAsSeen,
    stats,
    clearSeenPosts,
    isSmartRefreshAvailable
  } = useEnhancedFeed();

  const deletePostMutation = useDeletePostMutation();
  const sharePostMutation = useSharePostMutation();

  // Local state
  const [currentUser, setCurrentUser] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [useVirtualScroll, setUseVirtualScroll] = useState(false);
  const [showEndMessage, setShowEndMessage] = useState(false);

  // Use enhanced posts from the hook
  const posts = enhancedPosts;

  const error = isError ? feedError?.message || "Failed to load posts" : "";

  // Only show "all caught up" message when we're absolutely certain there are no more posts
  useEffect(() => {
    if (!hasNextPage && posts.length > 0 && !isLoading && !isFetchingNextPage && feedData?.pages?.length > 0) {
      // Longer delay to ensure posts are fully rendered
      const timer = setTimeout(() => setShowEndMessage(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowEndMessage(false);
    }
  }, [hasNextPage, posts.length, isLoading, isFetchingNextPage, feedData?.pages]);
  
  // Refs for infinite scroll
  const observerRef = useRef();
  const lastPostElementRef = useCallback(node => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, {
      root: null,
      rootMargin: '100px',
      threshold: 0
    });
    
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Enable virtual scrolling when there are many posts
  useEffect(() => {
    setUseVirtualScroll(posts.length > 50);
  }, [posts.length]);

  // Fetch current user data
  const fetchCurrentUser = useCallback(async () => {
    try {
      const userRes = await api.get("/User/profile");
      setCurrentUser(userRes.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  const refreshFeed = () => {
    // Use smart refresh that prioritizes unseen content
    smartRefresh();
  };

  // Handler functions for PostCard
  const handleEditPost = useCallback((postId, currentContent) => {
    const postToEdit = posts.find(p => p.id === postId);
    if (postToEdit) {
      setEditingPost(postToEdit);
      setEditModalOpen(true);
    } else {
      toast.error("Post not found for editing! It might have vanished into the meme void 👻");
    }
  }, [posts]);

  const handleDeletePost = useCallback(async (postId) => {
    if (window.confirm("Are you sure you want to delete this post? This will remove all reactions, comments, and shares permanently!")) {
      deletePostMutation.mutate(postId);
    }
  }, [deletePostMutation]);

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
  }, [fetchCurrentUser]);

  // Show loading skeleton until posts are actually loaded and ready
  if ((isLoading && posts.length === 0) || (posts.length === 0 && !isError && feedData?.pages === undefined)) {
    return (
      <div>
        {/* Refresh button placeholder */}
        <div className="flex justify-end mb-4">
          <div className="w-8 h-8 rounded-full bg-base-200 animate-pulse"></div>
        </div>
        <FeedSkeleton count={5} />
      </div>
    );
  }

  return (
    <div>
      {/* Enhanced refresh controls - Mobile optimized */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/60">
          <span>📊 {stats.unseenCount} new</span>
          <span className="hidden sm:inline">• {stats.totalSeenInStorage} seen</span>
        </div>
        <div className="flex gap-2">
          {stats.totalSeenInStorage > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all seen posts history? This will show all posts again on next refresh.')) {
                  clearSeenPosts();
                  toast.success('Seen posts cleared!');
                }
              }}
              className="btn btn-xs btn-ghost text-xs"
              title="Clear seen posts"
            >
              🗑️
            </button>
          )}
          <button
            onClick={refreshFeed}
            disabled={isLoading}
            className={`btn btn-sm btn-ghost btn-circle ${
              isSmartRefreshAvailable ? 'btn-primary' : ''
            }`}
            aria-label="Smart refresh - prioritizes unseen content"
            title={isSmartRefreshAvailable ? 'New unseen content available!' : 'Refresh feed'}
          >
            <svg
              className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
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

      {posts.length === 0 && !isLoading && !isFetchingNextPage && feedData?.pages?.length > 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">😴</div>
          <h3 className="text-xl font-bold text-base-content mb-2">
            The feed is emptier than your soul at 3 AM 💀
          </h3>
          <p className="text-base-content/70 mb-6">
            Time to drop some fire content and break the internet! 🔥
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
          {useVirtualScroll && currentUser ? (
            <div className="h-[calc(100vh-200px)]">
              <VirtualScrollFeed
                posts={posts}
                currentUser={currentUser}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onUnshare={handleUnsharePost}
                onChange={refreshFeed}
                hasMore={hasNextPage}
                onLoadMore={fetchNextPage}
                loading={isFetchingNextPage}
              />
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {currentUser && posts.map((post, index) => {
                // Check if this is the first seen post (after all unseen posts)
                const isFirstSeenPost = post.isSeen &&
                  (index === 0 || !posts[index - 1]?.isSeen);

                const postContent = (
                  <PostVisibilityTracker
                    postId={post.id}
                    onVisible={markPostAsSeen}
                  >
                    <PostCard
                      post={post}
                      currentUser={currentUser}
                      onEdit={handleEditPost}
                      onDelete={handleDeletePost}
                      onUnshare={handleUnsharePost}
                      onChange={refreshFeed}
                    />
                  </PostVisibilityTracker>
                );

                // Add ref to last post for infinite scroll
                if (index === posts.length - 1) {
                  return (
                    <div key={`${post.isShared ? "shared" : "post"}-${post.id}`}>
                      {isFirstSeenPost && stats.unseenCount > 0 && (
                        <div className="flex items-center justify-center py-4 my-6">
                          <div className="flex-1 h-px bg-base-300"></div>
                          <div className="px-4 text-xs sm:text-sm text-base-content/60 bg-base-100">
                            📚 Previously seen posts
                          </div>
                          <div className="flex-1 h-px bg-base-300"></div>
                        </div>
                      )}
                      <div ref={lastPostElementRef}>
                        {postContent}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={`${post.isShared ? "shared" : "post"}-${post.id}`}>
                      {isFirstSeenPost && stats.unseenCount > 0 && (
                        <div className="flex items-center justify-center py-4 my-6">
                          <div className="flex-1 h-px bg-base-300"></div>
                          <div className="px-4 text-xs sm:text-sm text-base-content/60 bg-base-100">
                            📚 Previously seen posts
                          </div>
                          <div className="flex-1 h-px bg-base-300"></div>
                        </div>
                      )}
                      {postContent}
                    </div>
                  );
                }
              })}
            </div>
          )}

          {/* Loading indicator for infinite scroll */}
          {!useVirtualScroll && isFetchingNextPage && (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md text-primary"></div>
            </div>
          )}

          {!useVirtualScroll && showEndMessage && (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✨</div>
              <p className="text-base-content/60 text-sm">
                You're all caught up!
              </p>
            </div>
          )}
        </>
      )}
      
      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingPost(null);
        }}
        post={editingPost}
        onSuccess={() => {
          refreshFeed();
        }}
      />
    </div>
  );
};