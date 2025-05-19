import { db } from './firebase';
import { doc, collection, addDoc, getDoc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import emailService from './emailService';
import googleCalendarService from './googleCalendarService';

const bookingService = {
  // Request a booking slot
  requestBooking: async (expertId, slotId, userData) => {
    try {
      // Get the expert's data
      const expertDoc = doc(db, 'experts', expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      const slotIndex = expertData.availableSlots.findIndex(
        slot => slot.id === parseInt(slotId)
      );
      
      if (slotIndex === -1) {
        return Promise.reject("Slot not found");
      }
      
      if (expertData.availableSlots[slotIndex].booked || expertData.availableSlots[slotIndex].pending) {
        return Promise.reject("Slot is not available");
      }
      
      // Mark slot as pending
      const updatedSlots = [...expertData.availableSlots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        pending: true,
        pendingUserId: userData.userId
      };
      
      // Update expert document
      await updateDoc(expertDoc, {
        availableSlots: updatedSlots
      });
      
      // Create a booking request in Firestore
      const bookingData = {
        expertId,
        expertName: expertData.name,
        expertEmail: expertData.email,
        userId: userData.userId,
        userName: userData.userName,
        userEmail: userData.userEmail,
        slotId: parseInt(slotId),
        slotTime: expertData.availableSlots[slotIndex].time,
        status: 'pending',
        notes: userData.notes || '',
        createdAt: new Date(),
      };
      
      const bookingsCollection = collection(db, 'bookings');
      const bookingRef = await addDoc(bookingsCollection, bookingData);
      
      // Send notification email to expert about the new booking request
      console.log("Sending booking notification to expert");
      await emailService.sendBookingNotificationToExpert({
        ...bookingData,
        id: bookingRef.id
      });
      
      return {
        success: true,
        bookingId: bookingRef.id,
        expert: {
          id: expertId,
          ...expertData,
          availableSlots: updatedSlots
        },
        message: `Booking request sent. Waiting for ${expertData.name} to confirm.`
      };
    } catch (error) {
      console.error("Error requesting booking:", error);
      return Promise.reject("Failed to request booking");
    }
  },
  
  // Get bookings for a user
  getUserBookings: async (userId) => {
    try {
      const bookingsCollection = collection(db, 'bookings');
      const userBookingsQuery = query(bookingsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(userBookingsQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting user bookings:", error);
      return Promise.reject("Failed to retrieve your bookings");
    }
  },
  
  // Get bookings for an expert
  getExpertBookings: async (expertId) => {
    try {
      const bookingsCollection = collection(db, 'bookings');
      const expertBookingsQuery = query(bookingsCollection, where('expertId', '==', expertId));
      const querySnapshot = await getDocs(expertBookingsQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting expert bookings:", error);
      return Promise.reject("Failed to retrieve bookings");
    }
  },
  
  // Confirm a booking request
  confirmBooking: async (bookingId) => {
    try {
      // Get the booking data
      const bookingDoc = doc(db, 'bookings', bookingId);
      const bookingSnapshot = await getDoc(bookingDoc);
      
      if (!bookingSnapshot.exists()) {
        return Promise.reject("Booking not found");
      }
      
      const bookingData = bookingSnapshot.data();
      
      if (bookingData.status !== 'pending') {
        return Promise.reject(`Booking is already ${bookingData.status}`);
      }
      
      // Get the expert document
      const expertDoc = doc(db, 'experts', bookingData.expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      const slotIndex = expertData.availableSlots.findIndex(
        slot => slot.id === bookingData.slotId
      );
      
      if (slotIndex === -1) {
        return Promise.reject("Slot not found");
      }
      
      // Mark the slot as booked
      const updatedSlots = [...expertData.availableSlots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        pending: false,
        booked: true,
        bookedUserId: bookingData.userId
      };
      
      // Generate a simple meeting link without requiring Google Calendar sign-in
      const meetingLink = generateSimpleMeetingLink(
        bookingData.expertId,
        bookingData.userId,
        bookingId
      );
      
      // Update booking with confirmed status and meeting link
      await updateDoc(bookingDoc, {
        status: 'confirmed',
        meetingLink,
        updatedAt: new Date()
      });
      
      // Update expert document with booked slot
      await updateDoc(expertDoc, {
        availableSlots: updatedSlots
      });
      
      // Send email notifications to both expert and user with the meeting link
      const updatedBookingData = {
        ...bookingData,
        meetingLink,
        status: 'confirmed'
      };
      
      console.log('Debug - Preparing to send emails with booking data:', {
        expertEmail: updatedBookingData.expertEmail,
        userEmail: updatedBookingData.userEmail,
        expertName: updatedBookingData.expertName,
        userName: updatedBookingData.userName,
        meetingLink: updatedBookingData.meetingLink
      });
      
      await emailService.sendMeetingConfirmationEmails(updatedBookingData);
      
      return {
        success: true,
        bookingId,
        meetingLink,
        message: 'Booking confirmed successfully. Meeting details sent via email.'
      };
    } catch (error) {
      console.error("Error confirming booking:", error);
      return Promise.reject("Failed to confirm booking");
    }
  },
  
  // Reject a booking request
  rejectBooking: async (bookingId, reason) => {
    try {
      // Get the booking data
      const bookingDoc = doc(db, 'bookings', bookingId);
      const bookingSnapshot = await getDoc(bookingDoc);
      
      if (!bookingSnapshot.exists()) {
        return Promise.reject("Booking not found");
      }
      
      const bookingData = bookingSnapshot.data();
      
      if (bookingData.status !== 'pending') {
        return Promise.reject(`Booking is already ${bookingData.status}`);
      }
      
      // Get the expert document
      const expertDoc = doc(db, 'experts', bookingData.expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      const slotIndex = expertData.availableSlots.findIndex(
        slot => slot.id === bookingData.slotId
      );
      
      if (slotIndex === -1) {
        return Promise.reject("Slot not found");
      }
      
      // Mark the slot as available again
      const updatedSlots = [...expertData.availableSlots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        pending: false,
        pendingUserId: null
      };
      
      // Update booking with rejected status
      await updateDoc(bookingDoc, {
        status: 'rejected',
        rejectionReason: reason || 'No reason provided',
        updatedAt: new Date()
      });
      
      // Update expert document with available slot
      await updateDoc(expertDoc, {
        availableSlots: updatedSlots
      });
      
      return {
        success: true,
        bookingId,
        message: 'Booking rejected'
      };
    } catch (error) {
      console.error("Error rejecting booking:", error);
      return Promise.reject("Failed to reject booking");
    }
  },
  
  // Cancel a confirmed booking
  cancelBooking: async (bookingId) => {
    try {
      // Get the booking data
      const bookingDoc = doc(db, 'bookings', bookingId);
      const bookingSnapshot = await getDoc(bookingDoc);
      
      if (!bookingSnapshot.exists()) {
        return Promise.reject("Booking not found");
      }
      
      const bookingData = bookingSnapshot.data();
      
      if (bookingData.status !== 'confirmed') {
        return Promise.reject(`Cannot cancel a booking that is ${bookingData.status}`);
      }
      
      // Get the expert document
      const expertDoc = doc(db, 'experts', bookingData.expertId);
      const expertSnapshot = await getDoc(expertDoc);
      
      if (!expertSnapshot.exists()) {
        return Promise.reject("Expert not found");
      }
      
      const expertData = expertSnapshot.data();
      const slotIndex = expertData.availableSlots.findIndex(
        slot => slot.id === bookingData.slotId
      );
      
      if (slotIndex === -1) {
        return Promise.reject("Slot not found");
      }
      
      // Mark the slot as available again
      const updatedSlots = [...expertData.availableSlots];
      updatedSlots[slotIndex] = {
        ...updatedSlots[slotIndex],
        booked: false,
        bookedUserId: null
      };
      
      // Update booking with cancelled status
      await updateDoc(bookingDoc, {
        status: 'cancelled',
        updatedAt: new Date()
      });
      
      // Update expert document with available slot
      await updateDoc(expertDoc, {
        availableSlots: updatedSlots
      });
      
      return {
        success: true,
        bookingId,
        message: 'Booking cancelled successfully'
      };
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return Promise.reject("Failed to cancel booking");
    }
  }
};

// Helper function to generate a simple meeting link without Google sign-in
const generateSimpleMeetingLink = (expertId, userId, bookingId) => {
  // Using a free video conferencing service that doesn't require sign-in
  // This link will take users directly to a meeting room
  const roomName = `nutrition-experts-${expertId.substring(0, 4)}-${userId.substring(0, 4)}-${bookingId.substring(0, 4)}`;
  return `https://meet.jit.si/${roomName}`;
};

export default bookingService; 