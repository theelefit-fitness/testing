import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommentSection from '../components/CommentSection';
import expertsService from '../services/expertsService';
import bookingService from '../services/bookingService';
import { auth } from '../services/firebase';
import RatingStars from '../components/RatingStars';
import useProfileImage from '../hooks/useProfileImage';
import LoadingSpinner from '../components/LoadingSpinner';
import './ExpertDetailPage.css';

const DEFAULT_PROFILE_IMAGE = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

// BookingSlot component
const BookingSlot = ({ slot, expertId, onBook, currentUser, onLoginRedirect }) => {
  const [isBooking, setIsBooking] = useState(false);

  const handleBookClick = async () => {
    if (!currentUser) {
      onLoginRedirect();
      return;
    }

    if (!slot.booked && !slot.pending && !isBooking) {
      setIsBooking(true); // Set loading state immediately
      await onBook(expertId, slot.id);
      setIsBooking(false);
    }
  };

  const getSlotStatus = () => {
    if (isBooking) return 'booking';
    if (slot.booked) return 'booked';
    if (slot.pending) return 'pending';
    if (slot.cancelled) return 'cancelled';
    if (slot.completed) return 'completed';
    return 'available';
  };

  const status = getSlotStatus();

  return (
    <div className={`booking-slot ${status}`}>
      <div className="slot-time">{slot.time}</div>
      <button 
        className={`book-button ${status}`}
        onClick={handleBookClick}
        disabled={status !== 'available'}
      >
        {status === 'booking' ? 'Booking...' : 
         status === 'booked' ? 'Booked' : 
         status === 'pending' ? 'Request Pending' : 
         'Book Now'}
      </button>
    </div>
  );
};

// Main ExpertDetailPage component
const ExpertDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [recentBooking, setRecentBooking] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchExpert = async () => {
      try {
        const expertData = await expertsService.getExpertById(id);
        if (!expertData) {
          setError('Expert not found');
          return;
        }

        setExpert(expertData);
        
        if (currentUser && expertData.ratings) {
          const userRating = expertData.ratings.find(r => r.userId === currentUser.uid);
          if (userRating) {
            setUserRating(userRating.value);
          }
        }
      } catch (error) {
        console.error('Error fetching expert:', error);
        setError('Failed to load expert details');
      } finally {
        setLoading(false);
      }
    };

    fetchExpert();
  }, [id, currentUser]);

  const { imageUrl } = useProfileImage(expert?.id, expert?.profileImageURL);

  const handleBookSlot = async (expertId, slotId) => {
    if (!currentUser) {
      setShowLoginPrompt(true);
      setMessage({ text: 'Please log in to book appointments', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return;
    }

    try {
      // Update the slot state immediately in the UI
      setExpert(prev => ({
        ...prev,
        availableSlots: prev.availableSlots.map(slot => 
          slot.id === slotId ? { ...slot, pending: true } : slot
        )
      }));

      const userData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        userEmail: currentUser.email,
        notes: ''
      };

      const response = await bookingService.requestBooking(expertId, slotId, userData);
      
      // Update with the server response
      setExpert(prev => ({
        ...prev,
        availableSlots: response.expert.availableSlots
      }));

      setMessage({ 
        text: '✓ Booking request sent to expert!', 
        type: 'success-animated' 
      });
      
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);

    } catch (error) {
      // Revert the slot state if booking failed
      setExpert(prev => ({
        ...prev,
        availableSlots: prev.availableSlots.map(slot => 
          slot.id === slotId ? { ...slot, pending: false } : slot
        )
      }));

      setMessage({ text: error.message || 'Booking failed', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    }
  };

  const handleRatingChange = async (ratingValue) => {
    if (!currentUser) {
      setShowLoginPrompt(true);
      setMessage({ text: 'Please log in to rate experts', type: 'error' });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return;
    }

    try {
      const response = await expertsService.rateExpert(id, currentUser.uid, ratingValue);
      setExpert(response.expert);
      setUserRating(ratingValue);
      setMessage({ text: response.message, type: 'success' });
      
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      setMessage({ text: error.message || 'Rating failed', type: 'error' });
      
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/auth', { state: { returnPath: `/expert/${id}` } });
  };

  const goBack = () => {
    navigate('/experts');
  };

  if (loading) {
    return <LoadingSpinner text="Loading expert information..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>{error}</h2>
        <button className="back-button" onClick={goBack}>
          ← Back to Experts
        </button>
      </div>
    );
  }

  return (
    <div className="expert-detail-container">
      <button className="back-button" onClick={goBack}>
        ← Back to Experts
      </button>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      {recentBooking && (
        <div className="booking-success">
          <div className="booking-success-content">
            <h3>Booking Request Sent!</h3>
            <div className="booking-details">
              <p><strong>Expert:</strong> {recentBooking.expertName}</p>
              <p><strong>Time:</strong> {recentBooking.slotTime}</p>
              <p><strong>Status:</strong> Awaiting Confirmation</p>
            </div>
            <p className="redirect-message">You'll be redirected to your dashboard in a moment...</p>
            <div className="booking-actions">
              <button 
                className="view-dashboard-button" 
                onClick={() => navigate('/user-dashboard')}
              >
                Go to Dashboard Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="expert-profile">
        <div className="expert-profile-header">
          <div className="expert-image">
            <img 
              src={imageUrl} 
              alt={expert.name} 
            />
          </div>
          <div className="expert-info">
            <h1>{expert.name}</h1>
            <div className="specialty-badge">
              <p className="specialty">{expert.specialty}</p>
            </div>
            <p className="experience experience-text">{expert.experience} Experience</p>
            <div className="qualifications">
              <h3>Qualifications</h3>
              <p>{expert.qualifications}</p>
            </div>
            <div className="rating-section">
              <div className="current-rating">
                <span className="rating-label">Rating:</span>
                <span className="rating-value">{expert.rating || 'No ratings yet'}</span>
                <RatingStars initialRating={Math.round(expert.rating || 0)} readOnly={true} />
                <span className="rating-count">({expert.ratings ? expert.ratings.length : 0} ratings)</span>
              </div>
              <div className="user-rating">
                <h4>Rate this expert:</h4>
                <RatingStars 
                  initialRating={userRating} 
                  onRatingChange={handleRatingChange} 
                />
                {!currentUser && showLoginPrompt && (
                  <div className="login-prompt-container">
                    <p className="login-prompt">Please log in to rate experts</p>
                    <button className="login-button" onClick={handleLoginRedirect}>
                      Log In Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="expert-bio">
          <h3>About</h3>
          <p>{expert.bio}</p>
        </div>
        
        <div className="booking-section">
          <h2>Available Appointment Slots</h2>
          {!currentUser && showLoginPrompt && (
            <div className="login-prompt-container">
              <p className="login-prompt">Please log in to book appointments</p>
              <button className="login-button" onClick={handleLoginRedirect}>
                Log In Now
              </button>
            </div>
          )}
          {expert.availableSlots && expert.availableSlots.length > 0 ? (
            <div className="slots-container">
              {expert.availableSlots.map(slot => (
                <BookingSlot 
                  key={slot.id} 
                  slot={slot} 
                  expertId={expert.id} 
                  onBook={handleBookSlot}
                  currentUser={currentUser}
                  onLoginRedirect={handleLoginRedirect}
                />
              ))}
            </div>
          ) : (
            <p className="no-slots">No available slots at the moment.</p>
          )}
        </div>
        
        <CommentSection expertId={id} currentUser={currentUser} />
      </div>
    </div>
  );
};

export default ExpertDetailPage;