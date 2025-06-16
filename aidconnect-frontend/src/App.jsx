import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ChatProvider } from "./context/ChatContext";
import { SocketProvider } from "./context/SocketContext";

import Navbar from "./components/Navbar";
import Login from "./Login";
import Signup from "./Signup";
import Landing from "./components/Landing";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import RequesterDashboard from "./components/dashboard/RequesterDashboard";
import VolunteerDashboard from "./components/dashboard/VolunteerDashboard";
import RequestForm from "./components/requests/RequestForm";
import RequestDetail from "./components/requests/RequestDetail";
import Profile from "./components/profile/Profile";
import Chat from "./components/chat/Chat";
import RequestsPage from "./components/requests/RequestsPage";
import ChatButton from "./components/chat/ChatButton";


// Routes


// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
};

// Public Route
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
};

// Role-based dashboard
const RoleBasedDashboard = () => {
  const { user } = useAuth();

  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "requester":
      return <RequesterDashboard />;
    case "volunteer":
      return <VolunteerDashboard />;
    default:
      return <div>Invalid role</div>;
  }
};

// AppContent moved here to safely use `useLocation`
const AppContent = () => {
  const location = useLocation();
  const hideNavbarRoutes = ["/", "/login", "/signup"];
  const shouldShowNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-100">
      {shouldShowNavbar && <Navbar />}
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route
            path="/chat/:conversationId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/new"
            element={
              <ProtectedRoute allowedRoles={["requester"]}>
                <RequestForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requester/requests/new"
            element={
              <ProtectedRoute allowedRoles={["requester"]}>
                <RequestForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/:id"
            element={
              <ProtectedRoute>
                <RequestDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <ChatButton />
    </div>
  );
};

// Root App
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <ChatProvider>
            <Router>
              <AppContent />
            </Router>
          </ChatProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
