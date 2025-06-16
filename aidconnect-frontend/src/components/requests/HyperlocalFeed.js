import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Clock, AlertCircle } from 'react-feather';
import { formatDistanceToNow } from 'date-fns';
import './HyperlocalFeed.css';

const HyperlocalFeed = () => {
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(5); // Default 5km radius

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyRequests();
    }
  }, [userLocation, radius]);

  const fetchNearbyRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/requests/nearby', {
        params: {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          radius: radius
        }
      });
      setNearbyRequests(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch nearby requests');
      console.error('Error fetching nearby requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (e) => {
    setRadius(Number(e.target.value));
  };

  const getEmergencyLevelClass = (level) => {
    switch (level) {
      case 'urgent':
        return 'urgent';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  };

  if (loading) {
    return <div className="loading">Loading nearby requests...</div>;
  }

  return (
    <div className="hyperlocal-feed">
      <div className="feed-header">
        <h2>Your Neighborhood Needs</h2>
        <div className="radius-selector">
          <label htmlFor="radius">Show requests within:</label>
          <select
            id="radius"
            value={radius}
            onChange={handleRadiusChange}
            className="radius-select"
          >
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="requests-grid">
        {nearbyRequests.map((request) => (
          <div key={request._id} className="request-card">
            <div className="request-header">
              <h3>{request.title}</h3>
              <span className={`emergency-badge ${getEmergencyLevelClass(request.emergencyLevel)}`}>
                {request.emergencyLevel}
              </span>
            </div>
            
            <p className="request-description">{request.description}</p>
            
            <div className="request-meta">
              <div className="location">
                <MapPin size={16} />
                <span>{request.location}</span>
              </div>
              <div className="distance">
                {request.distance.toFixed(1)} km away
              </div>
            </div>

            <div className="request-footer">
              <div className="timestamp">
                <Clock size={16} />
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </div>
              <button className="help-button">Help Now</button>
            </div>
          </div>
        ))}
      </div>

      {nearbyRequests.length === 0 && !error && (
        <div className="no-requests">
          <p>No requests found in your area. Try increasing the radius.</p>
        </div>
      )}
    </div>
  );
};

export default HyperlocalFeed; 