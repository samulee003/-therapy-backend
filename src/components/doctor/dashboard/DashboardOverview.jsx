import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { getDoctorAppointments } from '../../../services/api';
import { getStatusText, getStatusColor } from './utils';

const DashboardOverview = ({ user, onNavigateToTab }) => {
  const theme = useTheme();
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [errorAppointments, setErrorAppointments] = useState('');

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
      } else if (Array.isArray(response.data)) {
        // 保持向後兼容的處理方式
        setAppointments(response.data);
      } else {
        // 其他情況，設為空陣列
        console.warn('意外的回應格式:', response.data);
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setErrorAppointments(err.response?.data?.message || err.message || '無法加載預約記錄。');
      setAppointments([]);
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

  // 計算今日日期
  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 過濾今日預約
  const todayAppointments = appointments.filter(
    appointment => appointment.date === formattedToday && appointment.status !== 'cancelled'
  );

  // 過濾未來預約（不含今日）
  const upcomingAppointments = appointments.filter(
    appointment => {
      // 比較日期是否在今天之後
      return (
        appointment.date > formattedToday && 
        appointment.status !== 'cancelled'
      );
    }
  );

  // 獲取所有未取消預約
  const activeAppointments = appointments.filter(
    appointment => appointment.status !== 'cancelled'
  );

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
        心理治療師儀表板
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
                  歡迎回來，{user?.name || user?.email?.split('@')[0] || '用戶'}！管理您的預約和時段。
      </Typography>

      {errorAppointments && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorAppointments}
        </Alert>
      )}

      {loadingAppointments ? (
        <CircularProgress sx={{ my: 2 }} />
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* 統計卡片 */}
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  今日預約
                </Typography>
                <Typography variant="h4" component="div" color="primary" fontWeight="medium">
                  {todayAppointments.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  即將到來
                </Typography>
                <Typography variant="h4" component="div" color="primary" fontWeight="medium">
                  {upcomingAppointments.length}
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
                  管理時段
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => onNavigateToTab(1)} // 切換到排班管理頁籤
                  startIcon={<CalendarIcon />}
                  sx={{ mt: 1 }}
                >
                  前往管理
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* 即將到來的預約預覽 */}
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
                    今日及未來預約 (預覽)
                  </Typography>
                  <Button
                    onClick={() => onNavigateToTab(2)} // 切換到預約列表頁籤
                    color="primary"
                    endIcon={<PeopleIcon />}
                  >
                    查看全部
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {activeAppointments.length === 0 ? (
                  <Typography color="text.secondary">目前沒有即將到來的預約。</Typography>
                ) : (
                  <List>
                    {[...todayAppointments, ...upcomingAppointments].slice(0, 5).map(appointment => (
                      <ListItem
                        key={appointment.id}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                            {appointment.actualPatientName?.charAt(0) || '患'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="medium">
                              {appointment.actualPatientName || '患者'}
                            </Typography>
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
                                label={getStatusText(appointment.status)}
                                color={getStatusColor(appointment.status)}
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
      )}
    </Box>
  );
};

export default DashboardOverview; 