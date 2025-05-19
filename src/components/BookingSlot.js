import React from 'react';
import './BookingSlot.css';

const BookingSlot = ({ slot, onBook, expertId, currentUser, onLoginRedirect }) => {
  const handleClick = () => {
    if (!currentUser) {
      onLoginRedirect();
      return;
    }

    if (!slot.booked && !slot.pending) {
      onBook(expertId, slot.id);
    }
  };

  const getButtonText = () => {
    if (slot.booked) return 'Booked';
    if (slot.pending) return 'Confirmation Pending';
    return 'Book Slot';
  };

  const getButtonClass = () => {
    if (slot.booked) return 'booked';
    if (slot.pending) return 'pending';
    return '';
  };

  return (
    <div className={`booking-slot ${slot.booked ? 'booked' : ''} ${slot.pending ? 'pending' : ''}`}>
      <div className="slot-time">{slot.time}</div>
      <button 
        className={`booking-button ${getButtonClass()}`} 
        onClick={handleClick}
        disabled={slot.booked || slot.pending}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

export default BookingSlot; 