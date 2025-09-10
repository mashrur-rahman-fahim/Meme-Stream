import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaFileAlt, FaSave, FaSpinner, FaCamera } from 'react-icons/fa';
import ImageUpload from './ImageUpload';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const ProfileEditModal = ({ isOpen, onClose, currentUser, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    image: ''
  });
  const [uploadedImageData, setUploadedImageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        image: currentUser.image || ''
      });
      setUploadedImageData(null);
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, currentUser]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle image upload
  const handleImageUpload = (imageData) => {
    setUploadedImageData(imageData);
    setFormData(prev => ({
      ...prev,
      image: imageData.url
    }));
    setIsDirty(true);
    toast.success('Profile picture uploaded successfully!');
  };

  // Handle image removal
  const handleImageRemove = () => {
    setUploadedImageData(null);
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
    setIsDirty(true);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put('/User/profile', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        bio: formData.bio.trim(),
        image: formData.image
      });

      toast.success('Profile updated successfully!');
      
      // Call the onUpdate callback with the updated user data
      // Handle both old and new response formats for backward compatibility
      const userData = response.data.user || response.data.User;
      if (onUpdate && userData) {
        onUpdate(userData);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      // Handle both old and new error response formats
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.Error || 
                          error.response?.data || 
                          'Failed to update profile. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle modal close with unsaved changes warning
  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl bg-base-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-base-content flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FaUser className="text-primary" />
            </div>
            Edit Profile
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="btn btn-ghost btn-circle"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="text-center">
            <label className="block text-sm font-medium text-base-content mb-4">
              Profile Picture
            </label>
            
            {/* Current Profile Picture */}
            {(currentUser?.image || formData.image) && !uploadedImageData && (
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <img
                    src={formData.image || currentUser?.image}
                    alt="Current profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-base-300"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FaCamera className="text-white text-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* Image Upload Component */}
            <ImageUpload
              onImageUpload={handleImageUpload}
              currentImageUrl={formData.image}
              onImageRemove={handleImageRemove}
              className="max-w-md mx-auto"
            />

            {uploadedImageData && (
              <div className="mt-3 text-xs text-base-content/60 text-center">
                <p>✅ {uploadedImageData.originalName}</p>
                <p>📏 {uploadedImageData.width}x{uploadedImageData.height}</p>
              </div>
            )}
          </div>

          {/* Name Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <FaUser className="text-primary" />
                Display Name
              </span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`input input-bordered w-full ${
                errors.name ? 'input-error' : ''
              }`}
              placeholder="Enter your display name"
              disabled={isLoading}
            />
            {errors.name && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.name}</span>
              </label>
            )}
          </div>

          {/* Email Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <FaEnvelope className="text-primary" />
                Email Address
              </span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`input input-bordered w-full ${
                errors.email ? 'input-error' : ''
              }`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {errors.email && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.email}</span>
              </label>
            )}
          </div>

          {/* Bio Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <FaFileAlt className="text-primary" />
                Bio
              </span>
              <span className="label-text-alt text-base-content/60">
                {formData.bio.length}/500
              </span>
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className={`textarea textarea-bordered w-full h-24 resize-none ${
                errors.bio ? 'textarea-error' : ''
              }`}
              placeholder="Tell the world about yourself... Keep it meme-y! 😄"
              disabled={isLoading}
              maxLength={500}
            />
            {errors.bio && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.bio}</span>
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-base-300">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="btn btn-primary flex-1"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

        {/* Unsaved changes indicator */}
        {isDirty && !isLoading && (
          <div className="absolute top-4 right-16">
            <div className="badge badge-warning badge-sm">
              Unsaved changes
            </div>
          </div>
        )}
      </div>
      
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
};

export default ProfileEditModal;