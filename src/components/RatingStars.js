import React, { useState, useEffect } from 'react';
import './RatingStars.css';

const RatingStars = ({ initialRating = 0, onRatingChange, readOnly = false }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  // Update rating if initialRating prop changes
  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleClick = (value) => {
    if (readOnly) return;
    
    setRating(value);
    if (onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className={`rating-stars ${readOnly ? 'readonly' : 'interactive'}`}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <span
            key={index}
            className={`star ${(hover || rating) >= starValue ? 'filled' : ''} ${readOnly ? 'readonly' : ''}`}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => !readOnly && setHover(starValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
            title={readOnly ? `${rating} out of 5` : `Rate ${starValue} out of 5`}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

export default RatingStars; 