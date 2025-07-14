import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { auth, getUserType } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { IoNotificationsOutline } from 'react-icons/io5';
import { BsChatDots } from 'react-icons/bs';
import { HiOutlineUserGroup } from 'react-icons/hi';
import './Navbar.css';
import { db } from '../services/firebase';
import { getDoc, doc } from 'firebase/firestore';

const Navbar = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEvaCustomer, setIsEvaCustomer] = useState(false);
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
          
          // Get user data to check if they are an EVA customer
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setIsEvaCustomer(userDoc.data().isEvaCustomer || false);
          }
        } catch (error) {
          console.error("Error getting user data:", error);
          setUserType(null);
          setIsEvaCustomer(false);
        }
      } else {
        setCurrentUser(null);
        setUserType(null);
        setIsEvaCustomer(false);
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
            <NavLink 
              to="/" 
              className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
              onClick={() => setMenuOpen(false)}
            >
              Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/community" 
              className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
              onClick={() => setMenuOpen(false)}
            >
              Community
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/experts" 
              className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
              onClick={() => setMenuOpen(false)}
            >
              Find Expert
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink 
              to="/apply-as-expert" 
              className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
              onClick={() => setMenuOpen(false)}
            >
              Apply as Expert
            </NavLink>
          </li>

          {/* AI Coach visible to all, but redirects based on auth status */}
          <li className="nav-item">
            <NavLink
              to={currentUser ? "/aicoach" : "/auth"}
              className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
              onClick={() => setMenuOpen(false)}
            >
              AI Coach
            </NavLink>
          </li>

          {/* Grocery List - only visible when logged in and is EVA customer */}
          {currentUser && isEvaCustomer && (
            <li className="nav-item">
              <NavLink
                to="/grocery-list"
                className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
                onClick={() => setMenuOpen(false)}
              >
                Grocery List
              </NavLink>
            </li>
          )}

          {!loading && (
            <>
              {currentUser ? (
                <>
                  <li className="nav-item">
                    {userType === 'expert' ? (
                      <NavLink 
                        to="/expert-dashboard" 
                        className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard
                      </NavLink>
                    ) : (
                      <NavLink 
                        to="/user-dashboard" 
                        className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
                        onClick={() => setMenuOpen(false)}
                      >
                        My Dashboard
                      </NavLink>
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
