import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Eye,
} from "react-feather";
import RequestDetail from "../requests/RequestDetail";
import RequestList from "../requests/RequestList";
import GratitudeWall from '../gratitude/GratitudeWall';
import '../../styles/RequesterDashboard.css';

const RequesterDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    requestsByStatus: {},
    recentRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const notificationSectionRef = useRef(null);

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
        "http://localhost:5000/api/requester/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStats(response.data);
    } catch (err) {
      console.error("Error fetching requester data:", err);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await axios.post(
        `http://localhost:5000/api/requester/requests/${requestId}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchData(); // Refresh data after action
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      setError(`Failed to ${action} request. Please try again.`);
    }
  };

  const handleViewDetails = async (requestId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/requester/requests/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSelectedRequest(response.data);
    } catch (err) {
      console.error("Error fetching request details:", err);
      setError("Failed to fetch request details. Please try again.");
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "in_progress":
        return "status-inprogress";
      case "fulfilled":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="icon" />;
      case "in_progress":
        return <Activity className="icon" />;
      case "fulfilled":
        return <CheckCircle className="icon" />;
      case "cancelled":
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
    <div className="requester-dashboard">
      <div className="dashboard-header">
        <h1>Requester Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
        <Link to="/requester/requests/new" className="btn btn-primary">
          Create New Request
        </Link>
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
                <span className="status-label">{status.replace("_", " ")}</span>
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
          <p className="stat-desc">Currently being handled by volunteers</p>
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
            userRole="requester"
          />
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

export default RequesterDashboard;
