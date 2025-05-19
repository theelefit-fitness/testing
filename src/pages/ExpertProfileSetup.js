import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, getUserType } from '../services/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import './ExpertProfileSetup.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
];

const ExpertProfileSetup = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    experience: '',
    qualifications: '',
    bio: '',
    phone: '',
    availability: {}
  });

  // Initialize availability object
  useEffect(() => {
    const initialAvailability = {};
    DAYS.forEach(day => {
      initialAvailability[day] = {};
      HOURS.forEach(hour => {
        initialAvailability[day][hour] = false;
      });
    });
    
    setFormData(prev => ({
      ...prev,
      availability: initialAvailability
    }));
  }, []);

  // Check authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvailabilityChange = (day, hour) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability[day],
          [hour]: !prev.availability[day][hour]
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Format availability for storage - convert to array of slots
      const availabilitySlots = [];
      let slotId = 1;
      
      Object.entries(formData.availability).forEach(([day, hours]) => {
        Object.entries(hours).forEach(([hour, isAvailable]) => {
          if (isAvailable) {
            availabilitySlots.push({
              id: slotId++,
              time: `${day} ${hour}`,
              booked: false
            });
          }
        });
      });

      // Choose a random image from the array
      const professionalImages = [
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1563701039037-5834af7e8d36?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      ];
      
      const randomImage = professionalImages[Math.floor(Math.random() * professionalImages.length)];

      // Prepare expert data
      const expertData = {
        name: formData.name,
        specialty: formData.specialty,
        experience: formData.experience,
        qualifications: formData.qualifications,
        bio: formData.bio,
        phone: formData.phone,
        email: currentUser.email,
        userId: currentUser.uid,
        image: randomImage,
        rating: 0, // Initialize with 0 rating
        ratings: [], // Initialize with empty ratings array
        availableSlots: availabilitySlots,
        createdAt: new Date()
      };

      // Save to Firestore
      const expertRef = doc(collection(db, 'experts'), currentUser.uid);
      await setDoc(expertRef, expertData);

      // Navigate to dashboard
      navigate('/expert-dashboard');
    } catch (error) {
      console.error('Error saving expert profile:', error);
      setError(error.message);
    } finally {
      setSaving(false);
      setIsModalOpen(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="expert-profile-setup">
      <div className={`setup-modal ${isModalOpen ? 'open' : ''}`}>
        <div className="setup-modal-content">
          <h2>Complete Your Expert Profile</h2>
          <p>Please provide your professional details to get started as a nutrition expert.</p>
          
          {error && <div className="setup-error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="setup-form">
            <div className="form-section">
              <h3>Personal Information</h3>
              
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="specialty">Specialty</label>
                <input
                  type="text"
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="experience">Years of Experience</label>
                <input
                  type="text"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="qualifications">Qualifications</label>
                <input
                  type="text"
                  id="qualifications"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio">Professional Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="4"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-section">
              <h3>Set Your Availability</h3>
              <p>Select the times you're available for appointments.</p>
              
              <div className="availability-grid">
                <div className="availability-header">
                  <div className="time-column"></div>
                  {DAYS.map(day => (
                    <div key={day} className="day-column">{day}</div>
                  ))}
                </div>
                
                <div className="availability-body">
                  {HOURS.map(hour => (
                    <div key={hour} className="availability-row">
                      <div className="time-column">{hour}</div>
                      {DAYS.map(day => (
                        <div key={`${day}-${hour}`} className="checkbox-column">
                          <input
                            type="checkbox"
                            id={`${day}-${hour}`}
                            checked={formData.availability[day]?.[hour] || false}
                            onChange={() => handleAvailabilityChange(day, hour)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="save-profile-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpertProfileSetup; 