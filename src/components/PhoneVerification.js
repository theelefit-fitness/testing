import React, { useState, useEffect } from 'react';
import { sendPhoneVerificationCode, verifyPhoneNumber } from '../services/firebase';
import './PhoneVerification.css';

const PhoneVerification = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [isVerified, setIsVerified] = useState(false);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clear reCAPTCHA on unmount
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const validatePhoneNumber = (number, country) => {
    const cleanNumber = number.replace(/\D/g, '');
    if (country === 'IN') {
      // Indian numbers: +91 followed by 10 digits starting with 6-9
      return /^91[6-9]\d{9}$/.test(cleanNumber);
    } else if (country === 'US') {
      // US numbers: +1 followed by 10 digits, area code starting with 2-9
      return /^1[2-9]\d{9}$/.test(cleanNumber);
    }
    return false;
  };

  const formatPhoneNumber = (number, country) => {
    const cleanNumber = number.replace(/\D/g, '');
    if (country === 'IN' && !cleanNumber.startsWith('91')) {
      return '91' + cleanNumber;
    } else if (country === 'US' && !cleanNumber.startsWith('1')) {
      return '1' + cleanNumber;
    }
    return cleanNumber;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedNumber = formatPhoneNumber(phoneNumber, selectedCountry);
      
      if (!validatePhoneNumber(formattedNumber, selectedCountry)) {
        throw new Error(`Please enter a valid ${selectedCountry === 'IN' ? 'Indian' : 'US'} phone number`);
      }

      const formattedPhoneNumber = '+' + formattedNumber;
      console.log('Sending code to:', formattedPhoneNumber);

      const verId = await sendPhoneVerificationCode(formattedPhoneNumber, 'recaptcha-container');
      setVerificationId(verId);
      setIsCodeSent(true);
      setError('');
      alert('Verification code has been sent to your phone number!');
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
      // Reset state on error
      setIsCodeSent(false);
      setVerificationId('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyPhoneNumber(verificationId, verificationCode);
      if (result.success) {
        setIsVerified(true);
        setError('');
        alert('Phone number verified successfully!');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-verification-container">
      <h2>Phone Number Verification</h2>
      
      {!isVerified ? (
        <>
          {!isCodeSent ? (
            <form onSubmit={handleSendCode}>
              <div className="form-group">
                <label>Select Country:</label>
                <select 
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="country-select"
                  disabled={loading}
                >
                  <option value="IN">India (+91)</option>
                  <option value="US">United States (+1)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phone Number:</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder={selectedCountry === 'IN' ? '9876543210' : '2345678900'}
                  className="phone-input"
                  disabled={loading}
                  required
                />
                <small>
                  {selectedCountry === 'IN' 
                    ? 'Enter 10-digit Indian mobile number without country code'
                    : 'Enter 10-digit US phone number without country code'}
                </small>
              </div>

              <div id="recaptcha-container" className="recaptcha-container"></div>

              <button 
                type="submit" 
                disabled={loading || !phoneNumber}
                className="submit-button"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <div className="form-group">
                <label>Verification Code:</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  className="code-input"
                  disabled={loading}
                  required
                />
                <small>Enter the 6-digit code sent to your phone</small>
              </div>

              <button 
                type="submit" 
                disabled={loading || verificationCode.length !== 6}
                className="submit-button"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setIsCodeSent(false);
                  setVerificationCode('');
                  setVerificationId('');
                  setError('');
                  // Clear reCAPTCHA
                  if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                  }
                }}
                className="back-button"
                disabled={loading}
              >
                Try Different Number
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="success-message">
          <span className="success-icon">✓</span>
          Phone number verified successfully!
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default PhoneVerification; 