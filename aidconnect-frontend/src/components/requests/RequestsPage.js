import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RequestList from './RequestList';
import { useAuth } from '../../context/AuthContext';

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, user } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(response.data);
      } catch (err) {
        setError('Failed to fetch requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [token]);

  if (loading) return <div>Loading requests...</div>;
  if (error) return <div>{error}</div>;

  return <RequestList requests={requests} userRole={user?.role || "requester"} />;
};

export default RequestsPage; 