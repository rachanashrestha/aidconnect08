import React, { useState } from 'react';
import { Heart, X } from 'react-feather';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AddGratitude.css';

const AddGratitude = ({ onGratitudeAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/gratitude',
        { message },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('');
      setIsOpen(false);
      if (onGratitudeAdded) {
        onGratitudeAdded(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add gratitude message');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        className="add-gratitude-button"
        onClick={() => setIsOpen(true)}
      >
        <Heart size={20} />
        <span>Share Gratitude</span>
      </button>
    );
  }

  return (
    <div className="add-gratitude-modal">
      <div className="add-gratitude-content">
        <div className="add-gratitude-header">
          <h3>Share Your Gratitude</h3>
          <button 
            className="close-button"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your appreciation message..."
            maxLength={500}
            required
          />
          <div className="character-count">
            {message.length}/500
          </div>
          <div className="button-group">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !message.trim()}
            >
              {loading ? 'Posting...' : 'Post Gratitude'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGratitude; 