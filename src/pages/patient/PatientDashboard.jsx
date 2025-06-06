import React, { useState, useEffect, useContext } from 'react'; // Added useEffect, useContext
import {
  Box,
  Typography,
  Paper,
  Container,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress, // Added
  Alert, // Added
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  EventNote as AppointmentIcon,
  Settings as SettingsIcon,
  AccessTime as TimeIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon, // Added
  Visibility as VisibilityIcon, // Added
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Corrected path
import {
  getPatientAppointments,
  cancelPatientAppointment,
  formatApiError,
  updateUserProfile,
  changeUserPassword,
} from '../../services/api'; // Corrected path assuming api is in src/services
import { ErrorAlert, LoadingIndicator, ApiStateHandler } from '../../components/common';

// Removed mock data

const PatientDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isLoading: authLoading, refreshUser } = useContext(AuthContext); // 添加 refreshUser
  const [tabValue, setTabValue] = useState(0);
  const [appointments, setAppointments] = useState([]); // State for appointments
  const [loading, setLoading] = useState(false); // State for loading appointments
  const [error, setError] = useState(''); // State for errors
  const [cancellingId, setCancellingId] = useState(null); // State for cancellation loading
  const [success, setSuccess] = useState(''); // 添加成功提示狀態

  // 查看詳情狀態
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // 取消預約確認對話框狀態 (保留給未來可能的內部使用或直接聯繫後的標記)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  // 新增：取消預約需聯繫診所的提示對話框狀態
  const [showCancelInfoDialog, setShowCancelInfoDialog] = useState(false);
  
  // 新增：編輯個人資料對話框狀態
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  // 新增：更改密碼對話框狀態
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const fetchAppointments = async () => {
    if (!user) return; // Don't fetch if user is not loaded
    setLoading(true);
    setError('');
    setSuccess(''); // 清除上一次的成功訊息

    try {
      const response = await getPatientAppointments();
      // 處理新格式的回應（包含 success 欄位和 appointments 陣列）
      if (response.data && response.data.success) {
        // 新的 API 回應格式
        setAppointments(response.data.appointments || []);
        setSuccess('預約資料已成功載入'); // 設置成功訊息
      } else if (Array.isArray(response.data)) {
        // 保持向後兼容的處理方式
        setAppointments(response.data);
        setSuccess('預約資料已成功載入'); // 設置成功訊息
      } else {
        // 其他情況，設為空陣列
        console.warn('意外的回應格式:', response.data);
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      // 使用格式化的錯誤訊息
      const formattedError = err.formatted || formatApiError(err, '無法加載您的預約記錄');
      setError(formattedError.message);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch appointments when component mounts or user changes
  useEffect(() => {
    if (!authLoading) {
      // Only fetch when auth state is determined
      fetchAppointments();
    }
  }, [user, authLoading]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // 處理患者點擊「取消預約」按鈕的行為
  const handlePatientCancelRequest = (appointment) => {
    // setSelectedAppointment(appointment); // 可能不需要設定，因為只是提示
    setShowCancelInfoDialog(true);
  };

  // 關閉「取消預約需聯繫診所」的提示對話框
  const handleCloseCancelInfoDialog = () => {
    setShowCancelInfoDialog(false);
  };

  // 確認取消預約 (此函數目前不會被患者界面的取消按鈕直接觸發)
  // 保留此函數邏輯，以防未來有其他方式觸發（例如管理員操作或患者透過其他途徑確認取消後，系統內部標記）
  const confirmCancelAppointment = async () => {
    if (!appointmentToCancel || !appointmentToCancel._id) {
      setCancelError('無效的預約資訊，無法取消。');
      setCancelConfirmOpen(false);
      return;
    }

    setCancellingId(appointmentToCancel._id);
    setCancelError('');
    setCancelSuccess('');
    setError(''); // 清除主頁面錯誤訊息

    try {
      await cancelPatientAppointment(appointmentToCancel._id);

      // 更新 UI
      setAppointments(prevAppointments =>
        prevAppointments.map(app =>
          app._id === appointmentToCancel._id ? { ...app, status: 'cancelled' } : app
        )
      );

      setCancelSuccess(`預約已成功取消。`);
      setSuccess('預約已成功取消'); // 更新主頁面的成功訊息

      // 如果正在查看被取消的預約，則更新選中的預約資訊
      if (selectedAppointment && selectedAppointment._id === appointmentToCancel._id) {
        setSelectedAppointment(prev => ({ ...prev, status: 'cancelled' }));
      }

      // 關閉確認對話框並重新加載預約列表
      setTimeout(() => {
        setCancelConfirmOpen(false);
        setCancelSuccess('');
        fetchAppointments(); // 重新加載預約列表確保數據同步
      }, 1500);
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
      // 使用格式化的錯誤訊息
      const formattedError = err.formatted || formatApiError(err, '無法取消預約，請稍後再試');
      setCancelError(formattedError.message);
      setError(formattedError.message); // 更新主頁面的錯誤訊息
    } finally {
      setCancellingId(null);
    }
  };

  // 關閉取消確認對話框
  const closeCancelConfirm = () => {
    setCancelConfirmOpen(false);
    setAppointmentToCancel(null);
    setCancelError('');
    setCancelSuccess('');
  };

  // 修改為查看詳情功能
  const handleViewDetails = appointment => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    // setSelectedAppointment(null); // 可選：關閉時清除，避免殘留數據
  };

  // Filter upcoming and past appointments
  const now = new Date();
  let upcomingAppointments = [];
  let pastAppointments = [];

  if (Array.isArray(appointments)) {
    try {
      upcomingAppointments = appointments.filter(app => {
        // 更穩健的日期時間檢查和轉換
        if (!app.date || !app.time) return false;
        const timePart = app.time.split(' - ')[0]; // 取開始時間
        if (!/^\d{2}:\d{2}$/.test(timePart)) return false; // 驗證時間格式 HH:MM
        try {
          const appointmentDateTime = new Date(`${app.date}T${timePart}:00`); // 假設為本地時間
          return appointmentDateTime >= now && app.status !== 'cancelled' && app.status !== 'completed';
        } catch (e) {
          console.warn("Invalid date/time for appointment:", app);
          return false;
        }
      });

      pastAppointments = appointments.filter(app => {
        if (!app.date || !app.time) return false;
        const timePart = app.time.split(' - ')[0];
        if (!/^\d{2}:\d{2}$/.test(timePart)) return false;
        try {
          const appointmentDateTime = new Date(`${app.date}T${timePart}:00`);
          return appointmentDateTime < now || app.status === 'cancelled' || app.status === 'completed';
        } catch (e) {
          console.warn("Invalid date/time for past appointment:", app);
          return false;
        }
      });
    } catch (filterError) {
      console.error("Error filtering appointments:", filterError);
      // 可以設置一個錯誤狀態來通知用戶列表過濾可能不完整
    }
  }

  // Sidebar menu items
  const menuItems = [
    { icon: <DashboardIcon />, label: '儀表板', value: 0 },
    // { icon: <CalendarIcon />, label: '預約時段', value: 1 }, // Link directly instead
    { icon: <AppointmentIcon />, label: '我的預約', value: 1 }, // Adjusted value
    { icon: <SettingsIcon />, label: '設置', value: 2 }, // Adjusted value
  ];

  const renderAppointmentItems = appointments => {
    return (
      <List sx={{ p: 0 }}>
        {appointments.map(appointment => (
          <ListItem
            key={appointment.id}
            sx={{
              p: isMobile ? 1.5 : 2,
              pb: isMobile ? 4 : 2, // 增加下方內邊距，為按鈕提供更多空間
              mb: 2,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              boxShadow: 1,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              position: 'relative', // 確保可以在內部進行絕對定位
            }}
            secondaryAction={
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                mt: isMobile ? 1 : 0,
                position: isMobile ? 'absolute' : 'absolute', // 改為絕對定位
                bottom: isMobile ? 8 : 'auto', // 在手機版時放在底部
                right: isMobile ? 8 : 16,
                top: isMobile ? 'auto' : '50%', // 在電腦版時垂直居中
                transform: isMobile ? 'none' : 'translateY(-50%)', // 在電腦版時垂直居中調整
              }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewDetails(appointment)}
                  disabled={loading || cancellingId !== null}
                  sx={{ 
                    minWidth: isMobile ? '60px' : 'auto',
                    fontSize: isMobile ? '0.75rem' : undefined 
                  }}
                >
                  詳情
                </Button>
                {appointment.status !== 'cancelled' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handlePatientCancelRequest(appointment)}
                    disabled={loading || cancellingId !== null}
                    sx={{ 
                      minWidth: isMobile ? '60px' : 'auto',
                      fontSize: isMobile ? '0.75rem' : undefined 
                    }}
                  >
                    取消
                  </Button>
                )}
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                {appointment.doctor?.name?.charAt(0) || '師'}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box>
                <Typography 
                  variant="body1" 
                  fontWeight="medium"
                  sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
                >
                    就診者：{appointment.actualPatientName || appointment.patientName || '未指定患者'}
                </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
                  >
                    治療師：{appointment.doctorName || appointment.doctor?.name || '心理治療師 (已排定)'}
                  </Typography>
                </Box>
              }
              secondary={
                <Box
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 1, 
                    mt: 0.5,
                    pr: isMobile ? 0 : 15, // 在非手機版中為右側按鈕預留空間
                    mb: isMobile ? 2.5 : 0, // 在手機版中為底部按鈕預留空間
                  }}
                >
                  <Chip
                    size="small"
                    label={appointment.date}
                    sx={{ 
                      bgcolor: 'background.paper',
                      height: isMobile ? '24px' : '32px',
                      '& .MuiChip-label': {
                        fontSize: isMobile ? '0.7rem' : '0.8rem'
                      }
                    }}
                  />
                  <Chip
                    size="small"
                    icon={<TimeIcon fontSize="small" />}
                    label={appointment.time}
                    sx={{ 
                      bgcolor: 'background.paper',
                      height: isMobile ? '24px' : '32px',
                      '& .MuiChip-label': {
                        fontSize: isMobile ? '0.7rem' : '0.8rem'
                      }
                    }}
                  />
                  <Chip
                    size="small"
                    label={
                      appointment.status === 'confirmed'
                        ? '已確認'
                        : appointment.status === 'cancelled'
                          ? '已取消'
                          : '待確認'
                    }
                    color={
                      appointment.status === 'confirmed'
                        ? 'success'
                        : appointment.status === 'cancelled'
                          ? 'default'
                          : 'warning'
                    }
                    variant="outlined"
                    sx={{ 
                      height: isMobile ? '24px' : '32px',
                      '& .MuiChip-label': {
                        fontSize: isMobile ? '0.7rem' : '0.8rem'
                      }
                    }}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  // Render dashboard content
  const renderDashboardContent = () => {
    // 使用 ApiStateHandler 統一處理 API 狀態
    return (
      <ApiStateHandler
        loading={authLoading || loading}
        error={error}
        success={success}
        loadingMessage={authLoading ? '載入用戶資訊...' : '載入預約資料...'}
        onErrorClose={() => setError('')}
        onSuccessClose={() => setSuccess('')}
      >
        {/* 根據頁籤顯示不同內容 */}
        {(() => {
          switch (tabValue) {
            case 0: // Dashboard Overview
              return (
                <Box>
                  <Typography 
                    variant="h5" 
                    component="h2" 
                    gutterBottom 
                    fontWeight="medium"
                    sx={{ fontSize: isMobile ? '1.25rem' : undefined }}
                  >
                    患者儀表板
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    paragraph
                    sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
                  >
                    歡迎回來，{user?.name || user?.email?.split('@')[0] || '用戶'}！在這裡管理您的預約。
                  </Typography>

                  <Grid container spacing={isMobile ? 2 : 3} sx={{ mt: isMobile ? 0 : 1 }}>
                    {/* Stat Cards */}
                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                          <Typography 
                            color="text.secondary" 
                            gutterBottom
                            sx={{ fontSize: isMobile ? '0.85rem' : undefined }}
                          >
                            即將到來的預約
                          </Typography>
                          <Typography
                            variant="h4"
                            component="div"
                            color="primary"
                            fontWeight="medium"
                            sx={{ fontSize: isMobile ? '1.8rem' : undefined }}
                          >
                            {upcomingAppointments.length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                          <Typography 
                            color="text.secondary" 
                            gutterBottom
                            sx={{ fontSize: isMobile ? '0.85rem' : undefined }}
                          >
                            歷史預約
                          </Typography>
                          <Typography
                            variant="h4"
                            component="div"
                            color="primary"
                            fontWeight="medium"
                            sx={{ fontSize: isMobile ? '1.8rem' : undefined }}
                          >
                            {pastAppointments.length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Card
                        sx={{
                          height: '100%',
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography color="text.secondary" gutterBottom>
                            需要新的預約？
                          </Typography>
                          <Button
                            variant="contained"
                            color="secondary"
                            component={RouterLink}
                            to="/appointment"
                            startIcon={<CalendarIcon />}
                            sx={{ mt: 1 }}
                          >
                            前往預約
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Upcoming Appointments Preview */}
                    <Grid item xs={12}>
                      <Card sx={{ borderRadius: 2, mt: 2 }}>
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 2,
                            }}
                          >
                            <Typography variant="h6" component="h3" fontWeight="medium">
                              即將到來的預約
                            </Typography>
                            <Button
                              onClick={() => setTabValue(1)} // Switch to 'My Appointments' tab
                              color="primary"
                              endIcon={<AppointmentIcon />}
                            >
                              查看全部
                            </Button>
                          </Box>
                          <Divider sx={{ mb: 2 }} />
                          {/* 顯示預約列表 */}
                          {upcomingAppointments.length === 0 ? (
                            <Typography color="text.secondary">
                              您目前沒有即將到來的預約。
                            </Typography>
                          ) : (
                            <List>
                              {upcomingAppointments.slice(0, 3).map(appointment => (
                                <ListItem
                                  key={appointment._id}
                                  secondaryAction={
                                    appointment.status !== 'cancelled' && (
                                      <IconButton
                                        edge="end"
                                        aria-label="cancel"
                                        color="error"
                                        onClick={() => handlePatientCancelRequest(appointment)}
                                        disabled={cancellingId === appointment._id}
                                      >
                                        {cancellingId === appointment._id ? (
                                          <LoadingIndicator type="inline" size="small" />
                                        ) : (
                                          <CancelIcon />
                                        )}
                                      </IconButton>
                                    )
                                  }
                                  sx={{
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:last-child': {
                                      borderBottom: 'none',
                                    },
                                  }}
                                >
                                  <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                      {/* Assuming doctor info is populated or available */}
                                      {appointment.doctor?.name?.charAt(0) || '師'}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                                      <Box>
                                      <Typography variant="body1" fontWeight="medium">
                                          就診者：{appointment.actualPatientName || appointment.patientName || '未指定患者'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          治療師：{appointment.doctorName ||
                                          appointment.doctor?.name ||
                                          '心理治療師 (已排定)'}
                                      </Typography>
                                      </Box>
                                    }
                                    secondary={
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          flexWrap: 'wrap',
                                          gap: 1,
                                          mt: 0.5,
                                        }}
                                      >
                                        <Chip
                                          size="small"
                                          label={appointment.date}
                                          sx={{ bgcolor: 'background.paper' }}
                                        />
                                        <Chip
                                          size="small"
                                          icon={<TimeIcon fontSize="small" />}
                                          label={appointment.time}
                                          sx={{ bgcolor: 'background.paper' }}
                                        />
                                        <Chip
                                          size="small"
                                          label={
                                            appointment.status === 'confirmed'
                                              ? '已確認'
                                              : appointment.status === 'cancelled'
                                                ? '已取消'
                                                : '待確認'
                                          }
                                          color={
                                            appointment.status === 'confirmed'
                                              ? 'success'
                                              : appointment.status === 'cancelled'
                                                ? 'default'
                                                : 'warning'
                                          }
                                          variant="outlined"
                                        />
                                      </Box>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              );
            case 1: // My Appointments
              return (
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5" component="h2" fontWeight="medium">
                      我的預約
                    </Typography>
                    <IconButton
                      onClick={fetchAppointments}
                      aria-label="刷新預約"
                      disabled={loading}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    查看您的所有預約。如需取消或變更預約，請提前聯絡診所。
                  </Typography>

                  <Card sx={{ borderRadius: 2, mt: 3 }}>
                    <CardContent>
                      <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                        所有預約記錄
                      </Typography>
                      {renderAppointmentItems(appointments)}

                      {/* 添加預約政策提示 */}
                      <Alert severity="info" sx={{ mt: 2 }}>
                        預約政策：如需取消或變更預約，請提前至少24小時聯絡診所。無故未赴約可能會影響您未來的預約權限。
                      </Alert>
                    </CardContent>
                  </Card>
                </Box>
              );
            case 2: // Settings
              return (
                <Box>
                  <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
                    設置
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    管理您的帳號和通知設置。
                  </Typography>

                  <Card sx={{ borderRadius: 2, mt: 3 }}>
                    <CardContent>
                      <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                        個人資料
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          <Box component="span" fontWeight="medium" display="inline-block" width="100px">姓名:</Box> 
                          {user?.name || user?.email?.split('@')[0] || '未提供'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <Box component="span" fontWeight="medium" display="inline-block" width="100px">用戶名/郵箱:</Box> 
                          {user?.username || user?.email || '未提供'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <Box component="span" fontWeight="medium" display="inline-block" width="100px">角色:</Box> 
                          {user?.role === 'patient' ? '患者' : user?.role}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button 
                          variant="outlined" 
                          color="primary"
                          startIcon={<SettingsIcon />}
                          onClick={() => handleOpenEditProfile()}
                        >
                          編輯資料
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="secondary"
                          onClick={() => handleOpenChangePassword()}
                        >
                          更改密碼
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>

                  <Card sx={{ borderRadius: 2, mt: 3 }}>
                    <CardContent>
                      <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                        通知設置
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        目前系統會自動向您註冊的郵箱發送預約通知和提醒。若要變更通知郵箱，請編輯您的個人資料。
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              );
            default:
              return null;
          }
        })()}
      </ApiStateHandler>
    );
  };

  // 初始化個人資料表單
  const initProfileForm = () => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || user.username || '',
      });
    }
    setProfileError('');
  };

  // 處理個人資料更新
  const handleProfileUpdate = async () => {
    if (!profileData.name.trim() || !profileData.email.trim()) {
      setProfileError('姓名和電子郵箱不能為空');
      return;
    }

    // 基本的電子郵箱格式驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setProfileError('請輸入有效的電子郵箱格式');
      return;
    }

    setUpdatingProfile(true);
    setProfileError('');

    try {
      await updateUserProfile(profileData);
      setSuccess('個人資料更新成功');
      setEditProfileOpen(false);
      
      // 刷新用戶資料
      refreshUser();
      
    } catch (err) {
      console.error('更新個人資料失敗:', err);
      const formattedError = err.formatted || formatApiError(err, '更新個人資料失敗');
      setProfileError(formattedError.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // 初始化密碼表單
  const initPasswordForm = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  // 處理密碼更改
  const handlePasswordChange = async () => {
    // 檢查是否有空字段
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('所有密碼字段都必須填寫');
      return;
    }

    // 檢查新密碼是否符合安全要求
    if (passwordData.newPassword.length < 8) {
      setPasswordError('新密碼長度必須至少為8個字符');
      return;
    }

    // 檢查確認密碼是否匹配
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('確認密碼與新密碼不匹配');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      await changeUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordSuccess('密碼已成功更改');
      
      // 3秒後關閉對話框
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('更改密碼失敗:', err);
      const formattedError = err.formatted || formatApiError(err, '更改密碼失敗');
      setPasswordError(formattedError.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // 處理打開編輯個人資料對話框
  const handleOpenEditProfile = () => {
    initProfileForm();
    setEditProfileOpen(true);
  };

  // 處理打開更改密碼對話框
  const handleOpenChangePassword = () => {
    initPasswordForm();
    setChangePasswordOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: isMobile ? 2 : 4, mb: isMobile ? 2 : 4, px: isMobile ? 1 : 2 }}>
      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: isMobile ? 1 : 2, borderRadius: 2 }}>
            <Tabs
              orientation={isMobile ? 'horizontal' : 'vertical'}
              variant={isMobile ? 'scrollable' : 'standard'}
              value={tabValue}
              onChange={handleTabChange}
              aria-label="Patient dashboard tabs"
              sx={{
                borderRight: isMobile ? 0 : 1,
                borderBottom: isMobile ? 1 : 0,
                borderColor: 'divider',
                '.MuiTabs-flexContainer': {
                  justifyContent: isMobile ? 'space-between' : 'flex-start'
                }
              }}
            >
              {menuItems.map(item => (
                <Tab
                  key={item.value}
                  icon={item.icon}
                  iconPosition="start"
                  label={item.label}
                  value={item.value}
                  sx={{
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    textTransform: 'none',
                    mb: isMobile ? 0 : 1,
                    fontSize: isMobile ? '0.8rem' : undefined,
                    minHeight: isMobile ? '48px' : undefined,
                    maxWidth: isMobile ? '33%' : '100%',
                    minWidth: 0,
                    py: isMobile ? 0.5 : 1
                  }}
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: 2 }}>{renderDashboardContent()}</Paper>
        </Grid>
      </Grid>

      {/* 預約詳情對話框 */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>預約詳情</DialogTitle>
        <DialogContent dividers>
          {selectedAppointment ? (
            <Box>
              <Typography gutterBottom><strong>就診者姓名：</strong> {selectedAppointment.actualPatientName || selectedAppointment.patientName || '未指定患者'}</Typography>
              <Typography gutterBottom><strong>日期：</strong> {selectedAppointment.date ? new Date(selectedAppointment.date + 'T00:00:00').toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : 'N/A'}</Typography>
              <Typography gutterBottom><strong>時間：</strong> {selectedAppointment.time || 'N/A'}</Typography>
              <Typography gutterBottom><strong>治療師：</strong> {selectedAppointment.doctorName || selectedAppointment.therapistName || selectedAppointment.doctorId?.name || 'N/A'}</Typography>
              <Typography gutterBottom><strong>服務項目：</strong> {selectedAppointment.service || '未指定'}</Typography>
              <Typography gutterBottom>
                <strong>狀態：</strong>
                <Chip
                  label={selectedAppointment.status || '未知'}
                  size="small"
                  color={
                    selectedAppointment.status === 'scheduled' ? 'primary' :
                    selectedAppointment.status === 'completed' ? 'success' :
                    selectedAppointment.status === 'cancelled' ? 'error' :
                    'default'
                  }
                  sx={{ ml: 1 }}
                />
              </Typography>
              {selectedAppointment.reason && <Typography gutterBottom><strong>預約原因：</strong> {selectedAppointment.reason}</Typography>}
              {selectedAppointment.notes && <Typography gutterBottom><strong>備註：</strong> {selectedAppointment.notes}</Typography>}
              {/* 可以根據需要添加更多從 bookingDetails 來的資訊，如果API返回了這些 */}
            </Box>
          ) : (
            <Typography>無法載入預約詳情。</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 取消預約需聯繫診所的提示 Dialog */}
      <Dialog open={showCancelInfoDialog} onClose={handleCloseCancelInfoDialog}>
        <DialogTitle>取消預約提醒</DialogTitle>
        <DialogContent>
          <DialogContentText>
            提醒您，若需取消預約，請您直接致電或透過其他方式與診所服務人員聯繫進行處理。
            感謝您的理解與配合。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelInfoDialog} color="primary" autoFocus>
            了解
          </Button>
        </DialogActions>
      </Dialog>

      {/* 保留原有的取消確認對話框，以防未來內部流程使用 */}
      <Dialog open={cancelConfirmOpen} onClose={closeCancelConfirm}>
        <DialogTitle id="cancel-appointment-title" sx={{ color: theme.palette.error.main }}>
          確認取消預約
        </DialogTitle>
        <DialogContent>
          {cancelSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              {cancelSuccess}
            </Alert>
          ) : (
            <>
              <DialogContentText id="cancel-appointment-description">
                您確定要取消此預約嗎？此操作不可撤銷。
              </DialogContentText>
              {appointmentToCancel && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>日期：</strong> {appointmentToCancel.date}
                  </Typography>
                  <Typography variant="body2">
                    <strong>時間：</strong> {appointmentToCancel.time}
                  </Typography>
                </Box>
              )}
              {cancelError && (
                <ErrorAlert
                  message={cancelError}
                  onClose={() => setCancelError('')}
                  sx={{ mt: 2 }}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!cancelSuccess && (
            <>
              <Button onClick={closeCancelConfirm} disabled={cancellingId !== null}>
                返回
              </Button>
              <Button
                onClick={confirmCancelAppointment}
                color="error"
                disabled={cancellingId !== null}
              >
                {cancellingId !== null ? (
                  <LoadingIndicator type="inline" size="small" message="處理中..." />
                ) : (
                  '確認取消'
                )}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* 編輯個人資料對話框 */}
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>編輯個人資料</DialogTitle>
        <DialogContent dividers>
          {profileError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {profileError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="姓名"
                fullWidth
                margin="normal"
                                          value={profileData.name || user?.name || user?.email?.split('@')[0] || ''}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                disabled={updatingProfile}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="電子郵箱"
                type="email"
                fullWidth
                margin="normal"
                value={profileData.email || user?.email || user?.username || ''}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                disabled={updatingProfile}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                注意：更新電子郵箱後，系統通知將發送至新郵箱地址。
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileOpen(false)} disabled={updatingProfile}>
            取消
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleProfileUpdate}
            disabled={updatingProfile}
          >
            {updatingProfile ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 更改密碼對話框 */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>更改密碼</DialogTitle>
        <DialogContent dividers>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="當前密碼"
                type="password"
                fullWidth
                margin="normal"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                disabled={changingPassword}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="新密碼"
                type="password"
                fullWidth
                margin="normal"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                disabled={changingPassword}
                required
                helperText="密碼長度至少為8個字符"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="確認新密碼"
                type="password"
                fullWidth
                margin="normal"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                disabled={changingPassword}
                required
                error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
                helperText={
                  passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''
                    ? '兩次輸入的密碼不一致'
                    : ''
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)} disabled={changingPassword}>
            取消
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handlePasswordChange}
            disabled={
              changingPassword || 
              !passwordData.currentPassword || 
              !passwordData.newPassword || 
              !passwordData.confirmPassword ||
              passwordData.newPassword !== passwordData.confirmPassword
            }
          >
            {changingPassword ? <CircularProgress size={24} /> : '更改密碼'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PatientDashboard;
