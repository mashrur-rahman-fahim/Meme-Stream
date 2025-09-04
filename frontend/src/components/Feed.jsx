import React, { useState, useEffect, useCallback } from "react";
import feedService from "../services/feedService";

export const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // New state for interactions
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [postReactions, setPostReactions] = useState({});
  const [postComments, setPostComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [reactionLoading, setReactionLoading] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [userReactions, setUserReactions] = useState({}); // Track user's reactions

  const loadPostReactions = useCallback(async (postId) => {
    try {
      const result = await feedService.getPostReactions(postId);
      if (result.success) {
        setPostReactions((prev) => ({
          ...prev,
          [postId]: result.data.reactions,
        }));
        // Store user's current reaction for this post
        setUserReactions((prev) => ({
          ...prev,
          [postId]: result.data.userReaction
            ? result.data.userReaction.Type
            : null,
        }));
      }
    } catch (error) {
      console.error("Error loading reactions:", error);
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

          // Load reactions for all posts
          newPosts.forEach((post) => {
            loadPostReactions(post.id);
          });

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
    [loadPostReactions]
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  // Reaction handlers
  const handleReaction = async (postId, reactionType) => {
    setReactionLoading((prev) => ({ ...prev, [postId]: true }));

    try {
      const result = await feedService.addReaction(postId, reactionType);
      if (result.success) {
        // Refresh reactions for this post
        await loadPostReactions(postId);
        // Update the post's engagement score locally
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, engagementScore: (post.engagementScore || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    } finally {
      setReactionLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Comment handlers
  const toggleComments = async (postId) => {
    const isExpanded = expandedComments.has(postId);

    if (isExpanded) {
      setExpandedComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      setExpandedComments((prev) => new Set(prev).add(postId));
      // Load comments if not already loaded
      if (!postComments[postId]) {
        await loadPostComments(postId);
      }
    }
  };

  const loadPostComments = async (postId) => {
    try {
      const result = await feedService.getPostComments(postId);
      if (result.success) {
        setPostComments((prev) => ({ ...prev, [postId]: result.data }));
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleAddComment = async (postId) => {
    const content = newComments[postId];
    if (!content || !content.trim()) return;

    setCommentLoading((prev) => ({ ...prev, [postId]: true }));

    try {
      const result = await feedService.addComment(postId, content.trim());
      if (result.success) {
        // Clear the input
        setNewComments((prev) => ({ ...prev, [postId]: "" }));
        // Reload comments
        await loadPostComments(postId);
        // Update engagement score
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, engagementScore: (post.engagementScore || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Share handler
  const handleShare = async (post) => {
    try {
      const result = await feedService.sharePost(post.id);
      if (result.success) {
        alert("Post shared to your profile successfully!");
        // Optionally refresh the feed to show updated state
        refreshFeed();
      } else {
        alert(result.error || "Failed to share post");
      }
    } catch (error) {
      console.error("Error sharing post:", error);
      alert("Failed to share post");
    }
  };

  const getReactionIcon = (type) => {
    // Only laugh reaction (type 0 = Laugh in the updated enum)
    return "�";
  };

  const getReactionName = (type) => {
    // Only laugh reaction
    return "Laugh";
  };

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (loading && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="loading loading-spinner loading-lg text-green-400 mb-4"></div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Your Smart Feed
        </h2>
        <p className="text-slate-300">Loading your personalized content...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Your Smart Feed</h2>
          <p className="text-sm text-slate-300">
            Prioritized content from friends and trending posts
          </p>
        </div>
        <button
          onClick={refreshFeed}
          disabled={loading}
          className="btn btn-sm bg-green-500 hover:bg-green-600 text-white border-none"
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
          <h3 className="text-2xl font-bold text-slate-100 mb-2">
            No posts in your feed yet!
          </h3>
          <p className="text-slate-300 mb-6">
            Connect with friends or check back later for new content.
          </p>
          <button
            onClick={refreshFeed}
            className="btn bg-green-500 hover:bg-green-600 text-white border-none"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="card bg-slate-600/50 backdrop-blur-md border border-slate-500/50 hover:border-slate-400/50 transition-all duration-200"
              >
                <div className="card-body p-4">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Shared Post Info */}
                      {post.isShared && (
                        <div className="w-full mb-2">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="text-blue-400">🔄</span>
                            <span className="font-medium text-blue-400">
                              {post.sharedBy?.name || "Someone"} shared
                            </span>
                            <span>•</span>
                            <span>
                              {formatDate(post.sharedAt || post.createdAt)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Original Post Author */}
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          {post.user.image ? (
                            <img
                              src={post.user.image}
                              alt={post.user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            post.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">
                            {post.user.name}
                            {post.isShared && (
                              <span className="text-slate-400 text-sm ml-1">
                                (original post)
                              </span>
                            )}
                          </span>
                          {post.isFriend && (
                            <div className="badge badge-success badge-sm text-xs">
                              👥 Friend
                            </div>
                          )}
                          <div className="badge badge-info badge-sm text-xs">
                            ⭐{" "}
                            {post.feedScore
                              ? post.feedScore.toFixed(1)
                              : "Ranked"}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">
                          {post.isShared
                            ? `Originally posted ${formatDate(
                                post.originalPost?.createdAt || post.createdAt
                              )}`
                            : formatDate(post.createdAt)}
                        </p>
                      </div>
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

                  {/* Post Actions */}
                  <div className="pt-3 border-t border-slate-500/50">
                    {/* Main Actions Row */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-2">
                        {/* Reaction Button - Only Laugh */}
                        <button
                          onClick={() => handleReaction(post.id, 0)}
                          className={`btn btn-ghost btn-sm hover:bg-green-400/10 ${
                            userReactions[post.id] !== null &&
                            userReactions[post.id] !== undefined
                              ? "text-green-400 bg-green-400/20"
                              : "text-slate-300 hover:text-green-400"
                          }`}
                          disabled={reactionLoading[post.id]}
                        >
                          <span className="text-lg">�</span>
                          {userReactions[post.id] !== null &&
                          userReactions[post.id] !== undefined
                            ? "Laughed"
                            : "Laugh"}
                          {reactionLoading[post.id] && (
                            <div className="loading loading-spinner loading-xs ml-1"></div>
                          )}
                        </button>

                        <button
                          onClick={() => toggleComments(post.id)}
                          className="btn btn-ghost btn-sm text-slate-300 hover:text-blue-400 hover:bg-blue-400/10"
                        >
                          <span className="text-lg">💬</span>
                          Comment
                        </button>

                        <button
                          onClick={() => handleShare(post)}
                          className="btn btn-ghost btn-sm text-slate-300 hover:text-purple-400 hover:bg-purple-400/10"
                        >
                          <span className="text-lg">📤</span>
                          Share
                        </button>
                      </div>

                      {post.engagementScore > 0 && (
                        <div className="text-xs text-slate-400">
                          🔥 {post.engagementScore} interactions
                        </div>
                      )}
                    </div>

                    {/* Reactions Display */}
                    {postReactions[post.id] &&
                      postReactions[post.id].length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {postReactions[post.id]
                            .reduce((acc, reaction) => {
                              const existingReaction = acc.find(
                                (r) => r.type === reaction.Type
                              );
                              if (existingReaction) {
                                existingReaction.count++;
                              } else {
                                acc.push({ type: reaction.Type, count: 1 });
                              }
                              return acc;
                            }, [])
                            .map((reaction) => (
                              <div
                                key={reaction.type}
                                className="flex items-center gap-1 bg-slate-600/50 rounded-full px-2 py-1"
                              >
                                <span className="text-sm">
                                  {getReactionIcon(reaction.type)}
                                </span>
                                <span className="text-xs text-slate-300">
                                  {reaction.count}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                    {/* Comments Section */}
                    {expandedComments.has(post.id) && (
                      <div className="mt-3 pt-3 border-t border-slate-600/50">
                        {/* Add Comment Form */}
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={newComments[post.id] || ""}
                            onChange={(e) =>
                              setNewComments((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddComment(post.id)
                            }
                            className="input input-sm bg-slate-600/50 border-slate-500/50 text-slate-200 flex-1 text-sm"
                            disabled={commentLoading[post.id]}
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={
                              commentLoading[post.id] ||
                              !newComments[post.id]?.trim()
                            }
                            className="btn btn-sm bg-green-500 hover:bg-green-600 text-white border-none"
                          >
                            {commentLoading[post.id] ? (
                              <div className="loading loading-spinner loading-xs"></div>
                            ) : (
                              "Post"
                            )}
                          </button>
                        </div>

                        {/* Comments List */}
                        {postComments[post.id] &&
                        postComments[post.id].length > 0 ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {postComments[post.id].map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <div className="avatar">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                    {comment.user?.name
                                      ?.charAt(0)
                                      .toUpperCase() || "U"}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="bg-slate-600/30 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-slate-200 text-sm">
                                        {comment.user?.name || "Anonymous"}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        {formatDate(comment.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-slate-300 text-sm">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : postComments[post.id] ? (
                          <div className="text-center text-slate-400 text-sm py-4">
                            No comments yet. Be the first to comment!
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="loading loading-spinner loading-sm text-green-400"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn bg-slate-600 hover:bg-slate-500 text-slate-200 border-slate-500 hover:border-slate-400"
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
            <div className="text-center mt-8 py-6 border-t border-slate-600/50">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-slate-400 font-medium">
                You've caught up with your feed!
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Check back later for new content
              </p>
            </div>
          )}
        </>
      )}

      {/* Feed Algorithm Info */}
      <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <h4 className="font-semibold text-slate-100">Smart Feed Algorithm</h4>
        </div>
        <ul className="text-sm text-slate-300 space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Friend posts get priority, especially recent ones
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            High-engagement content gets boosted
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Fresh content from all users is mixed in
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Ranked by relevance, engagement, and freshness
          </li>
        </ul>
      </div>
    </div>
  );
};
