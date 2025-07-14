import Compressor from 'compressorjs';

/**
 * Optimize image before upload
 * @param {File} file - Original image file
 * @returns {Promise<File>} - Optimized image file
 */
export const optimizeImage = (file) => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8, // 80% quality
      maxWidth: 1920,
      maxHeight: 1080,
      convertSize: 1000000, // Convert to JPEG if larger than 1MB
      success: (result) => {
        resolve(result);
      },
      error: (err) => {
        console.error('Error compressing image:', err);
        reject(err);
      },
    });
  });
};

/**
 * Create video thumbnail
 * @param {File} videoFile - Video file
 * @returns {Promise<string>} - Thumbnail data URL
 */
export const createVideoThumbnail = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to 1 second or 25% of video duration, whichever is less
      const seekTime = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    video.onerror = () => {
      reject(new Error('Error loading video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Check and optimize video file
 * @param {File} file - Original video file
 * @returns {Promise<{file: File, thumbnail: string}>} - Optimized video and thumbnail
 */
export const processVideo = async (file) => {
  // Check video duration
  const duration = await getVideoDuration(file);
  if (duration > 300) { // 5 minutes max
    throw new Error('Video must be less than 5 minutes long');
  }

  // Generate thumbnail
  const thumbnail = await createVideoThumbnail(file);

  // For now, return original file with thumbnail
  // In a production environment, you might want to use a server-side
  // service like FFmpeg for video compression
  return {
    file: file,
    thumbnail: thumbnail
  };
};

/**
 * Get video duration
 * @param {File} file - Video file
 * @returns {Promise<number>} - Duration in seconds
 */
const getVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      reject(new Error('Error loading video'));
    };

    video.src = URL.createObjectURL(file);
  });
}; 