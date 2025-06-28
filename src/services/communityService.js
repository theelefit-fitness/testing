import { db, storage, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc,
  where,
  limit as firestoreLimit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getProfileImageURL, uploadPostMedia } from './storageService';

/**
 * Create a new post in the community
 * @param {Object} postData - Post data including content, userId, userName, userAvatar, userType
 * @param {File} mediaFile - Optional media file to upload
 * @returns {Promise<Object>} - The created post
 */
export const createPost = async (postData, mediaFile = null) => {
  try {
    let mediaUrl = null;
    let mediaType = null;
    
    // Create post document first to get the postId
    const postRef = await addDoc(collection(db, 'posts'), {
      content: postData.content,
      createdAt: serverTimestamp(),
      userId: postData.userId,
      userName: postData.userName,
      userAvatar: postData.userAvatar,
      userType: postData.userType || 'user',
      likes: [],
      comments: [],
      mediaUrl: null,
      mediaType: null,
      status: 'uploading'
    });
    
    // Upload media if exists and update post with media URL
    if (mediaFile) {
      // Get the current authenticated user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated. Please sign in.');
      }
      
      // Use the authenticated user's email
      mediaUrl = await uploadPostMedia(
        mediaFile,
        currentUser.email,
        postData.userId,
        postRef.id
      );
      
      mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
      
      // Update post with media URL and type
      await updateDoc(postRef, {
        mediaUrl,
        mediaType,
        status: 'completed'
      });
    } else {
      // If no media, mark as completed immediately
      await updateDoc(postRef, {
        status: 'completed'
      });
    }
    
    // Get the created post
    const postDoc = await getDoc(postRef);
    const postWithId = {
      id: postRef.id,
      ...postDoc.data(),
      mediaUrl,
      mediaType
    };
    
    return postWithId;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

/**
 * Get posts for the community feed
 * @param {string} userId - Current user ID to check liked status
 * @returns {Promise<Array>} - Array of posts
 */
export const getPosts = async (userId = null) => {
  try {
    // Remove the limit to get all posts
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const postsPromises = [];
    
    querySnapshot.forEach((doc) => {
      const postData = doc.data();
      const postId = doc.id;
      
      // For each post, check if we need to fetch additional user data
      const postPromise = (async () => {
        try {
          // Start with basic post data
          const post = {
            id: postId,
            ...postData,
            liked: userId ? postData.likes?.includes(userId) : false
          };
          
          // If post doesn't have userType or has incomplete user info, try to fetch it
          if (!postData.userType || !postData.userName || !postData.userAvatar || postData.userAvatar.includes('placeholder')) {
            try {
              // Try to get profile image from usersMedia collection
              let profileImageURL = null;
              try {
                profileImageURL = await getProfileImageURL(postData.userId);
              } catch (imageError) {
                console.error(`Error fetching profile image for post ${postId}:`, imageError);
              }
              
              // First check if user is an expert
              const expertRef = doc(db, 'experts', postData.userId);
              const expertDoc = await getDoc(expertRef);
              
              if (expertDoc.exists()) {
                // User is an expert
                const expertData = expertDoc.data();
                post.userType = 'expert';
                
                // Update user avatar and name if missing or placeholder
                if (!postData.userAvatar || postData.userAvatar.includes('placeholder')) {
                  post.userAvatar = profileImageURL || expertData.profileImage || postData.userAvatar;
                }
                
                if (!postData.userName || postData.userName === 'Anonymous') {
                  post.userName = expertData.name || postData.userName;
                }
              } else {
                // Check users collection
                const userRef = doc(db, 'users', postData.userId);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  post.userType = userData.userType || 'user';
                  
                  // Update user avatar and name if missing or placeholder
                  if (!postData.userAvatar || postData.userAvatar.includes('placeholder')) {
                    post.userAvatar = profileImageURL || userData.profileImage || userData.photoURL || postData.userAvatar;
                  }
                  
                  if (!postData.userName || postData.userName === 'Anonymous') {
                    post.userName = userData.name || userData.displayName || postData.userName;
                  }
                } else if (profileImageURL) {
                  // If we at least have a profile image but no user doc
                  post.userAvatar = profileImageURL;
                }
              }
            } catch (error) {
              console.error(`Error fetching user data for post ${postId}:`, error);
            }
          }
          
          // Process comments to add user types if missing
          if (post.comments && post.comments.length > 0) {
            const commentPromises = post.comments.map(async (comment) => {
              if (!comment.userType || !comment.userName || !comment.userAvatar || comment.userAvatar.includes('placeholder')) {
                try {
                  // Try to get profile image from usersMedia collection
                  let profileImageURL = null;
                  try {
                    profileImageURL = await getProfileImageURL(comment.userId);
                  } catch (imageError) {
                    console.error(`Error fetching profile image for comment in post ${postId}:`, imageError);
                  }
                  
                  // First check if commenter is an expert
                  const expertRef = doc(db, 'experts', comment.userId);
                  const expertDoc = await getDoc(expertRef);
                  
                  if (expertDoc.exists()) {
                    // Commenter is an expert
                    const expertData = expertDoc.data();
                    comment.userType = 'expert';
                    
                    // Update user avatar and name if missing or placeholder
                    if (!comment.userAvatar || comment.userAvatar.includes('placeholder')) {
                      comment.userAvatar = profileImageURL || expertData.profileImage || comment.userAvatar;
                    }
                    
                    if (!comment.userName || comment.userName === 'Anonymous') {
                      comment.userName = expertData.name || comment.userName;
                    }
                  } else {
                    // Check users collection
                    const userRef = doc(db, 'users', comment.userId);
                    const userDoc = await getDoc(userRef);
                    
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      comment.userType = userData.userType || 'user';
                      
                      // Update user avatar and name if missing or placeholder
                      if (!comment.userAvatar || comment.userAvatar.includes('placeholder')) {
                        comment.userAvatar = profileImageURL || userData.profileImage || userData.photoURL || comment.userAvatar;
                      }
                      
                      if (!comment.userName || comment.userName === 'Anonymous') {
                        comment.userName = userData.name || userData.displayName || comment.userName;
                      }
                    } else if (profileImageURL) {
                      // If we at least have a profile image but no user doc
                      comment.userAvatar = profileImageURL;
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching user data for comment in post ${postId}:`, error);
                }
              }
              return comment;
            });
            
            post.comments = await Promise.all(commentPromises);
          }
          
          return post;
        } catch (error) {
          console.error(`Error processing post ${postId}:`, error);
          return {
            id: postId,
            ...postData,
            liked: userId ? postData.likes?.includes(userId) : false
          };
        }
      })();
      
      postsPromises.push(postPromise);
    });
    
    // Wait for all post processing to complete
    return await Promise.all(postsPromises);
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

/**
 * Toggle like on a post
 * @param {string} postId - ID of the post to like/unlike
 * @param {string} userId - ID of the user liking/unliking
 * @returns {Promise<Object>} - Updated post data
 */
export const toggleLikePost = async (postId, userId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postDoc.data();
    const isLiked = postData.likes?.includes(userId);
    
    // Update Firestore document in background
    updateDoc(postRef, {
      likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
    });
    
    // Return optimistic update immediately
    return {
      id: postId,
      ...postData,
      likes: isLiked 
        ? postData.likes.filter(id => id !== userId)
        : [...(postData.likes || []), userId],
      liked: !isLiked
    };
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

/**
 * Add a comment to a post
 * @param {string} postId - ID of the post to comment on
 * @param {Object} commentData - Comment data including content, userId, userName, userAvatar, userType
 * @returns {Promise<Object>} - Updated post with new comment
 */
export const addComment = async (postId, commentData) => {
  try {
    const postRef = doc(db, 'posts', postId);
    
    const comment = {
      content: commentData.content,
      userId: commentData.userId,
      userName: commentData.userName,
      userAvatar: commentData.userAvatar,
      userType: commentData.userType || 'user',
      createdAt: new Date().toISOString()
    };
    
    await updateDoc(postRef, {
      comments: arrayUnion(comment)
    });
    
    // Get updated post
    const updatedPostDoc = await getDoc(postRef);
    
    return {
      id: postId,
      ...updatedPostDoc.data()
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get suggested users to follow
 * @param {string} currentUserId - Current user ID
 * @param {number} limit - Maximum number of users to fetch
 * @returns {Promise<Array>} - Array of suggested users
 */
export const getSuggestedUsers = async (currentUserId, limit = 3) => {
  try {
    // First get all users
    const q = query(collection(db, 'users'), firestoreLimit(limit + 10)); // Fetch extra to filter out current user
    const querySnapshot = await getDocs(q);
    
    const userPromises = [];
    
    // Process each user document
    querySnapshot.forEach((userDoc) => {
      if (userDoc.id !== currentUserId) {
        const userData = userDoc.data();
        
        // For each user, check if they're an expert and get additional info
        const userPromise = (async () => {
          try {
            // Try to get profile image from usersMedia collection
            let profileImageURL = null;
            try {
              profileImageURL = await getProfileImageURL(userDoc.id);
            } catch (imageError) {
              console.error(`Error fetching profile image for user ${userDoc.id}:`, imageError);
            }
            
            // First check if user is an expert
            const expertRef = doc(db, 'experts', userDoc.id);
            const expertDoc = await getDoc(expertRef);
            
            let userInfo;
            
            if (expertDoc.exists()) {
              // User is an expert - combine data from both collections
              const expertData = expertDoc.data();
              
              userInfo = {
                id: userDoc.id,
                userType: 'expert',
                name: expertData.name || userData.name || userData.displayName || 'Expert',
                avatar: profileImageURL || expertData.profileImage || userData.profileImage || userData.photoURL || 'https://via.placeholder.com/40',
                email: userData.email || '',
                bio: expertData.bio || userData.bio || 'No bio available',
                location: expertData.location || userData.location || 'Not specified',
                occupation: expertData.specialization || userData.occupation || 'Nutrition Expert',
                isFollowing: userData.followers?.includes(currentUserId) || false,
                specialization: expertData.specialization || 'Nutrition Expert',
                rating: expertData.rating || 0,
                reviewCount: expertData.reviewCount || 0,
                certifications: expertData.certifications || []
              };
            } else {
              // User is not an expert - use regular user data
              userInfo = {
                id: userDoc.id,
                userType: 'user',
                name: userData.name || userData.displayName || 'User',
                avatar: profileImageURL || userData.profileImage || userData.photoURL || 'https://via.placeholder.com/40',
                email: userData.email || '',
                bio: userData.bio || 'No bio available',
                location: userData.location || 'Not specified',
                occupation: userData.occupation || 'Not specified',
                isFollowing: userData.followers?.includes(currentUserId) || false,
                interests: userData.interests || [],
                dietaryPreferences: userData.dietaryPreferences || [],
                goals: userData.goals || []
              };
            }
            
            // Get user media if available
            try {
              // Check both userMedia and usersMedia collections
              const mediaQuery1 = query(
                collection(db, 'userMedia'), 
                where('userId', '==', userDoc.id),
                firestoreLimit(4)
              );
              const mediaQuery2 = query(
                collection(db, 'usersMedia'), 
                where('userId', '==', userDoc.id)
              );
              
              const [mediaSnapshot1, mediaSnapshot2] = await Promise.all([
                getDocs(mediaQuery1),
                getDocs(mediaQuery2)
              ]);
              
              const mediaItems = [];
              
              // Add items from userMedia collection
              mediaSnapshot1.forEach(doc => {
                const data = doc.data();
                mediaItems.push({
                  id: doc.id,
                  url: data.url || data.imageUrl || data.mediaUrl || '',
                  description: data.description || 'User media',
                  userId: userDoc.id,
                  type: data.type || 'media'
                });
              });
              
              // Add items from usersMedia collection
              mediaSnapshot2.forEach(doc => {
                const data = doc.data();
                if (data.profileImageURL) {
                  mediaItems.push({
                    id: doc.id,
                    url: data.profileImageURL,
                    description: 'Profile Image',
                    userId: userDoc.id,
                    type: 'profile'
                  });
                }
              });
              
              userInfo.media = mediaItems;
            } catch (mediaError) {
              console.error(`Error fetching media for user ${userDoc.id}:`, mediaError);
              userInfo.media = [];
            }
            
            return userInfo;
          } catch (error) {
            console.error(`Error fetching details for user ${userDoc.id}:`, error);
            return null;
          }
        })();
        
        userPromises.push(userPromise);
      }
    });
    
    // Wait for all user info to be fetched
    const userResults = await Promise.all(userPromises);
    
    // Filter out any null results and limit to requested number
    return userResults
      .filter(user => user !== null)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    throw error;
  }
};

/**
 * Toggle follow status for a user
 * @param {string} targetUserId - ID of the user to follow/unfollow
 * @param {string} currentUserId - ID of the current user
 * @returns {Promise<boolean>} - New following status
 */
export const toggleFollowUser = async (targetUserId, currentUserId) => {
  try {
    const targetUserRef = doc(db, 'users', targetUserId);
    const currentUserRef = doc(db, 'users', currentUserId);
    
    const targetUserDoc = await getDoc(targetUserRef);
    
    if (!targetUserDoc.exists()) {
      throw new Error('Target user not found');
    }
    
    const isFollowing = targetUserDoc.data().followers?.includes(currentUserId) || false;
    
    // Update target user's followers
    await updateDoc(targetUserRef, {
      followers: isFollowing ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
    });
    
    // Update current user's following
    await updateDoc(currentUserRef, {
      following: isFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId)
    });
    
    return !isFollowing;
  } catch (error) {
    console.error('Error toggling follow status:', error);
    throw error;
  }
};

/**
 * Get trending topics based on post hashtags
 * @param {number} limit - Maximum number of topics to fetch
 * @returns {Promise<Array>} - Array of trending topics
 */
export const getTrendingTopics = async (limit = 5) => {
  try {
    // This is a simplified implementation
    // In a real app, you would analyze post content for hashtags
    // and count their occurrences to determine trending topics
    
    const topics = [
      '#HealthyEating',
      '#MealPrep',
      '#Nutrition',
      '#Wellness',
      '#FitnessFood',
      '#HealthyRecipes',
      '#MindfulEating',
      '#NutritionTips'
    ];
    
    // Shuffle array and return limited number of topics
    return topics
      .sort(() => 0.5 - Math.random())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    throw error;
  }
}; 