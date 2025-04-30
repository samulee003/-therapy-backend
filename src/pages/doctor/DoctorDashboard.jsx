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
  TextField, // Added for slot management
  Dialog, // Added for dialogs
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon // Added
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Adjusted path
import { 
    getDoctorAppointments, 
    getDoctorSlots, 
    addDoctorSlot, 
    removeDoctorSlot, 
    bulkGenerateDoctorSlots 
} from '../../services/api'; // Adjusted path

// Removed mock data

// Helper function to format date for API (YYYY-MM-DD)
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DoctorDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const [tabValue, setTabValue] = useState(0);
  
  // State for appointments
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [errorAppointments, setErrorAppointments] = useState('');

  // State for slots
  const [slots, setSlots] = useState({}); // { 'YYYY-MM-DD': [{ _id: '...', time: 'HH:MM' }, ...] }
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState('');
  const [selectedDateForSlots, setSelectedDateForSlots] = useState(formatDate(new Date()));
  const [newSlotTime, setNewSlotTime] = useState(''); // For adding single slot
  const [deletingSlotId, setDeletingSlotId] = useState(null);

  // State for bulk generation
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkStartTime, setBulkStartTime] = useState('09:00');
  const [bulkEndTime, setBulkEndTime] = useState('17:00');
  const [bulkInterval, setBulkInterval] = useState(60); // minutes
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // --- Data Fetching --- //

  const fetchAppointments = async () => {
    if (!user) return;
    setLoadingAppointments(true);
    setErrorAppointments('');
    try {
      // Fetch for a reasonable range, e.g., current month
      const today = new Date();
      const startOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
      const endOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      const response = await getDoctorAppointments(startOfMonth, endOfMonth);
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setErrorAppointments(err.response?.data?.message || err.message || '無法加載預約記錄。');
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchSlots = async (date) => {
    if (!user) return;
    setLoadingSlots(true);
    setErrorSlots('');
    try {
      // Fetch slots for the selected date
      const response = await getDoctorSlots(date, date);
      setSlots(prev => ({ ...prev, [date]: response.data[date] || [] }));
    } catch (err) {
      console.error(`Failed to fetch slots for ${date}:`, err);
      setErrorSlots(err.response?.data?.message || err.message || `無法加載 ${date} 的時段。`);
      setSlots(prev => ({ ...prev, [date]: [] })); // Clear slots for date on error
    } finally {
      setLoadingSlots(false);
    }
  };

  // Initial fetch and fetch when user changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchAppointments();
      fetchSlots(selectedDateForSlots);
    }
  }, [user, authLoading]);

  // Fetch slots when selected date changes
  useEffect(() => {
    if (user) {
        fetchSlots(selectedDateForSlots);
    }
  }, [selectedDateForSlots, user]);

  // --- Event Handlers --- //

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDateChangeForSlots = (event) => {
    setSelectedDateForSlots(event.target.value);
  };

  const handleAddSlot = async () => {
    if (!newSlotTime || !selectedDateForSlots) return;
    // Basic time format validation (HH:MM)
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newSlotTime)) {
        setErrorSlots('請輸入有效的時間格式 (HH:MM)，例如 09:00 或 14:30。');
        return;
    }

    setLoadingSlots(true); // Use slot loading indicator
    setErrorSlots('');
    try {
      await addDoctorSlot({ date: selectedDateForSlots, time: newSlotTime });
      setNewSlotTime('');
      // Refresh slots for the current date
      fetchSlots(selectedDateForSlots);
    } catch (err) {
      console.error('Failed to add slot:', err);
      setErrorSlots(err.response?.data?.message || err.message || '添加時段失敗。');
      setLoadingSlots(false); // Ensure loading stops on error
    }
  };

  const handleRemoveSlot = async (slotId) => {
    if (!window.confirm('您確定要刪除這個可用時段嗎？')) {
      return;
    }
    setDeletingSlotId(slotId);
    setErrorSlots('');
    try {
      await removeDoctorSlot(slotId);
      // Refresh slots for the current date
      fetchSlots(selectedDateForSlots);
    } catch (err) {
      console.error('Failed to remove slot:', err);
      setErrorSlots(err.response?.data?.message || err.message || '刪除時段失敗。');
    } finally {
      setDeletingSlotId(null);
    }
  };

  const handleBulkGenerate = async (event) => {
    event.preventDefault();
    if (!bulkStartDate || !bulkEndDate || !bulkStartTime || !bulkEndTime || bulkInterval <= 0 || bulkDaysOfWeek.length === 0) {
        setBulkError('請填寫所有必填欄位並確保數值有效。');
        return;
    }
    setBulkLoading(true);
    setBulkError('');
    setBulkSuccess('');
    try {
        const generationData = {
            startDate: bulkStartDate,
            endDate: bulkEndDate,
            startTime: bulkStartTime,
            endTime: bulkEndTime,
            interval: parseInt(bulkInterval, 10),
            daysOfWeek: bulkDaysOfWeek.map(d => parseInt(d, 10)),
        };
        const response = await bulkGenerateDoctorSlots(generationData);
        setBulkSuccess(`成功生成 ${response.data.count || '多個'} 時段！`);
        // Optionally clear form or redirect
    } catch (err) {
        console.error('Bulk generation failed:', err);
        setBulkError(err.response?.data?.message || err.message || '批量生成時段失敗。');
    } finally {
        setBulkLoading(false);
    }
  };

  // --- UI Rendering --- //

  // Filter appointments (example)
  const todayStr = formatDate(new Date());
  const todayAppointments = appointments.filter(app => app.date === todayStr);
  const upcomingAppointments = appointments.filter(app => app.date >= todayStr);

  // Sidebar menu items
  const menuItems = [
    { icon: <DashboardIcon />, label: '儀表板', value: 0 },
    { icon: <CalendarIcon />, label: '時段管理', value: 1 },
    { icon: <PeopleIcon />, label: '預約列表', value: 2 },
    // { icon: <DownloadIcon />, label: '導出數據', value: 3 }, // Future feature
    { icon: <SettingsIcon />, label: '設置', value: 3 }, // Adjusted value
  ];

  // Render dashboard content
  const renderDashboardContent = () => {
    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
    }
    // Display general errors first if any
    if (errorAppointments && tabValue !== 1) { // Show appointment error except on slot tab
        return <Alert severity="error" sx={{ mb: 2 }}>{errorAppointments}</Alert>;
    }
     if (errorSlots && tabValue === 1) { // Show slot error only on slot tab
        return <Alert severity="error" sx={{ mb: 2 }}>{errorSlots}</Alert>;
    }

    switch (tabValue) {
      case 0: // Dashboard Overview
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
              醫生儀表板
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              歡迎回來，{user?.name || user?.username}！管理您的預約和時段。
            </Typography>
            
            {loadingAppointments ? <CircularProgress sx={{my: 2}} /> : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Stat Cards */}
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
                      即將到來 (本月)
                    </Typography>
                    <Typography variant="h4" component="div" color="primary" fontWeight="medium">
                      {upcomingAppointments.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                 <Card sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <CardContent sx={{textAlign: 'center'}}>
                     <Typography color="text.secondary" gutterBottom>
                      管理時段
                    </Typography>
                    <Button 
                        variant="contained"
                        color="secondary"
                        onClick={() => setTabValue(1)} // Switch to Slot Management tab
                        startIcon={<CalendarIcon />}
                        sx={{mt: 1}}
                      >
                        前往管理
                      </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Upcoming Appointments Preview */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, mt: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" component="h3" fontWeight="medium">
                        今日及未來預約 (預覽)
                      </Typography>
                      <Button 
                        onClick={() => setTabValue(2)} // Switch to Appointments List tab
                        color="primary"
                        endIcon={<PeopleIcon />}
                      >
                        查看全部
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    {upcomingAppointments.length === 0 ? (
                        <Typography color="text.secondary">目前沒有即將到來的預約。</Typography>
                    ) : (
                        <List>
                        {upcomingAppointments.slice(0, 5).map((appointment) => (
                            <ListItem
                            key={appointment._id}
                            // Add actions if needed (e.g., view details)
                            sx={{ 
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': {
                                borderBottom: 'none'
                                }
                            }}
                            >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                                {/* Assuming patient info is populated */}
                                {appointment.patient?.name?.charAt(0) || '患'}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                <Typography variant="body1" fontWeight="medium">
                                    {appointment.patient?.name || '患者'} {/* Adjust based on actual data structure */}
                                </Typography>
                                }
                                secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
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
                                    label={appointment.status === 'confirmed' ? '已確認' : (appointment.status === 'cancelled' ? '已取消' : '待確認')} 
                                    color={appointment.status === 'confirmed' ? 'success' : (appointment.status === 'cancelled' ? 'default' : 'warning')} 
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
      case 1: // Slot Management
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
              時段管理
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              管理您的可預約時段。
            </Typography>

            {/* Single Slot Management */}
            <Card sx={{ borderRadius: 2, mt: 3, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                  管理單日可用時段
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <TextField
                        label="選擇日期"
                        type="date"
                        value={selectedDateForSlots}
                        onChange={handleDateChangeForSlots}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{ minWidth: 180 }}
                    />
                     <IconButton onClick={() => fetchSlots(selectedDateForSlots)} aria-label="刷新時段">
                        <RefreshIcon />
                    </IconButton>
                </Box>

                {loadingSlots ? <CircularProgress sx={{my: 2}} /> : (
                    <> 
                    {errorSlots && <Alert severity="error" sx={{ mb: 2 }}>{errorSlots}</Alert>}
                    <Typography variant="subtitle1" sx={{mb: 1}}> {selectedDateForSlots} 的可用時段:</Typography>
                    {slots[selectedDateForSlots] && slots[selectedDateForSlots].length > 0 ? (
                        <List dense>
                            {slots[selectedDateForSlots].map(slot => (
                                <ListItem 
                                    key={slot._id} 
                                    sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
                                    secondaryAction={
                                        <IconButton 
                                            edge="end" 
                                            aria-label="delete slot" 
                                            onClick={() => handleRemoveSlot(slot._id)}
                                            disabled={deletingSlotId === slot._id}
                                            color="error"
                                        >
                                            {deletingSlotId === slot._id ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                                        </IconButton>
                                    }
                                >
                                    <ListItemText primary={slot.time} />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary" sx={{my: 2}}>此日期沒有可用的時段。</Typography>
                    )}
                    </>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{mb: 1}}>新增時段:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        label="時間 (HH:MM)"
                        value={newSlotTime}
                        onChange={(e) => setNewSlotTime(e.target.value)}
                        placeholder="例如 10:30"
                        size="small"
                        sx={{ width: 150 }}
                    />
                    <Button 
                        variant="contained" 
                        onClick={handleAddSlot} 
                        disabled={loadingSlots || !newSlotTime}
                        startIcon={<AddIcon />}
                    >
                        新增
                    </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Bulk Slot Generation */}
            <Card sx={{ borderRadius: 2, mt: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                  批量生成時段
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  為指定日期範圍和星期生成可用時段。
                </Typography>
                {bulkError && <Alert severity="error" sx={{ mb: 2 }}>{bulkError}</Alert>}
                {bulkSuccess && <Alert severity="success" sx={{ mb: 2 }}>{bulkSuccess}</Alert>}
                <Box component="form" onSubmit={handleBulkGenerate}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="開始日期"
                                type="date"
                                value={bulkStartDate}
                                onChange={(e) => setBulkStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="結束日期"
                                type="date"
                                value={bulkEndDate}
                                onChange={(e) => setBulkEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="開始時間 (HH:MM)"
                                type="time"
                                value={bulkStartTime}
                                onChange={(e) => setBulkStartTime(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="結束時間 (HH:MM)"
                                type="time"
                                value={bulkEndTime}
                                onChange={(e) => setBulkEndTime(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="時間間隔 (分鐘)"
                                type="number"
                                value={bulkInterval}
                                onChange={(e) => setBulkInterval(e.target.value)}
                                InputProps={{ inputProps: { min: 1 } }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            {/* Simple Day of Week Selection (Improve with Checkboxes later) */}
                            <TextField
                                label="星期幾 (0-6, 逗號分隔)"
                                value={bulkDaysOfWeek.join(',')}
                                onChange={(e) => setBulkDaysOfWeek(e.target.value.split(',').map(d => d.trim()).filter(d => d !== ''))}
                                placeholder="例如 1,2,3,4,5"
                                fullWidth
                                required
                            />
                             <Typography variant="caption" color="text.secondary">0=週日, 1=週一, ..., 6=週六</Typography>
                        </Grid>
                    </Grid>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        startIcon={bulkLoading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                        disabled={bulkLoading}
                        sx={{ mt: 2 }}
                        >
                        批量生成
                    </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );
      case 2: // Appointments List
        return (
          <Box>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2" fontWeight="medium">
                預約列表
                </Typography>
                <IconButton onClick={fetchAppointments} aria-label="刷新預約">
                    <RefreshIcon />
                </IconButton>
            </Box>
            <Typography variant="body1" color="text.secondary" paragraph>
              查看和管理所有患者預約。
            </Typography>
            
            <Card sx={{ borderRadius: 2, mt: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                  所有預約記錄 (本月)
                </Typography>
                {loadingAppointments ? <CircularProgress sx={{my: 2}} /> : (
                    <> 
                    {errorAppointments && <Alert severity="error" sx={{ mb: 2 }}>{errorAppointments}</Alert>}
                    {appointments.length === 0 ? (
                        <Typography color="text.secondary">本月沒有預約記錄。</Typography>
                    ) : (
                        <List>
                        {appointments.map((appointment) => (
                            <ListItem
                            key={appointment._id}
                            // Add actions if needed (e.g., mark complete, view details)
                            sx={{ 
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': {
                                borderBottom: 'none'
                                }
                            }}
                            >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                                {appointment.patient?.name?.charAt(0) || '患'}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                <Typography variant="body1" fontWeight="medium">
                                    {appointment.patient?.name || '患者'}
                                </Typography>
                                }
                                secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
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
                                    label={appointment.status === 'confirmed' ? '已確認' : (appointment.status === 'cancelled' ? '已取消' : '待確認')} 
                                    color={appointment.status === 'confirmed' ? 'success' : (appointment.status === 'cancelled' ? 'default' : 'warning')} 
                                    variant="outlined"
                                    />
                                </Box>
                                }
                            />
                            </ListItem>
                        ))}
                        </List>
                    )}
                    </>
                )}
              </CardContent>
            </Card>
          </Box>
        );
      case 3: // Settings
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
              設置
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              管理您的帳號信息。
            </Typography>
            
            <Card sx={{ borderRadius: 2, mt: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h3" fontWeight="medium" gutterBottom>
                  個人資料
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  姓名: {user?.name || '未提供'}
                </Typography>
                 <Typography variant="body2" color="text.secondary" paragraph>
                  用戶名/郵箱: {user?.username || '未提供'}
                </Typography>
                 <Typography variant="body2" color="text.secondary" paragraph>
                  角色: {user?.role === 'doctor' ? '醫生' : user?.role}
                </Typography>
                {/* Add button to edit profile if needed */}
              </CardContent>
            </Card>
            {/* Add other settings sections if applicable */}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Tabs
              orientation={isMobile ? "horizontal" : "vertical"}
              variant={isMobile ? "scrollable" : "standard"}
              value={tabValue}
              onChange={handleTabChange}
              aria-label="Doctor dashboard tabs"
              sx={{ borderRight: isMobile ? 0 : 1, borderBottom: isMobile ? 1 : 0, borderColor: 'divider' }}
            >
              {menuItems.map((item) => (
                <Tab 
                  key={item.value} 
                  icon={item.icon} 
                  iconPosition="start" 
                  label={item.label} 
                  value={item.value} 
                  sx={{ justifyContent: 'flex-start', alignItems: 'center', textTransform: 'none', mb: isMobile ? 0 : 1 }} 
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: 2 }}>
            {renderDashboardContent()}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DoctorDashboard;

