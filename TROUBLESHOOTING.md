# Google OAuth 2.0 問題排查指南

## 🔍 常見問題和解決方案

### 1. **Google登入按鈕無反應**
**症狀**: 點擊Google登入按鈕沒有反應
**可能原因**:
- Google Client ID未配置或錯誤
- 後端Google OAuth端點未實現
- 網域未在Google Console中授權

**解決方案**:
```bash
# 檢查前端配置
cat .env

# 檢查瀏覽器控制台錯誤
# 開發者工具 > Console
```

### 2. **CORS錯誤**
**症狀**: 瀏覽器顯示CORS錯誤
**解決方案**:
- 確保後端CORS配置包含前端域名
- 檢查API URL是否正確

### 3. **Google配置錯誤**
**症狀**: "Invalid client ID" 錯誤
**解決方案**:
- 驗證Google Client ID格式
- 確保域名已在Google Console中授權

### 4. **後端連接失敗**
**症狀**: 無法連接到後端API
**檢查項目**:
```bash
# 測試後端連接
curl https://psy-backend.zeabur.app/api/auth/google/config
```

## 🛠️ 調試工具

### 瀏覽器開發者工具
1. **Network標籤**: 檢查API請求
2. **Console標籤**: 查看JavaScript錯誤
3. **Application標籤**: 檢查localStorage

### 後端日誌
檢查Zeabur後端服務的日誌輸出

## 📞 支援聯繫

如果問題持續存在，請提供：
1. 瀏覽器控制台錯誤截圖
2. 網路請求詳細信息
3. 後端日誌（如果可訪問） 