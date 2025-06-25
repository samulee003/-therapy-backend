import emailjs from '@emailjs/browser';
import ENV_CONFIG from '../config/environment';

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
  
  // 確保用戶在localStorage中存在（模擬註冊）
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const userExists = users.find(user => user.email === email);
  
  if (!userExists) {
    console.log('為重置密碼創建模擬用戶:', email);
    const newUser = {
      id: timestamp,
      email: email,
      password: '', // 空密碼，等待重置
      role: 'patient',
      name: email.split('@')[0],
      createdAt: new Date().toISOString(),
      isTemporary: true // 標記為臨時用戶
    };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
  }
  
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
  console.log('開始驗證重置令牌:', token);
  
  try {
    if (!token) {
      console.log('令牌為空');
      return { valid: false, error: '重置令牌為空' };
    }
    
    const tokenKey = `reset_token_${token}`;
    console.log('查找令牌鍵:', tokenKey);
    
    const tokenData = localStorage.getItem(tokenKey);
    console.log('令牌數據:', tokenData);
    
    if (!tokenData) {
      console.log('令牌不存在於localStorage');
      return { valid: false, error: '無效的重置令牌' };
    }
    
    const parsedData = JSON.parse(tokenData);
    console.log('解析的令牌數據:', parsedData);
    
    const { email, expiration, used } = parsedData;
    
    if (used) {
      console.log('令牌已被使用');
      return { valid: false, error: '此重置令牌已被使用' };
    }
    
    const now = Date.now();
    console.log('當前時間:', now, '過期時間:', expiration);
    
    if (now > expiration) {
      console.log('令牌已過期');
      localStorage.removeItem(tokenKey);
      return { valid: false, error: '重置令牌已過期' };
    }
    
    console.log('令牌驗證成功，用戶:', email);
    return { valid: true, email };
  } catch (error) {
    console.error('令牌驗證過程中出現錯誤:', error);
    return { valid: false, error: `令牌格式錯誤: ${error.message}` };
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
    
    // 構建重置連結 - 使用環境配置
    const baseUrl = ENV_CONFIG.getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    console.log('重置連結信息:', { 
      isDevelopment: ENV_CONFIG.isDevelopment(),
      hostname: window.location.hostname, 
      baseUrl,
      resetUrl 
    });
    
    // 準備郵件模板參數
    const templateParams = {
      email: email,  // 收件人郵件地址
      link: resetUrl, // 重置連結
      reset_url: resetUrl, // 備用參數名稱
      user_name: email.split('@')[0], // 從郵件地址提取用戶名
      expiration_time: '30分鐘',
      company_name: '心理治療預約系統',
      website_url: window.location.origin,
    };
    
    console.log('正在發送密碼重置郵件...', { 
      email, 
      service: EMAILJS_CONFIG.SERVICE_ID,
      template: EMAILJS_CONFIG.TEMPLATE_ID,
      resetUrl: resetUrl
    });
    
    console.log('EmailJS模板參數:', templateParams);
    
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
    
    // 檢查是否為EmailJS配置錯誤
    if (error.status === 401 || error.text?.includes('Unauthorized')) {
      return {
        success: false,
        error: 'EmailJS配置錯誤：未授權。請聯繫系統管理員。',
        showAdminContact: true
      };
    }
    
    // 檢查是否為模板不存在錯誤
    if (error.status === 404 || error.text?.includes('not found')) {
      return {
        success: false,
        error: 'EmailJS模板不存在。請聯繫系統管理員。',
        showAdminContact: true
      };
    }
    
    // 檢查是否為網絡錯誤
    if (error.name === 'NetworkError' || !navigator.onLine) {
      return {
        success: false,
        error: '網絡連接問題，無法發送郵件。請檢查網絡連接後重試。',
        showAdminContact: false
      };
    }
    
    // 其他錯誤情況
    return {
      success: false,
      error: `發送郵件失敗：${error.text || error.message || '未知錯誤'}。請聯繫系統管理員。`,
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

/**
 * 調試函數：顯示localStorage中的所有重置令牌
 */
export const debugResetTokens = () => {
  console.log('=== localStorage 重置令牌調試 ===');
  const keys = Object.keys(localStorage);
  const resetTokens = keys.filter(key => key.startsWith('reset_token_'));
  
  console.log(`總共找到 ${resetTokens.length} 個重置令牌:`);
  
  resetTokens.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      const isExpired = Date.now() > data.expiration;
      console.log(`令牌: ${key.replace('reset_token_', '')}`);
      console.log(`  - 郵箱: ${data.email}`);
      console.log(`  - 已使用: ${data.used}`);
      console.log(`  - 已過期: ${isExpired}`);
      console.log(`  - 過期時間: ${new Date(data.expiration).toLocaleString()}`);
    } catch (error) {
      console.log(`令牌 ${key} 數據格式錯誤:`, error);
    }
  });
  
  console.log('==============================');
};

/**
 * 調試函數：顯示localStorage中的所有用戶
 */
export const debugUsers = () => {
  console.log('=== localStorage 用戶調試 ===');
  try {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    console.log(`總共找到 ${users.length} 個用戶:`);
    
    users.forEach((user, index) => {
      console.log(`用戶 ${index + 1}:`);
      console.log(`  - ID: ${user.id}`);
      console.log(`  - 郵箱: ${user.email}`);
      console.log(`  - 角色: ${user.role}`);
      console.log(`  - 姓名: ${user.name}`);
      console.log(`  - 臨時用戶: ${user.isTemporary || false}`);
    });
  } catch (error) {
    console.log('用戶數據格式錯誤:', error);
  }
  
  console.log('=============================');
}; 