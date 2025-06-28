import React from 'react';
import './LikesStatistics.css';

const LikesStatistics = ({ comments }) => {
  // Calculate total likes
  const totalLikes = comments?.reduce((total, comment) => total + (comment.likesCount || 0), 0) || 0;

  // Get most liked comments
  const sortedComments = [...(comments || [])].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  const topComments = sortedComments.slice(0, 5); // Get top 5 most liked comments

  return (
    <div className="likes-statistics">
      <h3>Likes Statistics</h3>
      <div className="stats-summary">
        <div className="total-likes">
          <span className="likes-count">{totalLikes}</span>
          <span className="likes-label">Total Likes</span>
        </div>
      </div>

      {topComments.length > 0 && (
        <div className="top-comments">
          <h4>Most Liked Comments</h4>
          {topComments.map((comment, index) => (
            <div key={comment.id} className="top-comment-item">
              <div className="comment-rank">{index + 1}</div>
              <div className="comment-details">
                <p className="comment-text">{comment.text}</p>
                <div className="comment-meta">
                  <span className="comment-author">{comment.userName}</span>
                  <span className="likes-info">
                    <i className="fas fa-heart"></i>
                    {comment.likesCount || 0} likes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikesStatistics; 