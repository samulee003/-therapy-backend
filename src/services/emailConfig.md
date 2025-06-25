# EmailJS 配置指南

## 配置步驟

### 1. 更新 emailService.js 配置

在 `src/services/emailService.js` 文件中，找到 `EMAILJS_CONFIG` 部分並替換為您的實際配置：

```javascript
const EMAILJS_CONFIG = {
  SERVICE_ID: 'your_actual_service_id',      // 替換為您的Service ID
  TEMPLATE_ID: 'your_actual_template_id',    // 替換為您的Template ID  
  PUBLIC_KEY: 'your_actual_public_key',      // 替換為您的Public Key
};
```

### 2. 環境變量配置（推薦用於生產環境）

創建 `.env` 文件並添加：

```env
VITE_EMAILJS_SERVICE_ID=your_actual_service_id
VITE_EMAILJS_TEMPLATE_ID=your_actual_template_id
VITE_EMAILJS_PUBLIC_KEY=your_actual_public_key
```

然後在 `emailService.js` 中使用：

```javascript
const EMAILJS_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'therapy_system_service',
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'password_reset_template',
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key_here',
};
```

## 郵件模板變數

確保您的EmailJS模板包含以下變數：

- `{{to_email}}` - 收件人郵箱
- `{{reset_url}}` - 密碼重置連結
- `{{expiration_time}}` - 連結過期時間

## 測試配置

1. 配置完成後，嘗試使用忘記密碼功能
2. 檢查您的郵箱是否收到重置郵件
3. 點擊郵件中的連結測試重置流程

## 注意事項

- EmailJS免費計劃每月限制200封郵件
- 確保不要將API金鑰提交到公開的程式碼庫
- 建議在生產環境使用環境變量 