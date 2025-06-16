import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Users, UserCheck, UserX, MessagesSquare, ClipboardList, Clock, Shield } from 'lucide-react';
import { Activity, AlertCircle, CheckCircle, XCircle } from 'react-feather';
import RequestList from '../requests/RequestList';
import RequestDetail from '../requests/RequestDetail';
import GratitudeWall from '../gratitude/GratitudeWall';
import '../../styles/AdminDashboard.css';

const StatusBadge = ({ status }) => {
  const statusClass = {
    pending: 'badge-warning',
    in_progress: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    active: 'badge-success',
    inactive: 'badge-secondary',
    suspended: 'badge-warning',
  };

  return (
    <span className={`badge ${statusClass[status] || 'badge-secondary'}`}>
      {status}
    </span>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    userStats: { requester: 0, volunteer: 0, admin: 0 },
    requestStats: { pending: 0, in_progress: 0, completed: 0, cancelled: 0 },
    messageCount: 0,
    recentRequests: [],
    recentUsers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch data. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusChange = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/admin/users/${userId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      setError('Failed to update user status.');
    }
  };

  const totalUsers = Object.values(stats.userStats).reduce((a, b) => a + b, 0);
  const totalRequests = Object.values(stats.requestStats).reduce((a, b) => a + b, 0);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
  };

  const handleRequestAction = async (request, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/admin/requests/${request._id}/status`, { status: action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      setError('Failed to update request status.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="spinner"></div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <p className="text-danger mb-4">{error}</p>
      <button onClick={fetchData} className="btn btn-primary">Retry</button>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-stats">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 grid-cols-2 grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-2 text-primary">
              <Users />
              <h3>Total Users</h3>
            </div>
            <p className="text-3xl font-bold mt-2">{totalUsers}</p>
            <ul className="mt-2 text-sm text-gray">
              <li>👤 Requesters: {stats.userStats.requester}</li>
              <li>🤝 Volunteers: {stats.userStats.volunteer}</li>
              <li>🛠 Admins: {stats.userStats.admin}</li>
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 text-secondary">
              <ClipboardList />
              <h3>Total Requests</h3>
            </div>
            <p className="text-3xl font-bold mt-2">{totalRequests}</p>
            <ul className="mt-2 text-sm text-gray">
              <li>⏳ Pending: {stats.requestStats.pending}</li>
              <li>🚧 In Progress: {stats.requestStats.in_progress}</li>
              <li>✅ Completed: {stats.requestStats.completed}</li>
              <li>❌ Cancelled: {stats.requestStats.cancelled}</li>
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 text-success">
              <MessagesSquare />
              <h3>Total Messages</h3>
            </div>
            <p className="text-3xl font-bold mt-2">{stats.messageCount}</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 text-warning">
              <Clock />
              <h3>Recent Requests</h3>
            </div>
            <p className="text-3xl font-bold mt-2">{stats.recentRequests.length}</p>
          </div>
        </div>

        {/* Recent Users Table */}
        <div className="card mb-8">
          <h2 className="mb-4">Recent Users</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-gray">{user.email}</div>
                    </td>
                    <td className="text-primary font-semibold">{user.role}</td>
                    <td><StatusBadge status={user.status || 'active'} /></td>
                    <td className="text-gray">{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</td>
                    <td>
                      <select
                        value={user.status || 'active'}
                        onChange={(e) => handleUserStatusChange(user._id, e.target.value)}
                        className="form-input"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Requests Table */}
        <div className="card">
          <h2 className="mb-4">Recent Requests</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Requester</th>
                  <th>Volunteer</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRequests.map((req) => (
                  <tr key={req._id}>
                    <td className="font-medium">{req.title}</td>
                    <td>{req.requester?.name || 'N/A'}</td>
                    <td>{req.volunteer?.name || 'Not assigned'}</td>
                    <td><StatusBadge status={req.status} /></td>
                    <td className="text-gray">{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="requests-section">
          <h2>All Requests</h2>
          <RequestList
            requests={stats.recentRequests}
            onRequestClick={handleViewDetails}
            userRole="admin"
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

export default AdminDashboard;
