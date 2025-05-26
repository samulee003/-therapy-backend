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
          const trimmedClientId = clientId.trim();
          setGoogleClientId(trimmedClientId);
          // 動態載入Google Identity Services，直接傳遞clientId
          loadGoogleScript(trimmedClientId);
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
  const loadGoogleScript = (clientId) => {
    console.log('🔄 Loading Google script with Client ID:', clientId);
    
    if (window.google) {
      console.log('Google script already loaded, initializing with Client ID:', clientId);
      // 直接傳遞clientId，避免狀態異步問題
      setTimeout(() => initializeGoogleWithClientId(clientId), 100);
      return;
    }

    console.log('Loading Google Identity Services script...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google script loaded successfully');
      // 直接傳遞clientId，避免狀態異步問題
      setTimeout(() => initializeGoogleWithClientId(clientId), 100);
    };
    script.onerror = () => {
      console.error('Failed to load Google script');
      setError('無法載入Google服務腳本');
    };
    document.head.appendChild(script);
  };

  // 使用直接傳遞的clientId初始化Google Identity Services
  const initializeGoogleWithClientId = (clientId) => {
    console.log('🚀 開始初始化Google Identity Services...');
    console.log('🔍 檢查前置條件:', {
      hasGoogle: !!window.google,
      hasClientId: !!clientId,
      clientIdValue: clientId,
      clientIdLength: clientId?.length,
      stateClientId: googleClientId,
      currentDomain: window.location.hostname,
      currentOrigin: window.location.origin
    });
    
    if (window.google && clientId && clientId.trim()) {
      console.log('✅ 前置條件滿足，開始初始化...');
      console.log('🎯 使用Client ID:', clientId);
      
      try {
        const config = {
          client_id: clientId.trim(),
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // 禁用FedCM以避免第三方Cookie問題
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
        hasClientId: !!clientId,
        googleObject: window.google ? 'exists' : 'missing',
        clientIdValue: clientId || 'empty',
        stateClientId: googleClientId || 'empty',
        currentDomain: window.location.hostname
      });
      
      if (!window.google) {
        setError('Google服務腳本尚未載入');
      } else if (!clientId) {
        setError('Google Client ID未配置');
      }
    }
  };

  // 保留原有的初始化函數作為備用
  const initializeGoogle = () => {
    initializeGoogleWithClientId(googleClientId);
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
      
      console.log('🚀 Attempting to show Google prompt...');
      
      // 直接使用renderButton方法，更穩定
      tryRenderButton();
      
    } catch (err) {
      console.error('❌ Failed to trigger Google login:', err);
      setError(`無法啟動Google登入: ${err.message}`);
      setLoading(false);
    }
  };

  // 使用renderButton方法
  const tryRenderButton = () => {
    try {
      console.log('🔧 Using renderButton method...');
      
      // 創建臨時按鈕容器
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-9999px';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '1px';
      tempDiv.style.height = '1px';
      tempDiv.style.overflow = 'hidden';
      document.body.appendChild(tempDiv);

      console.log('🎯 Rendering Google button...');
      
      window.google.accounts.id.renderButton(tempDiv, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 250
      });

      // 等待按鈕渲染完成後點擊
      setTimeout(() => {
        console.log('🖱️ Attempting to click Google button...');
        const button = tempDiv.querySelector('div[role="button"]') || 
                      tempDiv.querySelector('button') || 
                      tempDiv.querySelector('[data-idom-class]');
        
        if (button) {
          console.log('✅ Found Google button, clicking...');
          button.click();
        } else {
          console.error('❌ Google button not found in rendered content');
          setError('無法找到Google登入按鈕');
        }
        
        // 清理臨時元素
        setTimeout(() => {
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
          setLoading(false);
        }, 1000);
      }, 500);
      
    } catch (err) {
      console.error('❌ RenderButton method failed:', err);
      setError(`Google登入服務暫時不可用: ${err.message}`);
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