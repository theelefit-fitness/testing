import React, { useEffect, useState } from 'react';
import googleCalendarService from '../services/googleCalendarService';

const GoogleCalendarAuth = ({ onAuthSuccess }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeGoogleAuth();
  }, []);

  const initializeGoogleAuth = async () => {
    try {
      await googleCalendarService.init();
      const signedIn = googleCalendarService.isSignedIn();
      setIsAuthenticated(signedIn);
      if (signedIn && onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    try {
      setIsLoading(true);
      await googleCalendarService.signIn();
      setIsAuthenticated(true);
      onAuthSuccess && onAuthSuccess();
    } catch (error) {
      console.error('Error during Google Calendar authentication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await googleCalendarService.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {!isAuthenticated ? (
        <button onClick={handleAuth} disabled={isLoading}>
          Connect Google Calendar
        </button>
      ) : (
        <button onClick={handleLogout}>
          Disconnect Google Calendar
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarAuth; 