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

/**
 * 格式化 API 錯誤
 * 
 * @param {Error} error - Axios 錯誤對象
 * @param {string} defaultMessage - 預設錯誤訊息
 * @returns {Object} 標準化錯誤對象 { message, code, details }
 */
export const formatApiError = (error, defaultMessage = '發生錯誤，請稍後再試') => {
  // 檢查是否是 Axios 錯誤
  if (error.response) {
    // 伺服器回應了錯誤狀態碼
    const { data, status } = error.response;
    
    return {
      message: data?.message || getStatusMessage(status) || defaultMessage,
      code: status,
      details: data || {}
    };
  } else if (error.request) {
    // 請求已發出但沒有收到回應，可能是網絡問題
    return {
      message: '無法連接到伺服器，請檢查您的網絡連接。',
      code: 'NETWORK_ERROR',
      details: { request: error.request }
    };
  } else {
    // 發生了其他錯誤
    return {
      message: error.message || defaultMessage,
      code: 'UNKNOWN_ERROR',
      details: error
    };
  }
};

/**
 * 根據 HTTP 狀態碼返回適當的錯誤訊息
 */
const getStatusMessage = (status) => {
  const messages = {
    400: '請求參數有誤',
    401: '您需要登入或重新登入',
    403: '您沒有權限執行此操作',
    404: '請求的資源不存在',
    409: '操作衝突或已存在',
    422: '表單資料驗證失敗',
    429: '請求太頻繁，請稍後再試',
    500: '伺服器內部錯誤',
    502: '網關錯誤',
    503: '服務暫時不可用'
  };
  
  return messages[status] || null;
};

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

// 添加響應攔截器來標準化錯誤處理
apiClient.interceptors.response.use(
  (response) => {
    // 對成功響應不做處理
    return response;
  },
  (error) => {
    // 格式化錯誤
    const formattedError = formatApiError(error);
    
    // 針對特定錯誤碼的處理
    if (formattedError.code === 401) {
      // 401 錯誤可能需要重定向到登入頁面
      console.warn('Authentication error:', formattedError.message);
      // 如果需要，可以觸發登出或重定向到登入頁面
      // window.location.href = '/login';
    }
    
    // 仍然拒絕承諾，但使用格式化後的錯誤
    return Promise.reject(Object.assign(error, { formatted: formattedError }));
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
// Backend expects { date, availableSlots: string[], isRestDay: boolean }
export const saveScheduleForDate = (date, availableSlots, isRestDay = false) => {
  return apiClient.post('/api/schedule', { date, availableSlots, isRestDay });
};

// Book an Appointment (Matches POST /api/book)
// Backend expects { date, time, patientName, patientPhone, patientEmail, ... }
export const bookAppointment = (appointmentDetails) => {
  return apiClient.post('/api/book', appointmentDetails);
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

// Cancel an Appointment (Matches PUT /api/appointments/:id/cancel)
// Backend endpoint doesn't differentiate roles for cancellation
export const cancelAppointment = (appointmentId) => {
  return apiClient.put(`/api/appointments/${appointmentId}/cancel`);
};
// Aliases for different roles
export const cancelPatientAppointment = cancelAppointment;
export const cancelAdminAppointment = cancelAppointment; // Assuming admin uses the same endpoint

// 獲取所有醫生列表 (用於預約頁面)
export const getDoctors = () => {
  return apiClient.get('/api/doctors');
};

// --- Removed Functions (Backend doesn't support these) --- //
// registerUser
// getUserProfile
// getAvailableSlots (replaced by getScheduleForMonth)
// addDoctorSlot (replaced by saveScheduleForDate)
// removeDoctorSlot
// bulkGenerateDoctorSlots
// loginAdmin


export default apiClient;

