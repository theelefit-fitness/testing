# Setting Up EmailJS for Meeting Notifications

This guide provides comprehensive instructions for setting up EmailJS to send real-time email notifications for booking confirmations on the Nutrition Experts Platform.

## Why EmailJS?

EmailJS allows you to send emails directly from client-side JavaScript without requiring a backend server. It supports various email providers including Gmail, Outlook, Yahoo, and custom SMTP servers.

## Step 1: Create an EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/) and sign up for a free account
2. Verify your email address to activate your account
3. After verification, you'll be directed to the dashboard

## Step 2: Add an Email Service

1. In your EmailJS dashboard, click on "Email Services" in the left sidebar
2. Click the "Add New Service" button
3. Choose your preferred email service:
   - **Gmail** (Recommended): Easy to set up, supports OAuth
   - **Outlook/Office 365**: Good for business accounts
   - **Custom SMTP**: For your own email servers
4. Give your service a name (e.g., "Nutrition Platform Notifications")
5. Click "Connect Account" and follow the authentication steps:
   - For Gmail, you'll need to sign in and allow permissions
   - Accept the "Send email on your behalf" permission
   - You may need to complete additional security steps if you have 2FA enabled
6. Once connected, click "Create Service"
7. Note down the **Service ID** (e.g., "service_abc123") - you'll need this later

## Step 3: Create Email Templates

### Setting Up a Booking Confirmation Template

1. In your EmailJS dashboard, go to "Email Templates" in the left sidebar
2. Click "Create New Template"
3. You can use either:
   - **Visual Editor**: Drag-and-drop interface for non-technical users
   - **Code Editor**: HTML editor for custom designs

#### Using the Visual Editor:

1. Click "Design with Visual Editor"
2. Add your header, text blocks, buttons, and other elements
3. For dynamic content, use variables wrapped in double curly braces:
   - Click on any text element
   - Type `{{variable_name}}` where you want the dynamic content
   - Common variables used in our system:
     - `{{to_name}}` - Recipient's name
     - `{{from_name}}` - Sender's name (Nutrition Experts Platform)
     - `{{meeting_time}}` - Time of the meeting
     - `{{meeting_link}}` - Link to join the meeting
     - `{{message_html}}` - The email content (HTML)

#### Using the Code Editor:

1. Click "Code" in the top tab
2. Insert your HTML template
3. Example template for appointment confirmation:
   ```html
   <html>
     <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
       <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
         <!-- Header with Logo -->
         <div style="text-align: center; margin-bottom: 20px;">
           <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
           <p style="font-size: 18px; font-weight: bold;">Meeting Confirmation</p>
         </div>
         
         <!-- Warm Greeting -->
         <p>Dear {{to_name}},</p>
         <p>We're excited to confirm your nutrition consultation has been successfully scheduled! We look forward to helping you achieve your health and wellness goals.</p>
         
         <!-- Meeting Details Box -->
         <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
           <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Appointment Details</h3>
           <p><strong>Date & Time:</strong> {{meeting_time}}</p>
           <p><strong>Nutrition Expert:</strong> {{expert_name}}</p>
           <p><strong>Session Duration:</strong> 60 minutes</p>
           <p><strong>Meeting Link:</strong> <a href="{{meeting_link}}" style="color: #4E3580;">Click here to join your meeting</a></p>
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
             <a href="{{calendar_google}}" style="display: inline-block; background-color: #4285F4; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Google Calendar</a>
             <a href="{{calendar_outlook}}" style="display: inline-block; background-color: #0078D4; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Outlook Calendar</a>
             <a href="{{calendar_ical}}" style="display: inline-block; background-color: #FF3B30; color: white; padding: 8px 15px; margin: 0 5px; border-radius: 5px; text-decoration: none; font-size: 14px;">Apple Calendar</a>
           </div>
         </div>
         
         <!-- Additional Message from HTML -->
         <div>{{message_html}}</div>
         
         <!-- Footer -->
         <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
           <p>If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
           <p>Warm regards,<br>{{from_name}}</p>
         </div>
       </div>
     </body>
   </html>
   ```

4. Click "Save" and give your template a descriptive name (e.g., "Nutrition Consultation Confirmation")
5. Go to the "Settings" tab of your template and note down the **Template ID** (e.g., "template_xyz789")

### Setting Up an Auto-Reply Template (Optional)

1. Create a second template by following the same steps
2. Design it as an immediate acknowledgment email
3. Example auto-reply template:
   ```html
   <html>
     <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
       <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
         <!-- Header -->
         <div style="text-align: center; margin-bottom: 20px;">
           <h2 style="color: #4E3580; margin-bottom: 5px;">Nutrition Experts Platform</h2>
           <p style="font-size: 18px; font-weight: bold;">Booking Request Received</p>
         </div>
         
         <!-- Greeting -->
         <p>Dear {{to_name}},</p>
         <p>Thank you for choosing Nutrition Experts Platform for your health journey!</p>
         
         <!-- Booking Information -->
         <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #4E3580; margin: 20px 0;">
           <h3 style="margin-top: 0; color: #4E3580; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Request Details</h3>
           <p><strong>Requested Date & Time:</strong> {{meeting_time}}</p>
           <p><strong>Nutrition Expert:</strong> {{expert_name}}</p>
           <p><strong>Session Type:</strong> Initial Consultation</p>
         </div>
         
         <!-- What's Next -->
         <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
           <h3 style="margin-top: 0; color: #4E3580;">What Happens Next?</h3>
           <ol style="padding-left: 20px;">
             <li>Our expert will review your booking request</li>
             <li>You'll receive a confirmation email within 24 hours</li>
             <li>The confirmation email will include your meeting link and preparation instructions</li>
             <li>You can add the appointment to your calendar once confirmed</li>
           </ol>
         </div>
         
         <!-- Nutrition Tips -->
         <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
           <h3 style="margin-top: 0; color: #4E3580;">While You Wait - Nutrition Tips</h3>
           <ul style="padding-left: 20px;">
             <li>Start a food diary to track your current eating habits</li>
             <li>Note any specific nutrition concerns you'd like to discuss</li>
             <li>Prepare questions about your dietary goals and challenges</li>
             <li>Consider your ideal outcomes from this nutrition consultation</li>
           </ul>
         </div>
         
         <!-- Footer -->
         <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
           <p>If you need to make any changes, please contact us directly by replying to this email.</p>
           <p>Best regards,<br>{{from_name}}</p>
         </div>
       </div>
     </body>
   </html>
   ```
4. Note down this second **Template ID** if you implement it

## Step 4: Get Your Public Key

1. In your EmailJS dashboard, go to "Account" > "API Keys"
2. Copy your **Public Key** (e.g., "user_abc123xyz789")

## Step 5: Update the Code

Open `src/services/emailService.js` and make the following changes:

1. Replace `"YOUR_PUBLIC_KEY"` with your actual public key:
   ```javascript
   emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your actual key from EmailJS
   ```

2. Update the service and template IDs in the `sendRealEmail` function:
   ```javascript
   const SERVICE_ID = "YOUR_SERVICE_ID";  // Replace with your service ID (e.g., "service_abc123")
   const TEMPLATE_ID = "YOUR_TEMPLATE_ID"; // Replace with your template ID (e.g., "template_xyz789")
   ```

3. Configure any additional template parameters as needed:
   ```javascript
   const templateParams = {
     to_email: to,
     subject: subject,
     to_name: userData ? userData.userName : (expertData ? expertData.expertName : ''),
     from_name: 'Nutrition Experts Platform',
     meeting_time: userData ? userData.slotTime : (expertData ? expertData.slotTime : ''),
     meeting_link: userData ? userData.meetingLink : (expertData ? expertData.meetingLink : ''),
     expert_name: userData ? userData.expertName : '',
     calendar_google: userData ? generateGoogleCalendarLink(userData) : '',
     calendar_outlook: userData ? generateOutlookCalendarLink(userData) : '',
     calendar_ical: userData ? generateICalLink(userData) : '',
     message_html: content
   };
   ```

## Step 6: Implementing Auto-Reply (Optional)

If you want to send an immediate auto-reply when bookings are requested (before confirmation):

1. Create an additional function in `emailService.js`:
   ```javascript
   // Send auto-reply acknowledgment
   const sendBookingRequestAcknowledgment = async (userData) => {
     try {
       await sendRealEmail({
         to: userData.userEmail,
         subject: `We've received your booking request`,
         content: generateAutoReplyContent(userData),
         userData: userData
       });
       return true;
     } catch (error) {
       console.error('Error sending auto-reply:', error);
       return false;
     }
   };
   
   // Generate auto-reply content
   const generateAutoReplyContent = (userData) => {
     return `
       <html>
         <body style="font-family: Arial, sans-serif; line-height: 1.6;">
           <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
             <h2 style="color: #4E3580;">Booking Request Received</h2>
             <p>Hello ${userData.userName},</p>
             <p>Thank you for booking with Nutrition Experts Platform.</p>
             <p>We're processing your request for a session with ${userData.expertName} at ${userData.slotTime}.</p>
             
             <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
               <h3 style="margin-top: 0; color: #4E3580;">Nutrition Consultation Preparation</h3>
               <p>To prepare for your upcoming session, consider:</p>
               <ul>
                 <li>Your current diet patterns</li>
                 <li>Specific nutrition goals</li>
                 <li>Any dietary restrictions or preferences</li>
                 <li>Health concerns related to nutrition</li>
               </ul>
             </div>
             
             <p>You'll receive a confirmation email shortly with your meeting link and calendar details.</p>
             <p>If you have questions before your appointment, please reply to this email.</p>
             <p>We look forward to helping you on your nutrition journey!</p>
             <p>Best regards,<br>The Nutrition Experts Team</p>
           </div>
         </body>
       </html>
     `;
   };
   ```

2. Export the new function in the service:
   ```javascript
   const emailService = {
     sendMeetingConfirmationEmails,
     sendBookingRequestAcknowledgment
   };
   ```

3. Call this function when the user submits a booking request (in your booking component)

## Testing the Implementation

1. Once you've made these changes, test the email functionality:
   - Create a test booking in the system
   - Verify emails are sent to both the expert and user
   - Check for proper formatting and content in the emails

2. Debug using browser console:
   - EmailJS will log success or error messages
   - Use these to troubleshoot any issues

## Troubleshooting

- **Authentication Issues**: Make sure your email service is properly connected and permissions are granted
- **Emails Not Sending**: Check your browser console for error messages
- **Template Variables Not Working**: Verify variable names match between your template and code
- **Styling Problems**: Test emails on different email clients (Gmail, Outlook, etc.)
- **Rate Limits**: Free EmailJS accounts have daily limits (200 emails/month)

## Going to Production

For a production environment, consider:

1. **Upgrade to Paid Plan**: Increase email limits (starts at $14.95/month)
2. **Set Up Domain Authentication**: To improve deliverability
3. **Create Multiple Templates**: For different notification types
4. **Implement Email Analytics**: To track open rates (available in paid plans)

## Monitoring and Maintenance

1. Regularly check your EmailJS dashboard for:
   - Usage statistics
   - Failed email deliveries
   - Service connectivity issues

2. Keep your email templates updated when:
   - Branding changes
   - New features are added
   - User feedback suggests improvements

## Need More Help?

- Official [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS API Reference](https://www.emailjs.com/docs/sdk/installation/) for advanced usage
- [Template Variables Guide](https://www.emailjs.com/docs/user-guide/dynamic-variables/) 

// Add these helper functions for calendar integration
const generateGoogleCalendarLink = (userData) => {
  // Implementation to create Google Calendar link
  // Example structure: https://calendar.google.com/calendar/render?action=TEMPLATE&text=Nutrition+Consultation&dates=...
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Nutrition+Consultation+with+${encodeURIComponent(userData.expertName)}&details=Your+nutrition+consultation+appointment.+Join+link:+${encodeURIComponent(userData.meetingLink)}&dates=YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ`;
};

const generateOutlookCalendarLink = (userData) => {
  // Implementation to create Outlook Calendar link
  return `https://outlook.office.com/calendar/0/deeplink/compose?subject=Nutrition+Consultation+with+${encodeURIComponent(userData.expertName)}&body=Your+nutrition+consultation+appointment.+Join+link:+${encodeURIComponent(userData.meetingLink)}&startdt=YYYY-MM-DDTHH:MM:SS&enddt=YYYY-MM-DDTHH:MM:SS`;
};

const generateICalLink = (userData) => {
  // Implementation to create iCal file download
  // This would typically return a data URI or a link to a server endpoint that generates an .ics file
  return `/api/generate-ical?appointmentId=${userData.appointmentId}`;
}; 