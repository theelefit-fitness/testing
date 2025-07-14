import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-circle"></div>
        <div className="spinner-circle-inner"></div>
      </div>
      <p className="loading-text">{text}</p>
    </div>
  );
};

export default LoadingSpinner; 