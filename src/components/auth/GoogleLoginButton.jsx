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
        console.log('🔍 開始獲取Google配置...');
        const response = await getGoogleConfig();
        console.log('📡 Google config API response:', response);
        console.log('📊 Response data:', response.data);
        console.log('🔍 Response data type:', typeof response.data);
        console.log('🔍 Response data keys:', Object.keys(response.data || {}));
        
        // 詳細檢查後端返回的配置格式
        const responseData = response.data;
        console.log('🔍 Details object:', responseData?.details);
        console.log('🔍 Details keys:', Object.keys(responseData?.details || {}));
        
        const clientId = responseData?.details?.clientId || responseData?.clientId;
        console.log('🎯 Extracted Client ID:', clientId);
        console.log('🎯 Client ID type:', typeof clientId);
        console.log('🎯 Client ID length:', clientId?.length);
        
        if (clientId && clientId.trim()) {
          console.log('✅ Setting Google Client ID:', clientId);
          setGoogleClientId(clientId.trim());
          // 動態載入Google Identity Services
          loadGoogleScript();
        } else {
          console.error('❌ No valid client ID found in response');
          console.error('❌ Response structure:', JSON.stringify(responseData, null, 2));
          setError('Google配置中缺少有效的Client ID');
        }
      } catch (err) {
        console.error('❌ Failed to fetch Google config:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        setError('無法載入Google登入配置');
      }
    };

    fetchGoogleConfig();
  }, []);

  // 當googleClientId設置後，重新初始化Google服務
  useEffect(() => {
    if (googleClientId && window.google) {
      console.log('Client ID updated, re-initializing Google...');
      initializeGoogle();
    }
  }, [googleClientId]);

  // 動態載入Google Identity Services腳本
  const loadGoogleScript = () => {
    if (window.google) {
      console.log('Google script already loaded, initializing...');
      // 延遲初始化，確保clientId已設置
      setTimeout(() => initializeGoogle(), 100);
      return;
    }

    console.log('Loading Google Identity Services script...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google script loaded successfully');
      // 延遲初始化，確保clientId已設置
      setTimeout(() => initializeGoogle(), 100);
    };
    script.onerror = () => {
      console.error('Failed to load Google script');
      setError('無法載入Google服務腳本');
    };
    document.head.appendChild(script);
  };

  // 初始化Google Identity Services
  const initializeGoogle = () => {
    console.log('🚀 開始初始化Google Identity Services...');
    console.log('🔍 檢查前置條件:', {
      hasGoogle: !!window.google,
      hasClientId: !!googleClientId,
      clientIdValue: googleClientId,
      clientIdLength: googleClientId?.length,
      currentDomain: window.location.hostname,
      currentOrigin: window.location.origin
    });
    
    if (window.google && googleClientId) {
      console.log('✅ 前置條件滿足，開始初始化...');
      console.log('🎯 使用Client ID:', googleClientId);
      
      try {
        const config = {
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // 禁用FedCM以避免第三方Cookie問題
          ux_mode: 'popup', // 使用彈窗模式
          context: 'signin' // 明確指定上下文
        };
        
        console.log('🔧 Google初始化配置:', config);
        
        window.google.accounts.id.initialize(config);
        console.log('✅ Google Identity Services initialized successfully');
        
        // 測試Google服務是否可用
        if (window.google.accounts.id.prompt) {
          console.log('✅ Google prompt method available');
        } else {
          console.warn('⚠️ Google prompt method not available');
        }
        
        // 測試其他Google方法
        console.log('🔍 可用的Google方法:', {
          hasPrompt: !!window.google.accounts.id.prompt,
          hasRenderButton: !!window.google.accounts.id.renderButton,
          hasRevoke: !!window.google.accounts.id.revoke
        });
        
      } catch (err) {
        console.error('❌ Failed to initialize Google Identity Services:', err);
        console.error('❌ Error details:', err.message, err.stack);
        setError(`Google服務初始化失敗: ${err.message}`);
      }
    } else {
      console.log('❌ Cannot initialize Google - missing requirements:', {
        hasGoogle: !!window.google,
        hasClientId: !!googleClientId,
        googleObject: window.google ? 'exists' : 'missing',
        clientIdValue: googleClientId || 'empty',
        currentDomain: window.location.hostname
      });
      
      if (!window.google) {
        setError('Google服務腳本尚未載入');
      } else if (!googleClientId) {
        setError('Google Client ID未配置');
      }
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
    console.log('Google login triggered', {
      hasGoogle: !!window.google,
      hasClientId: !!googleClientId,
      clientId: googleClientId,
      domain: window.location.hostname,
      origin: window.location.origin
    });

    if (!window.google) {
      setError('Google服務尚未載入，請稍後再試');
      return;
    }

    if (!googleClientId) {
      setError('Google配置尚未完成，請稍後再試');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 使用renderButton方法作為備選方案
      console.log('Attempting to show Google prompt...');
      
      // 先嘗試使用prompt方法
      window.google.accounts.id.prompt((notification) => {
        console.log('Google prompt notification:', notification);
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.log('Prompt not displayed:', reason);
          
          // 如果prompt失敗，嘗試使用renderButton
          if (reason === 'browser_not_supported' || reason === 'invalid_client') {
            console.log('Trying alternative method: renderButton');
            tryRenderButton();
          } else {
            setError(`Google登入不可用: ${reason}`);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Failed to trigger Google login:', err);
      setError(`無法啟動Google登入: ${err.message}`);
      setLoading(false);
    }
  };

  // 備選方案：使用renderButton
  const tryRenderButton = () => {
    try {
      // 創建臨時按鈕容器
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      window.google.accounts.id.renderButton(tempDiv, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        click_listener: () => {
          console.log('Google button clicked via renderButton');
        }
      });

      // 模擬點擊
      setTimeout(() => {
        const button = tempDiv.querySelector('div[role="button"]');
        if (button) {
          button.click();
        }
        document.body.removeChild(tempDiv);
        setLoading(false);
      }, 100);
    } catch (err) {
      console.error('RenderButton method also failed:', err);
      setError('Google登入服務暫時不可用');
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