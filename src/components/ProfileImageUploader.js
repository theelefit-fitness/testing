import React, { useState, useRef, useEffect } from 'react';
import { uploadProfileImage } from '../services/storageService';
import { doc, getDoc, updateDoc, deleteObject } from 'firebase/firestore';
import { ref, deleteObject as deleteStorageObject, getMetadata } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import './ProfileImageUploader.css';

const DEFAULT_PROFILE_IMAGE = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

// Camera icon SVG as a component
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="camera-icon">
    <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
  </svg>
);

// Helper functions for local storage caching
const getImageFromCache = (userId) => {
  try {
    const cachedData = localStorage.getItem(`profileImage_${userId}`);
    if (cachedData) {
      const { url, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is less than 24 hours old (86400000 ms)
      const now = new Date().getTime();
      if (now - timestamp < 86400000) {
        return url;
      } else {
        // Cache expired, remove it
        localStorage.removeItem(`profileImage_${userId}`);
      }
    }
  } catch (error) {
    console.error('Error reading from cache:', error);
  }
  return null;
};

const saveImageToCache = (userId, url) => {
  try {
    const cacheData = {
      url,
      timestamp: new Date().getTime()
    };
    localStorage.setItem(`profileImage_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
};

const ProfileImageUploader = ({ 
  currentImageUrl, 
  email, 
  userId,
  userType, 
  onImageUploaded, 
  size = 'medium' 
}) => {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || DEFAULT_PROFILE_IMAGE);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const successTimeoutRef = useRef(null);
  
  // Fetch the profile image URL from cache first, then Firestore if needed
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!userId) return;
      
      // Try to get image from cache first
      const cachedImageUrl = getImageFromCache(userId);
      if (cachedImageUrl) {
        console.log('Using cached profile image URL');
        setImageUrl(cachedImageUrl);
        if (onImageUploaded) {
          onImageUploaded(cachedImageUrl);
        }
        return;
      }
      
      // If not in cache or expired, fetch from Firestore
      try {
        console.log('Fetching profile image from Firestore');
        const userCollection = userType === 'expert' ? 'experts' : 'users';
        const userDoc = await getDoc(doc(db, userCollection, userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.profileImageUrl) {
            // Save to state and cache
            setImageUrl(userData.profileImageUrl);
            saveImageToCache(userId, userData.profileImageUrl);
            
            if (onImageUploaded) {
              onImageUploaded(userData.profileImageUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile image:', error);
      }
    };
    
    fetchProfileImage();
  }, [userId, userType, onImageUploaded]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, []);
  
  const handleImageClick = () => {
    // Remove the click handler functionality from the image
    // We'll use a dedicated upload button instead
  };
  
  const triggerFileUpload = () => {
    if (isUploading || previewUrl) return; // Prevent clicking while uploading or in preview mode
    fileInputRef.current.click();
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Please select an image file (png, jpg, jpeg)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    // Create a temporary URL for preview
    const tempPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(tempPreviewUrl);
    setSelectedFile(file);
    setError(null);
  };
  
  const handleSaveImage = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Try to delete the old image if it exists and is not the default
      if (imageUrl && imageUrl !== DEFAULT_PROFILE_IMAGE) {
        try {
          // Extract the path from the URL
          const oldImagePath = imageUrl.split('?')[0].split('/o/')[1]?.replace(/%2F/g, '/');
          if (oldImagePath) {
            const oldImageRef = ref(storage, decodeURIComponent(oldImagePath));
            
            // First check if we have access to the file
            try {
              await getMetadata(oldImageRef);
              // If we get here, we have read access, try to delete
              await deleteStorageObject(oldImageRef);
              console.log('Old image deleted successfully');
            } catch (metadataError) {
              // If we can't even read the metadata, we definitely can't delete it
              console.log('Cannot access old image metadata, skipping deletion:', metadataError.message);
            }
          }
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
          // Continue with upload even if delete fails - just log the error
          console.log('Continuing with new image upload despite deletion error');
        }
      }
      
      // Upload the image to Firebase Storage
      const downloadUrl = await uploadProfileImage(selectedFile, email, userId, userType);
      
      // Update the user document in Firestore with the new image URL
      const userCollection = userType === 'expert' ? 'experts' : 'users';
      await updateDoc(doc(db, userCollection, userId), {
        profileImageUrl: downloadUrl,
        userMedia: {
          profileImage: downloadUrl
        }
      });
      
      // Save the new URL to cache
      saveImageToCache(userId, downloadUrl);
      
      // Call the callback with the new image URL
      if (onImageUploaded) {
        onImageUploaded(downloadUrl);
      }
      
      // Clean up the temporary URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Set the final image URL
      setImageUrl(downloadUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      
      // We don't need to show success message here since onImageUploaded will handle it
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleCancelUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  };
  
  return (
    <div className={`profile-image-uploader ${size}`}>
      <div 
        className={`image-container ${isUploading ? 'uploading' : ''} ${previewUrl ? 'preview-mode' : ''}`}
        title={previewUrl ? "Preview" : "Profile photo"}
      >
        <img 
          src={previewUrl || imageUrl} 
          alt={previewUrl ? "Preview" : "Profile"} 
        />
        
        {isUploading && (
          <div className="upload-overlay">
            <div className="spinner"></div>
            <div className="upload-text">Uploading...</div>
          </div>
        )}
      </div>
      
      {/* Upload Button */}
      {!previewUrl && !isUploading && (
        <button 
          className="upload-photo-btn" 
          onClick={triggerFileUpload}
          type="button"
        >
          Change Photo
        </button>
      )}
      
      {/* Action buttons */}
      {previewUrl && !isUploading && (
        <div className="upload-actions">
          <button 
            className="upload-btn save-btn" 
            onClick={handleSaveImage}
          >
            Save
          </button>
          <button 
            className="upload-btn cancel-btn" 
            onClick={handleCancelUpload}
          >
            Cancel
          </button>
        </div>
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />
      {error && <div className="upload-error">{error}</div>}
    </div>
  );
};

export default ProfileImageUploader; 