import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import expertsService from '../services/expertsService';
import './CommentSection.css';
import { formatDistanceToNow, format, differenceInMinutes, differenceInHours, isYesterday } from 'date-fns';

// Default avatar for users without profile pictures
const DEFAULT_AVATAR = "https://t4.ftcdn.net/jpg/00/64/67/63/360_F_64676383_LdbmhiNM6Ypzb3FM4PPuFP9rHe7ri8Ju.jpg";

const COMMENTS_TO_SHOW = 3; // Number of comments to show initially

const CommentSection = ({ expertId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showAllComments, setShowAllComments] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [expertId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const commentsData = await expertsService.getExpertComments(expertId);
      setComments(commentsData);
      setError('');
    } catch (error) {
      setError('Failed to load comments');
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!currentUser) {
      setShowLoginPrompt(true);
      return;
    }

    if (!newComment.trim()) return;

    try {
      setIsPosting(true);
      const response = await expertsService.addComment(
        expertId,
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        newComment.trim()
      );

      if (response.success) {
        setComments(response.expert.comments);
        setNewComment('');
        setMessage({ text: 'Comment posted successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      setMessage({ text: 'Failed to post comment', type: 'error' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!currentUser) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const response = await expertsService.likeComment(expertId, commentId, currentUser.uid);
      if (response.success) {
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? {
                  ...comment,
                  likes: response.liked 
                    ? [...(comment.likes || []), currentUser.uid]
                    : (comment.likes || []).filter(id => id !== currentUser.uid),
                  likesCount: response.likesCount
                }
              : comment
          )
        );
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      setMessage({ text: 'Failed to like comment', type: 'error' });
    }
  };

  const getAvatarColor = (username) => {
    if (!username) return '#0ca789';
    const colors = [
      '#4E3580', '#C8DA2B', '#0ca789', '#1976d2', '#f44336', 
      '#ff9800', '#9c27b0', '#3f51b5', '#009688', '#cddc39'
    ];
    const hash = username.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = (user) => {
    if (!user) return 'Anonymous';
    return user.displayName || (user.email ? user.email.split('@')[0] : 'Anonymous');
  };

  const handlePostReply = (commentId) => {
    if (!replyText.trim()) return;
    if (!currentUser) {
      setShowLoginPrompt(true);
      setMessage({ text: 'Please log in to reply', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return;
    }

    const newReply = {
      id: Date.now(),
      author: currentUser.displayName || currentUser.email.split('@')[0],
      text: replyText,
      date: new Date(),
      likes: 0,
      liked: false
    };

    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      return comment;
    }));

    setReplyingTo(null);
    setReplyText('');
  };

  const toggleLike = (commentId, isReply = false, parentId = null) => {
    if (!currentUser) {
      setShowLoginPrompt(true);
      setMessage({ text: 'Please log in to like comments', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return;
    }

    setComments(prev => prev.map(comment => {
      if (isReply && parentId === comment.id) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id === commentId) {
              const currentLikes = parseInt(reply.likes) || 0;
              return {
                ...reply,
                likes: reply.liked ? currentLikes - 1 : currentLikes + 1,
                liked: !reply.liked
              };
            }
            return reply;
          })
        };
      }
      if (!isReply && comment.id === commentId) {
        const currentLikes = parseInt(comment.likes) || 0;
        return {
          ...comment,
          likes: comment.liked ? currentLikes - 1 : currentLikes + 1,
          liked: !comment.liked
        };
      }
      return comment;
    }));
  };

  const handleLoginRedirect = () => {
    navigate('/auth', { state: { returnPath: `/expert/${expertId}` } });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Invalid date';
    try {
      // Handle both Firestore Timestamp and regular Date objects
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      const now = new Date();
      const minutesDiff = differenceInMinutes(now, date);
      const hoursDiff = differenceInHours(now, date);

      // If less than 1 hour old
      if (minutesDiff < 60) {
        return `${minutesDiff} min ago`;
      }
      
      // If less than 24 hours old
      if (hoursDiff < 24) {
        return `${hoursDiff} hr ago`;
      }
      
      // For older dates, show DD/MM/YY HH:MM format
      return format(date, 'dd/MM/yy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Sort comments by most recent first
  const sortedComments = [...comments].sort((a, b) => {
    const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return dateB - dateA;
  });

  // For mobile, always show COMMENTS_TO_SHOW initially
  const visibleComments = showAllComments ? 
    sortedComments : 
    sortedComments.slice(0, COMMENTS_TO_SHOW);

  // Show load more button if there are more comments than initial display
  const hasMoreComments = sortedComments.length > COMMENTS_TO_SHOW;

  if (loading) {
    return <div className="loading">Loading comments...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length})</h3>
      
      <div className="comment-input-section">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write your comment..."
          className="comment-input"
        />
        <button 
          onClick={handlePostComment}
          disabled={isPosting || !newComment.trim()}
          className="post-comment-btn"
        >
          {isPosting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>

      <div className="comments-list">
        {visibleComments.map((comment) => (
          <div key={comment.id} className="comment-item">
            <div className="comment-avatar">
              {comment.userName ? comment.userName[0].toUpperCase() : 'U'}
            </div>
            <div className="comment-content">
              <div className="comment-header">
                <span className="comment-author">{comment.userName}</span>
                <span className="comment-date">
                  {formatDate(comment.timestamp)}
                </span>
              </div>
              <p className="comment-text">{comment.text}</p>
              <div className="comment-actions">
                <button 
                  className={`comment-action ${comment.likes?.includes(currentUser?.uid) ? 'liked' : ''}`}
                  onClick={() => handleLikeComment(comment.id)}
                >
                  <i className="fas fa-heart"></i>
                  <span>{comment.likesCount || 0}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {hasMoreComments && (
         <div className="show-more-btn-container">
           <button 
            className="show-more-btn"
            onClick={() => setShowAllComments(!showAllComments)}
          >
            {showAllComments ? 'Show Less' : `Show More Comments (${sortedComments.length - COMMENTS_TO_SHOW})`}
          </button>
          </div>
        )}
      </div>

      {showLoginPrompt && (
        <div className="login-prompt">
          <p>Please log in to interact with comments</p>
          <button onClick={handleLoginRedirect} className="login-btn">
            Log In
          </button>
        </div>
      )}

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default CommentSection;