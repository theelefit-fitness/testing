import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import bookingService from '../services/bookingService';
import './UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    // Check authentication
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch user data
        fetchUserData(user.uid);
        // Fetch user bookings
        fetchUserBookings(user.uid);
      } else {
        navigate('/auth');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);
  
  // Refresh bookings whenever the component mounts or when returning to this page 
  // or when lastRefresh changes
  useEffect(() => {
    if (currentUser && currentUser.uid) {
      // Check if we need to refresh bookings based on navigation state
      if (location.state && location.state.refreshBookings) {
        // Clear the state so future navigations don't trigger refresh unnecessarily
        navigate(location.pathname, { replace: true, state: {} });
        fetchUserBookings(currentUser.uid);
      } else {
        fetchUserBookings(currentUser.uid);
      }
    }
  }, [location.key, lastRefresh]);

  const fetchUserData = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const data = userSnapshot.data();
        
        // Check if user is an expert - if so, redirect to expert dashboard
        if (data.userType === 'expert') {
          navigate('/expert-dashboard');
          return;
        }
        
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookings = async (userId) => {
    try {
      setLoadingBookings(true);
      const userBookings = await bookingService.getUserBookings(userId);
      setBookings(userBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoadingBookings(false);
    }
  };

  // Function to manually refresh bookings
  const refreshBookings = () => {
    if (currentUser && currentUser.uid) {
      setLastRefresh(Date.now());
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await bookingService.cancelBooking(bookingId);
      // Update bookings state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        )
      );
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading">Loading your dashboard...</div>;
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h1>User Dashboard</h1>
       
      </div>
      
      {error && <div className="dashboard-error">{error}</div>}
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {currentUser?.email}</h2>
          <p>This is your personal nutrition dashboard.</p>
        </div>

        <div className="dashboard-section">
          <h3>Find Nutrition Experts</h3>
          <p>Connect with qualified nutrition experts to get personalized advice.</p>
          <button 
            className="action-button"
            onClick={() => navigate('/experts')}
          >
            Browse Experts
          </button>
        </div>
        
        <div className="dashboard-section appointments-section">
          <div className="section-header">
          <h3>My Appointments</h3>
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
            <div className="empty-state">
              <p className="no-appointments">You don't have any upcoming appointments.</p>
              <button 
                className="action-button"
                onClick={() => navigate('/experts')}
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <>
              <div className="bookings-container">
                <div className="bookings-group">
                  <h4>Pending Confirmations</h4>
                  {bookings.filter(b => b.status === 'pending').length > 0 ? (
                    <div className="bookings-cards">
                      {bookings
                        .filter(booking => booking.status === 'pending')
                        .map(booking => (
                          <div key={booking.id} className="booking-card pending">
                            <div className="booking-header">
                              <h5>Appointment with {booking.expertName}</h5>
                              <span className="booking-status">Awaiting Confirmation</span>
                            </div>
                            <div className="booking-details">
                              <p><strong>Time:</strong> {booking.slotTime}</p>
                              <p><strong>Requested:</strong> {formatDate(booking.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="empty-message">No pending appointments</p>
                  )}
                </div>

                <div className="bookings-group">
                  <h4>Upcoming Appointments</h4>
                  {bookings.filter(b => b.status === 'confirmed').length > 0 ? (
                    <div className="bookings-cards">
                      {bookings
                        .filter(booking => booking.status === 'confirmed')
                        .map(booking => (
                          <div key={booking.id} className="booking-card confirmed">
                            <div className="booking-header">
                              <h5>Appointment with {booking.expertName}</h5>
                              <span className="booking-status">Confirmed</span>
                            </div>
                            <div className="booking-details">
                              <p><strong>Time:</strong> {booking.slotTime}</p>
                              <p><strong>Confirmed:</strong> {formatDate(booking.updatedAt)}</p>
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
                                className="cancel-button"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                Cancel Appointment
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="empty-message">No confirmed appointments</p>
                  )}
                </div>

                {bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length > 0 && (
                  <div className="bookings-group">
                    <h4>Past & Cancelled Appointments</h4>
                    <div className="bookings-cards">
                      {bookings
                        .filter(booking => booking.status === 'rejected' || booking.status === 'cancelled')
                        .map(booking => (
                          <div key={booking.id} className={`booking-card ${booking.status}`}>
                            <div className="booking-header">
                              <h5>Appointment with {booking.expertName}</h5>
                              <span className="booking-status">
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                            <div className="booking-details">
                              <p><strong>Time:</strong> {booking.slotTime}</p>
                              {booking.rejectionReason && (
                                <p><strong>Reason:</strong> {booking.rejectionReason}</p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="booking-cta">
                <button 
                  className="action-button"
                  onClick={() => navigate('/experts')}
                >
                  Book New Appointment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard; 