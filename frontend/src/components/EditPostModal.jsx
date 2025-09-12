import React, { useState, useEffect } from 'react';
import { FaTimes, FaImage, FaSpinner } from 'react-icons/fa';
import feedService from '../services/feedService';
import toast from 'react-hot-toast';

export const EditPostModal = ({ isOpen, onClose, post, onSuccess }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [memeValidation, setMemeValidation] = useState(null);
  const [isValidatingMeme, setIsValidatingMeme] = useState(false);

  useEffect(() => {
    if (isOpen && post) {
      setContent(post.content || '');
      setImage(post.image || '');
      setMemeValidation(null);
    }
  }, [isOpen, post]);

  const validateMemeContent = async (contentToValidate, imageToValidate) => {
    if (!contentToValidate.trim() && !imageToValidate.trim()) {
      setMemeValidation(null);
      return;
    }

    setIsValidatingMeme(true);
    try {
      const result = await feedService.checkMemeContent({
        content: contentToValidate,
        image: imageToValidate
      });
      
      if (result.success) {
        setMemeValidation(result.data);
      } else {
        setMemeValidation({ isMeme: false, message: "Meme validation failed! Try again? 🤖💥" });
      }
    } catch (error) {
      setMemeValidation({ isMeme: false, message: "Validation error occurred" });
    }
    setIsValidatingMeme(false);
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Debounced validation
    clearTimeout(window.memeValidationTimeout);
    window.memeValidationTimeout = setTimeout(() => {
      validateMemeContent(newContent, image);
    }, 1000);
  };

  const handleImageChange = (e) => {
    const newImage = e.target.value;
    setImage(newImage);
    
    // Debounced validation
    clearTimeout(window.memeValidationTimeout);
    window.memeValidationTimeout = setTimeout(() => {
      validateMemeContent(content, newImage);
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim() && !image.trim()) {
      toast.error("Your meme can't be invisible! Add some content 👻");
      return;
    }

    setLoading(true);
    
    try {
      const result = await feedService.editPost(post.id, {
        content: content.trim(),
        image: image.trim()
      });

      if (result.success) {
        toast.success(result.data.message || "Meme successfully upgraded to premium edition! ✨");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || "Edit failed! Your meme is playing hard to get 😅");
      }
    } catch (error) {
      toast.error("Something went wrong! Even our edit button needs therapy 🤔");
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    setContent('');
    setImage('');
    setMemeValidation(null);
    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = (content.trim() || image.trim()) && 
                   (!memeValidation || memeValidation.isMeme) && 
                   !loading && 
                   !isValidatingMeme;

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-base-100 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-base-content">Edit Your Meme</h2>
          <button 
            onClick={handleClose} 
            className="btn btn-ghost btn-sm btn-circle"
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Meme Text Content</span>
            </label>
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Update your spicy meme content... 🌶️"
              className="textarea textarea-bordered bg-base-200 h-24 resize-none"
              disabled={loading}
            />
          </div>

          {/* Image URL Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Image URL</span>
            </label>
            <div className="input-group">
              <span className="bg-base-300">
                <FaImage className="text-base-content/60" />
              </span>
              <input
                type="url"
                value={image}
                onChange={handleImageChange}
                placeholder="https://example.com/your-meme.jpg"
                className="input input-bordered bg-base-200 w-full"
                disabled={loading}
              />
            </div>
          </div>

          {/* Image Preview */}
          {image && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Preview</span>
              </label>
              <div className="w-full max-h-64 rounded-lg bg-base-300/20 flex justify-center overflow-hidden">
                <img 
                  src={image} 
                  alt="Preview" 
                  className="max-h-64 w-auto h-auto object-contain rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Meme Validation Status */}
          {isValidatingMeme && (
            <div className="alert alert-info">
              <FaSpinner className="animate-spin" />
              <span>Checking if your content is meme-worthy... 🤖</span>
            </div>
          )}

          {memeValidation && !isValidatingMeme && (
            <div className={`alert ${memeValidation.isMeme ? 'alert-success' : 'alert-error'}`}>
              <span>
                {memeValidation.message || (memeValidation.isMeme ? 
                  "✅ This is meme content! Ready to update!" : 
                  "❌ This isn't meme content. Keep it spicy and meme-worthy!"
                )}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-action">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Meme'
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop bg-black/50" onClick={handleClose}></div>
    </div>
  );
};