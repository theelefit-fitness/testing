import React from 'react';
import ExpertRegistrationForm from '../components/ExpertRegistrationForm';
import './RegistrationPage.css';

const RegistrationPage = () => {
  return (
    <div className="registration-page">
      <div className="registration-header">
        <h1>Register as a Nutrition Expert</h1>
        <p>Join our platform to connect with clients seeking nutrition guidance and grow your practice</p>
      </div>
      
      <div className="registration-content">
        <div className="benefits-section">
          <h2>Benefits of Joining</h2>
          <ul className="benefits-list">
            <li>
              <div className="benefit-icon">📊</div>
              <div className="benefit-text">
                <h3>Expand Your Reach</h3>
                <p>Connect with new clients from around the world.</p>
              </div>
            </li>
            <li>
              <div className="benefit-icon">📱</div>
              <div className="benefit-text">
                <h3>Easy Scheduling</h3>
                <p>Our platform handles appointment bookings automatically.</p>
              </div>
            </li>
            <li>
              <div className="benefit-icon">💰</div>
              <div className="benefit-text">
                <h3>Grow Your Business</h3>
                <p>Increase your client base and boost your income.</p>
              </div>
            </li>
            <li>
              <div className="benefit-icon">⭐</div>
              <div className="benefit-text">
                <h3>Build Your Reputation</h3>
                <p>Collect client reviews to enhance your professional profile.</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="form-section">
          <ExpertRegistrationForm />
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage; 