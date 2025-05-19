import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ExpertsPage from './pages/ExpertsPage';
import ExpertDetailPage from './pages/ExpertDetailPage';
import RegistrationPage from './pages/RegistrationPage';
import AuthPage from './pages/AuthPage';
import ExpertProfileSetup from './pages/ExpertProfileSetup';
import ExpertDashboard from './pages/ExpertDashboard';
import UserDashboard from './pages/UserDashboard';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import { seedExpertsData } from './services/seedData';
import './App.css';

// ScrollToTop component to reset scroll on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

function App() {
  useEffect(() => {
    // Seed the Firestore database with initial data if needed
    seedExpertsData().catch(console.error);
  }, []);

  return (
    <Router>
      <div className="App">
        <ScrollToTop />
        <Navbar />
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/experts" element={<ExpertsPage />} />
            <Route path="/expert/:id" element={<ExpertDetailPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/expert-profile-setup" element={<ExpertProfileSetup />} />
            <Route path="/expert-dashboard" element={<ExpertDashboard />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
