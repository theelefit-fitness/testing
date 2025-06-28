import React, { useState } from 'react';
import './ExpertApplicationForm.css';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

const ExpertApplicationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    experience: '',
    education: '',
    qualifications: '',
    bio: '',
    email: '',
    phone: ''
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
    
    try {
      // Add application to Firestore
      const applicationData = {
        ...formData,
        status: 'pending',
        createdAt: new Date(),
      };
      
      const applicationsCollection = collection(db, 'expertApplications');
      const docRef = await addDoc(applicationsCollection, applicationData);
      
      setMessage({ 
        text: 'Your application has been submitted successfully! Our team will review it and contact you via email.', 
        type: 'success' 
      });
      
      // Clear form
      setFormData({
        name: '',
        specialty: '',
        experience: '',
        education: '',
        qualifications: '',
        bio: '',
        email: '',
        phone: ''
      });
    } catch (error) {
      setMessage({ 
        text: error.message || 'Failed to submit your application. Please try again later.', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expert-application-form-container">
      <h2>Apply to Become a Nutrition Expert</h2>
      <p>Fill out this form to apply as a nutrition expert on our platform</p>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form className="expert-application-form" onSubmit={handleSubmit}>
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
          <label htmlFor="education">Education</label>
          <input
            type="text"
            id="education"
            name="education"
            value={formData.education}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="qualifications">Qualifications & Certifications</label>
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
        
        <button 
          type="submit" 
          className="application-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};

export default ExpertApplicationForm; 