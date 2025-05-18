import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getDoctorAppointments, cancelAdminAppointment } from '../../../services/api';
import { getStatusText, getStatusColor } from './utils';

// 預約管理組件
const AppointmentManager = ({ user }) => {
  // 狀態管理
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [errorAppointments, setErrorAppointments] = useState('');
  
  // 預約詳情和取消相關狀態
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  // 獲取預約數據
  const fetchAppointments = async () => {
    if (!user) return;
    setLoadingAppointments(true);
    setErrorAppointments('');
    try {
      const response = await getDoctorAppointments();
      // 處理新格式的回應（包含 success 欄位和 appointments 陣列）
      if (response.data && response.data.success) {
        // 新的 API 回應格式
        setAppointments(response.data.appointments || []);
        setFilteredAppointments(response.data.appointments || []);
      } else if (Array.isArray(response.data)) {
        // 保持向後兼容的處理方式
        setAppointments(response.data);
        setFilteredAppointments(response.data);
      } else {
        // 其他情況，設為空陣列
        console.warn('意外的回應格式:', response.data);
        setAppointments([]);
        setFilteredAppointments([]);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setErrorAppointments(err.response?.data?.message || err.message || '無法加載預約記錄。');
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // 初始加載
  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  // 搜索過濾
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAppointments(appointments);
      return;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = appointments.filter(
      appointment =>
        appointment.patientName?.toLowerCase().includes(lowerCaseSearch) ||
        appointment.patientEmail?.toLowerCase().includes(lowerCaseSearch) ||
        appointment.patientPhone?.includes(searchTerm) ||
        appointment.date?.includes(searchTerm) ||
        appointment.time?.includes(searchTerm) ||
        appointment.appointmentReason?.toLowerCase().includes(lowerCaseSearch)
    );
    setFilteredAppointments(filtered);
  }, [searchTerm, appointments]);

  // 查看預約詳情
  const handleViewAppointmentDetails = appointment => {
    setSelectedAppointment(appointment);
    setAppointmentDetailsOpen(true);
  };

  // 關閉預約詳情
  const handleCloseAppointmentDetails = () => {
    setAppointmentDetailsOpen(false);
    setSelectedAppointment(null);
  };

  // 打開取消預約確認
  const handleOpenCancelConfirm = appointment => {
    setCancelError('');
    setCancelSuccess('');
    setAppointmentToCancel(appointment);
    setCancelConfirmOpen(true);
  };

  // 關閉取消預約確認
  const closeCancelConfirm = () => {
    setCancelConfirmOpen(false);
    setAppointmentToCancel(null);
    setCancellingId(null);
  };

  // 確認取消預約
  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    setCancellingId(appointmentToCancel.id);
    setCancelError('');
    setCancelSuccess('');

    try {
      const response = await cancelAdminAppointment(appointmentToCancel.id);
      if (response.data && response.data.success) {
        setCancelSuccess('預約已成功取消。');
        // 在列表中更新該預約的狀態
        setAppointments(prevAppointments =>
          prevAppointments.map(app =>
            app.id === appointmentToCancel.id ? { ...app, status: 'cancelled' } : app
          )
        );
        // 如果預約詳情彈窗是打開的且顯示的是當前取消的預約，也更新它
        if (selectedAppointment && selectedAppointment.id === appointmentToCancel.id) {
          setSelectedAppointment({ ...selectedAppointment, status: 'cancelled' });
        }
        // 關閉取消確認對話框
        setTimeout(() => {
          closeCancelConfirm();
          // 重新獲取所有預約刷新列表
          fetchAppointments();
        }, 1500);
      } else {
        throw new Error(response.data?.message || '取消預約失敗');
      }
    } catch (err) {
      console.error('取消預約失敗:', err);
      setCancelError(err.response?.data?.message || err.message || '取消預約時發生錯誤。');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
        預約管理
      </Typography>
      <Typography variant="body1" paragraph>
        查看和管理所有患者預約。您可以查看詳情或取消預約。
      </Typography>

      {/* 搜索和刷新按鈕 */}
      <Box sx={{ display: 'flex', mb: 3, gap: 2 }}>
        <TextField
          label="搜索預約"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="刷新預約列表">
          <IconButton onClick={fetchAppointments} disabled={loadingAppointments}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 錯誤信息顯示 */}
      {errorAppointments && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorAppointments}
        </Alert>
      )}

      {/* 取消成功消息 */}
      {cancelSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {cancelSuccess}
        </Alert>
      )}

      {/* 加載中顯示 */}
      {loadingAppointments ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        /* 預約列表表格 */
        <TableContainer component={Paper} sx={{ mb: 5 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>患者姓名</TableCell>
                <TableCell>日期</TableCell>
                <TableCell>時間</TableCell>
                <TableCell>聯繫方式</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {searchTerm ? '沒有符合搜索條件的預約' : '暫無預約記錄'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map(appointment => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.patientName}</TableCell>
                    <TableCell>{appointment.date}</TableCell>
                    <TableCell>{appointment.time}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {appointment.patientEmail}
                      </Typography>
                      {appointment.patientPhone && (
                        <Typography variant="body2" color="text.secondary">
                          {appointment.patientPhone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(appointment.status)}
                        color={getStatusColor(appointment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="查看詳情">
                        <IconButton
                          size="small"
                          onClick={() => handleViewAppointmentDetails(appointment)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {appointment.status !== 'cancelled' && (
                        <Tooltip title="取消預約">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenCancelConfirm(appointment)}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 預約詳情對話框 */}
      <Dialog open={appointmentDetailsOpen} onClose={handleCloseAppointmentDetails}>
        <DialogTitle>預約詳情</DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box sx={{ minWidth: 300 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedAppointment.patientName}</Typography>
                <Chip
                  label={getStatusText(selectedAppointment.status)}
                  color={getStatusColor(selectedAppointment.status)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  預約時間
                </Typography>
                <Typography>
                  {selectedAppointment.date} {selectedAppointment.time}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  聯絡資料
                </Typography>
                <Typography>{selectedAppointment.patientEmail}</Typography>
                {selectedAppointment.patientPhone && (
                  <Typography>{selectedAppointment.patientPhone}</Typography>
                )}
              </Box>
              {selectedAppointment.appointmentReason && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    預約原因
                  </Typography>
                  <Typography>{selectedAppointment.appointmentReason}</Typography>
                </Box>
              )}
              {selectedAppointment.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    備註
                  </Typography>
                  <Typography>{selectedAppointment.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedAppointment && selectedAppointment.status !== 'cancelled' && (
            <Button onClick={() => handleOpenCancelConfirm(selectedAppointment)} color="error">
              取消此預約
            </Button>
          )}
          <Button onClick={handleCloseAppointmentDetails}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 取消預約確認對話框 */}
      <Dialog open={cancelConfirmOpen} onClose={closeCancelConfirm}>
        <DialogTitle>取消預約</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {appointmentToCancel
              ? `您確定要取消 ${appointmentToCancel.patientName} 於 ${appointmentToCancel.date} ${appointmentToCancel.time} 的預約嗎？此操作無法撤銷。`
              : '確定要取消此預約嗎？此操作無法撤銷。'}
          </DialogContentText>
          {cancelError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {cancelError}
            </Alert>
          )}
          {cancelSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {cancelSuccess}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelConfirm} disabled={!!cancellingId}>
            保留預約
          </Button>
          <Button
            onClick={confirmCancelAppointment}
            color="error"
            disabled={!!cancellingId || !!cancelSuccess}
            startIcon={cancellingId ? <CircularProgress size={20} /> : null}
          >
            {cancellingId ? '處理中...' : '確認取消'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppointmentManager; 