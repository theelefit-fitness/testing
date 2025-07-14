import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, deleteUser, getAuth } from 'firebase/auth';
import { generateRandomPassword, sendExpertApprovalEmail, sendExpertRejectionEmail, sendExpertApprovalEmailWithReset } from '../services/emailService';
import { registerUser } from '../services/firebase';
import './AdminPanel.css';
import AdminDashboard from '../components/AdminDashboard';
import UserDetails from '../components/UserDetails';
import ExpertDetails from '../components/ExpertDetails';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [applications, setApplications] = useState([]);
  const [experts, setExperts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, type: '', id: null });
  const [theme, setTheme] = useState('light');
  const [dashboardTimeRange, setDashboardTimeRange] = useState('24h');

  useEffect(() => {
    // Load data based on active tab
    loadData(activeTab);
  }, [activeTab]);

  // Check for selected application ID in localStorage when applications are loaded
  useEffect(() => {
    if (activeTab === 'applications' && applications.length > 0) {
      const selectedAppId = window.localStorage.getItem('selectedAppId');
      if (selectedAppId) {
        const foundApp = applications.find(app => app.id === selectedAppId);
        if (foundApp) {
          setSelectedApp(foundApp);
          // Clear the stored ID after use
          window.localStorage.removeItem('selectedAppId');
        }
      }
    }
  }, [activeTab, applications]);

  const loadData = async (tabName) => {
    setLoading(true);
    setError('');
    
    try {
      if (tabName === 'applications') {
        await loadApplications();
      } else if (tabName === 'experts') {
        await loadExperts();
      } else if (tabName === 'users') {
        await loadUsers();
      } else if (tabName === 'dashboard') {
        await Promise.all([loadExperts(), loadUsers()]);
      }
    } catch (error) {
      console.error(`Error loading ${tabName}:`, error);
      setError(`Failed to load ${tabName}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      // Get all expert applications from Firestore
      const applicationsCollection = collection(db, 'expertApplications');
      const applicationsSnapshot = await getDocs(applicationsCollection);
      
      const applicationsList = applicationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          // Ensure status is properly set (null/undefined become 'pending')
          status: data.status || 'pending'
        };
      });
      
      // Log for debugging
      console.log(`Loaded ${applicationsList.length} applications`);
      console.log(`Pending applications: ${applicationsList.filter(app => app.status === 'pending').length}`);
      
      // Sort by creation date, newest first
      applicationsList.sort((a, b) => b.createdAt - a.createdAt);
      
      setApplications(applicationsList);
      return applicationsList;
    } catch (error) {
      console.error("Error loading applications:", error);
      throw error;
    }
  };

  const loadExperts = async () => {
    try {
      // Get all experts from Firestore (users with userType 'expert')
      const usersCollection = collection(db, 'users');
      const expertsQuery = query(usersCollection, where("userType", "==", "expert"));
      const expertsSnapshot = await getDocs(expertsQuery);
      
      const expertsList = await Promise.all(expertsSnapshot.docs.map(async (docSnapshot) => {
        const userData = docSnapshot.data();
        
        // Get expert profile data from experts collection
        const expertProfileRef = doc(db, 'experts', docSnapshot.id);
        const expertProfileSnapshot = await getDoc(expertProfileRef);
        
        const profile = expertProfileSnapshot.exists() 
          ? expertProfileSnapshot.data() 
          : { name: userData.email };
        
        return {
          uid: docSnapshot.id,
          ...userData,
          profile,
          createdAt: userData.createdAt?.toDate() || new Date()
        };
      }));
      
      // Sort by creation date, newest first
      expertsList.sort((a, b) => b.createdAt - a.createdAt);
      
      setExperts(expertsList);
    } catch (error) {
      console.error("Error loading experts:", error);
      throw error;
    }
  };

  const loadUsers = async () => {
    try {
      // Get all regular users from Firestore
      const usersCollection = collection(db, 'users');
      const usersQuery = query(usersCollection, where("userType", "==", "user"));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersList = await Promise.all(usersSnapshot.docs.map(async (docSnapshot) => {
        const userData = docSnapshot.data();
        
        // Get user-related data
        // For example, get booking history
        const bookingsCollection = collection(db, 'bookings');
        const userBookingsQuery = query(bookingsCollection, where("userId", "==", docSnapshot.id));
        const bookingsSnapshot = await getDocs(userBookingsQuery);
        
        const bookings = bookingsSnapshot.docs.map(bookingDoc => ({
          id: bookingDoc.id,
          ...bookingDoc.data(),
          timestamp: bookingDoc.data().timestamp?.toDate() || new Date()
        }));
        
        // Get reviews
        const reviewsCollection = collection(db, 'reviews');
        const userReviewsQuery = query(reviewsCollection, where("userId", "==", docSnapshot.id));
        const reviewsSnapshot = await getDocs(userReviewsQuery);
        
        const reviews = reviewsSnapshot.docs.map(reviewDoc => ({
          id: reviewDoc.id,
          ...reviewDoc.data(),
          timestamp: reviewDoc.data().timestamp?.toDate() || new Date()
        }));
        
        return {
          uid: docSnapshot.id,
          ...userData,
          bookings,
          reviews,
          createdAt: userData.createdAt?.toDate() || new Date()
        };
      }));
      
      // Sort by creation date, newest first
      usersList.sort((a, b) => b.createdAt - a.createdAt);
      
      setUsers(usersList);
    } catch (error) {
      console.error("Error loading users:", error);
      throw error;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    navigate('/admin');
  };

  const approveApplication = async (application) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Generate random password
      const randomPassword = generateRandomPassword();
      console.log(`Generated password for expert: ${randomPassword}`);
      
      // First check if user already exists in Firebase
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where("email", "==", application.email));
      const userSnapshot = await getDocs(userQuery);
      let existingUser = null;
      let uid = null;
      
      if (!userSnapshot.empty) {
        console.log("User already exists in Firebase, will update instead of create");
        existingUser = userSnapshot.docs[0];
        uid = existingUser.id;
      }
      
      // Register the expert user in Firebase Auth with expert userType
      let result;
      
      if (existingUser) {
        // Update existing user to expert type
        await setDoc(doc(db, 'users', uid), {
          email: application.email,
          userType: 'expert',
          updatedAt: new Date()
        }, { merge: true });
        
        result = {
          success: true,
          email: application.email,
          uid: uid,
          shopifyIntegrated: false,
          existingUser: true
        };
        
        console.log("Existing user updated to expert type:", result);
      } else {
        // Create new user
        try {
          result = await registerUser(application.email, randomPassword, 'expert', {
            name: application.name,
            phone: application.phone,
            specialty: application.specialty
          });
          
          console.log('Expert registration result:', result);
        } catch (registerError) {
          console.error("Error registering expert:", registerError);
          
          // Check if error is because user already exists
          if (registerError.message && registerError.message.includes('auth/email-already-in-use')) {
            console.log("User exists in Firebase Auth but not in Firestore, creating Firestore document");
            
            // Try to sign in with the new password to get the UID
            try {
              const userCredential = await signInWithEmailAndPassword(auth, application.email, randomPassword);
              uid = userCredential.user.uid;
              
              // Create user profile in Firestore
              await setDoc(doc(db, 'users', uid), {
                email: application.email,
                userType: 'expert',
                createdAt: new Date(),
                shopifyMapped: false
              });
              
              result = {
                success: true,
                email: application.email,
                uid: uid,
                shopifyIntegrated: false
              };
              
              console.log("Created Firestore document for existing auth user:", result);
            } catch (signInError) {
              console.error("Could not sign in with new password, sending password reset email instead");
              
              // Send password reset email
              await sendPasswordResetEmail(application.email);
              
              // Try direct Firebase registration without Shopify
              console.log("Attempting to create Firestore document without knowing UID");
              
              // We don't know the UID, so we'll create a document with a generated ID
              const userDocRef = await addDoc(collection(db, 'pendingExperts'), {
                email: application.email,
                name: application.name,
                phone: application.phone,
                specialty: application.specialty,
                bio: application.bio,
                experience: application.experience,
                education: application.education,
                qualifications: application.qualifications,
                createdAt: new Date(),
                status: 'pending_auth',
                needsPasswordReset: true
              });
              
              result = {
                success: true,
                email: application.email,
                pendingId: userDocRef.id,
                shopifyIntegrated: false,
                needsPasswordReset: true
              };
            }
          } else {
            // Try direct Firebase registration without Shopify
            console.log("Attempting direct Firebase registration without Shopify...");
            
            try {
              // Create user in Firebase Auth
              const userCredential = await createUserWithEmailAndPassword(auth, application.email, randomPassword);
              const user = userCredential.user;
              
              // Create user profile in Firestore
              await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                userType: 'expert',
                createdAt: new Date(),
                shopifyMapped: false
              });
              
              result = {
                success: true,
                email: application.email,
                uid: user.uid,
                shopifyIntegrated: false
              };
              
              console.log("Direct Firebase registration successful:", result);
            } catch (directRegisterError) {
              console.error("Direct Firebase registration also failed:", directRegisterError);
              throw directRegisterError;
            }
          }
        }
      }

      if (!result.success) {
        throw new Error('Failed to create expert account');
      }
      
      // Create expert profile in experts collection
      if (result.uid) {
        await setDoc(doc(db, 'experts', result.uid), {
          name: application.name,
          email: application.email,
          phone: application.phone,
          specialty: application.specialty,
          bio: application.bio,
          experience: application.experience,
          education: application.education,
          qualifications: application.qualifications,
          createdAt: new Date(),
          status: 'active'
        });
        console.log(`Expert profile created for UID: ${result.uid}`);
      }
      
      // Update application status
      const applicationRef = doc(db, 'expertApplications', application.id);
      const updateData = {
        status: 'approved',
        approvedAt: new Date(),
        password: result.needsPasswordReset ? null : randomPassword, // Store for reference
        shopifyCustomerId: result.shopifyCustomerId || null,
        shopifyIntegrated: result.shopifyIntegrated || false
      };
      
      // Only add firebaseUid if it exists
      if (result.uid) {
        updateData.firebaseUid = result.uid;
      }
      
      if (result.pendingId) {
        updateData.pendingId = result.pendingId;
      }
      
      await updateDoc(applicationRef, updateData);
      
      // Send approval email with credentials
      if (result.needsPasswordReset) {
        await sendExpertApprovalEmailWithReset(application.email, application.name);
      } else {
        await sendExpertApprovalEmail(application.email, randomPassword, application.name);
      }
      
      setSuccess(`Expert ${application.name} has been approved successfully. An email with login credentials has been sent.`);
      
      // Refresh applications
      await loadApplications();
      
      // Update the selectedApp to reflect the status change
      const updatedApp = {...application, status: 'approved', approvedAt: new Date()};
      setSelectedApp(updatedApp);
    } catch (error) {
      console.error("Error approving expert:", error);
      setError(`Failed to approve expert: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const rejectApplication = async (application) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log("Rejecting application:", application.id);
      
      // Update application status
      const applicationRef = doc(db, 'expertApplications', application.id);
      await updateDoc(applicationRef, {
        status: 'rejected',
        rejectedAt: new Date()
      });
      
      // Send rejection email
      await sendExpertRejectionEmail(application.email, application.name);
      
      setSuccess(`Expert application for ${application.name} has been rejected.`);
      
      // Refresh applications
      await loadApplications();
      
      // Update the selectedApp to reflect the status change
      const updatedApp = {...application, status: 'rejected', rejectedAt: new Date()};
      setSelectedApp(updatedApp);
    } catch (error) {
      console.error("Error rejecting expert:", error);
      setError(`Failed to reject expert: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSelectedApp(null);
    setSelectedExpert(null);
    setSelectedUser(null);
    setError('');
    setSuccess('');
    
    // If switching to applications tab, check for a selected app ID in localStorage
    if (tab === 'applications') {
      const selectedAppId = window.localStorage.getItem('selectedAppId');
      if (selectedAppId) {
        // Find the application with this ID
        loadApplications().then(() => {
          const foundApp = applications.find(app => app.id === selectedAppId);
          if (foundApp) {
            setSelectedApp(foundApp);
          }
          // Clear the stored ID after use
          window.localStorage.removeItem('selectedAppId');
        });
      }
    }
  };

  const resendExpertCredentials = async (expert) => {
    setResendLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Find the original application to get or generate a new password
      const applicationsCollection = collection(db, 'expertApplications');
      const applicationsQuery = query(applicationsCollection, where("email", "==", expert.email));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      let password;
      
      if (!applicationsSnapshot.empty) {
        const applicationData = applicationsSnapshot.docs[0].data();
        password = applicationData.password || generateRandomPassword();
        
        // Update the application with the new password if it wasn't previously stored
        if (!applicationData.password) {
          const applicationRef = doc(db, 'expertApplications', applicationsSnapshot.docs[0].id);
          await updateDoc(applicationRef, {
            password: password
          });
        }
      } else {
        // No application found, generate a new password
        password = generateRandomPassword();
      }
      
      // Send email with credentials
      await sendExpertApprovalEmail(expert.email, password, expert.profile.name || expert.email);
      
      setSuccess(`Credentials successfully resent to ${expert.email}`);
    } catch (error) {
      console.error("Error resending credentials:", error);
      setError(`Failed to resend credentials: ${error.message}`);
    } finally {
      setResendLoading(false);
    }
  };

  // Function to handle expert deletion
  const deleteExpert = async (expertId) => {
    try {
      setActionLoading(true);
      
      // 1. Delete from Firestore 'users' collection
      await deleteDoc(doc(db, 'users', expertId));
      
      // 2. Delete from Firestore 'experts' collection
      await deleteDoc(doc(db, 'experts', expertId));
      
      // 3. Delete bookings
      const bookingsCollection = collection(db, 'bookings');
      const expertBookingsQuery = query(bookingsCollection, where("expertId", "==", expertId));
      const bookingsSnapshot = await getDocs(expertBookingsQuery);
      
      const deleteBookingsPromises = bookingsSnapshot.docs.map(bookingDoc => 
        deleteDoc(doc(db, 'bookings', bookingDoc.id))
      );
      await Promise.all(deleteBookingsPromises);
      
      // 4. Delete reviews
      const reviewsCollection = collection(db, 'reviews');
      const expertReviewsQuery = query(reviewsCollection, where("expertId", "==", expertId));
      const reviewsSnapshot = await getDocs(expertReviewsQuery);
      
      const deleteReviewsPromises = reviewsSnapshot.docs.map(reviewDoc => 
        deleteDoc(doc(db, 'reviews', reviewDoc.id))
      );
      await Promise.all(deleteReviewsPromises);
      
      // 5. Remove from the experts list and reset selected expert
      setExperts(prevExperts => prevExperts.filter(expert => expert.uid !== expertId));
      setSelectedExpert(null);
      setSuccess('Expert deleted successfully');
      setDeleteConfirmation({ show: false, type: '', id: null });
      
      // Note: Deleting the Firebase Auth user requires Admin SDK which isn't available in client-side code
      // This would need to be handled via a Cloud Function or backend service
      
    } catch (error) {
      console.error('Error deleting expert:', error);
      setError('Failed to delete expert. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Function to handle user deletion
  const deleteUser = async (userId) => {
    try {
      setActionLoading(true);
      
      // 1. Delete from Firestore 'users' collection
      await deleteDoc(doc(db, 'users', userId));
      
      // 2. Delete bookings
      const bookingsCollection = collection(db, 'bookings');
      const userBookingsQuery = query(bookingsCollection, where("userId", "==", userId));
      const bookingsSnapshot = await getDocs(userBookingsQuery);
      
      const deleteBookingsPromises = bookingsSnapshot.docs.map(bookingDoc => 
        deleteDoc(doc(db, 'bookings', bookingDoc.id))
      );
      await Promise.all(deleteBookingsPromises);
      
      // 3. Delete reviews
      const reviewsCollection = collection(db, 'reviews');
      const userReviewsQuery = query(reviewsCollection, where("userId", "==", userId));
      const reviewsSnapshot = await getDocs(userReviewsQuery);
      
      const deleteReviewsPromises = reviewsSnapshot.docs.map(reviewDoc => 
        deleteDoc(doc(db, 'reviews', reviewDoc.id))
      );
      await Promise.all(deleteReviewsPromises);
      
      // 4. Remove from the users list and reset selected user
      setUsers(prevUsers => prevUsers.filter(user => user.uid !== userId));
      setSelectedUser(null);
      setSuccess('User deleted successfully');
      setDeleteConfirmation({ show: false, type: '', id: null });
      
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    // Apply theme to body
    document.body.classList.toggle('dark-theme');
  };

  // Get total count of active users (experts + normal users)
  const getTotalActiveUsers = () => {
    return experts.length + users.length;
  };

  // Function to render delete confirmation dialog
  const renderDeleteConfirmation = () => {
    if (!deleteConfirmation.show) return null;
    
    const type = deleteConfirmation.type;
    const id = deleteConfirmation.id;
    
    return (
      <div className="delete-confirmation-overlay">
        <div className="delete-confirmation-modal">
          <h3>Confirm Deletion</h3>
          <p>Are you sure you want to delete this {type}? This action cannot be undone.</p>
          <div className="delete-confirmation-buttons">
            <button 
              className="cancel-button"
              onClick={() => setDeleteConfirmation({ show: false, type: '', id: null })}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button 
              className="delete-button"
              onClick={() => type === 'expert' ? deleteExpert(id) : deleteUser(id)}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`admin-panel ${theme}-theme`}>
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-header-actions">
          <button onClick={toggleTheme} className="theme-toggle-button">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button onClick={logout} className="admin-logout-button">Logout</button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => changeTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`admin-tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => changeTab('applications')}
        >
          Expert Applications
        </button>
        <button 
          className={`admin-tab ${activeTab === 'experts' ? 'active' : ''}`}
          onClick={() => changeTab('experts')}
        >
          All Experts
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => changeTab('users')}
        >
          All Users
        </button>
      </div>
      
      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <AdminDashboard 
          experts={experts}
          users={users}
          timeRange={dashboardTimeRange}
          setTimeRange={setDashboardTimeRange}
          theme={theme}
          loading={loading}
          onChangeTab={changeTab}
        />
      )}
      
      {/* Expert Applications Tab */}
      {activeTab === 'applications' && (
        <div className="admin-panel-content">
          <div className="applications-list">
            <h2>Applications {loading && <span className="loading-text">(Loading...)</span>}</h2>
            
            {applications.length === 0 && !loading ? (
              <p className="no-data">No applications found.</p>
            ) : (
              <ul className="applications">
                {applications.map(app => (
                  <li 
                    key={app.id} 
                    className={`application-item ${selectedApp?.id === app.id ? 'selected' : ''} ${app.status}`}
                    onClick={() => setSelectedApp(app)}
                  >
                    <div className="app-basic-info">
                      <span className="app-name">{app.name}</span>
                      <span className="app-specialty">{app.specialty}</span>
                    </div>
                    <div className="app-meta">
                      <span className="app-date">
                        {app.createdAt.toLocaleDateString()}
                      </span>
                      <span className="app-status">{app.status || 'pending'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="application-details">
            {selectedApp ? (
              <div className="application-info">
                <h2>Application Details</h2>
                
                <div className="app-detail-header">
                  <h3>{selectedApp.name}</h3>
                  <span className={`status-badge ${selectedApp.status || 'pending'}`}>
                    {selectedApp.status || 'Pending'}
                  </span>
                </div>
                
                <div className="application-data">
                  <div className="data-row">
                    <div className="data-label">Email:</div>
                    <div className="data-value">{selectedApp.email}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Phone:</div>
                    <div className="data-value">{selectedApp.phone}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Specialty:</div>
                    <div className="data-value">{selectedApp.specialty}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Experience:</div>
                    <div className="data-value">{selectedApp.experience}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Education:</div>
                    <div className="data-value">{selectedApp.education}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Qualifications:</div>
                    <div className="data-value">{selectedApp.qualifications}</div>
                  </div>
                  <div className="data-row full">
                    <div className="data-label">Bio:</div>
                    <div className="data-value bio">{selectedApp.bio}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Submitted:</div>
                    <div className="data-value">{selectedApp.createdAt.toLocaleString()}</div>
                  </div>
                </div>
                
                {/* Application Action Buttons - Show for pending applications */}
                {(selectedApp.status === 'pending' || !selectedApp.status) && (
                  <div className="action-buttons application-actions">
                    <button 
                      className="reject-button"
                      onClick={() => rejectApplication(selectedApp)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Reject Application'}
                    </button>
                    <button 
                      className="approve-button"
                      onClick={() => approveApplication(selectedApp)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Approve & Create Account'}
                    </button>
                  </div>
                )}
                
                {selectedApp.status === 'approved' && (
                  <div className="approval-info">
                    <p>This application was approved and an expert account has been created.</p>
                    <p>An email with login instructions was sent to the applicant.</p>
                  </div>
                )}
                
                {selectedApp.status === 'rejected' && (
                  <div className="rejection-info">
                    <p>This application was rejected.</p>
                    <p>A notification email was sent to the applicant.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-selection">
                <p>Select an application to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Experts Tab */}
      {activeTab === 'experts' && (
        <div className="admin-panel-content">
          <div className="applications-list">
            <h2>Experts {loading && <span className="loading-text">(Loading...)</span>}</h2>
            
            {experts.length === 0 && !loading ? (
              <p className="no-data">No experts found.</p>
            ) : (
              <ul className="applications">
                {experts.map(expert => (
                  <li 
                    key={expert.uid} 
                    className={`application-item ${selectedExpert?.uid === expert.uid ? 'selected' : ''}`}
                    onClick={() => setSelectedExpert(expert)}
                  >
                    <div className="app-basic-info">
                      <span className="app-name">{expert.profile.name || expert.email}</span>
                      <span className="app-specialty">{expert.profile.specialty || 'Specialty not set'}</span>
                    </div>
                    <div className="app-meta">
                      <span className="app-date">
                        {expert.createdAt.toLocaleDateString()}
                      </span>
                      <span className="app-status">Active</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="application-details">
            {selectedExpert ? (
              <ExpertDetails 
                expert={selectedExpert} 
                onDelete={() => setDeleteConfirmation({ 
                  show: true, 
                  type: 'expert', 
                  id: selectedExpert.uid 
                })} 
                onResendCredentials={async () => {
                  try {
                    setResendLoading(true);
                    // Reset password
                    await sendPasswordResetEmail(auth, selectedExpert.email);
                    setSuccess(`Password reset email sent to ${selectedExpert.email}`);
                  } catch (error) {
                    console.error('Error resending credentials:', error);
                    setError('Failed to send reset email. Please try again.');
                  } finally {
                    setResendLoading(false);
                  }
                }}
                resendLoading={resendLoading}
              />
            ) : (
              <div className="no-selection">
                <p>Select an expert to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="admin-panel-content">
          <div className="applications-list">
            <h2>Users {loading && <span className="loading-text">(Loading...)</span>}</h2>
            
            {users.length === 0 && !loading ? (
              <p className="no-data">No users found.</p>
            ) : (
              <ul className="applications">
                {users.map(user => (
                  <li 
                    key={user.uid} 
                    className={`application-item ${selectedUser?.uid === user.uid ? 'selected' : ''}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="app-basic-info">
                      <span className="app-name">{user.email}</span>
                      <span className="app-specialty">Regular User</span>
                    </div>
                    <div className="app-meta">
                      <span className="app-date">
                        {user.createdAt.toLocaleDateString()}
                      </span>
                      <span className="app-status">Active</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="application-details">
            {selectedUser ? (
              <UserDetails 
                user={selectedUser} 
                onDelete={() => setDeleteConfirmation({ 
                  show: true, 
                  type: 'user', 
                  id: selectedUser.uid 
                })} 
              />
            ) : (
              <div className="no-selection">
                <p>Select a user to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Render delete confirmation dialog */}
      {renderDeleteConfirmation()}
    </div>
  );
};

export default AdminPanel; 