import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { getUserType } from '../services/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import RatingStars from '../components/RatingStars';
import bookingService from '../services/bookingService';
import googleCalendarService from '../services/googleCalendarService';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileImageUploader from '../components/ProfileImageUploader';
import { getProfileImageURL } from '../services/storageService';
import './ExpertDashboard.css';
import LikesStatistics from '../components/LikesStatistics';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
];

// Generate random avatar color based on username
const getAvatarColor = (username) => {
  const colors = [
    '#4E3580', '#C8DA2B', '#0ca789', '#1976d2', '#f44336', 
    '#ff9800', '#9c27b0', '#3f51b5', '#009688', '#cddc39'
  ];
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Get user initials for avatar
const getInitials = (username) => {
  return username.substring(0, 2).toUpperCase();
};

const ExpertDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [expertData, setExpertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    experience: '',
    qualifications: '',
    bio: '',
    phone: '',
    availability: {}
  });
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'appointments', 'settings'
  const [message, setMessage] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  useEffect(() => {
    // Check authentication
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Check if user is actually an expert
        const userType = await getUserType(user.uid);
        if (userType !== 'expert') {
          // If not an expert, redirect to user dashboard
          navigate('/user-dashboard');
          return;
        }
        
        // Fetch expert data
        fetchExpertData(user.uid);
        // Fetch profile image
        fetchProfileImage(user.email);
      } else {
        navigate('/auth');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
  }, [currentUser, lastRefresh]);

  // Set up auto-refresh every 30 seconds when appointments tab is active
  useEffect(() => {
    let intervalId;
    
    if (activeTab === 'appointments' && currentUser) {
      intervalId = setInterval(() => {
        fetchBookings(true); // Silent refresh (no loading indicator)
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, currentUser]);

  // Check if we need to refresh based on navigation state
  useEffect(() => {
    if (currentUser && currentUser.uid && location.state && location.state.refreshBookings) {
      // Clear the state so future navigations don't trigger refresh unnecessarily
      navigate(location.pathname, { replace: true, state: {} });
      fetchBookings();
    }
  }, [location.state, navigate, location.pathname, currentUser]);

  useEffect(() => {
    // Initialize Google Calendar service when component mounts
    const initializeGoogleCalendar = async () => {
      try {
        await googleCalendarService.init();
      } catch (error) {
        console.error('Error initializing Google Calendar:', error);
      }
    };

    initializeGoogleCalendar();
  }, []);

  // Refresh profile image if the URL changes
  useEffect(() => {
    if (profileImageUrl) {
      const img = new Image();
      img.src = profileImageUrl;
      img.onload = () => {
        // Image loaded successfully, no need to do anything
      };
      img.onerror = () => {
        // If the image fails to load, try to fetch it again
        if (currentUser && currentUser.uid) {
          fetchProfileImage(currentUser.email);
        }
      };
    }
  }, [profileImageUrl]);

  const fetchExpertData = async (userId) => {
    try {
      const expertRef = doc(db, 'experts', userId);
      const expertSnapshot = await getDoc(expertRef);
      
      if (expertSnapshot.exists()) {
        const data = expertSnapshot.data();
        setExpertData(data);
        
        // Convert availableSlots to availability grid format
        const initialAvailability = {};
        DAYS.forEach(day => {
          initialAvailability[day] = {};
          HOURS.forEach(hour => {
            initialAvailability[day][hour] = false;
          });
        });
        
        // Mark the booked slots
        if (data.availableSlots) {
          data.availableSlots.forEach(slot => {
            const [day, time] = slot.time.split(' ', 2);
            const timeWithAmPm = slot.time.substring(slot.time.indexOf(' ') + 1);
            
            if (initialAvailability[day] && HOURS.includes(timeWithAmPm)) {
              initialAvailability[day][timeWithAmPm] = true;
            }
          });
        }
        
        // Set the form data for editing
        setFormData({
          name: data.name || '',
          specialty: data.specialty || '',
          experience: data.experience || '',
          qualifications: data.qualifications || '',
          bio: data.bio || '',
          phone: data.phone || '',
          availability: initialAvailability
        });
      } else {
        // No expert profile found
        navigate('/expert-profile-setup');
      }
    } catch (error) {
      console.error('Error fetching expert data:', error);
      setError('Failed to load your expert profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (silent = false) => {
    if (!currentUser) return;
    
    try {
      if (!silent) setLoadingBookings(true);
      const expertBookings = await bookingService.getExpertBookings(currentUser.uid);
      setBookings(expertBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (!silent) setError('Failed to load your bookings. Please try again.');
    } finally {
      if (!silent) setLoadingBookings(false);
    }
  };

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

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form data to current expert data
    if (expertData) {
      // Convert availableSlots back to availability grid format
      const initialAvailability = {};
      DAYS.forEach(day => {
        initialAvailability[day] = {};
        HOURS.forEach(hour => {
          initialAvailability[day][hour] = false;
        });
      });
      
      if (expertData.availableSlots) {
        expertData.availableSlots.forEach(slot => {
          const [day, time] = slot.time.split(' ', 2);
          const timeWithAmPm = slot.time.substring(slot.time.indexOf(' ') + 1);
          
          if (initialAvailability[day] && HOURS.includes(timeWithAmPm)) {
            initialAvailability[day][timeWithAmPm] = true;
          }
        });
      }
      
      setFormData({
        name: expertData.name || '',
        specialty: expertData.specialty || '',
        experience: expertData.experience || '',
        qualifications: expertData.qualifications || '',
        bio: expertData.bio || '',
        phone: expertData.phone || '',
        availability: initialAvailability
      });
    }
    
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
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
      
      // Keep any existing booked slots
      if (expertData.availableSlots) {
        expertData.availableSlots.forEach(slot => {
          if (slot.booked) {
            const [day, time] = slot.time.split(' ', 2);
            const timeWithAmPm = slot.time.substring(slot.time.indexOf(' ') + 1);
            
            // Check if the slot is still in the availability
            if (formData.availability[day]?.[timeWithAmPm]) {
              // Find and update the slot to keep it booked
              const existingSlot = availabilitySlots.find(s => 
                s.time === slot.time
              );
              
              if (existingSlot) {
                existingSlot.booked = true;
              }
            }
          }
        });
      }
      
      // Update expert data
      const updatedExpertData = {
        name: formData.name,
        specialty: formData.specialty,
        experience: formData.experience,
        qualifications: formData.qualifications,
        bio: formData.bio,
        phone: formData.phone,
        availableSlots: availabilitySlots,
        updatedAt: new Date()
      };
      
      // Preserve existing ratings
      if (expertData.ratings) {
        updatedExpertData.ratings = expertData.ratings;
      }
      
      // Preserve existing rating
      if (expertData.rating) {
        updatedExpertData.rating = expertData.rating;
      }
      
      // Save to Firestore
      const expertRef = doc(db, 'experts', currentUser.uid);
      await updateDoc(expertRef, updatedExpertData);
      
      // Update local state
      setExpertData({
        ...expertData,
        ...updatedExpertData
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating expert profile:', error);
      setError('Failed to update your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      setLoading(true);
      await bookingService.confirmBooking(bookingId);
      // Refresh bookings after confirmation
      fetchBookings();
    } catch (error) {
      console.error('Error confirming booking:', error);
      setError('Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      await bookingService.rejectBooking(bookingId);
      // Update the booking in the state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'rejected' } 
            : booking
        )
      );
      // Refresh expert data to update slots
      fetchExpertData(currentUser.uid);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      setError('Failed to reject booking. Please try again.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await bookingService.cancelBooking(bookingId);
      // Update the booking in the state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        )
      );
      // Refresh expert data to update slots
      fetchExpertData(currentUser.uid);
      setMessage({
        text: 'Appointment cancelled successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking. Please try again.');
    }
  };

  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to manually refresh bookings
  const refreshBookings = () => {
    if (currentUser && currentUser.uid) {
      setLastRefresh(Date.now());
    }
  };

  const fetchProfileImage = async (email) => {
    try {
      if (currentUser && currentUser.uid) {
        // Try to get image from cache first
        const cachedImageKey = `profileImage_${currentUser.uid}`;
        const cachedData = localStorage.getItem(cachedImageKey);
        
        if (cachedData) {
          try {
            const { url, timestamp } = JSON.parse(cachedData);
            // Check if cache is less than 24 hours old
            const now = new Date().getTime();
            if (now - timestamp < 86400000) {
              console.log('Using cached profile image in ExpertDashboard');
              setProfileImageUrl(url);
              return;
            } else {
              // Cache expired, remove it
              localStorage.removeItem(cachedImageKey);
            }
          } catch (error) {
            console.error('Error parsing cached profile image:', error);
          }
        }
        
        // If not in cache or expired, fetch from storage
        console.log('Fetching profile image from storage in ExpertDashboard');
        const imageUrl = await getProfileImageURL(currentUser.uid);
        if (imageUrl) {
          setProfileImageUrl(imageUrl);
          
          // Save to cache
          try {
            localStorage.setItem(cachedImageKey, JSON.stringify({
              url: imageUrl,
              timestamp: new Date().getTime()
            }));
          } catch (error) {
            console.error('Error saving profile image to cache:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  const handleProfileImageUploaded = (url) => {
    setProfileImageUrl(url);
  };

  if (loading) {
    return <LoadingSpinner text="Loading..." />;
  }

  return (
    <div className="expert-dashboard">
      <div className="dashboard-header">
        <h1>Expert Dashboard</h1>
        <div className="dashboard-tabs">
          <button 
            className={`dashboard-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`dashboard-tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
            {bookings.filter(b => b.status === 'pending').length > 0 && (
              <span className="notification-badge">
                {bookings.filter(b => b.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            className={`dashboard-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {expertData && (
        <div className="dashboard-content">
          {activeTab === 'profile' && (
            <div className="profile-section">
              <div className="profile-card">
                <div className="profile-image-container">
                  <ProfileImageUploader 
                    currentImageUrl={profileImageUrl}
                    email={currentUser?.email}
                    userId={currentUser?.uid}
                    userType="experts"
                    onImageUploaded={handleProfileImageUploaded}
                    size="large"
                    className="profile-image-uploader"
                  />
                </div>
                
                <div className="profile-header">
                  <div className="profile-info">
                    <h2 >{expertData.name}</h2>
                    <p className="specialty">{expertData.specialty}</p>
                    <div className="expert-rating">
                      <span>Rating: {expertData.rating || 'No ratings yet'}</span>
                      {expertData.rating && (
                        <RatingStars initialRating={Math.round(expertData.rating)} readOnly={true} />
                      )}
                      <span className="rating-count">
                        ({expertData.ratings ? expertData.ratings.length : 0} ratings)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="profile-content">
                  <div className="profile-section full-width">
                    <h3 className="no-dot">About</h3>
                    <div className="readonly-field">
                      <textarea 
                        value={expertData.bio || "No bio information provided."} 
                        readOnly 
                      />
                    </div>
                  </div>
                  
                  <div className="profile-grid">
                    <div className="grid-item">
                      <h3 className="no-dot">Qualifications</h3>
                      <div className="readonly-field">
                        <input 
                          type="text" 
                          value={expertData.qualifications || "No qualifications provided."} 
                          readOnly 
                        />
                      </div>
                    </div>
                    
                    <div className="grid-item">
                      <h3 className="no-dot">Experience</h3>
                      <div className="readonly-field">
                        <input 
                          type="text" 
                          value={expertData.experience || "No experience provided."} 
                          readOnly 
                        />
                      </div>
                    </div>
                    
                    <div className="grid-item">
                      <h3 className="no-dot">Phone</h3>
                      <div className="readonly-field">
                        <input 
                          type="text" 
                          value={expertData.phone || "No phone number provided."} 
                          readOnly 
                        />
                      </div>
                    </div>
                    
                    <div className="grid-item">
                      <h3 className="no-dot">Email</h3>
                      <div className="readonly-field">
                        <input 
                          type="email" 
                          value={expertData.email || "No email provided."} 
                          readOnly 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="button-container">
                  {!isEditing ? (
                    <button className="edit-profile-button" onClick={handleEditProfile}>
                      Edit Profile
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button className="save-button" style={{backgroundColor: 'red', color: 'white'}} onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button 
                        className="save-button" 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {isEditing ? (
                <div className="edit-profile-form">
                  <div className="form-section">
                    <h3>Personal Information</h3>
                    
                    <div className="form-row">
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
                    </div>
                    
                    <div className="form-row">
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
                    </div>
                    
                    <div className="form-group full-width">
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
                    
                    <div className="form-row">
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
                      
                      <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={currentUser?.email || ""}
                          disabled
                          className="disabled-input"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <h3>Update Your Availability</h3>
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
                </div>
              ) : (
                <div className="profile-details">
                  <div className="profile-section full-width">
                    <h3>Available Appointment Slots</h3>
                    {expertData.availableSlots && expertData.availableSlots.length > 0 ? (
                      <div className="slots-list">
                        {expertData.availableSlots.map(slot => (
                          <div 
                            key={slot.id} 
                            className={`slot-item ${slot.booked ? 'booked' : ''}`}
                          >
                            <span className="slot-time">{slot.time}</span>
                            {slot.booked && <span className="booked-badge">Booked</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No available slots set up yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="appointments-section">
              <div className="dashboard-grid">
                <div className="upcoming-appointments">
                  <h3>Upcoming Appointments</h3>
                  {bookings.filter(booking => booking.status === 'confirmed').length > 0 ? (
                    <div className="bookings-list">
                      {bookings
                        .filter(booking => booking.status === 'confirmed')
                        .map(booking => (
                          <div key={booking.id} className="booking-card confirmed">
                            <div className="booking-info">
                              <h4>Appointment with {booking.userName}</h4>
                              <p><strong>Time:</strong> {booking.slotTime}</p>
                              <p><strong>Email:</strong> {booking.userEmail}</p>
                              <p><strong>Confirmed:</strong> {formatDate(booking.updatedAt)}</p>
                            </div>
                            <div className="booking-actions">
                              {booking.meetingLink && (
                                <a 
                                  href={booking.meetingLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="meeting-link"
                                >
                                  Join Meeting
                                </a>
                              )}
                              <button 
                                className="meeting-link" style={{backgroundColor:'red', color: 'white'}}
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                Cancel Appointment
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="no-upcoming">No upcoming appointments.</p>
                  )}
                </div>
               
                        
                <div className="appointments-section">
                  <div className="section-header">
                    <h2>Available Appointments</h2>
                    <button 
                      className="refresh-button" 
                      onClick={refreshBookings}
                      disabled={loadingBookings}
                    >
                      {loadingBookings ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  
                  {loadingBookings ? (
                    <div className="loading-bookings">Loading your appointments...</div>
                  ) : bookings.length === 0 ? (
                    <div className="no-bookings">You don't have any appointment requests yet.</div>
                  ) : (
                    <>
                      <div className="booking-requests">
                        <h3>Pending Requests</h3>
                        {bookings.filter(booking => booking.status === 'pending').length > 0 ? (
                          <div className="bookings-list">
                            {bookings
                              .filter(booking => booking.status === 'pending')
                              .map(booking => (
                                <div key={booking.id} className="booking-card pending">
                                  <div className="booking-info">
                                    <h4>Request from {booking.userName}</h4>
                                    <p><strong>Time:</strong> {booking.slotTime}</p>
                                    <p><strong>Email:</strong> {booking.userEmail}</p>
                                    <p><strong>Requested:</strong> {formatDate(booking.createdAt)}</p>
                                    {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
                                  </div>
                                  <div className="booking-actions">
                                    <button 
                                      className="confirm-button meeting-link" style={{backgroundColor:'#4E3580', color: 'white'}}
                                      onClick={() => handleConfirmBooking(booking.id)}
                                    >
                                      Confirm
                                    </button>
                                    <button 
                                      className="reject-button meeting-link" style={{backgroundColor:'red', color: 'white'}}
                                      onClick={() => handleRejectBooking(booking.id)}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="no-pending">No pending requests.</p>
                        )}
                      </div>
                      
                    </>
                  )}
                </div>
                
                
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-section">
            
              
              <div className="settings-card">
                <div className="settings-group">
                  <h3 >Ratings & Reviews</h3>
                  <div className="ratings-summary">
                    <div className="rating-display">
                      <span className="rating-value">{expertData.rating || 'N/A'}</span>
                      <div className="rating-stars">
                        {expertData.rating && (
                          <RatingStars initialRating={Math.round(expertData.rating)} readOnly={true} />
                        )}
                        <span className="rating-count">
                          ({expertData.ratings ? expertData.ratings.length : 0} ratings)
                        </span>
                      </div>
                    </div>
                    
                    {expertData.ratings && expertData.ratings.length > 0 && (
                      <div className="rating-breakdown">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = expertData.ratings.filter(r => Math.round(r.value) === star).length;
                          const percentage = expertData.ratings.length > 0 
                            ? Math.round((count / expertData.ratings.length) * 100) 
                            : 0;
                          
                          return (
                            <div key={star} className="rating-bar">
                              <span className="star-label">{star} stars</span>
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="percentage">{percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="settings-group">
                  <h3>User Comments ({expertData.commentCount || 0})</h3>
                  <div className="comments-list">
                    {expertData.comments && expertData.comments.length > 0 ? (
                      expertData.comments.sort((a, b) => {
                        const dateA = a.timestamp instanceof Date ? a.timestamp : a.timestamp.toDate();
                        const dateB = b.timestamp instanceof Date ? b.timestamp : b.timestamp.toDate();
                        return dateB - dateA;
                      }).map(comment => (
                        <div key={comment.id} className="dashboard-comment-item">
                          <div className="comment-avatar" style={{ 
                            backgroundColor: comment.userName ? getAvatarColor(comment.userName) : '#4E3580' 
                          }}>
                            {comment.userName ? getInitials(comment.userName) : 'U'}
                          </div>
                          <div className="comment-content">
                            <div className="comment-header">
                              <span className="comment-author">{comment.userName}</span>
                              <span className="comment-date">
                                {new Date(comment.timestamp.seconds * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="comment-text">{comment.text}</p>
                            <div className="comment-likes">
                              <i className="fas fa-heart"></i>
                              <span>{comment.likesCount || 0} likes</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-comments">No comments yet.</p>
                    )}
                  </div>
                  <div className="likes-analytics">
                    <LikesStatistics comments={expertData.comments || []} />
                  </div>
                </div>

               
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpertDashboard;