Write-Host "正在準備自動上傳至Git..." -ForegroundColor Cyan

# 檢查是否有修改
$changes = git status --porcelain
if (-not $changes) {
    Write-Host "沒有檢測到任何更改，無需上傳。" -ForegroundColor Yellow
    exit
}

# 顯示更改的文件
Write-Host "檢測到以下更改的文件:" -ForegroundColor Green
$changes | ForEach-Object { Write-Host "  $_" }

# 添加所有更改的文件
git add .

# 設置提交訊息
$commit_message = Read-Host "請輸入提交訊息 (或直接按Enter使用默認訊息)"
if (-not $commit_message) {
    $commit_message = "自動提交更新"
}

# 提交更改
git commit -q -m $commit_message

# 推送到遠程倉庫
git push -q

Write-Host "已成功上傳至Git!" -ForegroundColor Green
Read-Host -Prompt "按Enter鍵退出" 