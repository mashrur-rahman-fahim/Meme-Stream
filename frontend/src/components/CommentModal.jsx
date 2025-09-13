import React, { useEffect, useState, useCallback } from 'react';
import { FaPaperPlane, FaEllipsisH } from 'react-icons/fa';
import feedService from '../services/feedService';
import { formatDate } from '../utils/formatDate';
import toast from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';


const Comment = ({ comment, currentUser, onEdit, onDelete }) => {
  const isAuthor = currentUser.id === comment.userId;

  return (
    <div className="flex items-start gap-3">
      <div className="avatar">
        <div className="w-10 h-10 rounded-full bg-base-300">
          {comment.user?.image ? <img src={comment.user.image} alt={comment.user.name} /> : <span className="text-xl text-base-content flex items-center justify-center w-full h-full">{comment.user?.name.charAt(0).toUpperCase()}</span>}
        </div>
      </div>
      <div className="bg-base-200 rounded-lg p-3 text-sm flex-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-base-content">{comment.user?.name}</p>
            <p className="text-xs text-base-content/60">{formatDate(comment.createdAt)}</p>
          </div>
          {isAuthor && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-xs"><FaEllipsisH /></label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-300 rounded-box w-32">
                <li><a onClick={() => onEdit(comment)}>Edit</a></li>
                <li><a onClick={() => onDelete(comment.id)} className="text-error">Delete</a></li>
              </ul>
            </div>
          )}
        </div>
        <p className="text-base-content/80 whitespace-pre-wrap pt-1">{comment.content}</p>
      </div>
    </div>
  );
};

export const CommentModal = ({ isOpen, onClose, postId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    confirmText: 'Confirm',
    confirmButtonClass: 'btn-primary',
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch comments whenever the modal is opened for a specific post
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const res = await feedService.getPostComments(postId);
    if (res.success) {
      setComments(res.data);
    } else {
      toast.error("Comments broke! Even the internet is having a moment 😅");
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const result = await feedService.addComment(postId, newComment);
    if (result.success) {
      setNewComment('');
      fetchComments();
    } else {
      toast.error("Comment got lost in the void! Try again? 🕳️");
    }
  };


  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const result = await feedService.editComment(editingCommentId, editingCommentText);
    if (result.success) {
      toast.success("Comment upgraded to premium! ✨");
      handleCancelEdit();
      fetchComments();
    } else {
      toast.error("Edit failed! Even your comment is having trust issues 🤔");
    }
  };

  const handleDeleteComment = async (commentId) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Comment',
      message: 'Are you sure you want to permanently delete this comment?',
      onConfirm: () => performDeleteComment(commentId),
      confirmText: 'Delete',
      confirmButtonClass: 'btn-error',
    });
  };

  const performDeleteComment = async (commentId) => {
    setIsConfirming(true);
    const result = await feedService.deleteComment(commentId);
    if (result.success) {
      toast.success("Comment yeeted into the digital void! 🗑️💫");
      fetchComments();
    } else {
      toast.error("Delete failed! This comment is more stubborn than you thought 😤");
    }
    setIsConfirming(false);
    setConfirmState({ isOpen: false });
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
            comments.map(comment => (
              <div key={comment.id}>
                {editingCommentId === comment.id ? (
                  // --- EDITING VIEW ---
                  <form onSubmit={handleSaveEdit} className="bg-base-200 rounded-lg p-3">
                    <textarea
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      className="textarea bg-base-100 w-full"
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button type="button" onClick={handleCancelEdit} className="btn btn-sm btn-ghost">Cancel</button>
                      <button type="submit" className="btn btn-sm btn-primary">Save</button>
                    </div>
                  </form>
                ) : (
                  <Comment
                    comment={comment}
                    currentUser={currentUser}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteComment}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-base-content/70">
              <p>Ghost town in here! Be the first to drop a hot take! 👻</p>
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
            placeholder="Drop your hot take... 🔥"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="input input-bordered bg-base-200 w-full rounded-full"
          />
          <button type="submit" className="btn btn-ghost btn-circle">
            <FaPaperPlane className="text-primary" />
          </button>
        </form>
      </div>

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmButtonClass={confirmState.confirmButtonClass}
        isLoading={isConfirming}
      />
    </div>
  );
};