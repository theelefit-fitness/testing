import { storage, db, auth } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

// In-memory cache for profile image URLs
const profileImageCache = new Map();

/**
 * Upload a profile image to Firebase Storage and save the URL in Firestore
 * @param {File} file - The image file to upload
 * @param {string} email - User email as identifier for storage
 * @param {string} userId - User ID for Firestore document
 * @param {string} userType - Either 'users' or 'experts'
 * @returns {Promise<string>} - URL of the uploaded image
 */
export const uploadProfileImage = async (file, email, userId, userType) => {
  try {
    if (!file || !email || !userId) {
      throw new Error('File, email, and userId are required');
    }

    // Create a reference to the file in Firebase Storage
    // Structure: email/media/profile-image.extension
    const fileExtension = file.name.split('.').pop();
    const storageRef = ref(storage, `${email}/media/profile-image.${fileExtension}`);
    
    // Upload the file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Save the URL in Firestore for faster retrieval
    const mediaDocRef = doc(db, 'usersMedia', userId);
    
    // Check if document exists
    const mediaDoc = await getDoc(mediaDocRef);
    
    if (mediaDoc.exists()) {
      // Update existing document
      await setDoc(mediaDocRef, {
        profileImageURL: downloadURL,
        email: email,
        lastUpdated: new Date()
      }, { merge: true });
    } else {
      // Create new document
      await setDoc(mediaDocRef, {
        profileImageURL: downloadURL,
        email: email,
        userType: userType,
        lastUpdated: new Date()
      });
    }
    
    // Also update the user/expert document with the profile image URL
    const userDocRef = doc(db, userType, userId);
    await setDoc(userDocRef, {
      profileImageURL: downloadURL
    }, { merge: true });
    
    // Update the cache with the new URL
    profileImageCache.set(userId, {
      url: downloadURL,
      timestamp: Date.now()
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Upload post media (image/video) to Firebase Storage and save the URL in Firestore
 * @param {File} file - The media file to upload
 * @param {string} email - User email as identifier for storage
 * @param {string} userId - User ID for Firestore document
 * @param {string} postId - Optional post ID to associate with the media
 * @returns {Promise<string>} - URL of the uploaded media
 */
export const uploadPostMedia = async (file, email, userId, postId = null) => {
  try {
    if (!file || !email || !userId) {
      throw new Error('File, email, and userId are required');
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `post-${timestamp}.${fileExtension}`;
    
    // Create a reference to the file in Firebase Storage
    // Structure: email/media/posts/filename
    const storageRef = ref(storage, `${email}/media/posts/${fileName}`);
    
    // Ensure the user is authenticated with the correct email
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated. Please sign in.');
    }
    
    // Use the authenticated user's email instead of passed email
    email = currentUser.email; // Override the email parameter with authenticated user's email
    
    // Upload the file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Save the URL in Firestore for faster retrieval
    const mediaDocRef = doc(db, 'usersMedia', userId);
    
    // Check if document exists
    const mediaDoc = await getDoc(mediaDocRef);
    
    const mediaData = {
      url: downloadURL,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date(),
      postId: postId
    };
    
    if (mediaDoc.exists()) {
      // Update existing document with new media
      await updateDoc(mediaDocRef, {
        media: arrayUnion(mediaData),
        lastUpdated: new Date()
      });
    } else {
      // Create new document
      await setDoc(mediaDocRef, {
        email: email,
        userType: 'user', // Default to user
        media: [mediaData],
        lastUpdated: new Date()
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading post media:', error);
    throw error;
  }
};

/**
 * Get the profile image URL from cache first, then Firestore if not in cache
 * @param {string} userId - User ID as identifier
 * @returns {Promise<string>} - URL of the profile image or null if not found
 */
export const getProfileImageURL = async (userId) => {
  try {
    if (!userId) {
      return null;
    }
    
    // Check if the URL is in the cache and not expired (cache for 1 hour)
    const cachedImage = profileImageCache.get(userId);
    if (cachedImage && (Date.now() - cachedImage.timestamp < 3600000)) {
      console.log('Using cached profile image for:', userId);
      return cachedImage.url;
    }
    
    // If not in cache or expired, get from Firestore
    const mediaDocRef = doc(db, 'usersMedia', userId);
    const mediaDoc = await getDoc(mediaDocRef);
    
    if (mediaDoc.exists() && mediaDoc.data().profileImageURL) {
      const imageUrl = mediaDoc.data().profileImageURL;
      
      // Update the cache
      profileImageCache.set(userId, {
        url: imageUrl,
        timestamp: Date.now()
      });
      
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting profile image URL:', error);
    return null;
  }
};

/**
 * Get all media for a user
 * @param {string} userId - User ID as identifier
 * @returns {Promise<Array>} - Array of media objects or empty array if none found
 */
export const getUserMedia = async (userId) => {
  try {
    if (!userId) {
      return [];
    }
    
    const mediaDocRef = doc(db, 'usersMedia', userId);
    const mediaDoc = await getDoc(mediaDocRef);
    
    if (mediaDoc.exists() && mediaDoc.data().media) {
      return mediaDoc.data().media;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user media:', error);
    return [];
  }
};

/**
 * Clear the profile image cache for a specific user or all users
 * @param {string} userId - Optional user ID to clear specific cache entry
 */
export const clearProfileImageCache = (userId = null) => {
  if (userId) {
    profileImageCache.delete(userId);
  } else {
    profileImageCache.clear();
  }
};

export default {
  uploadProfileImage,
  uploadPostMedia,
  getProfileImageURL,
  getUserMedia,
  clearProfileImageCache
}; 