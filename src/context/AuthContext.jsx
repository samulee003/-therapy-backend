import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logoutUser } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 檢查用戶是否已登入的函數
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('[AuthContext.jsx] checkAuth: starting');
    try {
      // 調用獲取當前用戶的 API
      const response = await getCurrentUser();
      console.log('[AuthContext.jsx] checkAuth: getCurrentUser response:', response);
      // 直接檢查是否返回了用戶資料
      if (response.data && response.data.user) {
        console.log('[AuthContext.jsx] checkAuth: user data found:', response.data.user);
        setUser(response.data.user);
      } else {
        console.log('[AuthContext.jsx] checkAuth: User not logged in or no user data in response. Response data:', response ? response.data : 'No response data');
        // console.log('用戶未登入或回應中沒有用戶資料'); // 此行已存在
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext.jsx] checkAuth: Full error object:', err);
      // 如果返回 401，表示用戶未登入，這是正常的
      if (err.response && err.response.status === 401) {
        console.log('[AuthContext.jsx] checkAuth: User not authenticated (401). This is normal if not logged in.');
        // console.log('用戶未驗證 (401)'); // 此行已存在
        setUser(null);
      } else {
        console.error('[AuthContext.jsx] checkAuth: Failed to check auth status. Error response:', err.response ? err.response.data : 'No response data');
        // console.error('檢查用戶登入狀態失敗:', err); // 此行已存在
        setError(err.response?.data?.error || err.response?.data?.message || err.message || '檢查登入狀態失敗');
      }
    } finally {
      setLoading(false);
      console.log('[AuthContext.jsx] checkAuth: finished');
    }
  }, []);

  // 初始檢查登入狀態
  useEffect(() => {
    console.log('[AuthContext.jsx] useEffect: calling checkAuth on mount');
    checkAuth();
  }, [checkAuth]);

  // 登入函數
  const login = userData => {
    console.log('[AuthContext.jsx] login: setting user data:', userData);
    setUser(userData);
    // 確認狀態更新
    // 注意：直接在這裡 console.log(user) 可能不會立即反映更新後的值，因為 setState 是異步的。
    // 可以透過 useEffect 監聽 user 變化來確認。
    setLoading(false);
    console.log('[AuthContext.jsx] login: finished');
  };

  // 登出函數
  const logout = async () => {
    console.log('[AuthContext.jsx] logout: starting');
    try {
      await logoutUser(); // 呼叫後端登出 API
      console.log('[AuthContext.jsx] logout: logoutUser API call successful');
    } catch (err) {
      console.error('[AuthContext.jsx] logout: Error during logout API call. Full error object:', err);
      // console.error('登出時出現錯誤:', err); // 此行已存在
    } finally {
      // 確保清除 localStorage 中的 token
      localStorage.removeItem('auth_token');
      setUser(null);
      setLoading(false);
      console.log('[AuthContext.jsx] logout: finished, user set to null');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    error,
    login,
    logout,
    refreshUser: checkAuth, // 提供刷新用戶資料的方法
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
