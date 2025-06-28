import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import RatingStars from './RatingStars';
import useProfileImage from '../hooks/useProfileImage';
import './ExpertCard.css';

const ExpertCard = ({ expert }) => {
  const { id, name, specialty, experience, profileImageURL, rating } = expert;
  const [isHovered, setIsHovered] = useState(false);
  const commentCount = expert.commentCount || 0;
  
  // Use our custom hook to handle the profile image
  const { imageUrl, isLoading, isDefault } = useProfileImage(id, profileImageURL);

  return (
    <div 
      className="expert-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="expert-card-image">
        {isLoading ? (
          <div className="image-placeholder">Loading...</div>
        ) : (
          <img 
            src={imageUrl} 
            alt={name}
            className={isDefault ? "default-image" : ""}
          />
        )}
      </div>
      <div className="expert-card-content">
        <h3 className="expert-name">{name}</h3>
        <p className="expert-specialty">{specialty}</p>
        <p className="expert-experience">{experience} Experience</p>
        <div className="expert-rating">
          <span>Rating: {rating || 'New'}</span>
          <RatingStars 
            initialRating={Math.round(rating || 0)} 
            readOnly={true} 
          />
          <span className="rating-count">
            ({expert.ratings ? expert.ratings.length : 0})
          </span>
        </div>
        <div className="expert-comments">
          <span>Comments: {commentCount}</span>
        </div>
        <Link to={`/expert/${id}`} className="details-button">
          {isHovered ? 'Rate, Comment & View Details' : 'View Details'}
        </Link>
      </div>
    </div>
  );
};

export default ExpertCard; 