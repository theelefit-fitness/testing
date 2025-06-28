import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, getUserType } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { IoNotificationsOutline } from 'react-icons/io5';
import { BsChatDots } from 'react-icons/bs';
import { HiOutlineUserGroup } from 'react-icons/hi';
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
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
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'auto';
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

  const isCommunityPage = location.pathname === '/community';

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
            <Link to="/community" className="nav-link" onClick={() => setMenuOpen(false)}>
              Community
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/experts" className="nav-link" onClick={() => setMenuOpen(false)}>
              Find Expert
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/apply-as-expert" className="nav-link" onClick={() => setMenuOpen(false)}>
              Apply as Expert
            </Link>
          </li>

          {/* AI Coach visible to all, but redirects based on auth status */}
          <li className="nav-item">
            <Link
              to={currentUser ? "/aicoach" : "/auth"}
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              AI Coach
            </Link>
          </li>

          {!loading && (
            <>
              {currentUser ? (
                <>
                  <li className="nav-item">
                    {userType === 'expert' ? (
                      <Link to="/expert-dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>
                        Dashboard
                      </Link>
                    ) : (
                      <Link to="/user-dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>
                        My Dashboard
                      </Link>
                    )}
                  </li>

                  {isCommunityPage && (
                    <div className="nav-icons">
                      <li className="nav-item icon-item">
                        <Link to="/notifications" className="nav-icon-link">
                          <IoNotificationsOutline className="nav-icon" />
                          <span className="icon-badge">2</span>
                        </Link>
                      </li>
                      <li className="nav-item icon-item">
                        <Link to="/chat" className="nav-icon-link">
                          <BsChatDots className="nav-icon" />
                          <span className="icon-badge">3</span>
                        </Link>
                      </li>
                      <li className="nav-item icon-item">
                        <Link to="/connections" className="nav-icon-link">
                          <HiOutlineUserGroup className="nav-icon" />
                        </Link>
                      </li>
                    </div>
                  )}

                  <li className="nav-item">
                    <button onClick={handleLogout} className="nav-button">
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <Link to="/auth" className="nav-link-button" onClick={() => setMenuOpen(false)}>
                    Login / Register
                  </Link>
                </li>
              )}
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
