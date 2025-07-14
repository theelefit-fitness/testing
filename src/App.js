import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ExpertsPage from './pages/ExpertsPage';
import ExpertDetailPage from './pages/ExpertDetailPage';
import RegistrationPage from './pages/RegistrationPage';
import AuthPage from './pages/AuthPage';
import ExpertProfileSetup from './pages/ExpertProfileSetup';
import ExpertDashboard from './pages/ExpertDashboard';
import UserDashboard from './pages/UserDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import ExpertApplicationForm from './pages/ExpertApplicationForm';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFoundPage from './pages/NotFoundPage';
import CommunityPage from './pages/CommunityPage';
import LoadingSpinner from './components/LoadingSpinner';
import GroceryListProcessor from './pages/GroceryListProcessor';
import { seedExpertsData } from './services/seedData';
import { auth, getUserType } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './App.css';
import AiCoach from './pages/AiCoach';

// ScrollToTop component to reset scroll on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// ProtectedRoute component to guard routes that require authentication
const ProtectedRoute = ({ children }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return <LoadingSpinner text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return children;
};

// AdminProtectedRoute component specifically for admin routes
const AdminProtectedRoute = ({ children }) => {
  const [adminChecked, setAdminChecked] = useState(false);
  
  useEffect(() => {
    setAdminChecked(true);
  }, []);

  if (!adminChecked) {
    return <LoadingSpinner text="loading..." />;
  }

  const isAdminAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
  
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin" />;
  }

  return children;
};

// NonAuthRoute component to prevent authenticated users from accessing certain routes
const NonAuthRoute = ({ children }) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userType = await getUserType(currentUser.uid);
          const redirectPath = userType === 'expert' ? '/expert-dashboard' : '/user-dashboard';
          navigate(redirectPath, { replace: true });
        } catch (error) {
          console.error("Error checking user type:", error);
          navigate('/user-dashboard', { replace: true });
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (!authChecked) {
    return <LoadingSpinner text="Loading..." />;
  }

  return !user ? children : null;
};

function App() {
  useEffect(() => {
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
            <Route path="/HomePage" element={<HomePage />} />
            
            <Route path="/community" element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            } />

            <Route path="/aicoach" element={
              <ProtectedRoute>
                <AiCoach />
              </ProtectedRoute>
            } />

            <Route path="/grocery-list" element={
              <ProtectedRoute>
                <GroceryListProcessor />
              </ProtectedRoute>
            } />

            <Route path="/experts" element={<ExpertsPage />} />
            <Route path="/expert/:id" element={<ExpertDetailPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/auth" element={
              <NonAuthRoute>
                <AuthPage />
              </NonAuthRoute>
            } />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/expert-profile-setup" element={<ExpertProfileSetup />} />
            <Route path="/expert-dashboard" element={
              <ProtectedRoute>
                <ExpertDashboard />
              </ProtectedRoute>
            } />
            <Route path="/user-dashboard" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/apply-as-expert" element={<ExpertApplicationForm />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/panel" element={
              <AdminProtectedRoute>
                <AdminPanel />
              </AdminProtectedRoute>
            } />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
