import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, registerUser, loginUser, getUserType } from '../services/firebase';
import './AuthPage.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.returnPath || '/';
  
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        // Handle login
        const user = await loginUser(email, password);
        // Check user type
        const type = await getUserType(user.uid);
        
        if (type === 'expert') {
          navigate('/expert-dashboard');
        } else {
          // Regular user goes to user dashboard
          navigate('/user-dashboard');
        }
      } else {
        // Handle registration
        const result = await registerUser(email, password, userType);
        
        // Show success message and switch to login form
        setSuccess(`Registration successful! Please log in with your new account.`);
        setIsLogin(true);
        // Clear form fields
        setPassword('');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`} 
            onClick={() => {
              setIsLogin(true);
              setError('');
              setSuccess('');
            }}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`} 
            onClick={() => {
              setIsLogin(false);
              setError('');
              setSuccess('');
            }}
          >
            Register
          </button>
        </div>
        
      
        
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>I am a:</label>
              <div className="user-type-options">
                <label className="user-type-option">
                  <input
                    type="radio"
                    name="userType"
                    value="user"
                    checked={userType === 'user'}
                    onChange={() => setUserType('user')}
                  />
                  <span>User</span>
                </label>
                <label className="user-type-option">
                  <input
                    type="radio"
                    name="userType"
                    value="expert"
                    checked={userType === 'expert'}
                    onChange={() => setUserType('expert')}
                  />
                  <span>Expert</span>
                </label>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        
        <p className="auth-toggle">
          {isLogin 
            ? "Don't have an account? " 
            : "Already have an account? "}
          <button 
            className="toggle-link"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
          >
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage; 