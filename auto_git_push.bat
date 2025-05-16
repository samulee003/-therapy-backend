@echo off
echo 正在準備自動上傳至Git...

REM 獲取更改的文件列表
git status --porcelain > changed_files.txt

REM 檢查是否有修改
for /f %%i in ("changed_files.txt") do set size=%%~zi
if %size% == 0 (
    echo 沒有檢測到任何更改，無需上傳。
    del changed_files.txt
    exit /b
)

REM 添加所有更改的文件
git add .

REM 設置提交訊息
set /p commit_message=請輸入提交訊息 (或直接按Enter使用默認訊息): 
if "%commit_message%"=="" set commit_message=自動提交更新

REM 提交更改
git commit -m "%commit_message%"

REM 推送到遠程倉庫
git push

REM 刪除臨時文件
del changed_files.txt

echo 已成功上傳至Git!
pause 