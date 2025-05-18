/**
 * 排班管理相關路由
 */

const express = require('express');
const { authenticateUser, authenticateAdmin, authenticateDoctor } = require('../middlewares/auth');

// 創建路由
const router = express.Router();

module.exports = (db) => {
  // 引入控制器
  const scheduleController = require('../controllers/scheduleController')(db);

  // 設置/更新排班 (醫生或管理員可訪問)
  router.post('/', (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'doctor') {
      return next();
    }
    res.status(403).json({ error: '只有醫生或管理員可以設置排班' });
  }, authenticateUser, scheduleController.createOrUpdateSchedule);

  // 獲取醫生排班 (所有已認證用戶可訪問)
  router.get('/doctor/:doctorId', authenticateUser, scheduleController.getDoctorSchedule);

  // 獲取可用預約時間段 (所有已認證用戶可訪問)
  router.get('/available/:doctorId/:date', authenticateUser, scheduleController.getAvailableTimeSlots);

  // 刪除排班 (醫生或管理員可訪問)
  router.delete('/:scheduleId', (req, res, next) => {
    if (req.user.role === 'admin') {
      return authenticateAdmin(req, res, next);
    } else {
      return authenticateDoctor(req, res, next);
    }
  }, scheduleController.deleteSchedule);

  return router;
}; 