import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// allowedRoles: Optional array of roles allowed to access the route
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    // Show a loading indicator while checking auth status
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    // Pass the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if allowedRoles is provided
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to an unauthorized page or home page if role is not allowed
    // For simplicity, redirecting to home page here
    console.warn(`User role '${user.role}' not allowed for this route. Allowed: ${allowedRoles.join(', ')}`);
    return <Navigate to="/" replace />;
  }

  // If authenticated and role is allowed (or no role restriction), render the child route
  return <Outlet />;
};

export default ProtectedRoute;

