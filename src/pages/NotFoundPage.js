import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-animation">
          <div className="number">4</div>
          <div className="circle">
            <div className="circle-inner"></div>
          </div>
          <div className="number">4</div>
        </div>
        <h1>Page Not Found</h1>
        <p>Oops! The page you're looking for doesn't exist.</p>
        <div className="not-found-actions">
          <Link to="/" className="home-button">Go to Home</Link>
          <Link to="/experts" className="experts-button">Browse Experts</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 