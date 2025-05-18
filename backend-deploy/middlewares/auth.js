/**
 * 身份驗證相關中間件
 */

const jwt = require('jsonwebtoken');

// JWT 密鑰
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 驗證用戶身份中間件
const authenticateUser = (req, res, next) => {
  // 從請求中獲取令牌
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

  // 如果沒有令牌，返回未授權錯誤
  if (!token) {
    return res.status(401).json({ error: '需要登入才能訪問' });
  }

  try {
    // 驗證令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('令牌驗證失敗:', error.message);
    return res.status(401).json({ error: '無效的登入憑證，請重新登入' });
  }
};

// 驗證管理員身份中間件
const authenticateAdmin = (req, res, next) => {
  // 首先驗證用戶身份
  authenticateUser(req, res, () => {
    // 然後檢查是否為管理員
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: '需要管理員權限才能訪問' });
    }
  });
};

// 驗證醫生身份中間件
const authenticateDoctor = (req, res, next) => {
  // 首先驗證用戶身份
  authenticateUser(req, res, () => {
    // 然後檢查是否為醫生或管理員
    if (req.user.role === 'doctor' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: '需要醫生權限才能訪問' });
    }
  });
};

// 驗證患者身份中間件
const authenticatePatient = (req, res, next) => {
  // 首先驗證用戶身份
  authenticateUser(req, res, () => {
    // 然後檢查是否為患者或管理員
    if (req.user.role === 'patient' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: '需要患者權限才能訪問' });
    }
  });
};

module.exports = {
  JWT_SECRET,
  authenticateUser,
  authenticateAdmin,
  authenticateDoctor,
  authenticatePatient
}; 