import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, AlertTriangle } from "react-feather";
import RequestDetail from "./RequestDetail";
import PropTypes from "prop-types";
import "./RequestList.css";
import axios from "axios";

const RequestList = ({ requests = [], onStatusChange = () => {}, userRole = "requester" }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    emergencyLevel: "all",
  });

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const filteredRequests = requests.filter((request) => {
    if (filters.status !== "all" && request.status !== filters.status) return false;
    if (filters.category !== "all" && request.category !== filters.category) return false;
    if (filters.emergencyLevel !== "all" && request.emergencyLevel !== filters.emergencyLevel)
      return false;
    return true;
  });

  const getEmergencyLevelClass = (level) => {
    switch (level) {
      case "emergency":
        return "emergency-level-emergency";
      case "high":
        return "emergency-level-high";
      case "medium":
        return "emergency-level-medium";
      case "low":
        return "emergency-level-low";
      default:
        return "emergency-level-default";
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

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Show confirmation dialog
      const confirmed = window.confirm('Are you sure you want to accept this request?');
      if (!confirmed) {
        return;
      }

      const response = await axios.put(
        `http://localhost:5000/api/volunteer/requests/${requestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        // Show success message
        alert('Request accepted successfully!');
        
        // Update the request in the list
        if (onStatusChange) {
          onStatusChange(requestId, 'in_progress');
        }
        
        // Refresh the requests list
        window.location.reload();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert(error.response?.data?.message || 'Failed to accept request. Please try again.');
    }
  };

  return (
    <div className="request-list-container">
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="medical">Medical</option>
            <option value="food">Food</option>
            <option value="shelter">Shelter</option>
            <option value="transportation">Transportation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Emergency Level</label>
          <select
            value={filters.emergencyLevel}
            onChange={(e) => handleFilterChange("emergencyLevel", e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="requests-grid">
        {filteredRequests.length === 0 ? (
          <div className="no-requests">
            <p>No requests found matching your filters.</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request._id}
              className="request-card"
              onClick={() => handleRequestClick(request)}
            >
              <div className="request-header">
                <h3 className="request-title">{request.title}</h3>
                <div className="request-meta">
                  <span className={`emergency-level ${getEmergencyLevelClass(request.emergencyLevel)}`}>
                    {request.emergencyLevel}
                  </span>
                  <span className={`status ${getStatusClass(request.status)}`}>
                    {request.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <p className="request-description">{request.description}</p>

              <div className="request-details">
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{request.location?.address || "Location not specified"}</span>
                </div>
                <div className="detail-item">
                  <Clock size={16} />
                  <span>
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {request.attachments && request.attachments.length > 0 && (
                <div className="request-attachments">
                  <div className="attachment-preview">
                    <img
                      src={`http://localhost:5000/${request.attachments[0].path}`}
                      alt="Request attachment"
                      className="preview-image"
                    />
                    {request.attachments.length > 1 && (
                      <div className="more-images">+{request.attachments.length - 1}</div>
                    )}
                  </div>
                </div>
              )}

              {userRole === "volunteer" && request.status === "pending" && (
                <button
                  className="accept-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAcceptRequest(request._id);
                  }}
                >
                  Accept Request
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {selectedRequest && (
        <RequestDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
};

RequestList.propTypes = {
  requests: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      emergencyLevel: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      location: PropTypes.shape({
        address: PropTypes.string,
        coordinates: PropTypes.arrayOf(PropTypes.number),
      }),
      createdAt: PropTypes.string.isRequired,
      attachments: PropTypes.arrayOf(
        PropTypes.shape({
          path: PropTypes.string.isRequired,
          description: PropTypes.string,
        })
      ),
      requester: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
        profilePicture: PropTypes.string,
      }),
    })
  ),
  onStatusChange: PropTypes.func,
  userRole: PropTypes.oneOf(["requester", "volunteer"]),
};

export default RequestList; 