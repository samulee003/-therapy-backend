import axios from 'axios';

// Determine the base URL based on the environment
// IMPORTANT: Set VITE_API_BASE_URL in your frontend service environment variables on Zeabur
// to your backend service URL (e.g., https://psy-backend.zeabur.app)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://psy-backend.zeabur.app'; // 默認使用部署的後端服務

// If API_BASE_URL is empty after checking env var, log an error or throw,
// because relative paths won't work correctly with separate frontend/backend services.
console.info('API 配置信息:', {
  baseURL: API_BASE_URL,
  environment: import.meta.env.MODE,
  environmentVariables: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '(未設置)',
  },
});
console.log(`[api.js] Effective API_BASE_URL: ${API_BASE_URL}`);

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
      message: data?.message || data?.error || getStatusMessage(status) || defaultMessage,
      code: status,
      details: data || {},
    };
  } else if (error.request) {
    // 請求已發出但沒有收到回應，可能是網絡問題
    return {
      message: '無法連接到伺服器，請檢查您的網絡連接。',
      code: 'NETWORK_ERROR',
      details: { request: error.request },
    };
  } else {
    // 發生了其他錯誤
    return {
      message: error.message || defaultMessage,
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }
};

/**
 * 根據 HTTP 狀態碼返回適當的錯誤訊息
 */
const getStatusMessage = status => {
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
    503: '服務暫時不可用',
  };

  return messages[status] || null;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Use the backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 重要：啟用憑證 (Cookies) 跨域發送，用於 Session 認證
  timeout: 10000, // 增加超時設置，10秒
  // 嘗試解決CORS問題
  validateStatus: function (status) {
    return status >= 200 && status < 500; // 自訂驗證狀態
  },
});

// Add a request interceptor to include the token (if any)
// NOTE: Current backend does not use token authentication after login.
// This interceptor remains for potential future use but won't affect current backend.
apiClient.interceptors.request.use(
  config => {
    console.log(`API 請求: ${config.method?.toUpperCase()} ${config.url}`);
    // 恢復 token 邏輯，支援從 localStorage 讀取 token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('API 請求錯誤:', error);
    return Promise.reject(error);
  }
);

// 添加響應攔截器來標準化錯誤處理
apiClient.interceptors.response.use(
  response => {
    console.log(
      `API 回應: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`
    );
    // 對成功響應不做處理
    return response;
  },
  error => {
    // 檢查是否是網絡錯誤（無響應）
    if (!error.response) {
      console.error('API 網絡錯誤: 無法連接到伺服器', {
        url: error.config?.url || '未知URL',
        method: error.config?.method?.toUpperCase() || '未知方法',
      });
      // 增強錯誤訊息以提供更多調試信息
      error.message = '無法連接到伺服器 (' + API_BASE_URL + ')，請檢查後端服務是否運行中。';
    }

    // 格式化錯誤
    const formattedError = formatApiError(error);
    console.error('API 錯誤:', {
      url: error.config?.url || '未知URL',
      method: error.config?.method?.toUpperCase() || '未知方法',
      status: error.response?.status || '無狀態碼',
      message: formattedError.message,
      details: error.response?.data || error.message || '未提供詳細信息',
    });

    // 針對特定錯誤碼的處理
    if (formattedError.code === 401) {
      // 401 錯誤可能需要重定向到登入頁面
      console.warn('認證錯誤 (401): 現有登入無效或需重新登入。', formattedError.message);
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
export const loginUser = credentials => {
  // Sending the full credentials object as backend requires both username and password
  console.log('[api.js] loginUser: credentials:', credentials);
  return apiClient.post('/api/auth/login', credentials); // 修改為標準路徑
};

// ADDED: User Logout (Matches POST /api/logout)
export const logoutUser = () => {
  console.log('[api.js] logoutUser: making request');
  return apiClient.post('/api/auth/logout');
};

// ADDED: Get Current User Profile (Matches GET /api/me)
export const getCurrentUser = () => {
  console.log('[api.js] getCurrentUser: making request');
  return apiClient.get('/api/auth/me');
};

// ADDED: User Registration (Matches POST /api/register)
export const registerUser = registrationData => {
  // registrationData should contain { username, password, name, role }
  return apiClient.post('/api/auth/register', registrationData); // 修改為標準路徑
};

// --- Google OAuth Authentication --- //

// Get Google OAuth configuration
export const getGoogleConfig = () => {
  console.log('[api.js] getGoogleConfig: fetching configuration');
  return apiClient.get('/api/auth/google/config');
};

// Google OAuth Callback - Exchange authorization code for user session
export const googleOAuthCallback = (code, mode = 'login', role = 'patient') => {
  console.log('[api.js] googleOAuthCallback: sending authorization code to backend');
  return apiClient.post('/api/auth/google/callback', { 
    code, 
    mode, 
    role 
  });
};

// Google Login (Send Google ID token to backend for verification)
export const googleLogin = (idToken) => {
  console.log('[api.js] googleLogin: sending ID token to backend');
  return apiClient.post('/api/auth/google/login', { idToken });
};

// Google Register (Send Google ID token and role to backend for registration)
export const googleRegister = (idToken, role) => {
  console.log('[api.js] googleRegister: sending ID token and role to backend');
  return apiClient.post('/api/auth/google/register', { idToken, role });
};

// --- Settings --- //

// Get Settings (Matches GET /api/settings)
export const getSettings = () => {
  return apiClient.get('/api/settings');
};

// Update Settings (Matches PUT /api/settings)
export const updateSettings = settingsData => {
  return apiClient.put('/api/settings', settingsData);
};

// --- Schedule --- //

// Get Schedule for a specific month (Matches GET /api/schedule/:year/:month)
export const getScheduleForMonth = (year, month, doctorId = null) => {
  // 確保參數有效
  if (!year || !month) {
    console.error('getScheduleForMonth: 缺少必要參數', { year, month });
    return Promise.reject(new Error('排班查詢需要有效的年份和月份'));
  }

  // Ensure month is zero-padded if necessary
  const paddedMonth = String(month).padStart(2, '0');

  // 構建基本 URL - 注意這裡是 /api/schedules (複數)
  let url = `/api/schedules/${year}/${paddedMonth}`;

  // 如果提供了 doctorId，將其作為查詢參數添加
  if (doctorId) {
    url = `${url}?doctorId=${doctorId}`;
    console.log(`排班查詢 URL (帶醫生ID): ${url}`);
  } else {
    console.log(`排班查詢 URL (不帶醫生ID): ${url}`);
  }

  // 返回 promise
  return apiClient.get(url).catch(error => {
    console.error(`排班查詢失敗 (${year}-${paddedMonth}):`, error);
    throw error; // 重新拋出以便上層處理
  });
};

// Save schedule for a specific date (Matches POST /api/schedule)
// Backend expects { doctorId, date, startTime, endTime, slotDuration (optional), isRestDay (optional), definedSlots (optional) }
export const saveScheduleForDate = (doctorId, date, startTime, endTime, isRestDay = false, slotDuration = 30, definedSlots = null) => {
  // 驗證輸入
  if (!doctorId || !date) {
    console.error('saveScheduleForDate: 無效輸入 - doctorId 或 date 缺失', { doctorId, date, startTime, endTime, isRestDay, slotDuration, definedSlots });
    return Promise.reject(new Error('排班保存需要有效的醫生ID和日期'));
  }

  if (!isRestDay && (!startTime || !endTime)) {
    console.error('saveScheduleForDate: 無效輸入 - 非休息日時 startTime 或 endTime 缺失', { doctorId, date, startTime, endTime, isRestDay, slotDuration, definedSlots });
    return Promise.reject(new Error('非休息日的排班保存需要開始和結束時間'));
  }

  const payload = {
    doctorId,
    date,
    isRestDay,
  };

  if (!isRestDay) {
    payload.startTime = startTime;
    payload.endTime = endTime;
    payload.slotDuration = slotDuration;
    if (definedSlots && definedSlots.length > 0) {
      payload.definedSlots = definedSlots;
    }
  }

  console.log('保存排班 payload:', payload);
  return apiClient.post('/api/schedules', payload).catch(error => {
    console.error(`保存排班失敗 (${date}):`, error);
    throw error;
  });
};

// Book an Appointment (Matches POST /api/book)
// Backend expects { date, time, patientName, patientPhone, patientEmail, ... }
export const bookAppointment = appointmentDetails => {
  return apiClient.post('/api/appointments', appointmentDetails);
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
export const cancelAppointment = appointmentId => {
  return apiClient.put(`/api/appointments/${appointmentId}/cancel`);
};
// Aliases for different roles
export const cancelPatientAppointment = cancelAppointment;
export const cancelAdminAppointment = cancelAppointment; // Assuming admin uses the same endpoint

// 獲取所有醫生列表 (用於預約頁面)
export const getDoctors = () => {
  return apiClient.get('/api/users/doctors');
};

// --- User Profile --- //

// Update user profile (Matches PUT /api/users/profile)
export const updateUserProfile = (profileData) => {
  return apiClient.put('/api/users/profile', profileData);
};

// Change user password (Matches PUT /api/users/password)
export const changeUserPassword = (passwordData) => {
  return apiClient.put('/api/users/password', passwordData);
};

// --- Password Reset --- //

import { 
  sendPasswordResetEmail, 
  simulatePasswordResetEmail, 
  validateResetToken, 
  markTokenAsUsed 
} from './emailService';

// 新增：後端密碼更新API (配合後端 PUT /api/auth/update-password)
export const updatePassword = async (email, newPassword) => {
  console.log('[api.js] updatePassword: 調用後端密碼更新API');
  
  if (!email || !newPassword) {
    throw new Error('郵箱和新密碼不能為空');
  }
  
  return apiClient.put('/api/auth/update-password', {
    email,
    newPassword
  });
};

// Request password reset (使用後端API + EmailJS發送重置郵件)
export const requestPasswordReset = async (data) => {
  console.log('[api.js] requestPasswordReset: requesting password reset for email:', data.email);
  
  try {
    // 優先使用後端API驗證用戶存在
    try {
      console.log('[api.js] 嘗試使用後端API驗證用戶...');
      const backendResponse = await apiClient.post('/api/auth/forgot-password', { email: data.email });
      console.log('[api.js] 後端驗證成功:', backendResponse.data);
      
      // 後端驗證成功，使用EmailJS發送郵件
      const result = await sendPasswordResetEmail(data.email);
      
      if (result.success) {
        return { 
          data: { 
            message: '密碼重置郵件已發送，請檢查您的電子郵件',
            showAdminContact: result.showAdminContact || false
          } 
        };
      } else {
        throw new Error(result.error || '發送郵件失敗');
      }
    } catch (backendError) {
      console.log('[api.js] 後端API調用失敗，回退到純前端模式:', backendError.message);
      
      // 後端不可用時，回退到純前端EmailJS模式
      const result = await sendPasswordResetEmail(data.email);
      
      if (result.success) {
        return { 
          data: { 
            message: result.message + ' (使用前端模式)',
            showAdminContact: result.showAdminContact || false
          } 
        };
      } else {
        throw {
          response: {
            data: {
              error: result.error,
              showAdminContact: result.showAdminContact || true
            }
          }
        };
      }
    }
  } catch (error) {
    console.error('密碼重置請求失敗:', error);
    
    // 如果是已經包裝的錯誤，直接重新拋出
    if (error.response?.data?.error) {
      throw error;
    }
    
    // 處理其他類型的錯誤
    throw {
      response: {
        data: {
          error: error.message || '發送重置郵件失敗，請聯繫系統管理員',
          showAdminContact: true
        }
      }
    };
  }
};

// Reset password with token (整合後端API)
export const resetPassword = async (data) => {
  console.log('[api.js] resetPassword: 開始重置密碼流程');
  console.log('重置數據:', { token: data.token ? '存在' : '不存在', password: '***' });
  
  try {
    if (!data.token) {
      throw new Error('缺少重置令牌');
    }
    
    if (!data.password) {
      throw new Error('缺少新密碼');
    }
    
    // 首先驗證前端令牌以獲取用戶郵箱
    console.log('開始驗證前端令牌...');
    const validation = validateResetToken(data.token);
    console.log('前端令牌驗證結果:', validation);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    console.log('前端令牌驗證成功，用戶郵箱:', validation.email);
    
    // 優先使用後端API更新密碼
    try {
      console.log('[api.js] 嘗試使用後端API更新密碼...');
      const backendResponse = await apiClient.put('/api/auth/update-password', {
        email: validation.email,
        newPassword: data.password
      });
      
      console.log('[api.js] 後端密碼更新成功:', backendResponse.data);
      
      // 標記前端令牌為已使用
      markTokenAsUsed(data.token);
      
      return { 
        data: { 
          message: '密碼重置成功！請使用新密碼登入' 
        } 
      };
    } catch (backendError) {
      console.log('[api.js] 後端API不可用，使用前端localStorage模式:', backendError.message);
      
      // 後端不可用時，回退到localStorage模式
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      console.log('當前用戶數量:', users.length);
      
      let userIndex = users.findIndex(user => user.email === validation.email);
      console.log('用戶索引:', userIndex);
      
      // 如果用戶不存在，創建一個模擬用戶
      if (userIndex === -1) {
        console.log('用戶不存在，創建新用戶:', validation.email);
        const newUser = {
          id: Date.now(),
          email: validation.email,
          password: data.password,
          role: 'patient',
          name: validation.email.split('@')[0],
          createdAt: new Date().toISOString()
        };
        users.push(newUser);
        userIndex = users.length - 1;
        console.log('新用戶已創建:', newUser);
      } else {
        console.log('找到現有用戶，更新密碼:', validation.email);
        // 更新現有用戶密碼
        users[userIndex].password = data.password;
        console.log('用戶密碼已更新');
      }
      
      // 保存用戶數據
      console.log('保存用戶數據到localStorage...');
      localStorage.setItem('users', JSON.stringify(users));
      console.log('用戶數據已保存');
      
      // 標記令牌為已使用
      markTokenAsUsed(data.token);
      
      return { 
        data: { 
          message: '密碼重置成功！(使用前端模式)' 
        } 
      };
    }
  } catch (error) {
    console.error('密碼重置失敗，錯誤詳情:', error);
    console.error('錯誤堆棧:', error.stack);
    
    throw {
      response: {
        data: {
          error: error.message || '密碼重置失敗，請重新嘗試'
        }
      }
    };
  }
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
