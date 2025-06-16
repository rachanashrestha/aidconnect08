import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
  <div className="navbar-container">
    <Link to="/" className="navbar-logo">
      AidConnect
    </Link>

    <div className="navbar-links">
      {user ? (
        <>
          <Link to="/requests">Requests</Link>
          <Link to="/dashboard">Dashboard</Link>
          <NotificationBell />

          <div className="navbar-user-dropdown">
            <button className="user-button">
              <span>{user.name}</span>
              <svg className="icon" width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
            <div className="user-dropdown">
              <Link to="/profile">Profile</Link>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup" className="signup-button">Sign Up</Link>
        </>
      )}
    </div>
  </div>
</nav>


  );
};

export default Navbar; 