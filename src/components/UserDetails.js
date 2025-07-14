import React, { useState } from 'react';
import RatingStars from './RatingStars';

const UserDetails = ({ user, onDelete }) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Format date objects
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toLocaleString();
  };
  
  return (
    <div className="application-info">
      <h2>User Details</h2>
      
      <div className="app-detail-header">
        <h3>{user.email}</h3>
        <span className="status-badge approved">Active</span>
      </div>
      
      {/* Tabs for different sections */}
      <div className="detail-tabs">
        <button 
          className={`detail-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button 
          className={`detail-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
        </button>
        <button 
          className={`detail-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </div>
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="application-data">
          <div className="data-row">
            <div className="data-label">Email:</div>
            <div className="data-value">{user.email}</div>
          </div>
          <div className="data-row">
            <div className="data-label">User ID:</div>
            <div className="data-value">{user.uid}</div>
          </div>
          <div className="data-row">
            <div className="data-label">User Type:</div>
            <div className="data-value">{user.userType}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Account Created:</div>
            <div className="data-value">{formatDate(user.createdAt)}</div>
          </div>
          {user.firstName && (
            <div className="data-row">
              <div className="data-label">First Name:</div>
              <div className="data-value">{user.firstName}</div>
            </div>
          )}
          {user.lastName && (
            <div className="data-row">
              <div className="data-label">Last Name:</div>
              <div className="data-value">{user.lastName}</div>
            </div>
          )}
          {user.shopifyCustomerId && (
            <div className="data-row">
              <div className="data-label">Shopify Customer ID:</div>
              <div className="data-value">{user.shopifyCustomerId}</div>
            </div>
          )}
          {user.shopifyMapped !== undefined && (
            <div className="data-row">
              <div className="data-label">Shopify Status:</div>
              <div className="data-value">{user.shopifyMapped ? 'Mapped to Shopify Account' : 'Not Mapped to Shopify'}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="user-bookings">
          <h3>Booking History</h3>
          
          {user.bookings && user.bookings.length > 0 ? (
            <div className="bookings-list">
              {user.bookings.map((booking, index) => (
                <div key={index} className="booking-item">
                  <div className="booking-header">
                    <div className="booking-title">
                      {booking.expertName || 'Unknown Expert'}
                    </div>
                    <div className="booking-status">
                      <span className={`status-badge ${booking.status || 'pending'}`}>
                        {booking.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="booking-details">
                    <div className="booking-detail">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{formatDate(booking.timestamp)}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="detail-label">Time Slot:</span>
                      <span className="detail-value">{booking.timeSlot || 'Not specified'}</span>
                    </div>
                    {booking.notes && (
                      <div className="booking-detail">
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value">{booking.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No bookings found for this user.</p>
          )}
        </div>
      )}
      
      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="user-reviews">
          <h3>Reviews & Ratings</h3>
          
          {user.reviews && user.reviews.length > 0 ? (
            <div className="reviews-list">
              {user.reviews.map((review, index) => (
                <div key={index} className="review-item">
                  <div className="review-header">
                    <div className="review-title">
                      Review for {review.expertName || 'Expert'}
                    </div>
                    <div className="review-rating">
                      <RatingStars initialRating={review.rating} readOnly={true} />
                    </div>
                  </div>
                  
                  <div className="review-content">
                    {review.comment}
                  </div>
                  
                  <div className="review-meta">
                    <span className="review-date">{formatDate(review.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No reviews found for this user.</p>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="expert-actions">
        <button 
          className="delete-button"
          onClick={onDelete}
        >
          Delete User
        </button>
      </div>
    </div>
  );
};

export default UserDetails; 