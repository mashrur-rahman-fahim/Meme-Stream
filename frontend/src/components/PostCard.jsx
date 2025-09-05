import React, { useEffect, useState, useCallback } from "react";
import { FaLaughSquint, FaComment, FaShare, FaEllipsisH, FaPaperPlane } from "react-icons/fa";
import api from "../utils/axios";

export const PostCard = ({ post, user, formatDate, onEdit, onDelete }) => {
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);
  const [userReaction, setUserReaction] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const isOriginalPost = !post.isShared;
  const loggedInUserId = user.id;

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
      setComments(Array.isArray(commentRes.data) ? commentRes.data : []);
      
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

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post("/Comment/create", {
        postId: post.id,
        userId: loggedInUserId,
        content: newComment,
      });
      setNewComment("");
      // Re-fetch comments to include the new one
      fetchPostInteractions();
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  return (
    <div className="card bg-slate-700 shadow-xl border border-slate-600/50">
      <div className="card-body p-5">
        {/* Post Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-12 h-12 rounded-full bg-green-500">
                {user.image ? (
                  <img src={user.image} alt={user.name} />
                ) : (
                  <span className="text-2xl text-white flex items-center justify-center w-full h-full">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold text-slate-100">{user.name}</span>
              {post.isShared && post.originalPost && (
                <div className="text-xs text-slate-400 mt-1">
                  Shared from {post.originalPost.user.name}
                </div>
              )}
              <p className="text-xs text-slate-400">
                {formatDate(post.createdAt)}
              </p>
            </div>
          </div>
          {isOriginalPost && (
             <div className="dropdown dropdown-end">
               <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                 <FaEllipsisH className="text-slate-400" />
               </label>
               <ul
                 tabIndex={0}
                 className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-slate-600 rounded-box w-52"
               >
                 <li>
                   <a onClick={() => onEdit(post.id, post.content)}>Edit Post</a>
                 </li>
                 <li>
                   <a onClick={() => onDelete(post.id)} className="text-red-400">
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
            <p className="text-slate-200 mb-4">{post.content}</p>
          )}
          {post.image && (
            <img
              src={post.image}
              alt="Post"
              className="rounded-lg w-full h-auto object-cover"
            />
          )}
        </div>

        {/* Reaction and Comment Counts */}
        <div className="flex justify-between items-center text-sm text-slate-400 mt-3 px-2">
            <div>
                {reactions.length > 0 && `😂 ${reactions.length} Laughs`}
            </div>
            <div>
                {comments.length > 0 && `${comments.length} Comments`}
            </div>
        </div>

        {/* Divider */}
        <div className="divider my-1"></div>

        {/* Action Buttons */}
        <div className="flex justify-around items-center text-slate-300">
          <button
            onClick={handleReactionClick}
            className={`btn btn-ghost flex-1 ${userReaction ? "text-amber-400" : ""}`}
          >
            <FaLaughSquint /> Laugh
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="btn btn-ghost flex-1"
          >
            <FaComment /> Comment
          </button>
          <button className="btn btn-ghost flex-1">
            <FaShare /> Share
          </button>
        </div>

        {/* Comment Section*/}
        {showComments && (
          <div className="mt-4 space-y-3">
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                <div className="avatar">
                    <div className="w-8 h-8 rounded-full">
                        {user.image ? <img src={user.image} alt="user" /> : <span>{user.name.charAt(0)}</span>}
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="input input-bordered bg-slate-600 w-full rounded-full"
                />
                <button type="submit" className="btn btn-ghost btn-circle">
                    <FaPaperPlane/>
                </button>
            </form>

            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <div className="avatar">
                    <div className="w-8 h-8 rounded-full">
                        {comment.user?.image ? <img src={comment.user.image} alt="commenter" /> : <span>{comment.user?.name.charAt(0)}</span>}
                    </div>
                </div>
                <div className="bg-slate-600 rounded-lg p-2 text-sm">
                  <p className="font-semibold text-slate-200">{comment.user?.name}</p>
                  <p className="text-slate-300">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};