# Google OAuth 配置檢查清單

## 🔍 當前問題
- 錯誤：401 invalid_client
- 詳情：flowName=GeneralOAuthFlow
- 原因：OAuth 同意畫面配置問題

## ✅ 必須檢查的項目

### 1. OAuth 同意畫面配置
- [ ] 前往 Google Cloud Console → OAuth 同意畫面
- [ ] 檢查應用程式狀態（測試中/已發布/需要驗證）
- [ ] 確認以下欄位已填寫：
  - [ ] 應用程式名稱：`心理治療預約系統`
  - [ ] 用戶支援電子郵件：您的郵箱
  - [ ] 應用程式首頁：`https://therapy-booking.zeabur.app`
  - [ ] 應用程式隱私權政策連結（可選）
  - [ ] 應用程式服務條款連結（可選）
  - [ ] 開發人員聯絡資訊：您的郵箱

### 2. 測試用戶設定（如果應用程式處於「測試中」狀態）
- [ ] 點擊「測試用戶」標籤
- [ ] 添加測試用戶：`samu003@gmail.com`
- [ ] 儲存變更

### 3. 範圍設定
- [ ] 檢查「範圍」標籤
- [ ] 確認包含以下範圍：
  - [ ] `../auth/userinfo.email`
  - [ ] `../auth/userinfo.profile`
  - [ ] `openid`

### 4. OAuth 2.0 客戶端 ID 配置
- [ ] 前往「憑證」頁面
- [ ] 檢查客戶端 ID：`18566096794-vmvdqvt1k5f3bl40fm7u7c9plk7jq767.apps.googleusercontent.com`
- [ ] 確認授權的 JavaScript 來源：
  - [ ] `https://therapy-booking.zeabur.app`
- [ ] 確認授權的重定向 URI：
  - [ ] `https://therapy-booking.zeabur.app`
  - [ ] `https://psy-backend.zeabur.app/api/auth/google/callback`

### 5. API 啟用狀態
- [ ] 前往「API 和服務」→「程式庫」
- [ ] 搜尋並啟用以下 API：
  - [ ] Google Identity Services API
  - [ ] People API
  - [ ] Google+ API（如果可用）

## 🚀 完成後的測試步驟

1. **等待 5-15 分鐘**讓配置生效
2. **清除瀏覽器緩存和 Cookie**
3. **重新測試 Google 登入功能**

## 📞 如果問題仍然存在

考慮以下選項：
1. **創建新的 OAuth 2.0 客戶端 ID**
2. **將應用程式發布為「正式版」**（需要驗證）
3. **聯繫 Google 支援**

## 🎯 最可能的解決方案

根據錯誤信息，最可能的問題是：
**您的 Google 帳號（samu003@gmail.com）未被添加為測試用戶**

請立即檢查 OAuth 同意畫面中的「測試用戶」設定！ 