# EmailJS 密碼重置模板配置指南

## 問題說明
當前EmailJS成功發送郵件，但重置連結沒有顯示為可點擊的超連結。

## 解決步驟

### 1. 登入EmailJS控制台
1. 前往 [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. 使用您的帳號登入

### 2. 編輯模板
1. 在側邊欄點選 "Email Templates"
2. 找到模板ID: `template_e2iu781`
3. 點選該模板進行編輯

### 3. 修改模板內容
在模板編輯器中，確保重置連結使用正確的HTML格式：

#### 建議的按鈕樣式：
```html
<div style="text-align: center; margin: 30px 0;">
  <a href="{{link}}" 
     style="background-color: #4CAF50; 
            color: white; 
            padding: 15px 32px; 
            text-align: center; 
            text-decoration: none; 
            display: inline-block; 
            font-size: 16px; 
            margin: 4px 2px; 
            cursor: pointer; 
            border-radius: 4px;
            font-family: Arial, sans-serif;">
    重置密碼
  </a>
</div>
```

#### 備用文字連結：
```html
<p>如果上方按鈕無法點擊，請複製以下連結到瀏覽器：</p>
<p style="background-color: #f5f5f5; 
          padding: 10px; 
          word-break: break-all; 
          font-family: monospace;">
  {{link}}
</p>
```

### 4. 完整模板範例
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4CAF50;">重置密碼</h2>
        
        <p>親愛的用戶，</p>
        
        <p>您好！我們收到了您的密碼重置請求。</p>
        
        <p>請點擊下方按鈕重置您的密碼：</p>
        
        <!-- 重置按鈕 -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{link}}" 
               style="background-color: #4CAF50; 
                      color: white; 
                      padding: 15px 32px; 
                      text-align: center; 
                      text-decoration: none; 
                      display: inline-block; 
                      font-size: 16px; 
                      margin: 4px 2px; 
                      cursor: pointer; 
                      border-radius: 4px;">
                重置密碼
            </a>
        </div>
        
        <p>此連結將在{{expiration_time}}後過期。</p>
        
        <p>如果您沒有要求重置密碼，請忽略此郵件。</p>
        
        <!-- 備用連結 -->
        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
            <p><strong>如果上方按鈕無法點擊，請複製以下連結到瀏覽器地址欄：</strong></p>
            <p style="background-color: #ffffff; 
                      padding: 10px; 
                      word-break: break-all; 
                      font-family: monospace; 
                      border: 1px solid #ddd; 
                      border-radius: 4px;">
                {{link}}
            </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #666;">
            此郵件由 {{company_name}} 發送至 {{email}}
        </p>
    </div>
</body>
</html>
```

### 5. 儲存模板
修改完成後，點選 "Save" 儲存模板。

### 6. 測試模板
1. 在模板頁面點選 "Test It" 按鈕
2. 輸入測試參數
3. 發送測試郵件並檢查連結是否可點擊

## 可用的模板變數
我們的代碼發送以下變數給EmailJS：

- `{{email}}` - 收件人郵件地址
- `{{link}}` - 重置連結（主要）
- `{{reset_url}}` - 重置連結（備用）
- `{{user_name}}` - 用戶名
- `{{expiration_time}}` - 有效期（30分鐘）
- `{{company_name}}` - 公司名稱
- `{{website_url}}` - 網站首頁

## 故障排除

### 連結仍然無法點擊？
1. 檢查模板中是否正確使用了 `<a href="{{link}}">` 標籤
2. 確保沒有額外的轉義字符
3. 在EmailJS模板中使用 "Preview" 功能檢查渲染結果

### 郵件沒有收到？
1. 檢查垃圾郵件資料夾
2. 確認EmailJS服務狀態正常
3. 檢查Console日誌中的錯誤信息

### 模板變數沒有替換？
1. 確認變數名稱拼寫正確
2. 檢查大小寫是否匹配
3. 確認EmailJS服務和模板ID正確 