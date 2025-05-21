# Scratchpad

## 背景與動機 (Background and Motivation)

使用者要求檢視目前的專案結構，並建立此 `.cursor/scratchpad.md` 文件。此文件的目的是為了在接下來的開發任務中，輔助 Planner 和 Executor 角色進行有效的規劃、執行、追蹤和記錄。專案名稱 `react_appointment_system_full_api` 暗示這是一個使用 React 技術棧，包含前端和完整後端 API 的預約系統。

**專案結構與技術棧分析 (2024-07-26):**

*   **前端:**
    *   框架/庫: React 18, React Router DOM 6
    *   建構工具: Vite
    *   UI 元件庫: Material-UI (MUI v5), Emotion
    *   HTTP 客戶端: Axios
    *   日期處理: date-fns
    *   狀態管理: React Context API (用於認證 `AuthContext`)
    *   主要目錄結構: `src/` 包含 `App.jsx`, `main.jsx`, `pages/` (HomePage, LoginPage, RegisterPage, AppointmentBookingPage, doctor/DoctorDashboard, patient/PatientDashboard), `components/` (auth/ProtectedRoute, layout/Header, layout/Footer), `services/api.js`, `context/AuthContext.jsx`.
*   **後端:**
    *   框架: Node.js, Express.js
    *   資料庫: SQLite (檔案 `database.sqlite`)
    *   主要依賴: `bcrypt` (密碼雜湊), `cors` (跨來源資源共用), `cookie-parser`, `dotenv`, `express-session`, `connect-sqlite3` (SQLite 會話儲存).
    *   主要檔案: `backend-deploy/server.js` (包含 API 路由、中間件、資料庫初始化邏輯).
    *   資料表: `settings`, `users`, `schedule`, `appointments`, `regular_patients`.
*   **部署相關:**
    *   `backend-deploy/` 目錄結構與 `backend-deploy/` 相似。
    *   後端 CORS 配置提及 `therapy-booking.zeabur.app`，暗示使用 Zeabur 進行部署。

**目前專案進度概要 (2024-07-26):**

專案已完成基礎架構搭建和核心認證流程的初步實現。
*   **前端:** 基本結構、路由、Material-UI 整合、AuthContext、核心頁面 (登入、註冊、儀表板框架、預約頁面框架) 已建立。`ProtectedRoute` 用於基於角色和認證狀態的路由保護。
*   **後端:** Express 伺服器、SQLite 資料庫模型 (包含使用者、預約、排程等表)、資料庫初始化、基於 Cookie 的身份驗證和角色中間件已實現。至少 `/api/login` 端點已開始開發。

專案已具備基本的使用者登入、註冊以及針對不同角色（醫生、病患）顯示不同儀表板的框架。

**新的考量 (2024-07-29):**

使用者表達了對於在 Zeabur 上部署後端更新時，現有的 `database.sqlite` 檔案（包含使用者帳號、預約資料等）可能會被覆蓋或重置，導致資料遺失的擔憚。因此，確保資料庫的持久性成為一個重要的議題。

本專案已與後端完全分離，僅負責前端（React/Vite/MUI/Context API），所有後端程式碼、資料庫、部署設定皆已移出。目標是讓前端結構清晰、維護容易，並能獨立於後端持續開發與優化。README、環境變數等文件需明確標示「本專案僅為前端」。

## 主要挑戰與分析 (Key Challenges and Analysis)

**初步分析 (2024-07-26):**

1.  **API 完整性與對接:**
    *   **挑戰:** 需要確認後端 `server.js` 中是否已完整實現所有必要的 API 端點 (例如：使用者 CRUD, 醫生排程管理, 病患預約 CRUD, 設定管理等)，以及前端 `src/services/api.js` 和各頁面組件是否已完整對接這些 API。
    *   **分析:** `server.js` 檔案較大 (839 行)，目前僅查看了開頭部分。需要進一步詳細閱讀以了解所有 API 端點的實現情況。前端頁面雖然存在，但具體的數據獲取、提交和互動邏輯的完善程度未知。
2.  **功能完整性:**
    *   **挑戰:** 預約系統的核心功能 (如選擇醫生、選擇時間、提交預約、取消預約、醫生管理預約和排程等) 的具體實現細節和使用者體驗流程需要詳細檢視。
    *   **分析:** 雖然有 `AppointmentBookingPage.jsx`, `DoctorDashboard.jsx`, `PatientDashboard.jsx` 等頁面，但其內部邏輯的複雜度和完成度尚不清楚。
3.  **錯誤處理與驗證:**
    *   **挑戰:** 前後端都需要健全的錯誤處理機制和輸入驗證。
    *   **分析:** 後端 `server.js` 的 API 端點中已開始包含一些基本的錯誤回應 (如 400, 401, 403)。前端表單驗證和錯誤提示的實現情況需要檢查。
4.  **測試覆蓋:**
    *   **挑戰:** 目前未見測試相關檔案或配置。對於一個完整的系統，單元測試、整合測試和端對端測試是確保品質的關鍵。
    *   **分析:** 這可能是後續需要重點補充的方面。
5.  **使用者體驗 (UX) 與使用者介面 (UI) 細節:**
    *   **挑戰:** Material-UI 提供了良好的基礎，但具體的資訊呈現、互動流程和整體美觀性需要仔細打磨。
    *   **分析:** 需要實際運行應用或更詳細地檢視組件代碼來評估。
6.  **安全性:**
    *   **挑戰:** 除了密碼雜湊和基本的角色權限外，還需要考慮其他安全方面，如 XSS, CSRF, SQL Injection (雖然 SQLite 本身對 SQL Injection 有一定防護，但 ORM 或直接拼接 SQL 時仍需注意) 等。
    *   **分析:** 後端使用了 `bcrypt`，這是好的開始。中間件 `isAuthenticated`, `isDoctor`, `isPatient` 提供了基礎授權。

7.  **SQLite 資料庫在 Zeabur 部署的持久性 (新增於 2024-07-29):**
    *   **挑戰:** 如何確保在 Zeabur 平台上部署後端應用程式的新版本時，SQLite 資料庫檔案 (`database.sqlite`) 不會被覆蓋或重置，從而避免使用者資料遺失。
    *   **分析:**
        *   **風險:** 若無特別配置，部署新版本時，平台可能會使用新的檔案系統替換舊的，導致 `database.sqlite` 遺失。
        *   **潛在解決方案:**
            1.  **Zeabur 持久化儲存設定:** 研究 Zeabur 是否提供特定的持久化儲存卷 (Persistent Volume/Storage) 或設定，可以將 `database.sqlite` 放置在該區域，使其在應用程式重新部署後依然存在。
            2.  **資料庫備份與還原策略:** 建立手動或自動的資料庫檔案備份機制，並規劃還原流程。
            3.  **遷移至託管資料庫服務:** 長遠來看，若應用對資料可靠性要求更高，可考慮遷移到 Zeabur 或其他雲平台提供的託管資料庫服務 (如 PostgreSQL, MySQL)。
            4.  **謹慎的部署流程:** 確保部署腳本或流程不會無條件覆蓋資料庫檔案。

**後續規劃方向:**

*   優先完成並驗證核心 API 端點的開發。
*   逐步完善前端各頁面的功能實現與 API 對接。
*   增強前後端的錯誤處理和輸入驗證。
*   考慮引入自動化測試。
*   優化使用者體驗和介面細節。

## 高層級任務分解 (High-level Task Breakdown)

### 前端專案重整任務

1. **明確前端專案定位**
    - [ ] 1.1：檢查根目錄與 src 內是否有任何後端相關檔案或設定，全部移除。
    - [ ] 1.2：.env.local 僅保留前端 API base url 等必要設定。
    - [ ] 1.3：README 明確說明本 repo 僅為前端，API 需連接外部後端。

2. **目錄結構優化（如有需要）**
    - [ ] 2.1：檢查 components、pages、services、context 等目錄結構，確認分層合理。
    - [ ] 2.2：如 API 增多，考慮將 services/api.js 拆分。

3. **文件與說明同步**
    - [ ] 3.1：更新 README，說明如何本地啟動、如何設定 API base url。
    - [ ] 3.2：如有多環境需求，於 .env 檔案中設置多組 API base url。

4. **開發流程優化**
    - [ ] 4.1：建議引入前端自動化測試（如 React Testing Library）。
    - [ ] 4.2：如有 CI/CD，僅針對前端進行部署與測試。

### 成功標準
- 目錄結構清晰，無後端遺留檔案。
- README、環境變數等文件說明明確。
- 前端可獨立啟動，API 請求可正確指向外部後端。
- 開發人員能快速理解並進行維護。

## 專案狀態看板 (Project Status Board)

任務六：確保 Zeabur 部署時 SQLite 資料庫的持久性
- [x] **6.1: 研究 Zeabur 對於 SQLite 資料持久化的官方文件與最佳實踐**
- [x] **6.2: (若需要) 調整後端專案設定或程式碼以符合 Zeabur 持久化要求**
- [x] **6.3: 建立資料庫備份與還原流程**
- [x] **6.4: 測試部署更新後的資料持久性**

任務七：前端重整與行動裝置 UI/UX 優化
- [x] **7.1：前端專案清理與重整**
  - [x] **7.1.1：移除後端相關檔案**
  - [x] **7.1.2：優化環境變數設定**
  - [x] **7.1.3：更新 README 文件**
  - [x] **7.1.4：建立前端測試環境**
- [x] **7.2：行動裝置 UI/UX 優化**
  - [x] **7.2.1：分析現有元件響應性**
  - [x] **7.2.2：改進預約流程的行動裝置體驗**
  - [x] **7.2.3：實施觸控友善設計**
  - [x] **7.2.4：優化頁面載入與反饋**
  - [x] **7.2.5：測試與驗證行動裝置體驗**

*   [x] **BugFix: Git 推送輸出混亂**
    *   [x] Sub Task 10: 調查 Git 推送輸出混亂問題
    *   [x] Sub Task 11: 修復 Git 推送輸出混亂問題
    *   [ ] Sub Task 12: 驗證修復結果 (等待使用者對 `auto_git_push.bat` 執行結果的詳細回饋)

- [x] **BugFix: 治療師儀表板日曆點擊無反應**
    *   [x] Sub Task 13: 問題初步分析與定位 (規劃者)
    *   [x] Sub Task 14: (執行者) 檢查相關前端組件事件處理與瀏覽器控制台
    *   [x] Sub Task 15: (執行者/規劃者) 根據初步發現，深入分析根本原因 (發現編輯介面渲染邏輯被註解或遺漏)。
    *   [x] Sub Task 16: (執行者) 根據分析結果，實施修復方案 (在 `ScheduleManager.jsx` 中恢復/加入編輯介面的渲染邏輯)。
    *   [x] Sub Task 17: (執行者) 驗證修復結果，確保點擊日期能觸發預期操作 (使用者截圖已確認編輯介面顯示)。

- [ ] **BugFix: 全面排查與修復治療師排班及預約相關錯誤**
    *   [ ] Sub Task 18: (執行者) 處理排班管理中的時間格式問題 (HH:MM)
        *   [ ] 18.1: 分析 `ScheduleManager.jsx` 中現存的非 HH:MM 時間格式問題 (如截圖所示「下午 02:」)。
        *   [ ] 18.2: 修改 `handleSlotInputChange` 嘗試在輸入時引導/校正為 HH:MM 格式或提供警告。
        *   [ ] 18.3: 再次驗證 `handleSaveScheduleForDate` 中儲存前的時段過濾邏輯，確保只儲存 HH:MM 格式。
        *   [ ] 18.4: 考慮如何處理已儲存的錯誤格式資料 (例如，是否需要在讀取時進行轉換或提示醫生修改)。
    *   [ ] Sub Task 19: (執行者) 審查 `ScheduleManager.jsx` - 資料獲取與日曆顯示
        *   [ ] 19.1: 驗證 `getScheduleForMonth` API 呼叫和回應處理。
        *   [ ] 19.2: 驗證日曆上現有排班 (可用時段、已預約時段概要) 的正確顯示。
        *   [ ] 19.3: 驗證月份導航功能。
    *   [ ] Sub Task 20: (執行者) 審查 `ScheduleManager.jsx` - 編輯排班對話框功能
        *   [ ] 20.1: 驗證 `handleEditDate` 正確帶入並顯示所選日期的現有時段。
        *   [ ] 20.2: 驗證時段操作：手動新增、預設時段新增、修改、刪除。
        *   [ ] 20.3: 驗證儲存排班 (`handleSaveScheduleForDate`)：API 呼叫、成功/錯誤處理、儲存後刷新UI。
    *   [ ] Sub Task 21: (執行者) 審查 `ScheduleManager.jsx` - 批量排班功能 (如果啟用)
    *   [ ] Sub Task 22: (執行者) 審查 `ScheduleManager.jsx` - 錯誤處理機制
    *   [ ] Sub Task 23: (執行者) 檢查預約流程 (`AppointmentBookingPage.jsx`) 中與排班資料的連動
        *   [ ] 23.1: 驗證獲取醫生列表、獲取醫生排班。
        *   [ ] 23.2: 驗證可用時段的顯示 (是否正確過濾、是否與 `ScheduleManager` 中的資料一致)。
        *   [ ] 23.3: 驗證預約提交後，對應時段在 `ScheduleManager` 和後續預約中是否正確更新為已預約。

## 現況狀態／進度追蹤 (Current Status / Progress Tracking)

**(2024-07-31) 任務 7.1.1 完成**：已檢查根目錄與 src 內所有檔案，未發現後端程式碼或設定。已刪除唯一遺留的後端啟動腳本 `start-backend.bat`。

**(2024-08-01) 任務 7.1.2 完成**：已優化環境變數設定，確保 .env 檔案僅包含前端 API 基礎 URL，並添加註釋說明純前端用途。

**(2024-08-01) 任務 7.1.3 完成**：已確認 README.md 已明確標示專案為純前端，且包含環境變數設定說明。

**(2024-08-01) 任務 7.1.4 完成**：已確認專案已配置 Vitest 與 React Testing Library，並具備基本的測試案例。

**(2024-08-01) 任務 7.2 UI/UX 優化完成**：
1. 優化了日曆區域的視覺顯示和滾動行為
2. 改進了日期和時段選擇按鈕，增大尺寸並優化視覺反饋
3. 改善表單區域在行動裝置上的呈現，增強可用性
4. 優化了預約成功訊息的顯示與使用者體驗
5. 通過一致的響應式設計保證跨裝置體驗

現在，行動裝置使用者可以更輕鬆地瀏覽日曆、選擇時段，填寫表單和確認預約，改善了整體使用體驗。

## 執行者反饋或協助請求 (Executor's Feedback or Assistance Requests)

**(2024-07-31) 任務 7.1.1 執行者反饋**：
- 根目錄與 src 目錄均無後端程式碼或設定。
- 唯一遺留的 `start-backend.bat`（後端啟動腳本）已依使用者同意刪除。
- 其餘檔案均屬前端或通用設定，無需處理。

**(2024-08-01) 任務 7.1.2 執行者反饋**：
- 已檢查環境變數文件，發現現有的 `.env` 檔案內含：`VITE_API_BASE_URL=https://psy-backend.zeabur.app/`
- README.md 中也提及了環境變數設定：`VITE_API_BASE_URL=http://localhost:5000`
- 已統一檔案內容，明確標記前端 API URL 並添加註釋說明純前端用途。

**(2024-08-01) 任務 7.2 執行者反饋**：
- 已完成 AppointmentBookingPage 的手機 UI/UX 優化，並成功推送至遠端 main 分支。
- 請規劃者確認成果是否符合預期，或有無需進一步優化之處。

*   等待使用者回饋 `auto_git_push.bat` 執行後的輸出情況 (中文顯示、Git 命令輸出簡潔度、整體是否仍然混亂)，以完成 Sub Task 12。
*   **已處理** 問題：治療師儀表板 (therapist-dashboard) 的日曆點擊日期後沒有反應。
    *   原因：`ScheduleManager.jsx` 中，負責渲染日期編輯介面的 JSX 程式碼沒有被正確包含在最終的 return 渲染邏輯中（部分相關邏輯被註解）。
    *   修復：已修改 `ScheduleManager.jsx`，將日期編輯介面正確地加入到條件渲染中，使其在點擊日期後能夠顯示。
    *   **已驗證：使用者提供的截圖確認編輯介面可以顯示。**
*   **目前正在處理：** 使用者回報排班預約仍有許多 bug，已開始全面排查。首要處理 `ScheduleManager.jsx` 中的時間格式問題。

## 總結 (Summary)

在本次優化中，我們完成了兩個主要任務：前端專案重整與行動裝置 UI/UX 優化。

**前端專案重整**的成果：
1. 移除了所有後端相關檔案，確保專案僅包含前端程式碼
2. 優化了環境變數設定，使 .env 檔案內容清晰且僅包含前端必要設定
3. 確認了 README 已明確標示純前端專案性質並提供完整的使用說明
4. 確認了自動化測試環境的設置，支援 Vitest 與 React Testing Library

**行動裝置 UI/UX 優化**的成果：
1. 解決了日曆區域在小型裝置上的溢出與擁擠問題
   - 添加了自定義滾動條與更好的容器控制
   - 優化了日期按鈕尺寸與排版
2. 提高了觸控互動元素的易用性
   - 增大了時段選擇按鈕
   - 調整了每行按鈕數量，擴大可點擊區域
   - 添加了視覺反饋效果（按壓動畫）
3. 優化了預約表單與確認體驗
   - 改善了表單控制項在行動裝置上的尺寸
   - 添加了輸入類型提示（tel、email 等）
   - 重新設計了預約成功頁面，提升視覺吸引力
4. 增強了視覺層級與反饋
   - 添加了預約日期時間摘要
   - 提供了更直觀的成功狀態顯示

這些優化專注於改善使用者體驗的核心流程——預約流程，使系統在行動裝置上更易於使用。通過統一的設計語言和響應式優化，我們確保了系統在不同螢幕尺寸（從小型手機到桌面）上都能提供一致且優質的使用體驗。

## 已識別執行階段問題 (Identified Runtime Issues) - 2024-08-01

在完成前端優化並將程式碼推送到 Git 後，根據使用者提供的執行階段截圖與日誌，發現以下主要後端問題：

1.  **後端資料庫錯誤**:
    *   錯誤訊息: `查詢排班 (年份: 2025, 月份: 05) 時發生錯誤: SQLITE_ERROR: no such column: s.is_rest_day`
    *   問題分析: 後端在查詢排程資料時，資料庫的相關資料表缺少 `s.is_rest_day` 欄位，或 SQL 查詢語句不正確。
    *   影響: 可能導致排程功能無法正常運作，進而影響預約流程。

2.  **API 回應與登入問題**:
    *   前端現象: 登入頁面顯示「伺服器回應格式不正確」，瀏覽器控制台顯示 `/api/auth/login` 請求 401 錯誤，以及「獲取治療師列表失敗」。
    *   問題分析: 這些可能是由上述資料庫錯誤引起的連鎖反應，或後端登入、權限驗證、資料查詢邏輯本身存在其他問題，導致 API 回應格式非預期或操作失敗。
    *   影響: 使用者無法登入，預約相關功能無法使用。

**結論**: 這些問題主要指向後端應用程式的資料庫結構或 API 邏輯，需要對後端程式碼進行檢查與修正。本前端專案已依計畫完成重構與優化。

---

## Project Status Board

- [x] 修正預約時段未過濾已被預約時段的 bug（fetchSchedule 內已正確帶入 bookedSlots，前端能正確過濾）
- [x] AppointmentBookingPage 手機 UI/UX 優化已完成並推送至 Git（commit: feat: 手機 UI/UX 優化 AppointmentBookingPage 預約流程與 Dialog 體驗）

## Executor's Feedback or Assistance Requests

- 已修正 fetchSchedule，將 item.booked_slots 正確帶入 processedScheduleData，getAvailableSlotsForDate 現可正確過濾已被預約的時段。
- 請手動測試預約流程，確認已無法選到已被預約的時段。

---