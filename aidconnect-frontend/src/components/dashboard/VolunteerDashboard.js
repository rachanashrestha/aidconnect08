import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Eye,
  AlertTriangle
} from 'react-feather';
import RequestDetail from '../requests/RequestDetail';
import RequestList from '../requests/RequestList';
import GratitudeWall from '../gratitude/GratitudeWall';
import '../../styles/VolunteerDashboard.css';

const VolunteerDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    requestsByStatus: {},
    recentRequests: [],
    availableRequests: [],
    completionRate: 0,
    lastActive: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);

  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        'http://localhost:5000/api/volunteer/stats',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStats(response.data);
      
      // Find active request if any
      const active = response.data.recentRequests.find(
        req => req.status === 'in_progress'
      );
      setActiveRequest(active);
    } catch (err) {
      console.error('Error fetching volunteer data:', err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      setError(null);
      console.log('Attempting request action:', {
        requestId,
        action,
        userId: user?._id,
        userRole: user?.role
      });

      let response;
      if (action === 'accept') {
        response = await axios.put(
          `http://localhost:5000/api/volunteer/requests/${requestId}/accept`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        response = await axios.put(
        `http://localhost:5000/api/volunteer/requests/${requestId}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      }

      console.log('Request action successful:', {
        requestId,
        action,
        response: response.data
      });

      // Show success message if available
      if (response.data.message) {
        console.log('Success:', response.data.message);
      }

      // Refresh data after successful action
      await fetchData();
    } catch (error) {
      console.error('Error performing request action:', {
        error: error.response?.data || error.message,
        requestId,
        action
      });
      setError(error.response?.data?.message || 'Failed to perform action');
    }
  };

  const handleViewDetails = async (requestId) => {
    try {
      setError(null);
      console.log('Fetching request details:', {
        requestId,
        userId: user?._id,
        userRole: user?.role
      });

      const response = await axios.get(
        `http://localhost:5000/api/volunteer/requests/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Request details fetched successfully:', {
        requestId,
        status: response.data.status
      });

      setSelectedRequest(response.data);
    } catch (err) {
      console.error('Error fetching request details:', {
        requestId,
        error: err.response?.data || err.message,
        status: err.response?.status
      });

      let errorMessage = 'Failed to fetch request details. Please try again.';
      
      if (err.response?.status === 404) {
        errorMessage = 'This request no longer exists or has been removed.';
        // Refresh the dashboard data to remove the non-existent request
        await fetchData();
      } else if (err.response?.status === 403) {
        errorMessage = 'You are not authorized to view this request.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid request ID.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Please log in again to continue.';
      }

      setError(errorMessage);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'badge-pending';
      case 'in_progress':
        return 'badge-inprogress';
      case 'fulfilled':
        return 'badge-completed';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="icon" />;
      case 'in_progress':
        return <Activity className="icon" />;
      case 'fulfilled':
        return <CheckCircle className="icon" />;
      case 'cancelled':
        return <XCircle className="icon" />;
      default:
        return <AlertCircle className="icon" />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="btn btn-red" onClick={fetchData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="volunteer-dashboard">
      <div className="dashboard-header">
        <h1>Volunteer Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="card">
          <h3>Total Requests</h3>
          <p className="stat-number">{stats.totalRequests}</p>
          <div className="status-breakdown">
            {Object.entries(stats.requestsByStatus).map(([status, count]) => (
              <div key={status} className="status-row">
                <span className="status-label">{status.replace('_', ' ')}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Active Requests</h3>
          <p className="stat-number active-count">
            {stats.requestsByStatus.in_progress || 0}
          </p>
          <p className="stat-desc">Currently being handled by you</p>
        </div>

        <div className="card">
          <h3>Completed Requests</h3>
          <p className="stat-number completed-count">
            {stats.requestsByStatus.fulfilled || 0}
          </p>
          <p className="stat-desc">Successfully resolved requests</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="requests-section">
          <h2>Your Requests</h2>
          <RequestList
            requests={stats.recentRequests}
            onRequestClick={handleViewDetails}
            userRole="volunteer"
          />
        </div>

        <div className="available-requests-section">
          <h2>Available Requests</h2>
          {!activeRequest && stats.availableRequests && stats.availableRequests.length > 0 && (
        <RequestList
              requests={stats.availableRequests}
              onRequestClick={handleViewDetails}
          userRole="volunteer"
        />
          )}
        </div>
      </div>

      <GratitudeWall />

      {selectedRequest && (
        <RequestDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={handleRequestAction}
        />
      )}
    </div>
  );
};

export default VolunteerDashboard; 