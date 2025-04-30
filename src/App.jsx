import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Container, CssBaseline } from '@mui/material';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import AppointmentBookingPage from './pages/AppointmentBookingPage'; // Import the new page
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// TODO: Add AuthProvider to wrap the application for global auth state

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <Header />
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* TODO: Add protected routes for dashboards */}
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} /> 
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/appointment" element={<AppointmentBookingPage />} /> {/* Add route for booking page */}
          {/* Remove the old /appointment/:id route if not needed */}
          {/* <Route path="/appointment/:id" element={<AppointmentPage />} /> */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>
      <Footer />
    </Box>
  );
}

export default App;

