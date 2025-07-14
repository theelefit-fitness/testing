import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, getUserType } from '../services/firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import CommunityPreview from '../components/CommunityPreview';
import './HomePage.css';

// SVG Icon Components
const QualifiedExpertsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const EasyBookingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <path d="M8 14h.01"></path>
    <path d="M12 14h.01"></path>
    <path d="M16 14h.01"></path>
    <path d="M8 18h.01"></path>
    <path d="M12 18h.01"></path>
    <path d="M16 18h.01"></path>
  </svg>
);

const FindSpecialistsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <path d="M11 8a3 3 0 0 1 0 6"></path>
  </svg>
);

const PersonalizedGuidanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    <path d="M8 10h.01"></path>
    <path d="M12 10h.01"></path>
    <path d="M16 10h.01"></path>
  </svg>
);

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Find Your Nutrition Expert</h1>
          <p>
            Connect with qualified nutrition professionals who can guide you toward your health goals with TheEleFit.
          </p>
          <Link to="/experts" className="cta-button">Find an Expert</Link>
        </div>
      </div>
      
      <div className="features-section">
        <h2>Why Choose Our Platform?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <QualifiedExpertsIcon />
            </div>
            <h3>Qualified Experts</h3>
            <p>All our nutrition experts are certified professionals with verified credentials and extensive experience.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <EasyBookingIcon />
            </div>
            <h3>Easy Booking</h3>
            <p>Book appointments at your convenience with our simple scheduling system and get instant confirmations.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <FindSpecialistsIcon />
            </div>
            <h3>Find Specialists</h3>
            <p>Search for experts based on specialties like weight management, sports nutrition, and personalized plans.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <PersonalizedGuidanceIcon />
            </div>
            <h3>Personalized Guidance</h3>
            <p>Receive customized nutrition plans tailored to your specific health needs and lifestyle preferences.</p>
          </div>
        </div>
      </div>
      
      <div className="container">
        <CommunityPreview />
      </div>
      
      <div className="expert-section">
        <div className="expert-section-content">
          <h2>Are You a Nutrition Expert?</h2>
          <p>Join our platform to connect with clients looking for your expertise and grow your practice with TheEleFit.</p>
          <Link to="/apply-as-expert" className="apply-button">
            Apply as Expert
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 