import React, { useEffect, useState, useCallback } from "react";
import { FaLaughSquint, FaComment, FaShare, FaEllipsisH, FaShareSquare } from "react-icons/fa";
import { CommentModal } from "./CommentModal";
import feedService from "../services/feedService";
import toast from 'react-hot-toast';

export const PostCard = ({ post, user, formatDate, onEdit, onDelete, onUnshare, onChange }) => {
  const [reactions, setReactions] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const isOriginalPost = !post.isShared;
  const targetPostId = isOriginalPost ? post.id : post.originalPost?.id;

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


  const author = isOriginalPost ? user : post.originalPost.user;
  const timestamp = isOriginalPost ? post.createdAt : post.originalPost.createdAt;

  return (
    <>
      <div className="card bg-base-200 shadow-xl border border-base-300">
        <div className="card-body p-5">
          {!isOriginalPost && (
            <div className="flex items-center gap-2 text-sm text-base-content/70 mb-3">
              <FaShareSquare className="text-primary" />
              <span className="font-semibold">{user.name}</span> shared
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="w-12 h-12 rounded-full bg-primary">
                  {author.image ? (
                    <img src={author.image} alt={author.name} />
                  ) : (
                    <span className="text-2xl text-primary-content flex items-center justify-center w-full h-full">
                      {author.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-semibold text-base-content">{author.name}</span>
                <p className="text-xs text-base-content/60">
                  {formatDate(timestamp)}
                </p>
              </div>
            </div>

            {/* Options Menu Logic */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <FaEllipsisH className="text-base-content/60" />
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-300 rounded-box w-52">
                {isOriginalPost ? (
                  <>
                    <li><a onClick={() => onEdit(post.id, post.content)}>Edit Post</a></li>
                    <li><a onClick={() => onDelete(post.id)} className="text-error">Delete Post</a></li>
                  </>
                ) : (
                  <li>
                    <a onClick={() => onUnshare(post.id, post.originalPost.id)} className="text-warning">
                      Unshare
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div>
            {post.content && (
              <p className="text-base-content mb-3 whitespace-pre-wrap">{post.content}</p>
            )}
            {post.image && (
              <div className="relative w-full max-h-[450px] rounded-lg bg-base-300/20 flex justify-center">
                <img
                  src={post.image}
                  alt="Post content"
                  className="max-h-[450px] w-auto h-auto object-contain"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-sm text-base-content/90 mt-3 px-2">
            <div>
              {reactions.length > 0 && `😂 ${reactions.length} Laughs`}
            </div>
            <div>
              {commentCount > 0 && `${commentCount} Comments`}
            </div>
          </div>

          <div className="divider my-1"></div>

          <div className="flex justify-around items-center text-base-content">
            <button
              onClick={handleReactionClick}
              className={`btn btn-ghost flex-1 ${userReaction ? "text-primary" : ""}`}
            >
              <FaLaughSquint /> Laugh
            </button>
            <button
              onClick={() => setIsCommentModalOpen(true)}
              className="btn btn-ghost flex-1"
            >
              <FaComment /> Comment
            </button>
            <button onClick={handleShareClick} className="btn btn-ghost flex-1">
              <FaShare /> Share
            </button>
          </div>
        </div>
      </div>

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCloseModal}
        postId={targetPostId}
        currentUser={user}
      />
    </>
  );
};