import axios from 'axios';

// Determine the base URL based on the environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'; // Default to relative /api

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Authentication --- //

// User Registration
export const registerUser = (userData) => {
  // userData should contain { username, password, role, name, email, phone (optional) }
  return apiClient.post('/auth/register', userData);
};

// User Login
export const loginUser = (credentials) => {
  // credentials should contain { username, password }
  return apiClient.post('/auth/login', credentials);
};

// Get User Profile (Example)
export const getUserProfile = () => {
  return apiClient.get('/auth/profile'); // Assuming a /profile endpoint exists
};

// --- Slots & Calendar (Shared) --- //

// Get available slots within a date range
export const getAvailableSlots = (startDate, endDate) => {
  // API expects YYYY-MM-DD format
  return apiClient.get('/slots/available', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

// --- Patient Specific --- //

// Book an appointment
export const bookAppointment = (appointmentDetails) => {
  // appointmentDetails should contain { date, time } (patientId is inferred from token)
  return apiClient.post('/appointments/book', appointmentDetails);
};

// Get appointments for the logged-in patient
export const getPatientAppointments = () => {
  return apiClient.get('/appointments/patient');
};

// Cancel an appointment (by patient)
export const cancelPatientAppointment = (appointmentId) => {
  return apiClient.put(`/appointments/${appointmentId}/cancel-patient`);
};

// --- Doctor Specific --- //

// Get appointments for the logged-in doctor
export const getDoctorAppointments = (startDate, endDate) => {
  return apiClient.get('/appointments/doctor', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

// Get slots managed by the logged-in doctor
export const getDoctorSlots = (startDate, endDate) => {
  return apiClient.get('/slots/doctor', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
};

// Add a new available slot (by doctor)
export const addDoctorSlot = (slotData) => {
  // slotData should contain { date, time }
  return apiClient.post('/slots/doctor', slotData);
};

// Remove an available slot (by doctor)
export const removeDoctorSlot = (slotId) => {
  return apiClient.delete(`/slots/doctor/${slotId}`);
};

// Bulk generate slots (by doctor)
export const bulkGenerateDoctorSlots = (generationData) => {
  // generationData might include { startDate, endDate, startTime, endTime, interval, daysOfWeek[] }
  return apiClient.post('/slots/doctor/bulk-generate', generationData);
};

// --- Admin Specific (Example - Keep or Modify) --- //

// Function to get settings (if needed)
export const getSettings = () => {
  return apiClient.get('/admin/settings');
};

// Function to update settings (if needed)
export const updateSettings = (settingsData) => {
  return apiClient.put('/admin/settings', settingsData);
};

// Function to get all appointments (for admin)
export const getAllAppointments = () => {
  return apiClient.get('/admin/appointments');
};

// Function to cancel any appointment (by admin)
export const cancelAdminAppointment = (appointmentId) => {
  return apiClient.put(`/admin/appointments/${appointmentId}/cancel`);
};

// Function for admin login (if separate from user login)
export const loginAdmin = (credentials) => {
  return apiClient.post('/auth/admin/login', credentials);
};


export default apiClient;

