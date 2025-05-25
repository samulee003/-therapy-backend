const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('🔍 檢查數據庫中實際存在的表');

// 檢查所有表
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('❌ 檢查表列表時出錯:', err);
  } else {
    console.log('\n📋 數據庫中存在的表:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    if (tables.length > 0) {
      console.log('\n=== 檢查每個表的結構 ===');
      checkTableStructures(tables.map(t => t.name));
    } else {
      console.log('\n❌ 數據庫中沒有任何表');
      db.close();
    }
  }
});

function checkTableStructures(tableNames) {
  let index = 0;
  
  function checkNextTable() {
    if (index >= tableNames.length) {
      db.close();
      console.log('\n✅ 檢查完成');
      return;
    }
    
    const tableName = tableNames[index];
    console.log(`\n📋 ${tableName} 表結構:`);
    
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`❌ 檢查 ${tableName} 表結構時出錯:`, err);
      } else {
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // 如果是用戶相關表，檢查一些數據
        if (tableName.toLowerCase().includes('user') || tableName.toLowerCase().includes('appointment') || tableName.toLowerCase().includes('patient')) {
          console.log(`\n📊 ${tableName} 表中的記錄數量:`);
          db.all(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, result) => {
            if (err) {
              console.error(`❌ 檢查 ${tableName} 記錄數量時出錯:`, err);
            } else {
              console.log(`  總記錄數: ${result[0].count}`);
            }
            index++;
            checkNextTable();
          });
        } else {
          index++;
          checkNextTable();
        }
      }
    });
  }
  
  checkNextTable();
} 