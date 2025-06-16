import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, User } from 'react-feather';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import AddGratitude from './AddGratitude';
import './GratitudeWall.css';

const GratitudeWall = () => {
  const [gratitudes, setGratitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchGratitudes = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/gratitude', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGratitudes(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load gratitude messages');
      console.error('Error fetching gratitudes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGratitudes();
  }, [token]);

  const handleGratitudeAdded = (newGratitude) => {
    setGratitudes(prev => [newGratitude, ...prev]);
  };

  if (loading) {
    return (
      <div className="gratitude-wall">
        <div className="gratitude-wall-header">
          <h2>Gratitude Wall</h2>
          <AddGratitude onGratitudeAdded={handleGratitudeAdded} />
        </div>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="gratitude-wall">
      <div className="gratitude-wall-header">
        <h2>
          <Heart className="gratitude-icon" />
          Gratitude Wall
        </h2>
        <p>Messages of appreciation from our community</p>
        <AddGratitude onGratitudeAdded={handleGratitudeAdded} />
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchGratitudes} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {gratitudes.length === 0 ? (
        <div className="no-gratitudes">
          <MessageCircle size={48} />
          <p>No gratitude messages yet. Be the first to share your appreciation!</p>
        </div>
      ) : (
        <div className="gratitude-messages">
          {gratitudes.map((gratitude) => (
            <div key={gratitude._id} className="gratitude-card">
              <div className="gratitude-header">
                <div className="sender-info">
                  {gratitude.sender.profilePicture ? (
                    <img
                      src={gratitude.sender.profilePicture}
                      alt={gratitude.sender.name}
                      className="sender-avatar"
                    />
                  ) : (
                    <div className="sender-avatar-placeholder">
                      <User size={20} />
                    </div>
                  )}
                  <span className="sender-name">{gratitude.sender.name}</span>
                  {gratitude.recipient && (
                    <span className="recipient-info">
                      to {gratitude.recipient.name}
                    </span>
                  )}
                </div>
                <span className="gratitude-date">
                  {new Date(gratitude.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="gratitude-message">{gratitude.message}</p>
              {gratitude.request && (
                <div className="gratitude-request">
                  <span className="request-title">{gratitude.request.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GratitudeWall; 