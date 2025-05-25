import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const GoogleLoginButton = ({ onSuccess, onError, variant = 'outlined', size = 'large', fullWidth = true, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // TODO: 實現Google OAuth 2.0流程
      // 目前顯示開發中訊息
      throw new Error('Google登入功能正在開發中，敬請期待！');
      
      // 預期的實現流程：
      // 1. 初始化Google OAuth客戶端
      // 2. 請求用戶授權
      // 3. 獲取授權碼
      // 4. 發送到後端驗證
      // 5. 處理登入成功/失敗

    } catch (err) {
      console.error('Google login error:', err);
      const errorMessage = err.message || 'Google登入失敗，請稍後再試';
      setError(errorMessage);
      if (onError) {
        onError(err);
      }
    } finally {
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
        {loading ? '登入中...' : '使用 Google 帳號登入'}
      </Button>
    </Box>
  );
};

export default GoogleLoginButton; 