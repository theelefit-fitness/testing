import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faVideo, faSmile, faThumbsUp, faComment, faShare, faUser, faCalendarAlt, faMapMarkerAlt, faBriefcase, faTimes, faPaperPlane, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { IoIosNotifications } from "react-icons/io";
import { IoChatbubbleEllipsesSharp } from "react-icons/io5";
import { FaUserFriends } from "react-icons/fa";
import { 
  createPost, 
  getPosts, 
  toggleLikePost, 
  addComment, 
  getSuggestedUsers, 
  toggleFollowUser,
  getTrendingTopics
} from '../services/communityService';
import { getProfileImageURL } from '../services/storageService';
import { optimizeImage, processVideo } from '../utils/mediaOptimizer';
import './CommunityPage.css';

const CommunityPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followingStatus, setFollowingStatus] = useState({});
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userMedia, setUserMedia] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [postCount, setPostCount] = useState(0);
  const videoRefs = useRef({});

  // Fetch current user and their profile data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          // First check if user is an expert
          const expertRef = doc(db, 'experts', user.uid);
          const expertDoc = await getDoc(expertRef);
          
          if (expertDoc.exists()) {
            // User is an expert - fetch data from both experts and users collections
            const expertData = expertDoc.data();
            
            // Also get user data
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            let userData = {};
            
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
            
            // Check for profile image in usersMedia collection
            let profileImageURL = null;
            try {
              profileImageURL = await getProfileImageURL(user.uid);
            } catch (imageError) {
              console.error('Error fetching profile image:', imageError);
            }
            
            // Combine data with expert data taking precedence
            const detailedProfile = {
              ...userData,
              ...expertData,
              userType: 'expert',
              displayName: expertData.name || userData.displayName || userData.name || user.displayName || 'Expert User',
              photoURL: profileImageURL || expertData.profileImage || userData.profileImage || userData.photoURL || user.photoURL || 'https://via.placeholder.com/150',
              email: userData.email || user.email || '',
              bio: expertData.bio || userData.bio || 'No bio available',
              location: expertData.location || userData.location || 'Not specified',
              occupation: expertData.specialization || userData.occupation || 'Nutrition Expert',
              joinDate: userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : 'Unknown',
              followers: userData.followers || [],
              following: userData.following || [],
              posts: userData.posts || [],
              specialization: expertData.specialization || 'Nutrition Expert',
              rating: expertData.rating || 0,
              reviewCount: expertData.reviewCount || 0,
              certifications: expertData.certifications || []
            };
            
            setUserProfile(detailedProfile);
          } else {
            // User is not an expert - fetch data from users collection only
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            // Check for profile image in usersMedia collection
            let profileImageURL = null;
            try {
              profileImageURL = await getProfileImageURL(user.uid);
            } catch (imageError) {
              console.error('Error fetching profile image:', imageError);
            }
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // For regular users, prioritize getting the actual name from multiple sources
              const userName = 
                userData.name || 
                userData.displayName || 
                userData.fullName || 
                user.displayName || 
                (user.email ? user.email.split('@')[0] : 'User');
              
              const detailedProfile = {
                ...userData,
                userType: 'user',
                displayName: userName,
                photoURL: profileImageURL || userData.profileImage || userData.photoURL || user.photoURL || 'https://via.placeholder.com/150',
                email: userData.email || user.email || '',
                bio: userData.bio || 'No bio available',
                location: userData.location || 'Not specified',
                occupation: userData.occupation || 'Not specified',
                joinDate: userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : 'Unknown',
                followers: userData.followers || [],
                following: userData.following || [],
                posts: userData.posts || [],
                interests: userData.interests || [],
                dietaryPreferences: userData.dietaryPreferences || [],
                goals: userData.goals || []
              };
              
              setUserProfile(detailedProfile);
            } else {
              // User document doesn't exist in either collection
              console.error('User document does not exist in Firestore');
              
              // Check for profile image in usersMedia collection even if user doc doesn't exist
              let profileImageURL = null;
              try {
                profileImageURL = await getProfileImageURL(user.uid);
              } catch (imageError) {
                console.error('Error fetching profile image:', imageError);
              }
              
              // Create a profile using auth data
              const userName = 
                user.displayName || 
                (user.email ? user.email.split('@')[0] : 'Anonymous User');
              
              setUserProfile({
                displayName: userName,
                email: user.email || '',
                photoURL: profileImageURL || user.photoURL || 'https://via.placeholder.com/150',
                joinDate: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown',
                location: 'Not specified',
                bio: 'No bio available',
                occupation: 'Not specified',
                followers: [],
                following: [],
                posts: []
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user profile data:', error);
          // Create minimal profile as fallback using auth data
          const userName = 
            user.displayName || 
            (user.email ? user.email.split('@')[0] : 'Anonymous User');
          
          // Try to get profile image even in error case
          let profileImageURL = null;
          try {
            profileImageURL = await getProfileImageURL(user.uid);
          } catch (imageError) {
            console.error('Error fetching profile image:', imageError);
          }
          
          setUserProfile({
            displayName: userName,
            email: user.email || '',
            photoURL: profileImageURL || user.photoURL || 'https://via.placeholder.com/150',
            joinDate: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown',
            location: 'Not specified',
            bio: 'No bio available',
            occupation: 'Not specified',
            followers: [],
            following: [],
            posts: []
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Fetch user media
  useEffect(() => {
    const fetchUserMedia = async () => {
      if (!currentUser || !userProfile) return;
      
      try {
        // Check both userMedia and usersMedia collections
        const mediaQuery1 = query(
          collection(db, 'userMedia'), 
          where('userId', '==', currentUser.uid)
        );
        const mediaQuery2 = query(
          collection(db, 'usersMedia'), 
          where('userId', '==', currentUser.uid)
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
            userId: currentUser.uid,
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
              userId: currentUser.uid,
              type: 'profile'
            });
          }
        });
        
        // If we have the profile image in userProfile, add it as well if not already in mediaItems
        if (userProfile?.photoURL && !userProfile.photoURL.includes('placeholder') && 
            !mediaItems.some(item => item.url === userProfile.photoURL)) {
          mediaItems.push({
            id: 'profile-image',
            url: userProfile.photoURL,
            description: 'Profile Image',
            userId: currentUser.uid,
            type: 'profile'
          });
        }
        
        setUserMedia(mediaItems);
      } catch (mediaError) {
        console.error('Error fetching user media:', mediaError);
      }
    };
    
    fetchUserMedia();
  }, [currentUser, userProfile]);

  // Fetch posts, suggested users, and trending topics
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        // Fetch posts
        const postsData = await getPosts(currentUser.uid);
        setPosts(postsData);
        
        // Fetch suggested users
        const usersData = await getSuggestedUsers(currentUser.uid, 3);
        setSuggestedUsers(usersData);
        
        // Update following status
        const followingData = {};
        usersData.forEach(user => {
          followingData[user.id] = user.isFollowing;
        });
        setFollowingStatus(followingData);
        
        // Fetch trending topics
        const topics = await getTrendingTopics(5);
        setTrendingTopics(topics);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [currentUser]);

  // Update post count when posts change
  useEffect(() => {
    if (currentUser?.uid) {
      const userPosts = posts.filter(post => post.userId === currentUser.uid);
      setPostCount(userPosts.length);
      
      // Update user profile with new post count
      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          posts: userPosts
        };
        setUserProfile(updatedProfile);
      }
    }
  }, [posts, currentUser]);

  // Handle media upload
  const handleMediaUpload = async (e, type = 'image') => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      
      const isImage = validImageTypes.includes(file.type);
      const isVideo = validVideoTypes.includes(file.type);

      if (type === 'image' && !isImage) {
        setUploadError('Please upload a valid image file (JPEG, PNG, GIF, WEBP)');
        return;
      }

      if (type === 'video' && !isVideo) {
        setUploadError('Please upload a valid video file (MP4, WEBM, MOV)');
        return;
      }

      // Validate file size
      const maxImageSize = 10 * 1024 * 1024; // 10MB
      const maxVideoSize = 100 * 1024 * 1024; // 100MB
      
      if (isImage && file.size > maxImageSize) {
        setUploadError('Image file size must be less than 10MB');
        return;
      }
      
      if (isVideo && file.size > maxVideoSize) {
        setUploadError('Video file size must be less than 100MB');
        return;
      }

      let processedFile = file;
      let previewUrl = null;

      if (isImage) {
        // Optimize image
        processedFile = await optimizeImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(processedFile);
      } else if (isVideo) {
        // Process video and generate thumbnail
        const { file: videoFile, thumbnail } = await processVideo(file);
        processedFile = videoFile;
        previewUrl = URL.createObjectURL(videoFile);
        setImagePreview(previewUrl);
      }

      setPostImage(processedFile);
      setUploadProgress(100);
    } catch (error) {
      console.error('Error processing media:', error);
      setUploadError(error.message || 'Error processing media file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle post submission
  const handleSubmitPost = async (e) => {
    e.preventDefault();
    
    if (!postContent.trim() && !postImage) return;
    if (!currentUser || !userProfile) return;
    
    setSubmitting(true);
    setIsPosting(true);
    setUploadError(null);
    
    try {
      const postData = {
        content: postContent,
        userId: currentUser.uid,
        userName: userProfile.displayName || 'Anonymous',
        userAvatar: userProfile.photoURL || 'https://via.placeholder.com/40',
        userType: userProfile.userType || 'user',
        email: currentUser.email,
        mediaType: postImage ? (postImage.type.startsWith('image/') ? 'image' : 'video') : null
      };

      // Create the actual post first
      const createdPost = await createPost(postData, postImage);
      
      // Update posts state with the new post
      setPosts(prevPosts => [createdPost, ...prevPosts]);
      
      // Reset form
      setPostContent('');
      setPostImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      
      // Refresh all posts to ensure consistency
      const updatedPosts = await getPosts(currentUser.uid);
      setPosts(updatedPosts);
      
    } catch (error) {
      console.error('Error creating post:', error);
      setUploadError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
      setIsPosting(false);
    }
  };

  // Handle like/unlike post
  const handleLikePost = async (postId) => {
    if (!currentUser) return;
    
    try {
      // Optimistically update UI
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId ? {
          ...post,
          likes: post.likes?.includes(currentUser.uid)
            ? post.likes.filter(id => id !== currentUser.uid)
            : [...(post.likes || []), currentUser.uid],
          liked: !post.liked
        } : post
      ));
      
      // Make API call
      const updatedPost = await toggleLikePost(postId, currentUser.uid);
      
      // Update with server response (in case of conflicts)
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId ? { ...post, likes: updatedPost.likes, liked: updatedPost.liked } : post
      ));
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert optimistic update on error
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === postId ? {
          ...post,
          likes: post.likes?.includes(currentUser.uid)
            ? post.likes.filter(id => id !== currentUser.uid)
            : [...(post.likes || []), currentUser.uid],
          liked: !post.liked
        } : post
      ));
    }
  };

  // Handle video click
  const handleVideoClick = (postId) => {
    const video = videoRefs.current[postId];
    if (!video) return;

    if (video.paused) {
      // Pause all other videos
      Object.values(videoRefs.current).forEach(v => {
        if (v !== video && !v.paused) {
          v.pause();
        }
      });
      video.play();
      setPlayingVideo(postId);
    } else {
      video.pause();
      setPlayingVideo(null);
    }
  };

  // Format video duration
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render post media
  const renderPostMedia = (post) => {
    if (!post.mediaUrl) return null;

    return (
      <div className="post-media">
        {post.mediaType === 'video' ? (
          <>
            <video 
              ref={el => videoRefs.current[post.id] = el}
              src={post.mediaUrl} 
              preload="metadata"
              poster={post.thumbnail}
              className="post-media-content"
              onClick={() => handleVideoClick(post.id)}
              onLoadedMetadata={(e) => {
                const video = e.target;
                if (video.duration === Infinity) {
                  video.currentTime = 1e101;
                  setTimeout(() => {
                    video.currentTime = 0;
                  }, 1000);
                }
              }}
            >
              Your browser does not support the video tag.
            </video>
            <div className="video-overlay" onClick={() => handleVideoClick(post.id)}>
              <div className="play-pause-icon">
                <FontAwesomeIcon icon={playingVideo === post.id ? faPause : faPlay} />
              </div>
            </div>
            {videoRefs.current[post.id] && (
              <div className="video-duration">
                {formatDuration(videoRefs.current[post.id].duration)}
              </div>
            )}
          </>
        ) : (
          <img 
            src={post.mediaUrl} 
            alt="Post content" 
            className="post-media-content"
            loading="lazy"
          />
        )}
        {post.status === 'uploading' && (
          <div className="media-upload-overlay">
            <LoadingSpinner text="Uploading media..." />
          </div>
        )}
      </div>
    );
  };

  // Handle comment submission
  const handleSubmitComment = async (postId) => {
    if (!newComment.trim() || !currentUser || !userProfile) return;
    
    try {
      const commentData = {
        content: newComment,
        userId: currentUser.uid,
        userName: userProfile.displayName || 'Anonymous',
        userAvatar: userProfile.photoURL || 'https://via.placeholder.com/40',
        userType: userProfile.userType || 'user',
        createdAt: new Date(),
        replies: []
      };
      
      // Optimistic update
      setPosts(posts.map(post => 
        post.id === postId ? {
          ...post,
          comments: [commentData, ...(post.comments || [])]
        } : post
      ));
      
      const updatedPost = await addComment(postId, commentData);
      
      // Update with server response
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, comments: updatedPost.comments } : post
      ));
      
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Handle reply submission
  const handleSubmitReply = async (postId, commentId) => {
    if (!replyText.trim() || !currentUser || !userProfile) return;
    
    try {
      const replyData = {
        content: replyText,
        userId: currentUser.uid,
        userName: userProfile.displayName || 'Anonymous',
        userAvatar: userProfile.photoURL || 'https://via.placeholder.com/40',
        userType: userProfile.userType || 'user',
        createdAt: new Date()
      };
      
      // Optimistic update
      setPosts(posts.map(post => 
        post.id === postId ? {
          ...post,
          comments: post.comments.map(comment =>
            comment.id === commentId ? {
              ...comment,
              replies: [...(comment.replies || []), replyData]
            } : comment
          )
        } : post
      ));
      
      // TODO: Implement server-side reply functionality
      // const updatedPost = await addReply(postId, commentId, replyData);
      
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  // Handle follow/unfollow user
  const handleFollowUser = async (userId) => {
    if (!currentUser) return;
    
    try {
      const newFollowingStatus = await toggleFollowUser(userId, currentUser.uid);
      
      // Update local state
      setFollowingStatus({
        ...followingStatus,
        [userId]: newFollowingStatus
      });
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return <LoadingSpinner text="Loading community..." />;
  }

  return (
   <div>
    
    <div className="community-page">
      
        
     
      {/* Left Sidebar - User Profile */}
      <div className="left-sidebar user-profile-sidebar">
        <div className="profile-header">
          <div className="profile-cover"></div>
          <div className="profile-avatar-container">
            <img 
              src={userProfile?.photoURL || 'https://via.placeholder.com/150'} 
              alt="Profile" 
              className="profile-avatar" 
            />
          </div>
          <div className="profile-name-container">
            <h2 className="profile-name">{userProfile?.displayName}</h2>
            {userProfile?.userType === 'expert' && (
              <span className="user-badge expert-badge profile-badge">Expert</span>
            )}
          </div>
          <p className="profile-email">{userProfile?.email}</p>
        </div>
        
        <div className="profile-details">
          <div className="profile-detail-item">
            <FontAwesomeIcon icon={faCalendarAlt} className="profile-icon" />
            <span>Joined: {userProfile?.joinDate}</span>
          </div>
          <div className="profile-detail-item">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="profile-icon" />
            <span>Location: {userProfile?.location}</span>
          </div>
          <div className="profile-detail-item">
            <FontAwesomeIcon icon={faBriefcase} className="profile-icon" />
            <span>Occupation: {userProfile?.occupation}</span>
          </div>
        </div>
        
        <div className="profile-bio">
          <h3>About</h3>
          <p>{userProfile?.bio}</p>
        </div>
        
        {/* User-specific information */}
        {userProfile?.userType !== 'expert' && (
          <>
            {userProfile?.interests?.length > 0 && (
              <div className="profile-interests">
                <h3>Interests</h3>
                <div className="interests-tags">
                  {userProfile.interests.map((interest, index) => (
                    <span key={index} className="interest-tag">{interest}</span>
                  ))}
                </div>
              </div>
            )}
            
            {userProfile?.dietaryPreferences?.length > 0 && (
              <div className="profile-dietary">
                <h3>Dietary Preferences</h3>
                <div className="dietary-tags">
                  {userProfile.dietaryPreferences.map((pref, index) => (
                    <span key={index} className="dietary-tag">{pref}</span>
                  ))}
                </div>
              </div>
            )}
            
            {userProfile?.goals?.length > 0 && (
              <div className="profile-goals">
                <h3>Goals</h3>
                <ul className="goals-list">
                  {userProfile.goals.map((goal, index) => (
                    <li key={index} className="goal-item">{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        
        {/* Expert-specific information */}
        {userProfile?.userType === 'expert' && userProfile?.specialization && (
          <div className="profile-specialization">
            <h3>Specialization</h3>
            <p>{userProfile.specialization}</p>
          </div>
        )}
        
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{postCount}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{userProfile?.following?.length || 0}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{userProfile?.followers?.length || 0}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
        
      
      </div>

      {/* Main Feed */}
      <div className="main-feed">
        {/* Post Composer */}
        <div className="post-composer">
          <div className="composer-header">
            <img 
              src={userProfile?.photoURL || 'https://via.placeholder.com/48'} 
              alt="Your avatar" 
              className="user-avatar" 
            />
            <textarea
              className="composer-input"
              placeholder="Share your nutrition journey, healthy recipes, or wellness tips..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
          </div>
          
          {imagePreview && (
            <div className="media-preview">
              {postImage?.type.startsWith('image/') ? (
                <img src={imagePreview} alt="Post preview" className="post-media-preview" />
              ) : (
                <video src={imagePreview} controls className="post-media-preview">
                  Your browser does not support the video tag.
                </video>
              )}
              <button 
                className="remove-media-btn"
                onClick={() => {
                  setPostImage(null);
                  setImagePreview(null);
                  setUploadProgress(0);
                  if (imagePreview.startsWith('blob:')) {
                    URL.revokeObjectURL(imagePreview);
                  }
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="upload-progress">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
          
          {uploadError && (
            <div className="upload-error">
              {uploadError}
            </div>
          )}

          {isProcessing && (
            <div className="processing-overlay">
              <LoadingSpinner text="Processing media..." />
            </div>
          )}
          
          <div className="composer-actions">
            <div className="media-upload-buttons">
              <label htmlFor="image-upload" className="media-button">
                <FontAwesomeIcon icon={faImage} />
                <span>Image</span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => handleMediaUpload(e, 'image')}
                  style={{ display: 'none' }}
                />
              </label>
              <label htmlFor="video-upload" className="media-button">
                <FontAwesomeIcon icon={faVideo} />
                <span>Video</span>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => handleMediaUpload(e, 'video')}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <button 
              className={`post-button ${isPosting ? 'posting' : ''}`}
              onClick={handleSubmitPost}
              disabled={submitting || (!postContent.trim() && !postImage) || isPosting}
            >
              {isPosting ? '' : 'Post'}
            </button>
          </div>
        </div>

        {/* Posts */}
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="post">
              <div className="post-header">
                <div className="post-user">
                  <img src={post.userAvatar} alt={post.userName} className="post-avatar" />
                  <div className="post-user-info">
                    <div className="post-username-container">
                      <span className="post-username">{post.userName}</span>
                      {post.userType === 'expert' && (
                        <span className="user-badge expert-badge">Expert</span>
                      )}
                    </div>
                    <span className="post-time">{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              {/* Post content */}
              <div className="post-content">
                <p>{post.content}</p>
                {renderPostMedia(post)}
              </div>
              
              <div className="post-actions">
                <div 
                  className={`post-action ${post.liked ? 'liked' : ''}`}
                  onClick={() => handleLikePost(post.id)}
                >
                  <FontAwesomeIcon icon={faThumbsUp} />
                  <span>{post.likes?.length || 0}</span>
                </div>
                <div 
                  className="post-action"
                  onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
                >
                  <FontAwesomeIcon icon={faComment} />
                  <span>{post.comments?.length || 0}</span>
                </div>
                <div className="post-action">
                  <FontAwesomeIcon icon={faShare} />
                  <span>Share</span>
                </div>
              </div>
              
              {/* Comments Section */}
              <div className={`post-comments ${activeCommentId === post.id ? 'active' : ''}`}>
                {/* Comment Input */}
                <div className="comment-form">
                  <img 
                    src={userProfile?.photoURL || 'https://via.placeholder.com/32'} 
                    alt="Your avatar" 
                    className="comment-avatar" 
                  />
                  <input
                    type="text"
                    className="comment-input"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmitComment(post.id);
                      }
                    }}
                  />
                  <button 
                    className="send-comment-btn"
                    onClick={() => handleSubmitComment(post.id)}
                    disabled={!newComment.trim()}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </div>

                {/* Comments List */}
                {post.comments?.sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                  return dateB - dateA;
                }).map((comment, index) => (
                  <div key={index} className="comment">
                    <img src={comment.userAvatar} alt={comment.userName} className="comment-avatar" />
                    <div className="comment-content">
                      <div className="comment-user-container">
                        <div className="comment-user">{comment.userName}</div>
                        {comment.userType === 'expert' && (
                          <span className="user-badge expert-badge small">Expert</span>
                        )}
                      </div>
                      <div className="comment-text">{comment.content}</div>
                      <div className="comment-meta">
                        <span className="comment-time">{formatDate(comment.createdAt)}</span>
                        <button 
                          className="reply-button"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies */}
                      {comment.replies?.length > 0 && (
                        <div className="comment-replies">
                          {comment.replies.map((reply, replyIndex) => (
                            <div key={replyIndex} className="comment">
                              <img src={reply.userAvatar} alt={reply.userName} className="comment-avatar" />
                              <div className="comment-content">
                                <div className="comment-user-container">
                                  <div className="comment-user">{reply.userName}</div>
                                  {reply.userType === 'expert' && (
                                    <span className="user-badge expert-badge small">Expert</span>
                                  )}
                                </div>
                                <div className="comment-text">{reply.content}</div>
                                <div className="comment-meta">
                                  <span className="comment-time">{formatDate(reply.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="reply-form">
                          <img 
                            src={userProfile?.photoURL || 'https://via.placeholder.com/32'} 
                            alt="Your avatar" 
                            className="comment-avatar" 
                          />
                          <input
                            type="text"
                            className="reply-input"
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSubmitReply(post.id, comment.id);
                              }
                            }}
                          />
                          <button 
                            className="send-reply-btn"
                            onClick={() => handleSubmitReply(post.id, comment.id)}
                            disabled={!replyText.trim()}
                          >
                            <FontAwesomeIcon icon={faPaperPlane} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-posts">
            <p>No posts yet. Be the first to share something!</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Suggested Follows and Trending Topics */}
      <div className="right-sidebar">
        
        <div className="sidebar-section">
          <h3 className="sidebar-title">Suggested Follows</h3>
          <div className="suggested-follows">
            {suggestedUsers.map((user) => (
              <div key={user.id} className="follow-item">
                <div className="follow-user">
                  <img src={user.avatar} alt={user.name} className="follow-avatar" />
                  <div className="follow-user-info">
                    <span className="follow-name">{user.name}</span>
                    <span className="follow-occupation">{user.occupation}</span>
                    {user.userType === 'expert' && user.rating > 0 && (
                      <div className="follow-rating">
                        <span className="stars">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < Math.round(user.rating) ? 'star filled' : 'star'}>★</span>
                          ))}
                        </span>
                        <span className="review-count">({user.reviewCount})</span>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  className={`follow-button ${followingStatus[user.id] ? 'following-button' : ''}`}
                  onClick={() => handleFollowUser(user.id)}
                >
                  {followingStatus[user.id] ? 'Following' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="sidebar-section">
          <h3 className="sidebar-title">Trending Topics</h3>
          <div className="trending-topics">
            {trendingTopics.map((topic, index) => (
              <a key={index} href="#" className="topic-tag">
                {topic}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
   </div>
  );
};

export default CommunityPage; 