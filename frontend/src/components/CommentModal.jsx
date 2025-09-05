import React, { useEffect, useState, useCallback } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import api from '../utils/axios';

const Comment = ({ comment }) => (
  <div className="flex items-start gap-3">
    <div className="avatar">
      <div className="w-10 h-10 rounded-full bg-base-300">
        {comment.user?.image ? (
          <img src={comment.user.image} alt={comment.user.name} />
        ) : (
          <span className="text-xl text-base-content flex items-center justify-center w-full h-full">
            {comment.user?.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
    <div className="bg-base-200 rounded-lg p-3 text-sm flex-1">
      <p className="font-semibold text-base-content">{comment.user?.name}</p>
      <p className="text-base-content/80 whitespace-pre-wrap">{comment.content}</p>
    </div>
  </div>
);

export const CommentModal = ({ isOpen, onClose, postId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch comments whenever the modal is opened for a specific post
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await api.get(`/Comment/get/${postId}`);
      setComments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post('/Comment/create', {
        postId: postId,
        content: newComment,
      });
      setNewComment('');
      fetchComments(); // Re-fetch comments to show the new one
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-base-300 max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-2xl text-base-content">Comments</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        {/* Comments List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
          {loading ? (
            <div className="text-center p-8">
              <span className="loading loading-bars loading-lg"></span>
            </div>
          ) : comments.length > 0 ? (
            comments.map(comment => <Comment key={comment.id} comment={comment} />)
          ) : (
            <div className="text-center p-8 text-base-content/70">
              <p className="text-4xl mb-2">🤔</p>
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>

        {/* Divider and Comment Form */}
        <div className="divider mt-4"></div>
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full">
              {currentUser.image ? (
                <img src={currentUser.image} alt="Your avatar" />
              ) : (
                <span className="text-xl text-base-content flex items-center justify-center w-full h-full bg-base-300">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="input input-bordered bg-base-200 w-full rounded-full"
          />
          <button type="submit" className="btn btn-ghost btn-circle">
            <FaPaperPlane className="text-primary" />
          </button>
        </form>
      </div>
    </div>
  );
};