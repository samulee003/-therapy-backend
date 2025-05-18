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
    try {
      // 調用獲取當前用戶的 API
      const response = await getCurrentUser();
      // 直接檢查是否返回了用戶資料
      if (response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        console.log('用戶未登入或回應中沒有用戶資料');
        setUser(null);
      }
    } catch (err) {
      // 如果返回 401，表示用戶未登入，這是正常的
      if (err.response && err.response.status === 401) {
        console.log('用戶未驗證 (401)');
        setUser(null);
      } else {
        console.error('檢查用戶登入狀態失敗:', err);
        setError(err.response?.data?.error || err.message || '檢查登入狀態失敗');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始檢查登入狀態
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 登入函數
  const login = userData => {
    console.log('AuthContext: 設置使用者資料', userData);
    setUser(userData);
    setLoading(false);
  };

  // 登出函數
  const logout = async () => {
    try {
      await logoutUser(); // 呼叫後端登出 API
    } catch (err) {
      console.error('登出時出現錯誤:', err);
    } finally {
      setUser(null);
      setLoading(false);
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
