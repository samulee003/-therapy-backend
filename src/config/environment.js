// 環境配置
export const ENV_CONFIG = {
  // 生產環境域名
  PRODUCTION_URL: 'https://therapy-booking.zeabur.app',
  
  // 開發環境配置
  DEVELOPMENT: {
    // 在開發環境中是否使用生產域名進行郵件連結
    USE_PRODUCTION_URL_FOR_EMAIL: true,
    // 本地開發端口
    LOCAL_PORT: 3000
  },
  
  // 獲取當前環境的基礎URL
  getBaseUrl: () => {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalhost && ENV_CONFIG.DEVELOPMENT.USE_PRODUCTION_URL_FOR_EMAIL) {
      return ENV_CONFIG.PRODUCTION_URL;
    }
    
    return window.location.origin;
  },
  
  // 檢查是否為開發環境
  isDevelopment: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  },
  
  // 檢查是否為生產環境
  isProduction: () => {
    return window.location.hostname.includes('zeabur.app') ||
           window.location.hostname.includes('therapy-booking');
  }
};

export default ENV_CONFIG; 