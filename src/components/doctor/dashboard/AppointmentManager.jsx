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
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Badge,
  Divider,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { getDoctorAppointments, cancelAdminAppointment } from '../../../services/api';
import { getStatusText, getStatusColor } from './utils';

// 預約管理組件
const AppointmentManager = ({ user }) => {
  // 響應式設計
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 狀態管理
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [errorAppointments, setErrorAppointments] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'upcoming'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'pending', 'cancelled'
  const [sortOrder, setSortOrder] = useState('byDate'); // 'byDate', 'byLatest'
  
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

  // 過濾預約的邏輯
  useEffect(() => {
    let filtered = [...appointments];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 搜索過濾
    if (searchTerm) {
    const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
      appointment =>
          appointment.actualPatientName?.toLowerCase().includes(lowerCaseSearch) ||
        appointment.patientEmail?.toLowerCase().includes(lowerCaseSearch) ||
        appointment.patientPhone?.includes(searchTerm) ||
        appointment.date?.includes(searchTerm) ||
        appointment.time?.includes(searchTerm) ||
        appointment.appointmentReason?.toLowerCase().includes(lowerCaseSearch)
    );
    }

    // 時間過濾
    if (timeFilter !== 'all') {
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        switch (timeFilter) {
          case 'today':
            return appointmentDate.toDateString() === today.toDateString();
          case 'week':
            return appointmentDate >= today && appointmentDate < nextWeek;
          case 'upcoming':
            return appointmentDate >= today;
          default:
            return true;
        }
      });
    }

    // 狀態過濾
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // 按選擇的方式排序
    filtered.sort((a, b) => {
      if (sortOrder === 'byLatest') {
        // 按最新預約在前排序 (假設有 createdAt 欄位，否則使用 id 作為替代)
        // 如果後端提供 createdAt 時間戳，使用 createdAt；否則使用 id (通常較大的 id 表示較新的記錄)
        const timeA = a.createdAt ? new Date(a.createdAt) : a.id;
        const timeB = b.createdAt ? new Date(b.createdAt) : b.id;
        return timeB - timeA; // 新的在前
      } else {
        // 按預約日期和時間排序 (原有邏輯)
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA - dateB;
      }
    });

    setFilteredAppointments(filtered);
  }, [searchTerm, appointments, timeFilter, statusFilter, sortOrder]);

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
      await cancelAdminAppointment(appointmentToCancel.id);
      
      // 更新本地狀態
      setAppointments(prev => 
        prev.map(app => 
          app.id === appointmentToCancel.id 
            ? { ...app, status: 'cancelled' }
            : app
        )
      );

      setCancelSuccess('預約已成功取消');
      
      // 1.5秒後關閉對話框
        setTimeout(() => {
          closeCancelConfirm();
        setCancelSuccess('');
        }, 1500);

    } catch (err) {
      console.error('取消預約失敗:', err);
      setCancelError(err.response?.data?.message || err.message || '取消預約失敗，請稍後重試。');
    } finally {
      setCancellingId(null);
    }
  };

  // 獲取統計數據
  const getAppointmentStats = () => {
    const today = new Date().toDateString();
    const todayCount = appointments.filter(app => 
      new Date(app.date).toDateString() === today && app.status !== 'cancelled'
    ).length;
    
    const upcomingCount = appointments.filter(app => 
      new Date(app.date) >= new Date() && app.status !== 'cancelled'
    ).length;
    
    const pendingCount = appointments.filter(app => 
      app.status === 'pending' || app.status === 'confirmed'
    ).length;

    return { todayCount, upcomingCount, pendingCount };
  };

  const stats = getAppointmentStats();

  // 分組預約
  const groupAppointmentsByDate = (appointments) => {
    const groups = {};
    appointments.forEach(appointment => {
      const date = appointment.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
    });
    return groups;
  };

  // 渲染卡片視圖
  const renderCardsView = () => {
    const groupedAppointments = groupAppointmentsByDate(filteredAppointments);

  return (
    <Box>
        {Object.keys(groupedAppointments).map(date => (
          <Box key={date} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              {new Date(date + 'T00:00:00').toLocaleDateString('zh-TW', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                weekday: 'long' 
              })}
      </Typography>
            <Grid container spacing={isMobile ? 1.5 : 2}>
              {groupedAppointments[date].map(appointment => (
                <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: appointment.status === 'cancelled' ? '1px solid' : 'none',
                      borderColor: appointment.status === 'cancelled' ? 'grey.300' : 'transparent',
                      opacity: appointment.status === 'cancelled' ? 0.7 : 1,
                      '&:hover': {
                        boxShadow: isMobile ? 2 : 3,
                        transform: isMobile ? 'none' : 'translateY(-2px)'
                      }
                    }}
                    onClick={() => handleViewAppointmentDetails(appointment)}
                  >
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        mb: isMobile ? 1.5 : 2,
                        flexDirection: isSmallMobile ? 'column' : 'row',
                        gap: isSmallMobile ? 1 : 0
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ 
                            bgcolor: 'primary.main', 
                            width: isMobile ? 35 : 40, 
                            height: isMobile ? 35 : 40 
                          }}>
                            <PersonIcon fontSize={isMobile ? 'medium' : 'large'} />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ 
                              fontSize: isMobile ? '1rem' : '1.1rem', 
                              fontWeight: 'bold',
                              lineHeight: 1.2
                            }}>
                              {appointment.actualPatientName || '未指定患者'}
      </Typography>
                            <Chip
          size="small"
                              label={getStatusText(appointment.status)}
                              color={getStatusColor(appointment.status)}
                              sx={{ 
                                mt: 0.5,
                                height: isMobile ? 20 : 24,
                                fontSize: isMobile ? '0.7rem' : '0.75rem'
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: isMobile ? 1 : 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.8 }}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight="medium" sx={{ 
                            fontSize: isMobile ? '0.85rem' : '0.875rem' 
                          }}>
                            {appointment.time}
                          </Typography>
      </Box>

                        {appointment.patientEmail && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              fontSize: isMobile ? '0.8rem' : '0.875rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: isMobile ? '200px' : 'none'
                            }}>
                              {appointment.patientEmail}
                            </Typography>
                          </Box>
                        )}
                        
                        {appointment.patientPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              fontSize: isMobile ? '0.8rem' : '0.875rem' 
                            }}>
                              {appointment.patientPhone}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {appointment.appointmentReason && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: isMobile ? 1 : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: isMobile ? 1 : 1.5,
                            fontSize: isMobile ? '0.8rem' : '0.875rem',
                            lineHeight: 1.3
                          }}
                        >
                          原因：{appointment.appointmentReason}
                        </Typography>
                      )}

                      <Box sx={{ 
                        display: 'flex', 
                        gap: isMobile ? 0.5 : 1, 
                        mt: isMobile ? 1.5 : 2,
                        flexDirection: isSmallMobile ? 'column' : 'row'
                      }}>
                        <Button
                          size={isMobile ? 'small' : 'small'}
                          variant="outlined"
                          startIcon={isMobile ? null : <VisibilityIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAppointmentDetails(appointment);
                          }}
                          fullWidth
                          sx={{ 
                            fontSize: isMobile ? '0.8rem' : '0.875rem',
                            py: isMobile ? 0.5 : 0.6
                          }}
                        >
                          詳情
                        </Button>
                        {appointment.status !== 'cancelled' && (
                          <Button
                            size={isMobile ? 'small' : 'small'}
                            variant="outlined"
                            color="error"
                            startIcon={isMobile ? null : <CancelIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCancelConfirm(appointment);
                            }}
                            fullWidth
                            sx={{ 
                              fontSize: isMobile ? '0.8rem' : '0.875rem',
                              py: isMobile ? 0.5 : 0.6
                            }}
                          >
                            取消
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
        
        {filteredAppointments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6" color="text.secondary">
              {searchTerm || timeFilter !== 'all' || statusFilter !== 'all' 
                ? '沒有符合條件的預約' 
                : '暫無預約記錄'}
            </Typography>
          </Box>
        )}
        </Box>
    );
  };

  // 渲染表格視圖
  const renderTableView = () => (
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
                {searchTerm || timeFilter !== 'all' || statusFilter !== 'all' 
                  ? '沒有符合條件的預約' 
                  : '暫無預約記錄'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map(appointment => (
                  <TableRow 
                    key={appointment.id}
                    sx={{
                      backgroundColor: appointment.status === 'cancelled' 
                        ? 'action.hover' 
                        : 'inherit',
                      opacity: appointment.status === 'cancelled' ? 0.6 : 1,
                      '&:hover': {
                        backgroundColor: appointment.status === 'cancelled' 
                          ? 'action.selected' 
                          : 'action.hover',
                      }
                    }}
                  >
                    <TableCell>
                  {appointment.actualPatientName || '未指定患者'}
                    </TableCell>
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
  );

  return (
    <Box>
      {/* 標題和統計 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h6" : "h5"} gutterBottom fontWeight="medium" sx={{
          fontSize: isMobile ? '1.25rem' : undefined,
          mb: isMobile ? 1 : undefined
        }}>
          預約管理
        </Typography>
        
        {/* 統計卡片 */}
        <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
          <Grid item xs={4} sm={4}>
            <Card sx={{ textAlign: 'center', bgcolor: 'primary.50' }}>
              <CardContent sx={{ py: isMobile ? 1.5 : 2, px: isMobile ? 1 : 2 }}>
                <Typography color="primary" variant={isMobile ? "h5" : "h4"} fontWeight="bold" sx={{
                  fontSize: isMobile ? '1.5rem' : undefined
                }}>
                  {stats.todayCount}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{
                  fontSize: isMobile ? '0.75rem' : undefined
                }}>
                  今日預約
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4} sm={4}>
            <Card sx={{ textAlign: 'center', bgcolor: 'success.50' }}>
              <CardContent sx={{ py: isMobile ? 1.5 : 2, px: isMobile ? 1 : 2 }}>
                <Typography color="success.main" variant={isMobile ? "h5" : "h4"} fontWeight="bold" sx={{
                  fontSize: isMobile ? '1.5rem' : undefined
                }}>
                  {stats.upcomingCount}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{
                  fontSize: isMobile ? '0.75rem' : undefined
                }}>
                  即將到來
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4} sm={4}>
            <Card sx={{ textAlign: 'center', bgcolor: 'warning.50' }}>
              <CardContent sx={{ py: isMobile ? 1.5 : 2, px: isMobile ? 1 : 2 }}>
                <Typography color="warning.main" variant={isMobile ? "h5" : "h4"} fontWeight="bold" sx={{
                  fontSize: isMobile ? '1.5rem' : undefined
                }}>
                  {stats.pendingCount}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{
                  fontSize: isMobile ? '0.75rem' : undefined
                }}>
                  待處理
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* 控制列 */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        alignItems: { md: 'center' },
        justifyContent: 'space-between'
      }}>
        {/* 搜索和篩選 */}
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 1 : 2, 
          flexWrap: 'wrap', 
          alignItems: 'center',
          width: '100%'
        }}>
          <TextField
            label="搜索預約"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ 
              minWidth: isMobile ? '100%' : 250,
              flexGrow: isMobile ? 1 : 0
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize={isMobile ? 'small' : 'medium'} />
                </InputAdornment>
              ),
            }}
            placeholder={isMobile ? "搜索..." : "患者姓名、電話、日期..."}
          />
          
          <Box sx={{ 
            display: 'flex', 
            gap: isMobile ? 1 : 2, 
            width: isMobile ? '100%' : 'auto',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <FormControl size="small" sx={{ 
              minWidth: isMobile ? 0 : 120,
              flex: isMobile ? 1 : 'none'
            }}>
              <InputLabel sx={{ fontSize: isMobile ? '0.8rem' : undefined }}>
                {isMobile ? '時間' : '時間篩選'}
              </InputLabel>
              <Select
                value={timeFilter}
                label={isMobile ? '時間' : '時間篩選'}
                onChange={(e) => setTimeFilter(e.target.value)}
                sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="today">今日</MenuItem>
                <MenuItem value="week">本週</MenuItem>
                <MenuItem value="upcoming">即將</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ 
              minWidth: isMobile ? 0 : 120,
              flex: isMobile ? 1 : 'none'
            }}>
              <InputLabel sx={{ fontSize: isMobile ? '0.8rem' : undefined }}>
                {isMobile ? '狀態' : '狀態篩選'}
              </InputLabel>
              <Select
                value={statusFilter}
                label={isMobile ? '狀態' : '狀態篩選'}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="confirmed">已確認</MenuItem>
                <MenuItem value="pending">待確認</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ 
              minWidth: isMobile ? 0 : 120,
              flex: isMobile ? 1 : 'none'
            }}>
              <InputLabel sx={{ fontSize: isMobile ? '0.8rem' : undefined }}>
                {isMobile ? '排序' : '排序方式'}
              </InputLabel>
              <Select
                value={sortOrder}
                label={isMobile ? '排序' : '排序方式'}
                onChange={(e) => setSortOrder(e.target.value)}
                sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
              >
                <MenuItem value="byDate">按預約日期</MenuItem>
                <MenuItem value="byLatest">最新預約在前</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* 視圖切換和刷新 */}
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 0.5 : 1, 
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode);
              }
            }}
            size="small"
          >
            <ToggleButton value="cards" sx={{ px: isMobile ? 1 : 1.5 }}>
              <ViewModuleIcon fontSize={isMobile ? 'small' : 'medium'} />
            </ToggleButton>
            <ToggleButton value="table" sx={{ px: isMobile ? 1 : 1.5 }}>
              <ViewListIcon fontSize={isMobile ? 'small' : 'medium'} />
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Tooltip title="刷新預約列表">
            <IconButton
              onClick={fetchAppointments}
              disabled={loadingAppointments}
              size="small"
            >
              <RefreshIcon fontSize={isMobile ? 'small' : 'medium'} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 錯誤和成功提示 */}
      {errorAppointments && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorAppointments}
        </Alert>
      )}

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
        /* 根據視圖模式渲染 */
        viewMode === 'cards' ? renderCardsView() : renderTableView()
      )}

      {/* 預約詳情對話框 */}
      <Dialog open={appointmentDetailsOpen} onClose={handleCloseAppointmentDetails}>
        <DialogTitle>預約詳情</DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box sx={{ minWidth: 300 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedAppointment.actualPatientName}</Typography>
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
              ? `您確定要取消 ${appointmentToCancel.actualPatientName} 於 ${appointmentToCancel.date} ${appointmentToCancel.time} 的預約嗎？此操作無法撤銷。`
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