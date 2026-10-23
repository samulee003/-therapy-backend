# AGENTS.md — AI 助手操作手冊

> 本檔案給任何在此專案工作的 AI 助手（Claude / WorkBuddy / 其他 agent）。
> 目標：讓你在**不破壞線上系統**的前提下正確協助 SAM 哥。
> 讀完本檔再動手。不確定的事，先問 SAM 哥。

---

## 一、這是什麼系統

**培甯心理治療預約系統** —— 病人線上預約心理治療師的網站。

```
病人前端（React SPA）
https://therapy-appointment.app.workbuddy.host/     ← 對病人公告的網址
        │ API（JS bundle 內寫死網址，改網域需重新 build）
        ↓
騰訊雲後端（唯一真實資料源）
https://therapy.119-28-24-38.sslip.io
  ├─ Node/Express（pm2 行程名 psy-backend，port 3000）
  ├─ SQLite  /var/lib/psy-backend/database.sqlite
  ├─ nginx（HTTPS + /api 反向代理）
  └─ 聯絡表單站 https://contact.119-28-24-38.sslip.io

舊系統（2026-12-01 可關）
  psy-backend.zeabur.app / therapy-booking.zeabur.app
```

- 資料量級：約 100 用戶 / 996 筆預約 / 329 筆排班（單機 SQLite）
- 這是**心理治療診所**：預約紀錄屬敏感個人資料（澳門 PDPA），操作要謹慎

---

## 二、鐵律（違反 = 事故）

1. **動線上資料庫前必先備份**：
   `sqlite3 /var/lib/psy-backend/database.sqlite ".backup '/var/backups/psy-backend/pre-<動作>-$(date +%Y%m%d-%H%M%S).sqlite'"`
2. **不要未經 SAM 哥確認就改帳號資料**（角色、密碼、刪帳號）。10-21 曾因會錯意把治療師升成 admin。
3. **`.env` 永遠不進 Git**。完整金鑰在 `06_機密設定/`，外流 = 全站帳號可被偽造。
4. **發布到 WorkBuddy 會覆蓋前端**（同一個 app）—— 發布前確認目錄是 `build-admin`（最新版），誤蓋可用它還原。
5. **改後端 = 一定 `pm2 restart psy-backend`**；改完必測 `curl http://127.0.0.1:3000/api/health`。
6. **改前端 = 三個入口都要同步**：WorkBuddy、VPS（/var/www/therapy-frontend）、Zeabur 舊前端（12/1 前生效即可）。
7. **SSH 只能用金鑰**：`ssh -i ~/.ssh/id_ed25519_tencent root@119.28.24.38`。密碼登入已關閉，別去開。
8. **測試用的帳號/資料，測完立刻刪**，並回報清理後的數量。

---

## 三、目錄結構（本歸檔）

| 目錄 | 內容 |
|---|---|
| `01_前端源碼/therapy-frontend/` | React + Vite + MUI。`npm run build` 產 dist |
| `02_後端源碼/psy-backend/` | Express。入口 `server.js`，`app.js` 掛中間件與路由 |
| `03_合作洽詢站/` | 純靜態（EmailJS 前端寄信） |
| `04_已建置成品/admin/` | **目前線上前端**（API 網址已寫死在 JS） |
| `05_資料庫快照/` | 定期拉的 SQLite 快照 |
| `06_機密設定/` | `.env` 完整金鑰（Git 已排除） |
| `07_營運腳本/` | 部署/修補/E2E 腳本（多數一次性，參考用） |
| `08_文件/` | 歷次分析報告 |

---

## 四、關鍵技術事實（省你一小時的那種）

### 前端
- **React Router 用 HashRouter**（`src/main.jsx`）—— WorkBuddy 靜態託管**沒有 SPA fallback**，
  BrowserRouter 的深連結（/login 等）重新整理會 404。網址長這樣：`/#/register`。
- **`VITE_API_BASE_URL` 是 build-time 變數**，寫死進 bundle。改 API 網域必須重新 build。
- 註冊有**防機器人**：註冊頁載入時呼叫 `GET /api/auth/human-check` 拿數學題，
  提交需帶 `humanToken` + `humanAnswer` + `website`（蜜罐，必須是空字串）。

### 後端
- 控制器是**工廠模式**：`const register = (db) => async (req, res) => {...}`，
  匯出為 `module.exports = (db) => ({ register: register(db), ... })`。
  ⚠️ **新增 handler 時匯出要寫 `name: name(db)` 或 `name: name()`，直接寫 `name,` 會把工廠當 handler → 請求永遠掛起**（10-23 踩過，花了 30 分鐘）。
- 速率限制：`/login`、`/register` 等 15 分鐘 10 次（express-rate-limit，記憶體儲存）。
  **OPTIONS 預檢也計數**；`pm2 restart` 會清空計數（測試時好用）。
- EmailJS：後端寄信（strict mode，帶私鑰 `accessToken`）。模板 ID：
  - 密碼重置 `template_e2iu781`
  - 聯絡表單 `template_e0ownlq`（⚠️ 是 **lq** 不是 ql，10-23 曾因筆記打錯誤判表單故障）
- 免費額度 200 封/月。寄信失敗會在 pm2 log 看到。

### 資料庫
- SQLite 單檔。表格：users / schedule / appointments / settings。
- `users.role` 只有 `patient / doctor / admin`。**查「治療師」的查詢全部用 `role='doctor'`**
  —— 不要為了 admin 把它放寬成 IN(...)，admin 是 IT 人員不是治療師（10-21 教訓）。

---

## 五、部署流程

### 後端（改了 controllers/routes 後）
```bash
scp -i ~/.ssh/id_ed25519_tencent -r 檔案 root@119.28.24.38:/var/www/psy-backend/
ssh ... "cd /var/www/psy-backend && node --check 檔案 && pm2 restart psy-backend"
curl http://127.0.0.1:3000/api/health   # 必須 200
```

### 前端（改了 src 後）
```bash
cd therapy-frontend && printf 'VITE_API_BASE_URL=https://therapy.119-28-24-38.sslip.io\n' > .env
npm run build
# WorkBuddy：用 WorkBuddy 的發布功能發布 dist 目錄（會覆蓋 therapy-appointment app）
# VPS：scp -r dist/* root@119.28.24.38:/var/www/therapy-frontend/
```

### 推 GitHub
- 後端 `samulee003/psy-backend`、前端 `samulee003/-therapy-backend`
- ⚠️ `git push origin` 的 credential helper 常卡住 → 改用 token 直推：
  `git push https://x-access-token:<TOKEN>@github.com/<repo>.git main`（token 不要寫進 config）
- ⚠️ 在 VPS 上 `npm install` 會把 lockfile 寫成騰訊內部鏡像 → Zeabur 構建失敗（EALLOWREMOTE）。
  推回 GitHub 前務必在本地用官方 registry 重生 lockfile。

---

## 六、驗證流程（改完必做）

1. `curl /api/health` → 200
2. 註冊流程 E2E（有現成腳本 `07_營運腳本/hc-test.js` 的模式，放進 app 目錄跑）：
   無驗證 → 400；正確答案 → 201；錯誤答案 → 400；蜜罐 → 400
3. 登入 → 讀醫師清單 → 讀可預約時段 → 建預約 → 讀回 → 取消
4. **測試帳號立刻刪除**，回報 `SELECT COUNT(*) FROM users`（應為 100 上下）
5. 改前端就開真實瀏覽器點一次關鍵流程

### E2E API 備忘
- `GET /api/schedules/available/:doctorId/:date` → `{available_slots[]}`（沒排班回 404）
- `POST /api/appointments` 必填 `{doctorId, patientId, appointmentDate, timeSlot, reason, isNewPatient, timezone}`
- 醫師清單 `GET /api/users/doctors` 只回 `role='doctor'`（目前只有 id=4 惠筠）

---

## 七、帳號

| id | 帳號 | 角色 | 備註 |
|---|---|---|---|
| 3 | samu003@gmail.com | admin | SAM 哥（IT/管理） |
| 4 | sasha0970@gmail.com | doctor | 惠筠心理治療師 |

臨時密碼的歷史任務已完成；若仍有未改的臨時密碼，提醒 SAM 哥處理。密碼 hash 備份在伺服器 `/root/pw-backup/`。

---

## 八、已知待辦（2026-10-23）

- [ ] 治療師登入驗證 + 交臨時密碼
- [ ] SAM 改掉 admin 臨時密碼
- [ ] uptime 監控（盯 /api/health）
- [ ] 備份離機 + 還原演練（每週）
- [ ] pm2-logrotate（日誌無限增長）
- [ ] Zeabur 舊前端未同步防機器人版（舊網址「重新註冊」會失敗；SAM 可在 Zeabur 後台點 Redeploy）
- [ ] 12/1 關 Zeabur 前做最終歸檔
