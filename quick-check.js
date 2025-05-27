const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 檢查醫生和預約對應關係 ===\n');

// 檢查醫生用戶
db.all('SELECT id, name, email, role FROM users WHERE role = "doctor"', [], (err, doctors) => {
  if (err) {
    console.error('查詢醫生失敗:', err);
    return;
  }
  
  console.log('醫生用戶:');
  doctors.forEach(doctor => {
    console.log(`- ID: ${doctor.id}, Name: ${doctor.name}, Email: ${doctor.email}`);
  });
  
  // 檢查預約對應
  db.all(`
    SELECT 
      a.id, 
      a.doctor_id, 
      a.patient_id, 
      a.date,
      a.time,
      u_patient.name as patient_name, 
      u_doctor.name as doctor_name 
    FROM appointments a 
    LEFT JOIN users u_patient ON a.patient_id = u_patient.id 
    LEFT JOIN users u_doctor ON a.doctor_id = u_doctor.id
  `, [], (err, appointments) => {
    if (err) {
      console.error('查詢預約失敗:', err);
      return;
    }
    
    console.log('\n預約資料:');
    if (appointments.length === 0) {
      console.log('- 沒有預約資料');
    } else {
      appointments.forEach(apt => {
        console.log(`- 預約ID: ${apt.id}, 醫生: ${apt.doctor_name} (ID: ${apt.doctor_id}), 患者: ${apt.patient_name} (ID: ${apt.patient_id}), 日期: ${apt.date}, 時間: ${apt.time}`);
      });
    }
    
    db.close();
  });
});

// 快速檢查 Google OAuth 配置
const https = require('https');

const clientId = '18566096794-vmvdqvt1k5f3bl40fm7u7c9plk7jq767.apps.googleusercontent.com';

console.log('🔍 檢查 Google OAuth 配置...');
console.log('Client ID:', clientId);

// 測試 Google OAuth 端點
const testUrl = `https://accounts.google.com/.well-known/openid_configuration`;

https.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const config = JSON.parse(data);
      console.log('✅ Google OAuth 端點正常');
      console.log('授權端點:', config.authorization_endpoint);
      console.log('Token 端點:', config.token_endpoint);
      
      // 測試授權 URL
      const authUrl = `${config.authorization_endpoint}?` +
        `client_id=${clientId}&` +
        `redirect_uri=https://therapy-booking.zeabur.app&` +
        `response_type=code&` +
        `scope=openid email profile`;
      
      console.log('\n🔗 測試授權 URL:');
      console.log(authUrl);
      console.log('\n📋 請在瀏覽器中訪問上面的 URL 來測試 OAuth 配置');
      
    } catch (error) {
      console.error('❌ 解析 Google 配置失敗:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('❌ 網路請求失敗:', error.message);
});

// 檢查後端配置
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
      console.log('✅ 後端配置正常');
      console.log('後端返回:', JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('❌ 後端配置解析失敗:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('❌ 後端請求失敗:', error.message);
}); 