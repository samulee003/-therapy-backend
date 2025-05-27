// 測試新的 Google OAuth 配置
const https = require('https');

const newClientId = '18566096794-ec7qc6cekboq6am8laiv5odkbqd4i18f.apps.googleusercontent.com';

console.log('🔍 測試新的 Google OAuth 配置...');
console.log('新的 Client ID:', newClientId);

// 測試授權 URL
const authUrl = 'https://accounts.google.com/oauth2/v2/auth?' +
  `client_id=${newClientId}&` +
  `redirect_uri=${encodeURIComponent('https://therapy-booking.zeabur.app')}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent('openid email profile')}&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('\n🔗 新的測試授權 URL:');
console.log(authUrl);

// 檢查後端是否已更新
console.log('\n🔍 檢查後端配置...');
const backendUrl = 'https://psy-backend.zeabur.app/api/auth/google/config';

https.get(backendUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const config = JSON.parse(data);
      console.log('✅ 後端配置回應:');
      console.log(JSON.stringify(config, null, 2));
      
      if (config.details && config.details.clientId) {
        const backendClientId = config.details.clientId;
        if (backendClientId.includes('ec7qc6cekboq6am8laiv5odkbqd4i18f')) {
          console.log('✅ 後端已使用新的 Client ID！');
        } else {
          console.log('⚠️  後端仍在使用舊的 Client ID，需要重新部署');
          console.log('後端 Client ID:', backendClientId);
        }
      }
    } catch (error) {
      console.error('❌ 後端配置解析失敗:', error.message);
      console.log('原始回應:', data);
    }
  });
}).on('error', (error) => {
  console.error('❌ 後端請求失敗:', error.message);
});

console.log('\n📋 測試步驟:');
console.log('1. 在瀏覽器中開啟: file:///D:/-therapy-backend/test-oauth-direct.html');
console.log('2. 點擊 "方法 1：直接 URL 重定向"');
console.log('3. 觀察是否出現 Google 登入頁面');
console.log('4. 如果成功，您應該會被重定向回 therapy-booking.zeabur.app 並獲得授權碼'); 