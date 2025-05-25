import React, { useState, useEffect, useContext } from 'react';
import {
  Button,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { googleLogin, googleRegister, getGoogleConfig } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const GoogleLoginButton = ({ 
  onSuccess, 
  onError, 
  variant = 'outlined', 
  size = 'large', 
  fullWidth = true, 
  disabled = false,
  mode = 'login', // 'login' or 'register'
  role = 'patient' // for register mode
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const { refreshUser } = useContext(AuthContext);

  // 獲取Google配置
  useEffect(() => {
    const fetchGoogleConfig = async () => {
      try {
        const response = await getGoogleConfig();
        if (response.data && response.data.clientId) {
          setGoogleClientId(response.data.clientId);
          // 動態載入Google Identity Services
          loadGoogleScript();
        }
      } catch (err) {
        console.error('Failed to fetch Google config:', err);
        setError('無法載入Google登入配置');
      }
    };

    fetchGoogleConfig();
  }, []);

  // 動態載入Google Identity Services腳本
  const loadGoogleScript = () => {
    if (window.google) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);
  };

  // 初始化Google Identity Services
  const initializeGoogle = () => {
    if (window.google && googleClientId) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });
    }
  };

  // 處理Google回調
  const handleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');

    try {
      let apiResponse;
      
      if (mode === 'register') {
        apiResponse = await googleRegister(response.credential, role);
      } else {
        apiResponse = await googleLogin(response.credential);
      }

      if (apiResponse.data && apiResponse.data.success) {
        // 刷新用戶狀態
        await refreshUser();
        
        if (onSuccess) {
          onSuccess(apiResponse.data);
        }
      } else {
        throw new Error(apiResponse.data?.error || `Google${mode === 'register' ? '註冊' : '登入'}失敗`);
      }
    } catch (err) {
      console.error('Google authentication error:', err);
      const errorMessage = err.response?.data?.error || err.message || `Google${mode === 'register' ? '註冊' : '登入'}失敗，請稍後再試`;
      setError(errorMessage);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // 觸發Google登入流程
  const handleGoogleLogin = async () => {
    if (!window.google || !googleClientId) {
      setError('Google服務尚未載入，請稍後再試');
      return;
    }

    try {
      window.google.accounts.id.prompt();
    } catch (err) {
      console.error('Failed to trigger Google login:', err);
      setError('無法啟動Google登入，請稍後再試');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || loading}
        onClick={handleGoogleLogin}
        startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
        sx={{
          py: 1.5,
          borderColor: '#dadce0',
          color: '#3c4043',
          backgroundColor: '#fff',
          '&:hover': {
            backgroundColor: '#f8f9fa',
            borderColor: '#dadce0',
          },
          '&:disabled': {
            backgroundColor: '#f8f9fa',
            borderColor: '#dadce0',
            color: '#9aa0a6',
          },
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        {loading 
          ? `${mode === 'register' ? '註冊' : '登入'}中...` 
          : mode === 'register' 
            ? `Google註冊 (${role === 'patient' ? '患者' : '治療師'})` 
            : 'Google登入'
        }
      </Button>
    </Box>
  );
};

export default GoogleLoginButton; 