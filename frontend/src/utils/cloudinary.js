// Cloudinary configuration and upload utilities
import { Cloudinary } from 'cloudinary-core';

// Initialize Cloudinary
const cloudinary = new Cloudinary({
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dsb7ttev4',
  secure: true,
});

// Generate SHA-1 signature for Cloudinary signed uploads
const generateCloudinarySignature = async (paramsToSign, apiSecret) => {
  // Sort parameters and create string to sign
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');
  
  const stringToSign = sortedParams + apiSecret;
  
  // Use Web Crypto API to generate SHA-1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

// Cloudinary signed upload function (no presets required)
export const uploadImageToCloudinary = async (file) => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dsb7ttev4';
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || '447622964742226';
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || 'qPHKa5sa89aPjcKFWiIpVac02wE';
    
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Parameters for signing (sorted alphabetically, excluding file and api_key)
    const paramsToSign = {
      folder: 'memestream',
      timestamp: timestamp,
      transformation: 'f_auto,q_auto:good'
    };
    
    // Generate signature
    const signature = await generateCloudinarySignature(paramsToSign, apiSecret);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', 'memestream');
    formData.append('transformation', 'f_auto,q_auto:good');
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary signed upload failed:', errorData);
      throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        url: data.secure_url,
        publicId: data.public_id,
        originalName: file.name,
        size: data.bytes,
        format: data.format,
        width: data.width,
        height: data.height,
      }
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
};

// Function to generate optimized image URLs
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 'auto',
    height = 'auto',
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      {
        width,
        height,
        crop,
        quality,
        fetch_format: format,
        flags: 'progressive',
      }
    ]
  });
};

// Function to generate image URLs with different sizes for responsive design
export const getResponsiveImageUrls = (publicId) => {
  const sizes = [
    { name: 'thumbnail', width: 150, height: 150 },
    { name: 'small', width: 400, height: 400 },
    { name: 'medium', width: 800, height: 600 },
    { name: 'large', width: 1200, height: 900 },
  ];

  return sizes.reduce((acc, size) => {
    acc[size.name] = getOptimizedImageUrl(publicId, {
      width: size.width,
      height: size.height,
      crop: 'fill',
      quality: 'auto',
    });
    return acc;
  }, {});
};

// Function to validate file before upload
export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.' 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File too large. Please upload images under 10MB.' 
    };
  }
  
  return { valid: true };
};

// Function to compress image before upload (optional)
export const compressImage = (file, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions to keep aspect ratio
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          // Create a new File object with compressed image
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// Helper function to delete images from Cloudinary (if needed)
export const deleteImageFromCloudinary = async (publicId) => {
  try {
    // Note: Image deletion requires server-side implementation with API secret
    // This is just a placeholder for frontend reference
    console.warn('Image deletion should be handled server-side for security');
    return { success: false, error: 'Deletion must be handled server-side' };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

export default {
  uploadImageToCloudinary,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  validateImageFile,
  compressImage,
  deleteImageFromCloudinary,
};