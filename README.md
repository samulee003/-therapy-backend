# 心理治療預約系統（前端專案）

**⚠️ 本專案僅包含前端程式碼，所有 API 請求需連接外部後端服務（如 Zeabur 部署的 Node.js/Express API）。本 repo 不包含任何後端程式碼或資料庫。**

這是一個使用React開發的心理治療預約系統前端專案。

## 技術棧

- React
- Material UI
- Vite
- Axios
- Date-fns

## 本地開發啟動與 API 設定說明

1. **安裝依賴**
   ```
   npm install
   ```
2. **建立 .env 檔案**（於專案根目錄）
   ```
   VITE_API_BASE_URL=https://your-backend-api-url
   ```
   - 請將 `https://your-backend-api-url` 替換為你實際的後端 API 服務網址。
   - 若本地測試後端，請填寫如 `http://localhost:5000`。
3. **啟動前端開發伺服器**
   ```
   npm run dev
   ```
4. **瀏覽器開啟**
   - 預設網址為 [http://localhost:3000](http://localhost:3000)

---

## 建置生產環境版本

```
npm run build
```

生成的文件將位於 `dist` 目錄中。

## 多環境 API base url 設定範例

你可以根據不同環境建立不同的環境變數檔案：

- `.env`（預設，所有環境皆適用）
- `.env.development`（僅本地開發時生效）
- `.env.production`（僅正式部署時生效）

範例：

```
# .env.development
VITE_API_BASE_URL=http://localhost:5000

# .env.production
VITE_API_BASE_URL=https://your-backend-api-url
```

Vite 會自動根據啟動模式載入對應的環境變數檔案。

- 本地開發：`npm run dev` 會使用 `.env.development`
- 正式建置：`npm run build` 會使用 `.env.production`

如需更多細節，請參考 [Vite 官方文件](https://vitejs.dev/guide/env-and-mode.html)。

## 環境變數配置

請在專案根目錄創建 `.env` 文件（或在部署環境中設置環境變數）：

```
# API設定（必填，請填寫你的後端 API 服務網址）
VITE_API_BASE_URL=https://your-backend-api-url
```

- 本專案所有 API 請求皆會發送至 `VITE_API_BASE_URL` 指定的後端服務。
- 請確保你有一個可用的後端 API（如 Node.js/Express 部署於 Zeabur 或其他平台）。
- 本 repo 不包含任何後端程式碼或資料庫。

## 版本相容性問題

本專案使用以下關鍵依賴的特定版本：

- @mui/x-date-pickers: ^8.2.0
- date-fns: ^3.6.0

**重要:** 如果更新這些庫時請確保版本相容。日期選擇器組件需要date-fns v3+才能正常工作。

## 目錄結構

- `src/components` - 可重用的UI組件
- `src/context` - React上下文（如身份驗證）
- `src/pages` - 頁面組件
- `src/services` - API服務與工具函數
- `src/assets` - 靜態資源（圖像等） 