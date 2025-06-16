import React, { useState } from 'react';
import { formatDistanceToNow } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { X, MessageCircle, User, CheckCircle, XCircle, MapPin, Clock, Tag, Star } from "react-feather";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./RequestDetail.css";
import VolunteerRating from '../rating/VolunteerRating';

const RequestDetail = ({ request, onClose, onStatusChange }) => {
  const navigate = useNavigate();
  const { startChat } = useChat();
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [showRating, setShowRating] = useState(false);

  if (!request) return null;

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleStartChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Log the request object
      console.log('Request object:', request);

      // Validate request object
      if (!request || !request._id) {
        throw new Error('Invalid request object');
      }

      // Validate volunteer and requester IDs
      if (!request.volunteer || !request.requester) {
        throw new Error('Request must have both volunteer and requester assigned');
      }

      // Log the data we're about to send
      const chatData = {
        requestId: request._id,
        volunteerId: request.volunteer._id || request.volunteer,
        requesterId: request.requester._id || request.requester
      };
      console.log('Starting chat with data:', chatData);

      const response = await axios.post(
        'http://localhost:5000/api/chat/room',
        chatData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Chat room creation response:', response.data);

      if (!response.data || !response.data._id) {
        throw new Error('Invalid response from server');
      }

      // Start the chat using the ChatContext
      await startChat(response.data._id);

      // Navigate to the chat room
      navigate(`/chat/${response.data._id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        setError(error.response.data.message || 'Failed to start chat');
      } else {
        setError(error.message || 'Failed to start chat');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setIsUpdating(true);
      setError(null);

      console.log('Updating request status:', {
        requestId: request._id,
        newStatus,
        userId: user?._id,
        userRole: user?.role
      });

      // Map the status to the correct action
      const action = newStatus === 'completed' ? 'complete' : 
                    newStatus === 'cancelled' ? 'cancel' : 
                    newStatus;

      const response = await axios.put(
        `http://localhost:5000/api/requests/${request._id}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Status update successful:', {
        requestId: request._id,
        newStatus,
        response: response.data
      });

      if (newStatus === 'completed' && user.role === 'requester') {
        setShowRating(true);
      }

      if (onStatusChange) {
        onStatusChange(response.data);
      }
    } catch (err) {
      console.error('Error updating request status:', {
        requestId: request._id,
        newStatus,
        error: err.response?.data || err.message,
        status: err.response?.status
      });

      let errorMessage = 'Failed to update request status. Please try again.';
      
      if (err.response?.status === 404) {
        errorMessage = 'This request no longer exists.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You are not authorized to update this request.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data.message || 'Invalid request status.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Please log in again to continue.';
      }

      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRatingComplete = (ratingData) => {
    setShowRating(false);
    if (onStatusChange) {
      onStatusChange({ ...request, rating: ratingData });
    }
  };

  const canUpdateStatus = () => {
    if (!user) return false;
    
    // Volunteers can mark requests as completed
    if (user.role === 'volunteer' && request.status === 'in_progress') {
      return true;
    }
    
    // Requesters can only cancel open requests
    if (user.role === 'requester' && request.requester._id === user._id) {
      return request.status === 'open';
    }
    
    return false;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open':
        return 'status-badge-pending';
      case 'in_progress':
        return 'status-badge-inprogress';
      case 'completed':
        return 'status-badge-completed';
      case 'cancelled':
        return 'status-badge-cancelled';
      default:
        return 'status-badge-default';
    }
  };

  const getEmergencyLevelClass = (level) => {
    switch (level) {
      case 'emergency':
        return 'emergency-level-emergency';
      case 'high':
        return 'emergency-level-high';
      case 'medium':
        return 'emergency-level-medium';
      case 'low':
        return 'emergency-level-low';
      default:
        return 'emergency-level-default';
    }
  };

  const renderUserCard = (user, role) => {
    if (!user) {
      return (
        <div className="user-card">
          <div className="user-details">
            <p>No {role} information available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="user-card" onClick={() => handleUserClick(user._id)}>
        <div className="user-avatar">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name || 'User'}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-details">
          <h4>{user.name || 'Anonymous User'}</h4>
          <p>{user.email || 'No email provided'}</p>
          {user.averageRating && (
            <div className="user-rating">
              <Star size={16} fill="#FFD700" />
              <span>{user.averageRating.toFixed(1)} ({user.totalRatings || 0} ratings)</span>
            </div>
          )}
        </div>
        <button
          className="chat-button"
          onClick={(e) => {
            e.stopPropagation();
            handleStartChat();
          }}
        >
          <MessageCircle size={20} />
          Chat
        </button>
      </div>
    );
  };

  return (
    <div className="request-detail-overlay" onClick={onClose}>
      <div className="request-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="request-detail-content">
          <div className="request-header">
            <h2>{request.title}</h2>
            <div className="request-meta">
              <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                {request.status === 'open' ? 'Pending' : 
                 request.status === 'in_progress' ? 'In Progress' :
                 request.status.replace('_', ' ')}
              </span>
              <span className={`emergency-level ${getEmergencyLevelClass(request.emergencyLevel)}`}>
                {request.emergencyLevel}
              </span>
            </div>
          </div>

          <div className="request-body">
            <div className="request-description">
              <h3>Description</h3>
              <p>{request.description}</p>
            </div>

            {request.attachments && request.attachments.length > 0 && (
              <div className="request-attachments">
                <h3>Attachments</h3>
                <div className="attachment-grid">
                  {request.attachments.map((attachment, index) => (
                    <div key={index} className="attachment-item">
                      <img
                        src={`http://localhost:5000/${attachment.path}`}
                        alt={`Attachment ${index + 1}`}
                        className="attachment-image"
                      />
                      {attachment.description && (
                        <p className="attachment-description">{attachment.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="request-info">
              <div className="info-section">
                <h3>Category</h3>
                <p>{request.category}</p>
              </div>

              <div className="info-section">
                <h3>Created</h3>
                <p>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</p>
              </div>

              {request.completedAt && (
                <div className="info-section">
                  <h3>Completed</h3>
                  <p>{formatDistanceToNow(new Date(request.completedAt), { addSuffix: true })}</p>
                </div>
              )}
            </div>

            <div className="user-sections">
            <div className="requester-info">
              <h3>Posted by</h3>
                {renderUserCard(request.requester, 'requester')}
                    </div>

              {request.volunteer && (
                <div className="volunteer-info">
                  <h3>Assigned Volunteer</h3>
                  {renderUserCard(request.volunteer, 'volunteer')}
                </div>
              )}
            </div>

            {request.location && (
              <div className="location-section">
                <h3>Location</h3>
                <div className="map-container">
                  <MapContainer
                    center={[request.location.coordinates[1], request.location.coordinates[0]]}
                    zoom={13}
                    style={{ height: "300px", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker
                      position={[
                        request.location.coordinates[1],
                        request.location.coordinates[0],
                      ]}
                    >
                      <Popup>{request.location.address}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <p className="location-address">{request.location.address}</p>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {showRating && request.volunteer ? (
            <VolunteerRating
              request={request}
              volunteer={request.volunteer}
              onRatingComplete={handleRatingComplete}
            />
          ) : (
            <div className="request-actions">
              {canUpdateStatus() && (
                <>
                  {user.role === 'volunteer' && request.status === 'in_progress' && (
                    <button
                      className="action-button complete"
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={isUpdating}
                    >
                      <CheckCircle size={16} style={{ marginRight: 8 }} />
                      Mark as Completed
                    </button>
                  )}
                  
                  {user.role === 'requester' && request.status === 'open' && (
                    <button
                      className="action-button cancel"
                      onClick={() => handleUpdateStatus('cancelled')}
                      disabled={isUpdating}
                    >
                      <XCircle size={16} style={{ marginRight: 8 }} />
                      Cancel Request
                    </button>
                  )}
                </>
              )}

              {request.volunteer && (
                <button
                  className="action-button chat"
                  onClick={handleStartChat}
                  disabled={isLoading}
                >
                  <MessageCircle size={20} />
                  {isLoading ? 'Starting chat...' : 'Start Chat'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetail; 