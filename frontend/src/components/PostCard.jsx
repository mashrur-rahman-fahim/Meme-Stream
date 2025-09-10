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

  const handleShareClick = async () => {
    if (!targetPostId) return;
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
            <button onClick={() => setIsCommentModalOpen(true)} className="btn btn-ghost btn-sm sm:btn-md flex-1 gap-1 sm:gap-2">
              <FaComment className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Comment</span>
            </button>
            <button onClick={handleShareClick} className="btn btn-ghost btn-sm sm:btn-md flex-1 gap-1 sm:gap-2">
              <FaShare className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCloseModal}
        postId={targetPostId}
        currentUser={currentUser}
      />
    </>
  );
};