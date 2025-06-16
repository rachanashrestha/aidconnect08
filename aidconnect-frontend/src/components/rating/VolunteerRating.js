import React, { useState } from 'react';
import { Star } from 'react-feather';
import axios from 'axios';
import './VolunteerRating.css';

const VolunteerRating = ({ request, volunteer, onRatingComplete }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await axios.post(
        `http://localhost:5000/api/requests/${request._id}/rate`,
        {
          rating,
          comment,
          volunteerId: volunteer._id
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (onRatingComplete) {
        onRatingComplete(response.data);
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="volunteer-rating">
      <h3>Rate Your Volunteer</h3>
      <p className="rating-subtitle">How was your experience with {volunteer.name}?</p>

      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="star-button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              size={32}
              fill={star <= (hover || rating) ? '#FFD700' : 'none'}
              stroke={star <= (hover || rating) ? '#FFD700' : '#666'}
            />
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rating-comment">
          <label htmlFor="comment">Additional Comments (Optional)</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this volunteer..."
            rows="4"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="submit-rating"
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </form>
    </div>
  );
};

export default VolunteerRating; 