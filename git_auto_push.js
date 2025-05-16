const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('正在準備自動上傳至Git...');

try {
  // 檢查是否有修改
  const status = execSync('git status --porcelain').toString();
  
  if (!status.trim()) {
    console.log('沒有檢測到任何更改，無需上傳。');
    rl.close();
  } else {
    // 顯示更改的文件
    console.log('檢測到以下更改的文件:');
    console.log(status);
    
    // 添加所有更改的文件
    execSync('git add .');
    
    // 獲取提交信息
    rl.question('請輸入提交訊息 (或直接按Enter使用默認訊息): ', (commitMessage) => {
      const message = commitMessage.trim() || '自動提交更新';
      
      try {
        // 提交更改
        execSync(`git commit -m "${message}"`);
        console.log('已提交更改');
        
        // 推送到遠程倉庫
        execSync('git push');
        console.log('已成功上傳至Git!');
      } catch (error) {
        console.error('上傳失敗:', error.message);
      }
      
      rl.close();
    });
  }
} catch (error) {
  console.error('操作失敗:', error.message);
  rl.close();
} 