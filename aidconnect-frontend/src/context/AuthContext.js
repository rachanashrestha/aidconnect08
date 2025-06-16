import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error('Auth check failed:', err);
      setError(err.response?.data?.message || 'Authentication failed');
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      
      if (!newToken || !newUser) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      setError(null);
      return newUser;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);

      // Validate required fields
      const { name, email, password, phone } = userData;
      if (!name || !email || !password || !phone) {
        throw new Error('All fields are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await axios.post(`${API_URL}/auth/signup`, userData);
      
      const { token: newToken, user: newUser } = response.data;
      
      if (!newToken || !newUser) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      setError(null);
      return newUser;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Signup failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_URL}/user/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    signup,
    logout,
    updateProfile,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 