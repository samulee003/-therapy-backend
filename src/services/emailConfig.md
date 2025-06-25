# EmailJS 配置說明

## 服務配置
- **Service ID**: `service_ky8ucke`
- **Template ID**: `template_e2iu781`
- **Public Key**: `ryFYX3BhVFTCNuv4P`

## 模板參數說明

### 密碼重置模板參數
根據EmailJS密碼重置模板標準，我們發送以下參數：

```javascript
{
  email: "收件人郵件地址",           // 必須參數，用於指定收件人
  link: "https://example.com/reset", // 必須參數，密碼重置連結
  reset_url: "https://example.com/reset", // 備用參數名稱
  user_name: "用戶名",              // 從郵件地址提取的用戶名
  expiration_time: "30分鐘",        // 令牌有效期
  company_name: "心理治療預約系統",  // 公司名稱
  website_url: "https://example.com" // 網站首頁連結
}
```

### 確保重置連結可點擊的設置

**在EmailJS模板中**，確保按鈕或連結的HTML格式正確：

1. **按鈕式連結**（推薦）：
```html
<a href="{{link}}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">
  重置密碼
</a>
```

2. **文字連結**：
```html
<p>點擊以下連結重置您的密碼：</p>
<p><a href="{{link}}" style="color: #1a73e8; text-decoration: underline;">{{link}}</a></p>
```

3. **如果連結不可點擊，添加備用說明**：
```html
<p>如果上方按鈕無法點擊，請複製以下連結到瀏覽器地址欄：</p>
<p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">{{link}}</p>
```

**重要**：
- 使用 `{{link}}` 作為主要參數名稱
- 提供 `{{reset_url}}` 作為備用參數
- 確保EmailJS模板中的變量名稱與代碼中的參數名稱一致
- 在模板中使用完整的HTML格式來創建可點擊的連結

## 常見錯誤解決

### 1. "The recipients address is empty"
**原因**：模板參數名稱不匹配
**解決方案**：確保使用正確的參數名稱 `email`

### 2. "Template not found" 或 404錯誤
**原因**：Template ID不正確
**解決方案**：檢查Template ID是否為 `template_e2iu781`

### 3. "Unauthorized" 或 401錯誤
**原因**：Public Key不正確或服務配置問題
**解決方案**：檢查Public Key是否為 `ryFYX3BhVFTCNuv4P`

## 測試方法

1. 確保EmailJS在應用啟動時正確初始化
2. 檢查瀏覽器控制台的詳細錯誤信息
3. 驗證所有配置參數是否正確
4. 測試網絡連接是否正常

## 部署注意事項

- 生產環境中應該使用環境變量存儲這些配置
- 定期檢查EmailJS服務狀態
- 監控郵件發送成功率

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