import React, { useEffect, useState, useCallback } from "react";
import { FaLaughSquint, FaComment, FaShare, FaEllipsisH, FaPaperPlane } from "react-icons/fa";
import { CommentModal } from "./CommentModal";
import api from "../utils/axios";

export const PostCard = ({ post, user, formatDate, onEdit, onDelete }) => {
  const [reactions, setReactions] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const isOriginalPost = !post.isShared;

  const fetchPostInteractions = useCallback(async () => {
    try {
      // Fetch Reactions
      const reactionRes = await api.get(`/Reaction/get/${post.id}`);
      if (reactionRes.data) {
        setReactions(Array.isArray(reactionRes.data.reactions) ? reactionRes.data.reactions : []);
        setUserReaction(reactionRes.data.userReaction || null);
      }

      // Fetch Comments
      const commentRes = await api.get(`/Comment/get/${post.id}`);
      setCommentCount(commentRes.data ? commentRes.data.length : 0);

    } catch (error) {
      console.error(`Error fetching data for post ${post.id}:`, error);
    }
  }, [post.id]);


  useEffect(() => {
    fetchPostInteractions();
  }, [fetchPostInteractions]);

  const handleReactionClick = async () => {
    try {
      await api.post("/Reaction/create", {
        postId: post.id,
        type: 0,
      });
      // Re-fetch to get the latest state
      fetchPostInteractions();
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleCloseModal = () => {
    setIsCommentModalOpen(false);
    fetchPostInteractions();
  };

  return (
    <div className="card bg-base-200 shadow-xl border border-base-300">
      <div className="card-body p-5">
        {/* Post Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-12 h-12 rounded-full bg-primary">
                {user.image ? (
                  <img src={user.image} alt={user.name} />
                ) : (
                  <span className="text-2xl text-primary-content flex items-center justify-center w-full h-full">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold text-base-content">{user.name}</span>
              {post.isShared && post.originalPost && (
                <div className="text-xs text-base-content/60 mt-1">
                  Shared from {post.originalPost.user.name}
                </div>
              )}
              <p className="text-xs text-base-content/60">
                {formatDate(post.createdAt)}
              </p>
            </div>
          </div>
          {isOriginalPost && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <FaEllipsisH className="text-base-content/60" />
              </label>
              <ul
                tabIndex={0}
                className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-300 rounded-box w-52"
              >
                <li>
                  <a onClick={() => onEdit(post.id, post.content)}>Edit Post</a>
                </li>
                <li>
                  <a onClick={() => onDelete(post.id)} className="text-error">
                    Delete Post
                  </a>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div>
          {post.content && (
            <p className="text-base-content mb-3">{post.content}</p>
          )}
          {post.image && (
            <div className="relative w-full min-h-[200px] max-h-[450px] rounded-lg">
              <img
                src={post.image}
                alt="Post"
                className="mx-auto max-h-[450px] w-auto h-auto object-contain"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Reaction and Comment Counts */}
        <div className="flex justify-between items-center text-sm text-base-content/90 mt-3 px-2">
          <div>
            {reactions.length > 0 && `😂 ${reactions.length} Laughs`}
          </div>
          <div>
            {commentCount > 0 && `${commentCount} Comments`}
          </div>
        </div>

        {/* Divider */}
        <div className="divider my-1"></div>

        {/* Action Buttons */}
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
          <button className="btn btn-ghost flex-1">
            <FaShare /> Share
          </button>
        </div>
      </div>
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCloseModal}
        postId={post.id}
        currentUser={user}
      />
    </div>
  );
};