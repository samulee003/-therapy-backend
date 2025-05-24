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