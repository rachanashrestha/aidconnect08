import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">AidConnect</Link>
      </div>

      <div className="navbar-menu">
        {user ? (
          <>
            <Link to="/dashboard" className="navbar-item">
              Dashboard
            </Link>
            {user.role === 'requester' && (
              <Link to="/requester/requests/new" className="navbar-item">
                New Request
              </Link>
            )}
            <Link to="/requests" className="navbar-item">
              Requests
            </Link>
            <Link to="/chat" className="navbar-item">
              Messages
            </Link>
            <div className="navbar-item">
              <NotificationBell />
            </div>
            <div className="navbar-item user-menu">
              <img
                src={user.profilePicture || '/default-avatar.png'}
                alt={user.name}
                className="user-avatar"
              />
              <div className="user-dropdown">
                <Link to="/profile" className="dropdown-item">
                  Profile
                </Link>
                <button onClick={handleLogout} className="dropdown-item">
                  Logout
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-item">
              Login
            </Link>
            <Link to="/register" className="navbar-item">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 