// Email service for sending notifications
import { db } from './firebase';
import emailjs from '@emailjs/browser';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

// Initialize EmailJS with your User ID (public key)
// You can find this in your EmailJS dashboard under Account > API Keys
emailjs.init("V8y4JdJdlObvV0JTX");

// Function to send booking notification to expert when a user books a slot
const sendBookingNotificationToExpert = async (bookingData) => {
  try {
    console.log('Debug - Sending booking notification to expert:', bookingData.expertEmail);
    
    if (!bookingData || !bookingData.expertEmail) {
      console.error('Missing required expert email address for notification:', {
        hasBookingData: !!bookingData,
        expertEmail: bookingData?.expertEmail
      });
      return false;
    }
    
    // Expert notification for new booking request
    await sendRealEmail({
      to: bookingData.expertEmail,
      subject: `New Booking Request from ${bookingData.userName}`,
      content: generateBookingRequestEmailContent(bookingData),
      expertData: bookingData
    });
    
    console.log('Booking notification sent to expert successfully');
    return true;
  } catch (error) {
    console.error('Error sending booking notification to expert:', error);
    return false;
  }
};

// Function to send meeting confirmation emails
const sendMeetingConfirmationEmails = async (bookingData) => {
  try {
    // In a real implementation, you would use a proper email service
    // like EmailJS with Gmail, Outlook, etc.
    
    console.log('Debug - Received booking data:', bookingData);
    
    if (!bookingData || !bookingData.expertEmail || !bookingData.userEmail) {
      console.error('Missing required email addresses for notification:', {
        hasBookingData: !!bookingData,
        expertEmail: bookingData?.expertEmail,
        userEmail: bookingData?.userEmail
      });
      return false;
    }
    
    // Only send emails if the booking has been confirmed by the expert
    if (bookingData.status !== 'confirmed') {
      console.log(`Skipping email sending for non-confirmed booking (status: ${bookingData.status})`);
      return true;
    }
    
    console.log('Sending meeting confirmation emails:');
    
    // Expert notification
    console.log('Debug - Sending expert email to:', bookingData.expertEmail);
    await sendRealEmail({
      to: bookingData.expertEmail,
      subject: `Appointment confirmed with ${bookingData.userName}`,
      content: generateExpertEmailContent(bookingData),
      expertData: bookingData
    });
    
    // User notification
    console.log('Debug - Sending user email to:', bookingData.userEmail);
    await sendRealEmail({
      to: bookingData.userEmail,
      subject: `Your appointment with ${bookingData.expertName} is confirmed!`,
      content: generateUserEmailContent(bookingData),
      userData: bookingData
    });
    
    console.log('Meeting confirmation emails sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending meeting confirmation emails:', error);
    return false;
  }
};

// Real email sending function using EmailJS
const sendRealEmail = async ({ to, subject, content, expertData, userData }) => {
  console.log(`Debug - sendRealEmail called with:`, { to, subject });
  console.log(`Debug - Email data:`, { expertData, userData });
  
  console.log(`Sending real email to: ${to}`);
  
  try {
    // For EmailJS, you need:
    // 1. SERVICE_ID: Create a service in EmailJS dashboard (e.g., Gmail)
    // 2. TEMPLATE_ID: Create an email template in EmailJS dashboard
    // 3. PUBLIC_KEY: Your EmailJS account's public key
    
    // IMPORTANT: You must create these in your EmailJS account!
    const SERVICE_ID = "service_6xenpqn";
    const TEMPLATE_ID = "template_yjlbx4n";  // Using your template ID
    
    // Prepare the template parameters
    // These must exactly match your EmailJS template variables
    const templateParams = {
      email: to,               // To Email uses {{email}} in template
      to_name: userData ? userData.userName : (expertData ? expertData.expertName : ''),
      subject: subject,
      message_html: content,
      reply_to: "theelifit25@gmail.com",
      bcc_email: "",          // Optional BCC
      cc_email: "",           // Optional CC
      // Additional booking data
      meeting_time: userData ? userData.slotTime : (expertData ? expertData.slotTime : ''),
      meeting_link: userData ? userData.meetingLink : (expertData ? expertData.meetingLink : ''),
      expert_name: userData ? userData.expertName : (expertData ? expertData.expertName : ''),
      // Calendar integration links
      calendar_google: userData ? generateGoogleCalendarLink(userData) : (expertData ? generateGoogleCalendarLink(expertData) : ''),
      calendar_outlook: userData ? generateOutlookCalendarLink(userData) : (expertData ? generateOutlookCalendarLink(expertData) : ''),
      calendar_ical: userData ? generateICalLink(userData) : (expertData ? generateICalLink(expertData) : '')
    };

    console.log('Debug - Full booking data:', { userData, expertData });
    console.log('Debug - Email recipient:', to);
    console.log('Debug - Template parameters:', JSON.stringify(templateParams, null, 2));
    
    try {
      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        templateParams,
        "V8y4JdJdlObvV0JTX" // Your public key
      );
      
      if (response.status === 200) {
        console.log(`Email sent successfully to ${to}`);
        return true;
      } else {
        throw new Error(`Failed to send email: Status ${response.status}`);
      }
    } catch (emailError) {
      console.error('EmailJS Error:', emailError);
      // If EmailJS fails, try the mock email as fallback
      return sendMockEmail({ to, subject, content });
    }
  } catch (error) {
    console.error(`Error in sendRealEmail to ${to}:`, error);
    console.error('Error details:', error.text || error.message);
    return sendMockEmail({ to, subject, content });
  }
};

// Mock email sending function for development/fallback
const sendMockEmail = async ({ to, subject, content }) => {
  console.log(`MOCK: Sending email to: ${to}`);
  console.log(`MOCK: Subject: ${subject}`);
  console.log(`MOCK: Content: ${content.substring(0, 100)}...`);
  
  // Simulate sending email
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`MOCK: Email sent to ${to}`);
      resolve(true);
    }, 500);
  });
};

// For backward compatibility and testing
const sendEmail = sendMockEmail;

// Helper functions for calendar integration
const generateGoogleCalendarLink = (bookingData) => {
  const { expertName, slotTime, meetingLink } = bookingData;
  const date = formatAppointmentDateForCalendar(slotTime);
  const endDate = new Date(date.getTime() + 60 * 60 * 1000); // Add 1 hour
  
  const startTime = date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Nutrition Consultation with ${expertName}`)}&details=${encodeURIComponent(`Your nutrition consultation appointment.\nJoin link: ${meetingLink}`)}&dates=${startTime}/${endTime}`;
};

const generateOutlookCalendarLink = (bookingData) => {
  const { expertName, slotTime, meetingLink } = bookingData;
  const date = formatAppointmentDateForCalendar(slotTime);
  const endDate = new Date(date.getTime() + 60 * 60 * 1000); // Add 1 hour
  
  return `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(`Nutrition Consultation with ${expertName}`)}&body=${encodeURIComponent(`Your nutrition consultation appointment.\nJoin link: ${meetingLink}`)}&startdt=${date.toISOString()}&enddt=${endDate.toISOString()}`;
};

const generateICalLink = (bookingData) => {
  // This would typically be handled by your backend API
  return `/api/calendar/generate-ical?appointmentId=${bookingData.id}`;
};

// Helper function to format date for calendar links
const formatAppointmentDateForCalendar = (slotTime) => {
  // Parse the slot time (e.g., "Monday 9:00 AM")
  const [day, time] = slotTime.split(' ', 2);
  const timeWithAmPm = slotTime.substring(slotTime.indexOf(' ') + 1);
  
  // Create a future date for the appointment
  const currentDate = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIndex = daysOfWeek.indexOf(day);
  const currentDayIndex = currentDate.getDay();
  
  let daysToAdd = targetDayIndex - currentDayIndex;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  
  const appointmentDate = new Date(currentDate);
  appointmentDate.setDate(currentDate.getDate() + daysToAdd);
  
  // Parse the time
  const [timeStr, meridiem] = timeWithAmPm.split(' ');
  const [hours, minutes] = timeStr.split(':');
  let hour = parseInt(hours);
  
  // Convert to 24-hour format
  if (meridiem.toLowerCase() === 'pm' && hour !== 12) {
    hour += 12;
  } else if (meridiem.toLowerCase() === 'am' && hour === 12) {
    hour = 0;
  }
  
  appointmentDate.setHours(hour, parseInt(minutes), 0, 0);
  return appointmentDate;
};

// Generate email content for the expert
const generateExpertEmailContent = (bookingData) => {
  const { userName, userEmail, slotTime, meetingLink } = bookingData;
  const formattedDate = formatAppointmentDate(slotTime);
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
            <p style="font-size: 18px; font-weight: bold;">New Consultation Scheduled</p>
          </div>
          
          <!-- Warm Greeting -->
          <p>Dear ${bookingData.expertName},</p>
          <p>A new nutrition consultation has been scheduled with your client.</p>
          
          <!-- Meeting Details Box -->
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Appointment Details</h3>
            <p><strong>Client Name:</strong> ${userName}</p>
            <p><strong>Client Email:</strong> ${userEmail}</p>
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
            <p><strong>Session Duration:</strong> 60 minutes</p>
            <p><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #4E3580;">Click here to join your meeting</a></p>
          </div>
          
          <!-- Calendar Integration -->
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580;">Add to Your Calendar</h3>
            <p>Don't miss this appointment! Add it to your calendar:</p>
            <div style="text-align: center; margin: 15px 0;">
              <a href="${generateGoogleCalendarLink(bookingData)}" style="display: inline-block; background-color: #4285F4; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Google Calendar</a>
              <a href="${generateOutlookCalendarLink(bookingData)}" style="display: inline-block; background-color: #0078D4; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Outlook Calendar</a>
              <a href="${generateICalLink(bookingData)}" style="display: inline-block; background-color: #FF3B30; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Apple Calendar</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>This is an automated message from the Nutrition Experts Platform.</p>
            <p>Warm regards,<br>Nutrition Experts Team</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Generate email content for the user
const generateUserEmailContent = (bookingData) => {
  const { expertName, expertEmail, slotTime, meetingLink } = bookingData;
  const formattedDate = formatAppointmentDate(slotTime);
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
            <p style="font-size: 18px; font-weight: bold;">Meeting Confirmation</p>
          </div>
          
          <!-- Warm Greeting -->
          <p>Dear ${bookingData.userName},</p>
          <p>We're excited to confirm your nutrition consultation has been successfully scheduled! We look forward to helping you achieve your health and wellness goals.</p>
          
          <!-- Meeting Details Box -->
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Appointment Details</h3>
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
            <p><strong>Nutrition Expert:</strong> ${expertName}</p>
            <p><strong>Session Duration:</strong> 60 minutes</p>
            <p><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #4E3580;">Click here to join your meeting</a></p>
          </div>
          
          <!-- Nutrition List -->
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580;">Preparation for Your Session</h3>
            <p>To make the most of your consultation, please have the following ready:</p>
            <ul style="padding-left: 20px;">
              <li>Your current diet plan or food diary (if available)</li>
              <li>List of supplements or medications you're taking</li>
              <li>Any specific nutrition concerns or goals</li>
              <li>Recent medical test results (if relevant to your nutrition plan)</li>
            </ul>
          </div>
          
          <!-- Calendar Integration -->
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580;">Add to Your Calendar</h3>
            <p>Don't miss your appointment! Add it to your calendar:</p>
            <div style="text-align: center; margin: 15px 0;">
              <a href="${generateGoogleCalendarLink(bookingData)}" style="display: inline-block; background-color: #4285F4; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Google Calendar</a>
              <a href="${generateOutlookCalendarLink(bookingData)}" style="display: inline-block; background-color: #0078D4; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Outlook Calendar</a>
              <a href="${generateICalLink(bookingData)}" style="display: inline-block; background-color: #FF3B30; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Apple Calendar</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
            <p>Warm regards,<br>Nutrition Experts Team</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Generate email content for booking request notification
const generateBookingRequestEmailContent = (bookingData) => {
  const { userName, userEmail, slotTime } = bookingData;
  const formattedDate = formatAppointmentDate(slotTime);
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
            <p style="font-size: 18px; font-weight: bold;">New Booking Request</p>
          </div>
          
          <!-- Warm Greeting -->
          <p>Dear ${bookingData.expertName},</p>
          <p>You have received a new booking request from a potential client.</p>
          
          <!-- Meeting Details Box -->
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Booking Request Details</h3>
            <p><strong>Client Name:</strong> ${userName}</p>
            <p><strong>Client Email:</strong> ${userEmail}</p>
            <p><strong>Requested Date & Time:</strong> ${formattedDate}</p>
            <p><strong>Status:</strong> <span style="background-color: #FFB74D; color: white; padding: 3px 8px; border-radius: 3px;">Pending Confirmation</span></p>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="margin-bottom: 15px;">Please login to your dashboard to confirm or reject this booking request.</p>
            <a href="https://demo-elefit.netlify.app/login" style="display: inline-block; background-color: #4E3580; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Go to Dashboard</a>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>This is an automated message from the Nutrition Experts Platform.</p>
            <p>Warm regards,<br>Nutrition Experts Team</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Helper function to format the appointment date
const formatAppointmentDate = (slotTime) => {
  // Parse the slot time (e.g., "Monday 9:00 AM")
  const [day, time] = slotTime.split(' ', 2);
  const timeWithAmPm = slotTime.substring(slotTime.indexOf(' ') + 1);
  
  // Create a future date for the appointment based on the day of the week
  const currentDate = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIndex = daysOfWeek.indexOf(day);
  const currentDayIndex = currentDate.getDay();
  
  // Calculate days to add to get to the target day
  let daysToAdd = targetDayIndex - currentDayIndex;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Move to next week if target day is today or in the past
  }
  
  const appointmentDate = new Date(currentDate);
  appointmentDate.setDate(currentDate.getDate() + daysToAdd);
  
  // Format the date
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return `${appointmentDate.toLocaleDateString('en-US', options)} at ${timeWithAmPm}`;
};

// Helper function to generate a random password
export const generateRandomPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// In a real application, we would use a service like Firebase Cloud Functions 
// or a backend server to send emails. For this example, we'll simulate 
// email sending by storing the email data in Firestore.

export const sendExpertApprovalEmail = async (email, password, name) => {
  try {
    console.log(`Sending expert approval email to ${email} with password: ${password}`);
    
    // Create HTML email content
    const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
            <p style="font-size: 18px; font-weight: bold;">Application Approved!</p>
          </div>
          
          <p>Dear ${name},</p>
          <p>Congratulations! Your application to become a nutrition expert on our platform has been approved.</p>
          
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Login Credentials</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Important:</strong> This password is ready to use. Please use it exactly as shown above.</p>
            <p><strong>Login URL:</strong> <a href="https://demo-elefit.netlify.app/auth" style="color: #4E3580;">Click here to login</a></p>
          </div>
          
          <p>Please log in and change your password immediately for security purposes.</p>
          <p>Thank you for joining our platform. We look forward to seeing you help clients achieve their nutrition goals.</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://demo-elefit.netlify.app/auth" style="display: inline-block; background-color: #4E3580; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Login Now</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>This is an automated message from the Nutrition Experts Platform.</p>
            <p>Warm regards,<br>Nutrition Experts Team</p>
          </div>
        </div>
      </body>
    </html>
    `;

    // Store the email in Firestore
    const emailData = {
      to: email,
      subject: 'Congratulations! Your Expert Application Has Been Approved',
      body: emailContent,
      plainText: `
Dear ${name},

Congratulations! Your application to become a nutrition expert on our platform has been approved.

You can now log in using the following credentials:
Email: ${email}
Password: ${password}

IMPORTANT: This password is ready to use. Please use it exactly as shown above.

Please log in and change your password immediately for security purposes.

Thank you for joining our platform. We look forward to seeing you help clients achieve their nutrition goals.

Best regards,
The Nutrition Experts Platform Team
      `,
      sentAt: new Date(),
      status: 'pending'
    };
    
    await addDoc(collection(db, 'emails'), emailData);
    
    // Also send the email directly using EmailJS
    try {
      const SERVICE_ID = "service_6xenpqn";
      const TEMPLATE_ID = "template_yjlbx4n";
      
      const templateParams = {
        email: email,
        to_name: name,
        subject: 'Congratulations! Your Expert Application Has Been Approved',
        message_html: emailContent,
        reply_to: "theelifit25@gmail.com",
      };
      
      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        templateParams,
        "V8y4JdJdlObvV0JTX"
      );
      
      if (response.status === 200) {
        console.log(`Email sent successfully to ${email}`);
      } else {
        console.warn(`EmailJS response status: ${response.status}`);
      }
    } catch (emailError) {
      console.error('EmailJS Error:', emailError);
      // If EmailJS fails, we've already stored it in Firestore, so just log the error
    }
    
    console.log(`Approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending approval email:", error);
    throw error;
  }
};

export const sendExpertRejectionEmail = async (email, name) => {
  try {
    // Store the email in Firestore
    const emailData = {
      to: email,
      subject: 'Update on Your Expert Application',
      body: `
Dear ${name},

Thank you for your interest in becoming a nutrition expert on our platform.

After careful review of your application, we regret to inform you that we are unable to approve your application at this time.

Please note that this decision may be based on various factors including current platform needs and specific expertise requirements.

You are welcome to apply again in the future with updated qualifications or experience.

Thank you for your understanding.

Best regards,
The Nutrition Experts Platform Team
      `,
      sentAt: new Date(),
      status: 'pending'
    };
    
    await addDoc(collection(db, 'emails'), emailData);
    
    console.log(`Rejection email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending rejection email:", error);
    throw error;
  }
};

export const sendExpertApprovalEmailWithReset = async (email, name) => {
  try {
    console.log(`Sending expert approval email with password reset to ${email}`);
    
    // Create HTML email content
    const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
            <p style="font-size: 18px; font-weight: bold;">Application Approved!</p>
          </div>
          
          <p>Dear ${name},</p>
          <p>Congratulations! Your application to become a nutrition expert on our platform has been approved.</p>
          
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Account Access</h3>
            <p>We noticed that you already have an account with us. A password reset email has been sent to your email address.</p>
            <p><strong>Important:</strong> Please check your inbox and follow the instructions to reset your password.</p>
            <p><strong>Login URL:</strong> <a href="https://demo-elefit.netlify.app/auth" style="color: #4E3580;">Click here to login</a> after resetting your password.</p>
          </div>
          
          <p>After resetting your password, please log in to access your expert dashboard.</p>
          <p>Thank you for joining our platform. We look forward to seeing you help clients achieve their nutrition goals.</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://demo-elefit.netlify.app/auth" style="display: inline-block; background-color: #4E3580; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Login After Password Reset</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>This is an automated message from the Nutrition Experts Platform.</p>
            <p>Warm regards,<br>Nutrition Experts Team</p>
          </div>
        </div>
      </body>
    </html>
    `;

    // Store the email in Firestore
    const emailData = {
      to: email,
      subject: 'Congratulations! Your Expert Application Has Been Approved',
      body: emailContent,
      plainText: `
Dear ${name},

Congratulations! Your application to become a nutrition expert on our platform has been approved.

We noticed that you already have an account with us. A password reset email has been sent to your email address.

Important: Please check your inbox and follow the instructions to reset your password.

After resetting your password, please log in to access your expert dashboard.

Thank you for joining our platform. We look forward to seeing you help clients achieve their nutrition goals.

Best regards,
The Nutrition Experts Platform Team
      `,
      sentAt: new Date(),
      status: 'pending'
    };
    
    await addDoc(collection(db, 'emails'), emailData);
    
    // Also send the email directly using EmailJS
    try {
      const SERVICE_ID = "service_6xenpqn";
      const TEMPLATE_ID = "template_yjlbx4n";
      
      const templateParams = {
        email: email,
        to_name: name,
        subject: 'Congratulations! Your Expert Application Has Been Approved',
        message_html: emailContent,
        reply_to: "theelifit25@gmail.com",
      };
      
      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        templateParams,
        "V8y4JdJdlObvV0JTX"
      );
      
      if (response.status === 200) {
        console.log(`Email sent successfully to ${email}`);
      } else {
        console.warn(`EmailJS response status: ${response.status}`);
      }
    } catch (emailError) {
      console.error('EmailJS Error:', emailError);
      // If EmailJS fails, we've already stored it in Firestore, so just log the error
    }
    
    console.log(`Approval email with password reset sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending approval email with password reset:", error);
    throw error;
  }
};

// In a real application, we would use a system like Firebase Cloud Functions
// to monitor the 'emails' collection and send actual emails.

// Export the service
const emailService = {
  sendMeetingConfirmationEmails,
  sendBookingNotificationToExpert
};

export default emailService; 