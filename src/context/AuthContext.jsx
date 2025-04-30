import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getUserProfile } from '../services/api'; // Corrected relative path

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true); // Add loading state

  const fetchUserProfile = useCallback(async () => {
    if (token) {
      try {
        // Set token for subsequent requests (already handled by interceptor in api.js)
        // apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await getUserProfile();
        setUser(response.data); // Assuming API returns user data in response.data
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        // Token might be invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        // apiClient.defaults.headers.common['Authorization'] = null;
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false); // No token, stop loading
    }
  }, [token]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const login = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(userData);
    // Set token for subsequent requests (handled by interceptor)
    // apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Clear token from requests (handled by interceptor)
    // apiClient.defaults.headers.common['Authorization'] = null;
    // Optionally redirect to login page
    // window.location.href = '/login';
  };

  // Provide loading state along with user and auth functions
  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading: loading, // Provide loading state
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

