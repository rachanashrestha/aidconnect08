import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, Clock, CheckCircle } from 'react-feather';
import './Profile.css';

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
    setLoading(true);
    setError(null);

        // Check if userId is available
        if (!userId) {
          // If no userId in params, try to get current user's ID from localStorage
          const currentUserId = localStorage.getItem('userId');
          if (currentUserId) {
            navigate(`/profile/${currentUserId}`);
            return;
          } else {
            setError('User ID not found');
            setLoading(false);
            return;
          }
        }

        // Fetch user profile
        const userResponse = await axios.get(
          `http://localhost:5000/api/user/${userId}`,
        {
          headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        }
      );
        setUser(userResponse.data);

        // Fetch user's requests
        const requestsResponse = await axios.get(
          `http://localhost:5000/api/user/${userId}/requests`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setRequests(requestsResponse.data);
    } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

    fetchUserData();
  }, [userId, navigate]);

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="profile-error">{error}</div>;
  }

  if (!user) {
    return <div className="profile-error">User not found</div>;
  }

  return (
    <div className="profile-container">
        <div className="profile-header">
        <div className="profile-avatar">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} />
          ) : (
            <div className="avatar-placeholder">
              {user.name.charAt(0).toUpperCase()}
          </div>
          )}
        </div>
        <div className="profile-info">
          <h1>{user.name}</h1>
          <p className="profile-email">{user.email}</p>
          {user.role === 'volunteer' && (
            <div className="volunteer-stats">
              <div className="rating">
                <Star size={20} fill="#FFD700" />
                <span>{user.averageRating?.toFixed(1) || '0.0'} ({user.totalRatings || 0} ratings)</span>
              </div>
              <div className="completed-requests">
                <CheckCircle size={20} />
                <span>{user.completedRequests || 0} requests completed</span>
              </div>
            </div>
              )}
            </div>
              </div>

      <div className="profile-content">
        <h2>Request History</h2>
        <div className="requests-list">
          {requests.length === 0 ? (
            <p className="no-requests">No requests found</p>
          ) : (
            requests.map(request => (
              <div key={request._id} className="request-card">
                <h3>{request.title}</h3>
                <p>{request.description}</p>
                <div className="request-meta">
                  <span className={`status-badge ${request.status}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                  <span className="timestamp">
                    <Clock size={16} />
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
              </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
