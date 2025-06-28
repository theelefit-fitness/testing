import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExpertRegistrationForm.css';
import expertsService from '../services/expertsService';

const ExpertRegistrationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    experience: '',
    qualifications: '',
    bio: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await expertsService.registerExpert(formData);
      setMessage({ text: response.message, type: 'success' });
      
      // Clear form
      setFormData({
        name: '',
        specialty: '',
        experience: '',
        qualifications: '',
        bio: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
      
      // Redirect to experts page after a delay to show the success message
      setTimeout(() => {
        navigate('/experts');
      }, 3000);
    } catch (error) {
      setMessage({ text: error.message || 'Registration failed', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-form-container">
      <h2>Nutrition Expert Registration</h2>
      <p>Join our platform and connect with clients seeking nutrition guidance</p>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          {message.type === 'success' && (
            <div className="redirect-info">
              You will be redirected to the experts page in a few seconds...
            </div>
          )}
        </div>
      )}
      
      <form className="registration-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="specialty">Specialty</label>
          <input
            type="text"
            id="specialty"
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="experience">Years of Experience</label>
          <input
            type="text"
            id="experience"
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="qualifications">Qualifications</label>
          <input
            type="text"
            id="qualifications"
            name="qualifications"
            value={formData.qualifications}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="bio">Professional Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows="4"
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <button 
          type="submit" 
          className="register-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Registering...' : 'Register as Expert'}
        </button>
      </form>
    </div>
  );
};

export default ExpertRegistrationForm; 