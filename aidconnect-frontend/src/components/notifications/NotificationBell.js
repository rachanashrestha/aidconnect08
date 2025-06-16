import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check } from 'react-feather';
import './NotificationBell.css';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'request_created':
      case 'request_accepted':
      case 'request_completed':
        navigate(`/requests/${notification.request}`);
        break;
      case 'new_message':
        navigate(`/chat/${notification.data.conversationId}`);
        break;
      default:
        break;
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'request_created':
        return '📝';
      case 'request_accepted':
        return '✅';
      case 'request_completed':
        return '🎉';
      case 'request_cancelled':
        return '❌';
      case 'new_message':
        return '💬';
      default:
        return '📢';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${days}d`;
    }
  };

  return (
    <div className="notification-bell">
      <button
        ref={bellRef}
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="notification-dropdown">
          <div className="notification-header">
            <div className="notification-title">Notifications</div>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action-button"
                  onClick={markAllAsRead}
                >
                  <Check size={16} style={{ marginRight: 4 }} />
                  Mark all as read
                </button>
              )}
              <button
                className="notification-action-button"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">
                    {formatTimeAgo(notification.createdAt)}
                  </div>
                </div>
                <button
                  className="notification-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification._id);
                  }}
                  aria-label="Delete notification"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 