import React, { useState, useRef } from 'react';
import { FaUpload, FaImage, FaTimes, FaSpinner } from 'react-icons/fa';
import { 
  uploadImageToCloudinary, 
  validateImageFile, 
  compressImage 
} from '../utils/cloudinary';
import toast from 'react-hot-toast';

const ImageUpload = ({ onImageUpload, currentImageUrl, onImageRemove, className = '' }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    
    try {
      // Compress image if it's larger than 2MB
      let fileToUpload = file;
      if (file.size > 2 * 1024 * 1024) {
        toast.loading('Compressing image...', { id: 'compress' });
        fileToUpload = await compressImage(file, 0.8);
        toast.dismiss('compress');
      }

      toast.loading('Uploading image...', { id: 'upload' });
      
      const result = await uploadImageToCloudinary(fileToUpload);
      
      if (result.success) {
        toast.success('Image uploaded successfully!', { id: 'upload' });
        onImageUpload(result.data);
      } else {
        toast.error(result.error || 'Upload failed', { id: 'upload' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.', { id: 'upload' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    if (onImageRemove) {
      onImageRemove();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={uploading}
      />

      {currentImageUrl ? (
        // Image Preview
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg border-2 border-base-300">
            <img
              src={currentImageUrl}
              alt="Upload preview"
              className="w-full h-48 sm:h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerFileSelect();
                }}
                disabled={uploading}
                className="btn btn-sm btn-primary"
                title="Change image"
              >
                <FaUpload className="text-sm" />
                Change
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                disabled={uploading}
                className="btn btn-sm btn-error"
                title="Remove image"
              >
                <FaTimes className="text-sm" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Upload Area
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
            ${dragActive 
              ? 'border-primary bg-primary/10 scale-105' 
              : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
            }
            ${uploading ? 'pointer-events-none opacity-75' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <FaSpinner className="text-2xl text-primary animate-spin" />
              <p className="text-sm text-base-content/70">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaImage className="text-2xl text-primary" />
              </div>
              <div>
                <p className="font-medium text-base-content mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-base-content/60">
                  PNG, JPG, GIF, WebP up to 10MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerFileSelect();
                }}
                className="btn btn-outline btn-primary btn-sm"
                disabled={uploading}
              >
                <FaUpload className="mr-2" />
                Select Image
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress/Status */}
      {uploading && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-sm text-primary">
            <FaSpinner className="animate-spin" />
            <span>Processing image...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;