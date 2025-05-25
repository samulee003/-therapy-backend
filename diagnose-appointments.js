const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('🔍 生產數據庫診斷 - 只讀模式');
console.log('⚠️  承諾：此腳本僅進行查詢，不會修改任何數據\n');

console.log('=== 1. 檢查數據庫表結構 ===');

// 檢查appointments表結構
db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
  if (err) {
    console.error('❌ 檢查appointments表結構時出錯:', err);
  } else {
    console.log('📋 appointments表欄位:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    console.log('');
  }
});

// 檢查users表結構
db.all("PRAGMA table_info(users)", [], (err, columns) => {
  if (err) {
    console.error('❌ 檢查users表結構時出錯:', err);
  } else {
    console.log('📋 users表欄位:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    console.log('');
    
    // 在users表檢查完後，檢查實際數據
    checkActualData();
  }
});

function checkActualData() {
  console.log('=== 2. 檢查現有預約數據 (最近5筆) ===');
  
  // 檢查最近的預約記錄
  db.all(`
    SELECT 
      a.id,
      a.patient_id,
      a.doctor_id,
      a.patient_name,
      a.patient_email,
      a.patient_phone,
      a.date,
      a.time,
      a.status,
      u.name as user_registered_name,
      u.email as user_registered_email
    FROM appointments a
    LEFT JOIN users u ON a.patient_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 5
  `, [], (err, appointments) => {
    if (err) {
      console.error('❌ 檢查預約數據時出錯:', err);
    } else if (appointments.length === 0) {
      console.log('📝 目前沒有預約記錄');
    } else {
      console.log(`📝 找到 ${appointments.length} 筆最近的預約記錄:`);
      appointments.forEach((appointment, index) => {
        console.log(`\n  📅 預約 ${index + 1}:`);
        console.log(`    ID: ${appointment.id}`);
        console.log(`    預約表中的患者姓名: "${appointment.patient_name}"`);
        console.log(`    用戶表中的註冊姓名: "${appointment.user_registered_name}"`);
        console.log(`    預約表中的患者郵箱: "${appointment.patient_email}"`);
        console.log(`    用戶表中的註冊郵箱: "${appointment.user_registered_email}"`);
        console.log(`    日期時間: ${appointment.date} ${appointment.time}`);
        console.log(`    狀態: ${appointment.status}`);
        
        // 比較兩個姓名是否相同
        if (appointment.patient_name === appointment.user_registered_name) {
          console.log(`    🟡 姓名匹配: 預約時姓名與註冊姓名相同`);
        } else {
          console.log(`    🔴 姓名不匹配: 預約時姓名與註冊姓名不同!`);
        }
      });
    }
    
    console.log('\n=== 3. 關鍵發現總結 ===');
    checkBackendBehavior();
  });
}

function checkBackendBehavior() {
  console.log('🎯 根據數據庫結構分析後端行為:');
  
  // 檢查是否有醫生用戶
  db.all("SELECT id, name, email FROM users WHERE role = 'doctor' LIMIT 3", [], (err, doctors) => {
    if (err) {
      console.error('❌ 檢查醫生用戶時出錯:', err);
    } else {
      console.log(`\n👨‍⚕️ 系統中的醫生帳號 (前3個):`);
      doctors.forEach(doctor => {
        console.log(`  - ID: ${doctor.id}, 姓名: ${doctor.name}, 郵箱: ${doctor.email}`);
      });
      
      if (doctors.length > 0) {
        console.log(`\n🔍 分析結論:`);
        console.log(`  1. appointments表有 'patient_name' 欄位`);
        console.log(`  2. users表有 'name' 欄位`);
        console.log(`  3. 後端API可能返回其中任一個作為 'patientName'`);
        console.log(`  4. 需要實際測試API響應確認數據來源`);
        
        console.log(`\n⚠️  簡化註冊風險評估:`);
        console.log(`  - 如果API使用 users.name → 簡化註冊後顯示會有問題`);
        console.log(`  - 如果API使用 appointments.patient_name → 簡化註冊後顯示正常`);
      }
    }
    
    db.close();
    console.log('\n✅ 診斷完成，數據庫已安全關閉');
  });
} 