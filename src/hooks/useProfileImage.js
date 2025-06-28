import { useState, useEffect } from 'react';
import { getProfileImageURL } from '../services/storageService';

const DEFAULT_PROFILE_IMAGE = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

/**
 * Custom hook to handle profile image loading with caching
 * @param {string} userId - The user ID to fetch the profile image for
 * @param {string} initialImageUrl - Optional initial image URL if already available
 * @returns {Object} - Object containing the image URL and loading state
 */
const useProfileImage = (userId, initialImageUrl = null) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [isLoading, setIsLoading] = useState(!initialImageUrl);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have an image URL, don't fetch
    if (initialImageUrl) {
      setImageUrl(initialImageUrl);
      setIsLoading(false);
      return;
    }

    // If no userId, use default image
    if (!userId) {
      setImageUrl(DEFAULT_PROFILE_IMAGE);
      setIsLoading(false);
      return;
    }

    const fetchProfileImage = async () => {
      try {
        setIsLoading(true);
        const url = await getProfileImageURL(userId);
        setImageUrl(url || DEFAULT_PROFILE_IMAGE);
        setError(null);
      } catch (err) {
        console.error('Error fetching profile image:', err);
        setImageUrl(DEFAULT_PROFILE_IMAGE);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileImage();
  }, [userId, initialImageUrl]);

  return {
    imageUrl: imageUrl || DEFAULT_PROFILE_IMAGE,
    isLoading,
    error,
    isDefault: !imageUrl || imageUrl === DEFAULT_PROFILE_IMAGE
  };
};

export default useProfileImage; 