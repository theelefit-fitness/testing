import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './ExpertApplicationForm.css';

const ExpertApplicationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    experience: '',
    education: '',
    qualifications: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Store the application in Firestore
      const expertApplicationsRef = collection(db, 'expertApplications');
      await addDoc(expertApplicationsRef, {
        ...formData,
        status: 'pending',
        createdAt: new Date()
      });

      setSuccess(true);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        experience: '',
        education: '',
        qualifications: '',
        bio: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      setError(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>Application Submitted Successfully!</h2>
          <p>Thank you for your interest in becoming an expert on our platform. Your application has been received and is under review by our team.</p>
          <p>You will receive an email notification once your application has been processed.</p>
          <button onClick={() => navigate('/')} className="home-button">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="expert-application-page">
      <div className="expert-application-container">
        <div className="hero-section">
          <div className="hero-content">
            <h1>Join Our Expert Team</h1>
            <p className="hero-subtitle">Share your expertise and help people achieve their nutrition and fitness goals</p>
            
            <div className="benefits-grid">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="benefit-content">
                  <h3>Growing Community</h3>
                  <p>Connect with clients seeking expert guidance</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-laptop"></i>
                </div>
                <div className="benefit-content">
                  <h3>Flexible Schedule</h3>
                  <p>Work on your own terms and manage your time</p>
                </div>
              </div>
              
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="benefit-content">
                  <h3>Grow Your Practice</h3>
                  <p>Expand your reach and build your brand</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-container">
            <h2>Apply to Become an Expert</h2>
            <p className="form-intro">
              Join our platform as a nutrition expert and help clients achieve their health goals. 
              Please complete the form below to apply.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address <span className="required">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number <span className="required">*</span></label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="specialty">Specialty/Area of Expertise <span className="required">*</span></label>
                <input
                  type="text"
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Sports Nutrition, Weight Management"
                />
              </div>

              <div className="form-group">
                <label htmlFor="experience">Years of Experience <span className="required">*</span></label>
                <input
                  type="text"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  placeholder="Enter years of professional experience"
                />
              </div>

              <div className="form-group">
                <label htmlFor="education">Education <span className="required">*</span></label>
                <input
                  type="text"
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  required
                  placeholder="Enter your highest degree and institution"
                />
              </div>

              <div className="form-group">
                <label htmlFor="qualifications">Certifications/Qualifications <span className="required">*</span></label>
                <input
                  type="text"
                  id="qualifications"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  required
                  placeholder="List relevant certifications"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Professional Bio <span className="required">*</span></label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={5}
                  required
                  placeholder="Tell us about yourself and your approach to nutrition and wellness"
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertApplicationForm; 