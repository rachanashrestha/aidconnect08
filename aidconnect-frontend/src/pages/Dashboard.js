import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import RequesterDashboard from '../components/dashboard/RequesterDashboard';
import VolunteerDashboard from '../components/dashboard/VolunteerDashboard';
import ChatButton from '../components/chat/ChatButton';

const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'requester':
        return <RequesterDashboard />;
      case 'volunteer':
        return <VolunteerDashboard />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {user.name}
          </h1>
          <ChatButton />
        </div>
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard; 