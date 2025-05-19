import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import expertsService from '../services/expertsService';
import './CommentSection.css';

// Default avatar for users without profile pictures
const DEFAULT_AVATAR = "https://t4.ftcdn.net/jpg/00/64/67/63/360_F_64676383_LdbmhiNM6Ypzb3FM4PPuFP9rHe7ri8Ju.jpg";

const CommentSection = ({ expertId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

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

  const handleCommentChange = (e) => {
    setNewComment(e.target.value);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setShowLoginPrompt(true);
      setMessage({ text: 'Please log in to comment', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return;
    }

    if (!newComment.trim()) {
      setMessage({ text: 'Comment cannot be empty', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return;
    }

    try {
      const response = await expertsService.addComment(
        expertId,
        currentUser.uid,
        currentUser.email.split('@')[0], // Use email username as display name
        newComment.trim()
      );
      
      setComments(response.expert.comments);
      setNewComment('');
      setMessage({ text: 'Comment added successfully', type: 'success' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to add comment', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/auth', { state: { returnPath: `/expert/${expertId}` } });
  };

  const formatDate = (timestamp) => {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Generate random avatar color based on username
  const getAvatarColor = (username) => {
    const colors = [
      '#4E3580', '#C8DA2B', '#0ca789', '#1976d2', '#f44336', 
      '#ff9800', '#9c27b0', '#3f51b5', '#009688', '#cddc39'
    ];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Get user initials for avatar
  const getInitials = (username) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length || 0})</h3>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form className="comment-form" onSubmit={handleSubmitComment}>
        {currentUser && (
          <div className="current-user">
            <div className="user-avatar" style={{ backgroundColor: getAvatarColor(currentUser.email.split('@')[0]) }}>
              {getInitials(currentUser.email.split('@')[0])}
            </div>
            <span>{currentUser.email.split('@')[0]}</span>
          </div>
        )}
        <textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={handleCommentChange}
          className="comment-input"
        />
        <button type="submit" className="comment-button">
          Post Comment
        </button>
      </form>
      
      {!currentUser && showLoginPrompt && (
        <div className="login-prompt-container">
          <p className="login-prompt">Please log in to leave a comment</p>
          <button className="login-button" onClick={handleLoginRedirect}>
            Log In Now
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="loading-comments">
          <div className="loading-spinner"></div>
          <p>Loading comments...</p>
        </div>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="comments-list">
          {comments.length > 0 ? (
            comments.sort((a, b) => {
              const dateA = a.timestamp instanceof Date ? a.timestamp : a.timestamp.toDate();
              const dateB = b.timestamp instanceof Date ? b.timestamp : b.timestamp.toDate();
              return dateB - dateA;
            }).map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-avatar" style={{ backgroundColor: getAvatarColor(comment.userName) }}>
                  {getInitials(comment.userName)}
                </div>
                <div className="comment-content">
                  <div className="comment-header">
                    <strong className="comment-author">{comment.userName}</strong>
                    <span className="comment-date">{formatDate(comment.timestamp)}</span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="no-comments">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection; 