import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, getUserType } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import './Navbar.css';

const Navbar = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Get user type
        try {
          const type = await getUserType(user.uid);
          setUserType(type);
        } catch (error) {
          console.error("Error getting user type:", error);
          setUserType(null);
        }
      } else {
        setCurrentUser(null);
        setUserType(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [location.pathname]); // Re-run when path changes to ensure nav updates after login/logout

  useEffect(() => {
    // Close the mobile menu when location changes
    setMenuOpen(false);
  }, [location.pathname]);

  // Handle body scroll lock when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img 
            src="https://theelefit.com/cdn/shop/files/freepik_br_3e6ca94d-018d-4329-8cd3-828c77c68075_1.svg?v=1737707946&width=700" 
            alt="The Elefit Logo" 
            className="logo-image"
          />
        </Link>
        
        <button 
          className={`mobile-menu-toggle ${menuOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
       
        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/experts" className="nav-link" onClick={() => setMenuOpen(false)}>
              Find Experts
            </Link>
          </li>
          
          {!loading && (
            <>
              {currentUser ? (
                <>
                  <li className="nav-item">
                    {userType === 'expert' ? (
                      <Link to="/expert-dashboard" className="nav-link " onClick={() => setMenuOpen(false)}>
                        Dashboard
                      </Link>
                    ) : (
                      <Link to="/user-dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>
                        My Dashboard
                      </Link>
                    )}
                  </li>
                  <li className="nav-item ">
                    <button onClick={() => {handleLogout(); setMenuOpen(false);}} className="nav-button nav-link-button">
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link to="/auth" className="nav-link-button" onClick={() => setMenuOpen(false)}>
                      Login / Register
                    </Link>
                  </li>
                </>
              )}
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar; 