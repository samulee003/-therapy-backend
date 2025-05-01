import axios from 'axios';

// Determine the base URL based on the environment
// IMPORTANT: Set VITE_API_BASE_URL in your frontend service environment variables on Zeabur
// to your backend service URL (e.g., https://psy-backend.zeabur.app)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // Default to empty string, forcing env var usage

// If API_BASE_URL is empty after checking env var, log an error or throw, 
// because relative paths won't work correctly with separate frontend/backend services.
if (!API_BASE_URL) {
  console.error("ERROR: VITE_API_BASE_URL is not set. API calls will likely fail.");
  // Optionally throw an error to prevent the app from running with incorrect config
  // throw new Error("VITE_API_BASE_URL environment variable is not set.");
}

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Use the backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 重要：啟用憑證 (Cookies) 跨域發送，用於 Session 認證
});

// Add a request interceptor to include the token (if any)
// NOTE: Current backend does not use token authentication after login.
// This interceptor remains for potential future use but won't affect current backend.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Currently unused by backend
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

// User Login (Matches POST /api/login)
// Backend expects { password }, frontend might send { username, password }
// The calling component might need adjustment if username is not needed by backend.
export const loginUser = (credentials) => {
  // Sending the full credentials object as backend requires both username and password
  return apiClient.post('/api/login', credentials); // Send the whole credentials object
};

// ADDED: User Logout (Matches POST /api/logout)
export const logoutUser = () => {
  return apiClient.post('/api/logout');
};

// ADDED: Get Current User Profile (Matches GET /api/me)
export const getCurrentUser = () => {
  return apiClient.get('/api/me');
};

// ADDED: User Registration (Matches POST /api/register)
export const registerUser = (registrationData) => {
  // registrationData should contain { username, password, name, role }
  return apiClient.post('/api/register', registrationData);
};

// --- Settings --- //

// Get Settings (Matches GET /api/settings)
export const getSettings = () => {
  return apiClient.get('/api/settings');
};

// Update Settings (Matches PUT /api/settings)
export const updateSettings = (settingsData) => {
  return apiClient.put('/api/settings', settingsData);
};

// --- Schedule --- //

// Get Schedule for a specific month (Matches GET /api/schedule/:year/:month)
export const getScheduleForMonth = (year, month) => {
  // Ensure month is zero-padded if necessary, though backend seems to handle it.
  const paddedMonth = String(month).padStart(2, '0');
  return apiClient.get(`/api/schedule/${year}/${paddedMonth}`);
};

// Save schedule for a specific date (Matches POST /api/schedule)
// Backend expects { date, availableSlots: string[] }
export const saveScheduleForDate = (date, availableSlots) => {
  return apiClient.post('/api/schedule', { date, availableSlots });
};


// --- Appointments --- //

// UPDATED: Get My Appointments (Matches GET /api/appointments/my)
// This will automatically use the session to determine the user and role
export const getMyAppointments = () => {
  return apiClient.get('/api/appointments/my');
};

// Aliases for role-specific components that expect these functions
export const getPatientAppointments = getMyAppointments;
export const getDoctorAppointments = getMyAppointments;

// UPDATED: Get All Appointments (Doctor only) (Matches GET /api/appointments/all)
export const getAllAppointments = () => {
  return apiClient.get('/api/appointments/all');
};

// Book an Appointment (Matches POST /api/book)
// Backend expects { date, time, patientName, patientPhone, patientEmail, ... }
export const bookAppointment = (appointmentDetails) => {
  return apiClient.post('/api/book', appointmentDetails);
};

// Cancel an Appointment (Matches PUT /api/appointments/:id/cancel)
// Backend endpoint doesn't differentiate roles for cancellation
export const cancelAppointment = (appointmentId) => {
  return apiClient.put(`/api/appointments/${appointmentId}/cancel`);
};
// Aliases for different roles
export const cancelPatientAppointment = cancelAppointment;
export const cancelAdminAppointment = cancelAppointment; // Assuming admin uses the same endpoint


// --- Removed Functions (Backend doesn't support these) --- //
// registerUser
// getUserProfile
// getAvailableSlots (replaced by getScheduleForMonth)
// addDoctorSlot (replaced by saveScheduleForDate)
// removeDoctorSlot
// bulkGenerateDoctorSlots
// loginAdmin


export default apiClient;

