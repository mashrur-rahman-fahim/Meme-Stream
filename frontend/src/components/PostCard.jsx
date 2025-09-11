import React, { useEffect, useState, useCallback } from "react";
import { FaLaughSquint, FaComment, FaShare, FaEllipsisH, FaShareSquare } from "react-icons/fa";
import { CommentModal } from "./CommentModal";
import feedService from "../services/feedService";
import toast from 'react-hot-toast';
import { formatDate } from "../utils/formatDate";


export const PostCard = ({ post, currentUser, onEdit, onDelete, onUnshare, onChange }) => {
  const [reactions, setReactions] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showInlineComments, setShowInlineComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isOriginalPost = !post.isShared;
  const targetPostId = isOriginalPost ? post.id : (post.originalPost?.id || post.id);

  const author = isOriginalPost ? post.user : (post.originalPost?.user || post.user);
  const sharer = post.sharedBy || (post.isShared ? post.user : null);
  const timestamp = isOriginalPost ? post.createdAt : (post.originalPost?.createdAt || post.createdAt);

  const canDeleteOrEdit = isOriginalPost && currentUser?.id === post.user?.id;
  const canUnshare = !isOriginalPost && currentUser?.id === sharer?.id;
  const showOptions = canDeleteOrEdit || canUnshare;

  const fetchPostInteractions = useCallback(async () => {
    if (!targetPostId) return;
    try {
      const reactionsRes = await feedService.getPostReactions(targetPostId);
      if (reactionsRes.success && reactionsRes.data) {
        setReactions(Array.isArray(reactionsRes.data.reactions) ? reactionsRes.data.reactions : []);
        setUserReaction(reactionsRes.data.userReaction || null);
      }
      const commentsRes = await feedService.getPostComments(targetPostId);
      if (commentsRes.success && commentsRes.data) {
        setCommentCount(commentsRes.data.length);
        setComments(commentsRes.data);
      }
    } catch (error) {
      console.error(`Error fetching interaction data for post ${targetPostId}:`, error);
    }
  }, [targetPostId]);

  useEffect(() => {
    fetchPostInteractions();
  }, [fetchPostInteractions]);


  const handleReactionClick = async () => {
    if (!targetPostId) return;
    await feedService.addReaction(targetPostId, 0);
    fetchPostInteractions();
  };

  const handleShareClick = () => {
    setIsShareDialogOpen(true);
  };

  const handleConfirmShare = async () => {
    if (!targetPostId) return;
    setIsShareDialogOpen(false);
    const toastId = toast.loading('Sharing post...');

    try {
      const result = await feedService.sharePost(targetPostId);

      if (result.success) {
        toast.success("Post shared successfully!", { id: toastId });
        if (onChange) onChange();
      } else {
        toast.error(result.error, { id: toastId });
      }
    } catch (err) {
      toast.error("An unexpected error occurred.", { id: toastId });
      console.error("Critical error sharing post:", err);
    }
  };

  const handleCloseModal = () => {
    setIsCommentModalOpen(false);
    fetchPostInteractions();
  };

  const handleToggleComments = () => {
    setShowInlineComments(!showInlineComments);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !targetPostId) return;

    setIsSubmittingComment(true);
    try {
      const result = await feedService.addComment(targetPostId, newComment.trim());
      if (result.success) {
        setNewComment('');
        fetchPostInteractions();
        toast.success("Comment added!");
      } else {
        toast.error(result.error || "Failed to add comment");
      }
    } catch (error) {
      toast.error("Error adding comment");
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <>
      <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-200 border border-base-300">
        <div className="card-body p-3 sm:p-5">
          {!isOriginalPost && sharer && (
            <div className="flex items-center gap-2 text-sm text-base-content/70 mb-3">
              <FaShareSquare className="text-primary" />
              <span className="font-semibold">{sharer?.name || 'Someone'}</span> shared
            </div>
          )}

          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="avatar">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary">
                  {author?.image ? (
                    <img src={author.image} alt={author?.name || 'User'} />
                  ) : (
                    <span className="text-lg sm:text-2xl text-primary-content flex items-center justify-center w-full h-full">
                      {(author?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-semibold text-sm sm:text-base text-base-content">{author?.name || 'Unknown User'}</span>
                <p className="text-xs text-base-content/60">{formatDate(timestamp)}</p>
              </div>
            </div>

            {/* The options menu */}
            {showOptions && (
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                  <FaEllipsisH className="text-base-content/60" />
                </label>
                <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-300 rounded-box w-52">
                  {canDeleteOrEdit && (
                    <>
                      <li><a onClick={() => onEdit(post.id, post.content)}>Edit Post</a></li>
                      <li><a onClick={() => onDelete(post.id)} className="text-error">Delete Post</a></li>
                    </>
                  )}
                  {canUnshare && (
                    <li>
                      <a onClick={() => onUnshare(post.originalPost.id)} className="text-warning">
                        Unshare
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Post Content */}
          <div>
            {post.content && <p className="text-sm sm:text-base text-base-content mb-3 whitespace-pre-wrap">{post.content}</p>}
            {post.image && (
              <div className="relative w-full max-h-[300px] sm:max-h-[450px] rounded-lg bg-base-300/20 flex justify-center">
                <img src={post.image} alt="Post content" className="max-h-[300px] sm:max-h-[450px] w-auto h-auto object-contain rounded-lg" loading="lazy" />
              </div>
            )}
          </div>

          {/* Interactions */}
          <div className="flex justify-between items-center text-xs sm:text-sm text-base-content/90 mt-3 px-1 sm:px-2">
            <div>{reactions.length > 0 && `😂 ${reactions.length} Laughs`}</div>
            <div>{commentCount > 0 && `${commentCount} Comments`}</div>
          </div>
          <div className="divider my-1"></div>
          <div className="flex justify-around items-center text-base-content">
            <button onClick={handleReactionClick} className={`btn btn-ghost btn-sm sm:btn-md flex-1 gap-1 sm:gap-2 ${userReaction ? "text-primary" : ""}`}>
              <FaLaughSquint className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Laugh</span>
            </button>
            <button onClick={handleToggleComments} className="btn btn-ghost btn-sm sm:btn-md flex-1 gap-1 sm:gap-2">
              <FaComment className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Comment</span>
            </button>
            <button onClick={handleShareClick} className="btn btn-ghost btn-sm sm:btn-md flex-1 gap-1 sm:gap-2">
              <FaShare className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Inline Comments Section (Facebook Style) */}
          {showInlineComments && (
            <div className="border-t border-base-300 pt-3 mt-3">
              {/* Comment Input */}
              <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
                <div className="avatar">
                  <div className="w-8 h-8 rounded-full bg-primary">
                    {currentUser?.image ? (
                      <img src={currentUser.image} alt={currentUser?.name} className="rounded-full" />
                    ) : (
                      <span className="text-primary-content text-xs flex items-center justify-center w-full h-full">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    className="input input-bordered input-sm w-full rounded-full bg-base-200 focus:bg-base-100"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={isSubmittingComment}
                  />
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full bg-primary">
                        {comment.user?.image ? (
                          <img src={comment.user.image} alt={comment.user?.name} className="rounded-full" />
                        ) : (
                          <span className="text-primary-content text-xs flex items-center justify-center w-full h-full">
                            {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-base-200 rounded-2xl px-3 py-2">
                        <p className="font-semibold text-sm">{comment.user?.name}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-base-content/60">
                        <span>{formatDate(comment.createdAt)}</span>
                        <button className="hover:underline font-medium">Like</button>
                        <button className="hover:underline font-medium">Reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Confirmation Dialog */}
      {isShareDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsShareDialogOpen(false)}
          />
          <div className="relative bg-base-100 rounded-2xl shadow-xl p-6 max-w-md mx-4 border border-base-300">
            <h3 className="text-lg font-semibold text-base-content mb-4">Share this post?</h3>
            <p className="text-base-content/70 mb-6">
              This will share the post to your timeline and it will be visible to your friends.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsShareDialogOpen(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShare}
                className="btn btn-primary"
              >
                Share Post
              </button>
            </div>
          </div>
        </div>
      )}

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCloseModal}
        postId={targetPostId}
        currentUser={currentUser}
      />
    </>
  );
};