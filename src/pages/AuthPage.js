import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, registerUser, loginUser, getUserType, sendPasswordResetEmail } from '../services/firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import './AuthPage.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.returnPath || '/';
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [retryData, setRetryData] = useState(null);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isEvaCustomer, setIsEvaCustomer] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Password validation function
  const validatePassword = (value) => {
    const strength = {
      score: 0,
      hasMinLength: value.length >= 8,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value)
    };

    // Calculate score based on criteria
    if (strength.hasMinLength) strength.score++;
    if (strength.hasUpperCase) strength.score++;
    if (strength.hasLowerCase) strength.score++;
    if (strength.hasNumber) strength.score++;
    if (strength.hasSpecialChar) strength.score++;

    setPasswordStrength(strength);
    return strength;
  };

  // Handle password change with validation
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (!isLogin) {
      validatePassword(newPassword);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Only redirect if we have a valid user type
        try {
          const userType = await getUserType(user.uid);
          if (userType) { // Only redirect if we have a valid user type
            if (userType === 'expert') {
              navigate('/expert-dashboard');
            } else {
              navigate('/user-dashboard');
            }
          }
        } catch (error) {
          console.error("Error checking user type:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Effect to handle auto-retry for Shopify users
  useEffect(() => {
    const performRetry = async () => {
      if (retryData && retryData.shouldRetry) {
        console.log('Automatically retrying login with same credentials...');
        setLoading(true);
        setError('');
        
        try {
          // Small delay to ensure UI feedback
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Try login again with same credentials
          const user = await loginUser(retryData.email, retryData.password);
          
          // Check if user was just mapped from Shopify to Firebase
          if (user.justMapped) {
            setSuccess('Your Shopify account has been successfully connected!');
            setTimeout(() => {
              checkUserTypeAndNavigate(user.uid);
            }, 1000);
          } else {
            checkUserTypeAndNavigate(user.uid);
          }
        } catch (retryError) {
          console.error('Retry login failed:', retryError);
          setError(retryError.message);
        } finally {
          setLoading(false);
          setRetryData(null); // Clear retry data
        }
      }
    };
    
    performRetry();
  }, [retryData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setShowLoginHint(false);

    try {
      if (!isLogin) {
        // Validate password for registration
        const strength = validatePassword(password);
        if (strength.score < 4) {
          setError('Password must meet all requirements');
          setLoading(false);
          return;
        }

        const additionalData = {
          firstName,
          lastName,
          isEvaCustomer
        };
        
        await registerUser(email, password, 'user', additionalData);
        const registeredEmailTemp = email;
        
        // Clear form and switch to login
        setPassword('');
        setFirstName('');
        setLastName('');
        setIsEvaCustomer(false);
        setIsLogin(true);
        
        // Set success message and email after state updates
        setTimeout(() => {
          setSuccess('Account created successfully! Please sign in with your credentials.');
          setEmail(registeredEmailTemp);
        }, 100);

      } else if (isForgotPassword) {
        await sendPasswordResetEmail(email);
        setSuccess('Password reset email sent. Please check your inbox.');
        setIsForgotPassword(false);
      } else {
        try {
        const user = await loginUser(email, password);
        
        if (user.justMapped) {
          setSuccess('Your Shopify account has been successfully connected!');
          setTimeout(() => {
            checkUserTypeAndNavigate(user.uid);
            }, 1000);
        } else {
          checkUserTypeAndNavigate(user.uid);
          }
        } catch (loginError) {
          console.error('Login error:', loginError);
          
          if (loginError.message && 
              (loginError.message.includes('Shopify account has been connected') || 
               loginError.message.includes('Please log in again'))) {
            
            setError('');
            setSuccess('Connecting to your account...');
            setShowLoginHint(true);
            
            // Automatically retry without user intervention
            setRetryData({
              shouldRetry: true,
              email: email,
              password: password
            });
            
          } else if (loginError.message && loginError.message.includes('Email or password is incorrect')) {
              setError(loginError.message);
          } else {
            setError(loginError.message);
          }
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      if (!retryData) {
      setLoading(false);
      }
    }
  };
  
  // Helper function to check user type and navigate to appropriate dashboard
  const checkUserTypeAndNavigate = async (uid) => {
    // Check user type
    const type = await getUserType(uid);
    
    if (type === 'expert') {
      navigate('/expert-dashboard');
    } else if (type === 'admin') {
      navigate('/admin');
    } else {
      // Regular user goes to user dashboard
      navigate('/user-dashboard');
    }
  };

  // Handle tab switch
  const handleTabSwitch = (isLoginTab) => {
    setIsLogin(isLoginTab);
    setError('');
    setSuccess('');
    setRetryData(null);
    setShowLoginHint(false);
    // Keep email if switching after registration
    if (isLoginTab && registeredEmail) {
      setEmail(registeredEmail);
    } else {
      setEmail('');
    }
    setPassword('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>{isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back!' : 'Create Account'}</h1>
          <p>
            {isForgotPassword
              ? 'Enter your email to reset your password'
              : isLogin
              ? 'Sign in to access your account'
              : 'Join our community of nutrition experts'}
          </p>
        </div>

        {!isForgotPassword && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => handleTabSwitch(true)}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => handleTabSwitch(false)}
            >
              Sign Up
            </button>
          </div>
        )}

        {error && (
          <div className="auth-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="auth-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {success}
          </div>
        )}

        {showLoginHint && (
          <div className="auth-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Setting up your account, please wait...
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && !isForgotPassword && (
            <>
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="evaCustomer">
                  Are you an EVA customer? <span className="required-star">*</span>
                </label>
                <select
                  id="evaCustomer"
                  value={isEvaCustomer}
                  onChange={(e) => setIsEvaCustomer(e.target.value === 'true')}
                  required
                  disabled={loading}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">
              Email Address {!isLogin && <span className="required-star">*</span>}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          {!isForgotPassword && (
            <div className="form-group">
              <label htmlFor="password">
                Password {!isLogin && <span className="required-star">*</span>}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                required
                disabled={loading}
              />
              {!isLogin && (
                <div className="password-strength">
                  <div className={`strength-bar ${passwordStrength.score >= 1 ? 'active' : ''}`}></div>
                  <div className={`strength-bar ${passwordStrength.score >= 2 ? 'active' : ''}`}></div>
                  <div className={`strength-bar ${passwordStrength.score >= 3 ? 'active' : ''}`}></div>
                  <div className={`strength-bar ${passwordStrength.score >= 4 ? 'active' : ''}`}></div>
                  <div className={`strength-bar ${passwordStrength.score >= 5 ? 'active' : ''}`}></div>
                  
                  <div className="password-requirements">
                    <p className={passwordStrength.hasMinLength ? 'met' : ''}>
                      ✓ At least 8 characters
                    </p>
                    <p className={passwordStrength.hasUpperCase ? 'met' : ''}>
                      ✓ One uppercase letter
                    </p>
                    <p className={passwordStrength.hasLowerCase ? 'met' : ''}>
                      ✓ One lowercase letter
                    </p>
                    <p className={passwordStrength.hasNumber ? 'met' : ''}>
                      ✓ One number
                    </p>
                    <p className={passwordStrength.hasSpecialChar ? 'met' : ''}>
                      ✓ One special character
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className="forgot-password">
              <button
                type="button"
                className="forgot-link"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setSuccess('');
                }}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              isForgotPassword ? 'Resetting...' : 
              isLogin && retryData ? 'Connecting account...' : 
              isLogin ? 'Authenticating...' : 
              'Processing...'
            ) : (
              isForgotPassword ? 'Reset Password' : 
              isLogin ? 'Sign In' : 
              'Create Account'
            )}
          </button>

          {isForgotPassword && (
            <>
            <div className="auth-divider">
              <span>OR</span>
            </div>
            <button
              type="button"
                className="auth-button secondary"
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccess('');
              }}
                disabled={loading}
            >
              Back to Sign In
            </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthPage; 