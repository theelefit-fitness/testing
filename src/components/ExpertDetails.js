import React, { useState } from 'react';
import RatingStars from './RatingStars';

const ExpertDetails = ({ expert, onDelete, onResendCredentials, resendLoading }) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Format date objects
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toLocaleString();
  };
  
  return (
    <div className="application-info">
      <h2>Expert Details</h2>
      
      <div className="app-detail-header">
        <h3>{expert.profile.name || expert.email}</h3>
        <span className="status-badge approved">Active</span>
      </div>
      
      <div className="expert-profile">
        {expert.profile.image && (
          <div className="expert-image">
            <img src={expert.profile.image} alt={expert.profile.name} />
          </div>
        )}
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
          className={`detail-tab ${activeTab === 'qualifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('qualifications')}
        >
          Qualifications
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
        <button 
          className={`detail-tab ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability
        </button>
      </div>
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="application-data">
          <div className="data-row">
            <div className="data-label">Email:</div>
            <div className="data-value">{expert.email}</div>
          </div>
          <div className="data-row">
            <div className="data-label">User ID:</div>
            <div className="data-value">{expert.uid}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Account Created:</div>
            <div className="data-value">{formatDate(expert.createdAt)}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Specialty:</div>
            <div className="data-value">{expert.profile.specialty || 'Not specified'}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Phone:</div>
            <div className="data-value">{expert.profile.phone || 'Not specified'}</div>
          </div>
          {expert.shopifyCustomerId && (
            <div className="data-row">
              <div className="data-label">Shopify Customer ID:</div>
              <div className="data-value">{expert.shopifyCustomerId}</div>
            </div>
          )}
          {expert.shopifyMapped !== undefined && (
            <div className="data-row">
              <div className="data-label">Shopify Status:</div>
              <div className="data-value">{expert.shopifyMapped ? 'Mapped to Shopify Account' : 'Not Mapped to Shopify'}</div>
            </div>
          )}
          <div className="data-row full">
            <div className="data-label">Bio:</div>
            <div className="data-value bio">{expert.profile.bio || 'No bio provided'}</div>
          </div>
        </div>
      )}
      
      {/* Qualifications Tab */}
      {activeTab === 'qualifications' && (
        <div className="application-data">
          <div className="data-row full">
            <div className="data-label">Experience:</div>
            <div className="data-value">{expert.profile.experience || 'Not specified'}</div>
          </div>
          <div className="data-row full">
            <div className="data-label">Education:</div>
            <div className="data-value">{expert.profile.education || 'Not specified'}</div>
          </div>
          <div className="data-row full">
            <div className="data-label">Qualifications:</div>
            <div className="data-value">{expert.profile.qualifications || 'Not specified'}</div>
          </div>
          <div className="data-row full">
            <div className="data-label">Certifications:</div>
            <div className="data-value">{expert.profile.certifications || 'Not specified'}</div>
          </div>
        </div>
      )}
      
      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="expert-bookings">
          <h3>Booking History</h3>
          
          {expert.bookings && expert.bookings.length > 0 ? (
            <div className="bookings-list">
              {expert.bookings.map((booking, index) => (
                <div key={index} className="booking-item">
                  <div className="booking-header">
                    <div className="booking-title">
                      Booking with {booking.userName || 'Anonymous User'}
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
            <p className="no-data">No bookings found for this expert.</p>
          )}
        </div>
      )}
      
      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="expert-reviews">
          <h3>Reviews & Ratings</h3>
          
          {expert.profile.ratings && expert.profile.ratings.length > 0 ? (
            <div>
              <div className="ratings-summary">
                <div className="rating-display">
                  <span className="rating-value">{expert.profile.rating || 'No ratings yet'}</span>
                  {expert.profile.rating && (
                    <RatingStars initialRating={Math.round(expert.profile.rating)} readOnly={true} />
                  )}
                  <span className="rating-count">({expert.profile.ratings.length} ratings)</span>
                </div>
                
                <div className="rating-breakdown">
                  <h4>Rating Breakdown</h4>
                  <div className="rating-stats">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = expert.profile.ratings.filter(r => Math.round(r.value) === star).length;
                      const percentage = expert.profile.ratings.length > 0 
                        ? Math.round((count / expert.profile.ratings.length) * 100) 
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
                </div>
              </div>
              
              <h4>Recent Reviews</h4>
              <div className="reviews-list">
                {expert.reviews && expert.reviews.map((review, index) => (
                  <div key={index} className="review-item">
                    <div className="review-header">
                      <div className="review-title">
                        {review.userName || 'Anonymous User'}
                      </div>
                      <div className="review-rating">
                        <RatingStars initialRating={review.rating} readOnly={true} />
                      </div>
                    </div>
                    
                    <div className="review-content">
                      {review.comment || 'No comment provided'}
                    </div>
                    
                    <div className="review-meta">
                      <span className="review-date">{formatDate(review.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="no-data">No reviews found for this expert.</p>
          )}
        </div>
      )}
      
      {/* Availability Tab */}
      {activeTab === 'availability' && (
        <div className="expert-slots">
          <h3>Available Time Slots</h3>
          
          {expert.profile.availableSlots && expert.profile.availableSlots.length > 0 ? (
            <ul className="slots-list">
              {expert.profile.availableSlots.map(slot => (
                <li key={slot.id} className={`slot ${slot.booked ? 'booked' : 'available'}`}>
                  {slot.time} - {slot.booked ? 'Booked' : 'Available'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No availability information found.</p>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="expert-actions">
        <button 
          className="delete-button"
          onClick={onDelete}
        >
          Delete Expert
        </button>
        <button 
          className="resend-credentials-button"
          onClick={onResendCredentials}
          disabled={resendLoading}
        >
          {resendLoading ? 'Sending...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
};

export default ExpertDetails; 