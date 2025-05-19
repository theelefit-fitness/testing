import React, { useEffect } from 'react';

const GoogleAuthCallback = () => {
  useEffect(() => {
    // Get the authorization code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Send the code back to the opener window
      window.opener.postMessage(
        { type: 'GOOGLE_AUTH_CODE', code },
        window.location.origin
      );
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Authentication Complete</h2>
      <p>You can close this window and return to the application.</p>
    </div>
  );
};

export default GoogleAuthCallback; 