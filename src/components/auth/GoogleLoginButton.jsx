import React, { useState, useEffect, useContext } from 'react';
import {
  Button,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { getGoogleConfig, googleOAuthCallback } from '../../services/api';
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
        console.log('🔍 開始獲取Google配置...');
        const response = await getGoogleConfig();
        console.log('📡 Google config API response:', response);
        
        const responseData = response.data;
        const clientId = responseData?.details?.clientId || responseData?.clientId;
        console.log('🎯 Extracted Client ID:', clientId);
        
        if (clientId && clientId.trim()) {
          console.log('✅ Setting Google Client ID:', clientId);
          setGoogleClientId(clientId.trim());
        } else {
          console.error('❌ No valid client ID found in response');
          setError('Google配置中缺少有效的Client ID');
        }
      } catch (err) {
        console.error('❌ Failed to fetch Google config:', err);
        setError('無法載入Google登入配置');
      }
    };

    fetchGoogleConfig();
  }, []);

  // 檢查是否是OAuth回調頁面
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');
    
    if (code) {
      console.log('🎉 收到OAuth授權碼:', code);
      handleOAuthCallback(code, state);
    } else if (error) {
      console.error('❌ OAuth錯誤:', error);
      setError(`Google登入失敗: ${error}`);
    }
  }, []);

  // 處理OAuth回調
  const handleOAuthCallback = async (code, state) => {
    setLoading(true);
    try {
      // 解析state參數來確定是登入還是註冊
      const stateData = state ? JSON.parse(decodeURIComponent(state)) : { mode: 'login' };
      
      // 使用API服務發送authorization code到後端
      const response = await googleOAuthCallback(code, stateData.mode, stateData.role);
      
      if (response.data && response.data.success) {
        // 刷新用戶狀態
        await refreshUser();
        
        // 清理URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        throw new Error(response.data?.error || 'Google認證失敗');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Google認證處理失敗';
      setError(errorMessage);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // 觸發Google OAuth流程
  const handleGoogleLogin = async () => {
    console.log('🚀 觸發Google OAuth流程', {
      hasClientId: !!googleClientId,
      clientId: googleClientId,
      mode,
      role,
      currentUrl: window.location.href
    });

    if (!googleClientId) {
      setError('Google配置尚未完成，請稍後再試');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 構建OAuth URL - 使用測試成功的確切格式
      const redirectUri = window.location.origin;  // 只使用origin，不包含pathname
      const state = encodeURIComponent(JSON.stringify({ mode, role }));
      
      // 使用測試成功的舊版端點和參數格式
      const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=openid%20email%20profile&` +
        `state=${state}`;
      
      console.log('🔗 Redirect URI:', redirectUri);
      console.log('🔗 Client ID:', googleClientId);
      console.log('🔗 Google OAuth URL:', authUrl);
      
      // 重定向到Google OAuth
      window.location.href = authUrl;
      
    } catch (err) {
      console.error('❌ Failed to trigger Google OAuth:', err);
      setError(`無法啟動Google登入: ${err.message}`);
      setLoading(false);
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