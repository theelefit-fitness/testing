import React from 'react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to The Elefit ("we," "our," or "us"). We are committed to protecting your privacy and personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website
            or use our nutrition expert platform services.
          </p>
          <p>
            Please read this Privacy Policy carefully. By accessing or using our Platform, you acknowledge that you have read,
            understood, and agree to be bound by all the terms outlined in this Privacy Policy. If you do not agree with our policies,
            please do not access or use our Platform.
          </p>
        </section>
        
        <section>
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Personal Information</h3>
          <p>We may collect personal information that you voluntarily provide to us when you:</p>
          <ul>
            <li>Register for an account</li>
            <li>Fill out a profile</li>
            <li>Apply as a nutrition expert</li>
            <li>Book consultations</li>
            <li>Communicate with us</li>
            <li>Subscribe to our newsletters</li>
          </ul>
          <p>This information may include:</p>
          <ul>
            <li>Name, email address, and contact details</li>
            <li>Login credentials</li>
            <li>Professional qualifications and certifications (for experts)</li>
            <li>Health and nutrition-related information</li>
            <li>Payment information</li>
            <li>Profile pictures</li>
          </ul>
          
          <h3>2.2 Automatically Collected Information</h3>
          <p>When you access our Platform, we may automatically collect certain information, including:</p>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Pages visited and time spent</li>
            <li>Referring websites</li>
            <li>Click patterns and interactions with the Platform</li>
          </ul>
        </section>
        
        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We may use the information we collect for various purposes, including:</p>
          <ul>
            <li>Providing, maintaining, and improving our Platform</li>
            <li>Processing transactions and managing your account</li>
            <li>Connecting clients with appropriate nutrition experts</li>
            <li>Verifying expert credentials and qualifications</li>
            <li>Sending administrative information and service updates</li>
            <li>Responding to your inquiries and support requests</li>
            <li>Marketing and promotional communications (with your consent)</li>
            <li>Analyzing usage patterns to enhance user experience</li>
            <li>Ensuring compliance with our terms and policies</li>
            <li>Protecting against fraudulent or unauthorized activity</li>
          </ul>
        </section>
        
        <section>
          <h2>4. Sharing Your Information</h2>
          <p>We may share your information with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Third-party vendors who help us operate our Platform and provide services</li>
            <li><strong>Nutrition Experts:</strong> When you book consultations, relevant information is shared with the expert</li>
            <li><strong>Business Partners:</strong> Trusted partners who help us provide services</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
          <p>We do not sell your personal information to third parties for their marketing purposes.</p>
        </section>
        
        <section>
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access,
            alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure,
            and we cannot guarantee absolute security.
          </p>
        </section>
        
        <section>
          <h2>6. Your Privacy Rights</h2>
          <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
          <ul>
            <li>Right to access and receive a copy of your personal information</li>
            <li>Right to correct inaccurate or incomplete information</li>
            <li>Right to delete your personal information</li>
            <li>Right to restrict or object to processing</li>
            <li>Right to data portability</li>
            <li>Right to withdraw consent at any time</li>
          </ul>
          <p>To exercise these rights, please contact us using the information provided in the "Contact Us" section.</p>
        </section>
        
        <section>
          <h2>7. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to collect and store information when you use our Platform.
            These technologies help us analyze user behavior, remember your preferences, and improve your experience.
          </p>
          <p>
            You can set your browser to refuse all or some browser cookies or to alert you when cookies are being sent.
            However, some parts of our Platform may not function properly if you disable cookies.
          </p>
        </section>
        
        <section>
          <h2>8. Third-Party Links</h2>
          <p>
            Our Platform may contain links to third-party websites, services, or content that are not owned or controlled by us.
            We have no control over and assume no responsibility for the privacy practices of any third-party sites or services.
            We encourage you to review the privacy policies of any third-party sites you visit.
          </p>
        </section>
        
        <section>
          <h2>9. Children's Privacy</h2>
          <p>
            Our Platform is not intended for children under 16 years of age. We do not knowingly collect personal information from children.
            If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </p>
        </section>
        
        <section>
          <h2>10. Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page
            and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>
        
        <section>
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="contact-info">
            Email: privacy@theelefit.com<br />
            Address: [Your Company Address]<br />
            Phone: [Your Company Phone Number]
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 