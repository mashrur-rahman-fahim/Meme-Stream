# Cloudinary Integration Setup

This document explains how Cloudinary is integrated into MemeStream for image uploads.

## Configuration

### Environment Variables
Make sure your `.env` file contains:
```env
VITE_CLOUDINARY_CLOUD_NAME=dsb7ttev4
VITE_CLOUDINARY_API_KEY=447622964742226
VITE_CLOUDINARY_API_SECRET=qPHKa5sa89aPjcKFWiIpVac02wE
```

## No Upload Presets Required!

This implementation uses **signed uploads** without requiring any upload presets to be configured in Cloudinary. The system will work automatically with your Cloudinary credentials.

## Components

### ImageUpload Component
The main component for handling image uploads:
- Drag & drop support
- File validation
- Image compression for large files
- Preview functionality
- Upload progress indication

### Usage Example
```jsx
import ImageUpload from '../components/ImageUpload';

const [imageUrl, setImageUrl] = useState('');
const [imageData, setImageData] = useState(null);

const handleImageUpload = (data) => {
  setImageData(data);
  setImageUrl(data.url);
};

const handleImageRemove = () => {
  setImageData(null);
  setImageUrl('');
};

<ImageUpload
  onImageUpload={handleImageUpload}
  currentImageUrl={imageUrl}
  onImageRemove={handleImageRemove}
/>
```

## Utilities

### cloudinary.js
Contains helper functions:
- `uploadImageToCloudinary(file)` - Upload file to Cloudinary
- `getOptimizedImageUrl(publicId, options)` - Generate optimized URLs
- `getResponsiveImageUrls(publicId)` - Generate multiple sizes
- `validateImageFile(file)` - Validate file before upload
- `compressImage(file, quality)` - Compress large images

## Security Notes

1. **API Secret**: Never expose the API secret in frontend code. It's included in .env for reference but should be used server-side only.
2. **Upload Preset**: Use unsigned upload presets for client-side uploads.
3. **File Validation**: Always validate files before upload (type, size, etc.).
4. **Transformation**: Apply transformations to optimize images automatically.

## Features Implemented

✅ **Post Creation**: Users can upload images when creating memes
✅ **Profile Pictures**: Users can upload profile pictures during registration
✅ **Drag & Drop**: Modern file upload interface
✅ **Image Optimization**: Automatic compression and format optimization
✅ **Validation**: File type and size validation
✅ **Progress Indication**: Upload progress feedback
✅ **Preview**: Image preview before and after upload

## File Size Limits

- **Frontend Validation**: 10MB maximum
- **Auto Compression**: Files > 2MB are automatically compressed
- **Cloudinary Limits**: Check your plan limits

## Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## Troubleshooting

### Common Issues
1. **Upload fails**: Check upload preset is set to "unsigned"
2. **CORS errors**: Verify Cloudinary CORS settings
3. **Large files**: Enable auto-compression
4. **Format errors**: Ensure file types are allowed in upload preset

### Error Messages
- "No file selected" - User didn't select a file
- "Invalid file type" - File format not supported
- "File too large" - File exceeds 10MB limit
- "Upload failed" - Network or Cloudinary error