import emailjs from '@emailjs/browser';

// EmailJS 配置
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_ky8ucke',
  TEMPLATE_ID: 'template_e2iu781', 
  PUBLIC_KEY: 'ryFYX3BhVFTCNuv4P',
};

/**
 * 初始化EmailJS服務
 */
export const initEmailJS = () => {
  // 在實際部署時，這些值應該從環境變量獲取
  emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
};

/**
 * 生成密碼重置令牌
 * 在沒有後端的情況下，我們使用時間戳和隨機數來生成令牌
 */
export const generateResetToken = (email) => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const token = btoa(`${email}:${timestamp}:${randomStr}`);
  
  // 將令牌存儲在localStorage中，設置30分鐘過期
  const expirationTime = timestamp + (30 * 60 * 1000); // 30分鐘
  localStorage.setItem(`reset_token_${token}`, JSON.stringify({
    email,
    expiration: expirationTime,
    used: false
  }));
  
  return token;
};

/**
 * 驗證密碼重置令牌
 */
export const validateResetToken = (token) => {
  try {
    const tokenData = localStorage.getItem(`reset_token_${token}`);
    if (!tokenData) {
      return { valid: false, error: '無效的重置令牌' };
    }
    
    const { email, expiration, used } = JSON.parse(tokenData);
    
    if (used) {
      return { valid: false, error: '此重置令牌已被使用' };
    }
    
    if (Date.now() > expiration) {
      localStorage.removeItem(`reset_token_${token}`);
      return { valid: false, error: '重置令牌已過期' };
    }
    
    return { valid: true, email };
  } catch (error) {
    return { valid: false, error: '令牌格式錯誤' };
  }
};

/**
 * 標記令牌為已使用
 */
export const markTokenAsUsed = (token) => {
  try {
    const tokenData = localStorage.getItem(`reset_token_${token}`);
    if (tokenData) {
      const data = JSON.parse(tokenData);
      data.used = true;
      localStorage.setItem(`reset_token_${token}`, JSON.stringify(data));
    }
  } catch (error) {
    console.error('標記令牌失敗:', error);
  }
};

/**
 * 發送密碼重置郵件
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    // 生成重置令牌
    const token = generateResetToken(email);
    
    // 構建重置連結
    const resetUrl = `${window.location.origin}/reset-password?token=${token}`;
    
    // 準備郵件模板參數
    const templateParams = {
      to_email: email,
      reset_url: resetUrl,
      expiration_time: '30分鐘',
    };
    
    // 發送郵件
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );
    
    console.log('密碼重置郵件發送成功:', response);
    return { success: true, message: '密碼重置郵件已發送' };
  } catch (error) {
    console.error('發送密碼重置郵件失敗:', error);
    
    // 如果EmailJS服務未配置或失敗，提供備選方案提示
    if (error.text && error.text.includes('not found')) {
      return {
        success: false,
        error: 'EmailJS服務未配置。請聯繫系統管理員協助重置密碼。',
        showAdminContact: true
      };
    }
    
    return {
      success: false,
      error: '發送郵件失敗，請稍後再試或聯繫系統管理員。',
      showAdminContact: true
    };
  }
};

/**
 * 模擬發送郵件（開發環境使用）
 * 當EmailJS服務未配置時，提供模擬功能以便開發測試
 */
export const simulatePasswordResetEmail = (email) => {
  console.log('=== 模擬密碼重置郵件 ===');
  console.log(`收件人: ${email}`);
  
  const token = generateResetToken(email);
  const resetUrl = `${window.location.origin}/reset-password?token=${token}`;
  
  console.log(`重置連結: ${resetUrl}`);
  console.log('有效期: 30分鐘');
  console.log('=========================');
  
  // 為了測試方便，將重置連結複製到剪貼板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(resetUrl).then(() => {
      console.log('重置連結已複製到剪貼板');
    }).catch(err => {
      console.log('無法複製到剪貼板:', err);
    });
  }
  
  return {
    success: true,
    message: '模擬郵件發送成功（開發模式）',
    resetUrl, // 開發環境返回連結以便測試
    isDevelopment: true
  };
};

/**
 * 清理過期的重置令牌
 */
export const cleanupExpiredTokens = () => {
  const keys = Object.keys(localStorage);
  const now = Date.now();
  
  keys.forEach(key => {
    if (key.startsWith('reset_token_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.expiration && now > data.expiration) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // 如果解析失敗，也移除這個無效的項目
        localStorage.removeItem(key);
      }
    }
  });
};

// 在應用啟動時清理過期令牌
cleanupExpiredTokens(); 