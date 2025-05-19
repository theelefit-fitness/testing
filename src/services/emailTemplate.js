// EmailJS configuration
export const EMAIL_CONFIG = {
  SERVICE_ID: "service_6xenpqn",
  TEMPLATE_ID: "template_yjlbx4n",
  PUBLIC_KEY: "V8y4JdJdlObvV0JTX",
  DEFAULT_REPLY_TO: "theelifit25@gmail.com",
  TEMPLATE_PARAMS: {
    email: "",              // Recipient's email (using {{email}} in template)
    to_name: "",           // From Name in template
    subject: "",           // Email subject
    message_html: "",      // Main content
    reply_to: "theelifit25@gmail.com",
    bcc_email: "",        // BCC recipients
    cc_email: "",         // CC recipients
    meeting_time: "",      // Meeting time
    meeting_link: "",      // Meeting link
    expert_name: ""       // Expert's name
  }
};

// Simple email template that matches exactly what's being used
export const EMAIL_TEMPLATE = `
To: {{email}}

From: {{to_name}}

Subject: {{subject}}

Meeting Time: {{meeting_time}}

Expert: {{expert_name}}

Meeting Link: {{meeting_link}}

{{{message_html}}}

Add to Calendar:
Google Calendar: {{calendar_google}}
Outlook Calendar: {{calendar_outlook}}
Apple Calendar: {{calendar_ical}}

CC: {{cc_email}}
BCC: {{bcc_email}}
`;

/*
EmailJS Template Setup Instructions:

1. Go to EmailJS Dashboard
2. Click "Email Templates" → "Create New Template"
3. Fill in these template settings:

   To Email:     {{email}}
   From Name:    {{to_name}}
   From Email:   Use Default Email Address
   Reply-to:     theelifit25@gmail.com
   CC:          {{cc_email}}
   BCC:         {{bcc_email}}
   Subject:     {{subject}}

4. In the HTML Editor, paste this exact template:

To: {{email}}

From: {{to_name}}

Subject: {{subject}}

Meeting Time: {{meeting_time}}

Expert: {{expert_name}}

Meeting Link: {{meeting_link}}

{{{message_html}}}

Add to Calendar:
Google Calendar: {{calendar_google}}
Outlook Calendar: {{calendar_outlook}}
Apple Calendar: {{calendar_ical}}

CC: {{cc_email}}
BCC: {{bcc_email}}

5. Important:
   - Keep the template exactly as shown above
   - Use triple braces {{{message_html}}} for HTML content
   - Make sure all variables match exactly
   - Test the template after saving
*/ 