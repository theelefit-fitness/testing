// // Load the Google API client library
// const loadGoogleApi = () => {
//   return new Promise((resolve, reject) => {
//     if (window.gapi) {
//       resolve(window.gapi);
//       return;
//     }

//     const script = document.createElement('script');
//     script.src = 'https://apis.google.com/js/api.js';
//     script.onload = () => {
//       window.gapi.load('client:auth2', () => {
//         window.gapi.client.init({
//           apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
//           discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
//           clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
//           scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
//         }).then(() => {
//           resolve(window.gapi);
//         }).catch(reject);
//       });
//     };
//     script.onerror = reject;
//     document.body.appendChild(script);
//   });
// };

// let gapiInstance = null;

// const googleCalendarService = {
//   // Initialize the Google API client
//   init: async () => {
//     try {
//       if (!gapiInstance) {
//         gapiInstance = await loadGoogleApi();
//       }
//       return true;
//     } catch (error) {
//       console.error('Error initializing Google API:', error);
//       throw error;
//     }
//   },

//   // Check if user is signed in
//   isSignedIn: () => {
//     if (!gapiInstance) return false;
//     return gapiInstance.auth2.getAuthInstance().isSignedIn.get();
//   },

//   // Sign in user
//   signIn: async () => {
//     try {
//       if (!gapiInstance) {
//         await googleCalendarService.init();
//       }
//       const auth2 = gapiInstance.auth2.getAuthInstance();
//       await auth2.signIn();
//       return true;
//     } catch (error) {
//       console.error('Error signing in:', error);
//       throw error;
//     }
//   },

//   // Sign out user
//   signOut: async () => {
//     try {
//       if (!gapiInstance) {
//         await googleCalendarService.init();
//       }
//       const auth2 = gapiInstance.auth2.getAuthInstance();
//       await auth2.signOut();
//       return true;
//     } catch (error) {
//       console.error('Error signing out:', error);
//       throw error;
//     }
//   },

//   // Create a Google Calendar event with Google Meet
//   createEvent: async (expertEmail, userEmail, slotTime, expertName) => {
//     try {
//       // If Google Calendar is not available or user isn't signed in,
//       // use the fallback method to create a meeting link without Google Calendar
//       if (!gapiInstance || !googleCalendarService.isSignedIn()) {
//         console.log('Using fallback meeting link generation (without Google Calendar)');
//         return createMeetingLinkWithoutGoogleCalendar(expertEmail, userEmail);
//       }

//       // Parse the slot time (e.g., "Monday 9:00 AM")
//       const [day, time] = slotTime.split(' ', 2);
//       const timeWithAmPm = slotTime.substring(slotTime.indexOf(' ') + 1);
      
//       // Create a future date for the appointment
//       const currentDate = new Date();
//       const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//       const targetDayIndex = daysOfWeek.indexOf(day);
//       const currentDayIndex = currentDate.getDay();
      
//       let daysToAdd = targetDayIndex - currentDayIndex;
//       if (daysToAdd <= 0) {
//         daysToAdd += 7;
//       }
      
//       const appointmentDate = new Date(currentDate);
//       appointmentDate.setDate(currentDate.getDate() + daysToAdd);
      
//       // Parse the time
//       const [timeStr, meridiem] = timeWithAmPm.split(' ');
//       const [hours, minutes] = timeStr.split(':');
//       let hour = parseInt(hours);
      
//       // Convert to 24-hour format
//       if (meridiem.toLowerCase() === 'pm' && hour !== 12) {
//         hour += 12;
//       } else if (meridiem.toLowerCase() === 'am' && hour === 12) {
//         hour = 0;
//       }
      
//       appointmentDate.setHours(hour, parseInt(minutes), 0, 0);
      
//       // Create end time (1 hour later)
//       const endDate = new Date(appointmentDate.getTime() + 60 * 60 * 1000);
      
//       // Create the event
//       const event = {
//         summary: `Nutrition Consultation with ${expertName}`,
//         description: 'Your nutrition consultation appointment.',
//         start: {
//           dateTime: appointmentDate.toISOString(),
//           timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//         },
//         end: {
//           dateTime: endDate.toISOString(),
//           timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//         },
//         attendees: [
//           { email: expertEmail },
//           { email: userEmail },
//         ],
//         conferenceData: {
//           createRequest: {
//             requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
//             conferenceSolutionKey: { type: 'hangoutsMeet' },
//           },
//         },
//       };
      
//       // Insert the event
//       const response = await gapiInstance.client.calendar.events.insert({
//         calendarId: 'primary',
//         resource: event,
//         conferenceDataVersion: 1,
//         sendUpdates: 'all',
//       });
      
//       // Return the meeting link
//       return response.result.hangoutLink;
//     } catch (error) {
//       console.error('Error creating Google Calendar event:', error);
//       // If there's an error with Google Calendar, use the fallback method
//       return createMeetingLinkWithoutGoogleCalendar(expertEmail, userEmail);
//     }
//   },
  
//   // Delete a Google Calendar event
//   deleteEvent: async (eventId) => {
//     try {
//       if (!gapiInstance) {
//         await googleCalendarService.init();
//       }

//       if (!googleCalendarService.isSignedIn()) {
//         await googleCalendarService.signIn();
//       }

//       await gapiInstance.client.calendar.events.delete({
//         calendarId: 'primary',
//         eventId: eventId,
//         sendUpdates: 'all',
//       });
//     } catch (error) {
//       console.error('Error deleting Google Calendar event:', error);
//       throw error;
//     }
//   }
// };

// // Fallback function to create a meeting link without Google Calendar
// const createMeetingLinkWithoutGoogleCalendar = (expertEmail, userEmail) => {
//   // Generate a unique room ID based on the emails
//   const expertHash = expertEmail.split('@')[0].substring(0, 4);
//   const userHash = userEmail.split('@')[0].substring(0, 4);
//   const timestamp = Date.now().toString().substring(8, 13);
  
//   // Using Jitsi Meet as a free alternative that doesn't require login
//   const roomName = `nutrition-experts-${expertHash}-${userHash}-${timestamp}`;
//   return `https://meet.jit.si/${roomName}`;
// };

// export default googleCalendarService; 

// Simple implementation of Google Calendar service

// Load the Google API client library
const loadGoogleApi = () => {
  return new Promise((resolve, reject) => {
    // In this simplified version, we just resolve immediately
    // In a real implementation, we would load the Google API client
    resolve(null);
  });
};

const googleCalendarService = {
  // Initialize the Google API client
  init: async () => {
    try {
      console.log('Google Calendar service initialized (simplified version)');
      return true;
    } catch (error) {
      console.error('Error initializing Google API:', error);
      throw error;
    }
  },

  // Check if user is signed in
  isSignedIn: () => {
    return false; // Always return false in this simplified version
  },

  // Sign in user
  signIn: async () => {
    try {
      console.log('Google Calendar sign in called (simplified version)');
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Sign out user
  signOut: async () => {
    try {
      console.log('Google Calendar sign out called (simplified version)');
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Create a Google Calendar event with Google Meet
  createEvent: async (expertEmail, userEmail, slotTime, expertName) => {
    try {
      // Use the fallback method to create a meeting link without Google Calendar
      console.log('Using fallback meeting link generation (without Google Calendar)');
      return createMeetingLinkWithoutGoogleCalendar(expertEmail, userEmail);
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return createMeetingLinkWithoutGoogleCalendar(expertEmail, userEmail);
    }
  },
  
  // Delete a Google Calendar event
  deleteEvent: async (eventId) => {
    try {
      console.log('Google Calendar delete event called (simplified version)');
      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }
};

// Fallback function to create a meeting link without Google Calendar
const createMeetingLinkWithoutGoogleCalendar = (expertEmail, userEmail) => {
  // Generate a unique room ID based on the emails
  const expertHash = expertEmail.split('@')[0].substring(0, 4);
  const userHash = userEmail.split('@')[0].substring(0, 4);
  const timestamp = Date.now().toString().substring(8, 13);
  
  // Using Jitsi Meet as a free alternative that doesn't require login
  const roomName = `nutrition-experts-${expertHash}-${userHash}-${timestamp}`;
  return `https://meet.jit.si/${roomName}`;
};

export default googleCalendarService; 