/**
 * 身份驗證相關控制器
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');

// 註冊新用戶
const register = (db) => async (req, res) => {
  try {
    const { name, email, password, role = 'patient' } = req.body;

    // 驗證必填欄位
    if (!name || !email || !password) {
      return res.status(400).json({ error: '姓名、電子郵件和密碼都是必填的' });
    }

    // 檢查郵箱是否已經註冊
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (user) {
        return res.status(400).json({ error: '此電子郵件已被註冊' });
      }

      try {
        // 加密密碼
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 插入新用戶
        const query = `
          INSERT INTO users (name, email, password, role, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(query, [name, email, hashedPassword, role], function(err) {
          if (err) {
            console.error('創建用戶時發生錯誤:', err.message);
            return res.status(500).json({ error: '無法創建用戶' });
          }

          // 生成JWT令牌
          const token = jwt.sign(
            { id: this.lastID, name, email, role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          // 設置cookie
          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24小時
          });

          // 回傳成功信息
          res.status(201).json({
            message: '註冊成功',
            user: {
              id: this.lastID,
              name,
              email,
              role
            }
          });
        });
      } catch (err) {
        console.error('密碼加密錯誤:', err.message);
        res.status(500).json({ error: '註冊過程中發生錯誤' });
      }
    });
  } catch (error) {
    console.error('註冊過程中發生錯誤:', error.message);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
};

// 用戶登入
const login = (db) => async (req, res) => {
  try {
    const { email, password } = req.body;

    // 驗證必填欄位
    if (!email || !password) {
      return res.status(400).json({ error: '電子郵件和密碼都是必填的' });
    }

    // 查詢用戶
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!user) {
        return res.status(401).json({ error: '無效的電子郵件或密碼' });
      }

      try {
        // 驗證密碼
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
          return res.status(401).json({ error: '無效的電子郵件或密碼' });
        }

        // 生成JWT令牌
        const token = jwt.sign(
          { id: user.id, name: user.name, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // 設置cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24小時
        });

        // 回傳成功信息
        res.json({
          message: '登入成功',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('密碼驗證錯誤:', error.message);
        res.status(500).json({ error: '登入過程中發生錯誤' });
      }
    });
  } catch (error) {
    console.error('登入過程中發生錯誤:', error.message);
    res.status(500).json({ error: '登入失敗，請稍後再試' });
  }
};

// 登出
const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: '已成功登出' });
};

// 獲取當前用戶信息
const getCurrentUser = (req, res) => {
  // 用戶資訊已經在身份驗證中間件中被添加到請求對象
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
};

module.exports = (db) => ({
  register: register(db),
  login: login(db),
  logout,
  getCurrentUser
}); 