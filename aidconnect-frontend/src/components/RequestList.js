import React, { useState, useEffect } from 'react';
import axios from 'axios';
import  './RequestList.css';
import { MapPin, Clock, AlertTriangle } from 'react-feather';
import { formatDistanceToNow } from 'date-fns';

const RequestList = ({ userRole }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    emergencyLevel: 'all',
  });

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/requests', {
        params: filters,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('API Response:', response.data);
      setRequests(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch requests');
      console.error('Error fetching requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAcceptRequest = (id) => {
    // Placeholder for accept request action
    alert(`Accepted request ${id}`);
  };

  return (
    <div className="request-list">
      <h2>Requests</h2>

      {/* Filter Section */}
      <div className="filters">
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="all">All Categories</option>
          <option value="medical">Medical</option>
          <option value="food">Food</option>
          <option value="shelter">Shelter</option>
          <option value="transportation">Transportation</option>
          <option value="other">Other</option>
        </select>

        <select name="emergencyLevel" value={filters.emergencyLevel} onChange={handleFilterChange}>
          <option value="all">All Emergency Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Loading/Error */}
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {/* Request Cards */}
      <div className="card-grid">
        {requests.length === 0 && !loading ? (
          <div className="empty">No requests found.</div>
        ) : (
          requests.map((req) => (
            <div className="request-card" key={req._id}>
              <div className="card-header">
                <h3>{req.title}</h3>
                <span className={`badge ${req.emergencyLevel}`}>{req.emergencyLevel}</span>
              </div>
              <p>{req.description}</p>
              <p className="location">
                <MapPin size={14} /> {req.location?.formattedAddress || 'Unknown Location'}
              </p>
              <p className="status">
                Status: <span className={`status-badge ${req.status}`}>{req.status}</span>
              </p>

              {userRole === 'volunteer' && req.status === 'open' && (
                <button className="accept-btn" onClick={() => handleAcceptRequest(req._id)}>
                  Accept Request
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RequestList;
