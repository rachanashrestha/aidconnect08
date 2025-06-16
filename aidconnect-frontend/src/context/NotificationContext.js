import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  useEffect(() => {
    if (socket) {
      // Listen for new notifications
      socket.on('newNotification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Listen for notification updates
      socket.on('notificationUpdated', (updatedNotification) => {
        setNotifications(prev =>
          prev.map(n =>
            n._id === updatedNotification._id ? updatedNotification : n
          )
        );
      });

      return () => {
        socket.off('newNotification');
        socket.off('notificationUpdated');
      };
    }
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/read`, {
        notificationIds: [notificationId]
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark notification as read');
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('http://localhost:5000/api/notifications/read', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`http://localhost:5000/api/notifications`, {
        data: { notificationIds: [notificationId] },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete notification');
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllRead = async () => {
    try {
      await axios.delete('http://localhost:5000/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete read notifications');
      console.error('Error deleting read notifications:', err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 