import React, { useContext } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, Container, CssBaseline, CircularProgress } from '@mui/material';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthContext } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);

  if (isLoading) {
    // Show loading indicator while checking auth status
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Optional: Check for allowed roles if provided
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to an unauthorized page or home page if role not allowed
    // For simplicity, redirecting home for now
    console.warn(
      `User role (${user?.role}) not authorized for this route. Allowed: ${allowedRoles}`
    );
    return <Navigate to="/" replace />;
  }

  // Render the child route element if authenticated (and authorized)
  return <Outlet />;
};

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <Header />
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin']} />}>
            <Route path="/therapist-dashboard" element={<DoctorDashboard />} />
            {/* Add other doctor/admin specific routes here */}
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/appointment" element={<AppointmentBookingPage />} />
            {/* Add other patient specific routes here */}
          </Route>

          {/* Fallback for any other authenticated user? Or handle specific roles above?*/}
          {/* Example: Route for any logged in user (if needed) */}
          {/* <Route element={<ProtectedRoute />}> */}
          {/*   <Route path="/some-generic-page" element={<SomeGenericPage />} /> */}
          {/* </Route> */}

          {/* Not Found Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>
    </Box>
  );
}

export default App;
