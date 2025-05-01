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
    getDoctorAppointments, // This now points to getAllAppointments
    getScheduleForMonth,   // Use this instead of getDoctorSlots
    saveScheduleForDate,   // Use this instead of addDoctorSlot
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

  // State for schedule (was slots)
  const [schedule, setSchedule] = useState({}); // { 'YYYY-MM-DD': { availableSlots: [...], bookedSlots: {...} }, ... }
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [errorSchedule, setErrorSchedule] = useState('');
  const [currentScheduleDate, setCurrentScheduleDate] = useState(new Date()); // Use Date object for month/year navigation
  const [editingDate, setEditingDate] = useState(null); // YYYY-MM-DD of the date being edited
  const [availableSlotsForEdit, setAvailableSlotsForEdit] = useState([]); // Array of strings like "HH:MM"

  // --- Data Fetching --- //

  const fetchAppointments = async () => {
    if (!user) return;
    setLoadingAppointments(true);
    setErrorAppointments('');
    try {
      const response = await getDoctorAppointments(); // Uses the alias to getAllAppointments
      // Filter appointments on the frontend if needed (e.g., by date range)
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setErrorAppointments(err.response?.data?.message || err.message || '無法加載預約記錄。');
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchSchedule = async (year, month) => {
    if (!user) return;
    setLoadingSchedule(true);
    setErrorSchedule('');
    try {
      const response = await getScheduleForMonth(year, month);
      setSchedule(response.data.schedule || {}); // Backend returns { success: true, schedule: { ... } }
    } catch (err) {
      console.error(`Failed to fetch schedule for ${year}-${month}:`, err);
      setErrorSchedule(err.response?.data?.message || err.message || `無法加載 ${year}年${month}月 的排班。`);
      setSchedule({}); // Clear schedule on error
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Initial fetch and fetch when user changes or month changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchAppointments(); // Fetch all appointments initially
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      fetchSchedule(year, month);
    }
  }, [user, authLoading, currentScheduleDate]); // Depend on currentScheduleDate

  // --- Event Handlers --- //

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle clicking a date on the schedule calendar to edit it
  const handleEditDate = (dateStr) => { // dateStr is YYYY-MM-DD
    setEditingDate(dateStr);
    // Initialize availableSlotsForEdit based on current schedule data for that date
    const currentSlots = schedule[dateStr]?.availableSlots || [];
    setAvailableSlotsForEdit([...currentSlots]); // Use spread to create a new array
  };
  
  // Handle adding a new time slot input for the editing date
  const handleAddSlotToEdit = () => {
    // Add an empty string or a default time
    setAvailableSlotsForEdit([...availableSlotsForEdit, ""]); 
  };

  // Handle changes in the time slot input fields
  const handleSlotInputChange = (index, value) => {
    const updatedSlots = [...availableSlotsForEdit];
    // Basic validation or formatting can be added here
    updatedSlots[index] = value;
    setAvailableSlotsForEdit(updatedSlots);
  };
  
  // Handle removing a time slot input from the editing date
  const handleRemoveSlotFromEdit = (index) => {
    const updatedSlots = availableSlotsForEdit.filter((_, i) => i !== index);
    setAvailableSlotsForEdit(updatedSlots);
  };

  // Handle saving the available slots for the currently editing date
  const handleSaveScheduleForDate = async () => {
    if (!editingDate) return;
    
    // Filter out empty strings and validate time format (HH:MM)
    const validSlots = availableSlotsForEdit.filter(slot => slot && /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot));
    // Optionally sort the slots
    validSlots.sort(); 

    setLoadingSchedule(true); // Indicate loading
    setErrorSchedule('');
    try {
      await saveScheduleForDate(editingDate, validSlots);
      setErrorSchedule(''); // Clear any previous error
      setEditingDate(null); // Close the editor
      setAvailableSlotsForEdit([]);
      // Refresh schedule for the current month
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      fetchSchedule(year, month);
    } catch (err) {
      console.error(`Failed to save schedule for ${editingDate}:`, err);
      setErrorSchedule(err.response?.data?.message || err.message || `保存 ${editingDate} 的排班失敗。`);
      setLoadingSchedule(false); // Stop loading on error
    }
  };
  
  // Navigate schedule month
  const handlePrevMonth = () => {
      setCurrentScheduleDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
      setCurrentScheduleDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  // --- UI Rendering --- //

  // Filter appointments defensively
  const todayStr = formatDate(new Date());
  // Ensure appointments is an array before filtering
  const todayAppointments = Array.isArray(appointments) 
                            ? appointments.filter(app => app.date === todayStr)
                            : []; 
  const upcomingAppointments = Array.isArray(appointments) 
                               ? appointments.filter(app => app.date >= todayStr)
                               : [];

  // Sidebar menu items
  const menuItems = [
    { icon: <DashboardIcon />, label: '儀表板', value: 0 },
    { icon: <CalendarIcon />, label: '排班管理', value: 1 }, // Changed label
    { icon: <PeopleIcon />, label: '預約列表', value: 2 },
    { icon: <SettingsIcon />, label: '設置', value: 3 },
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
     if (errorSchedule && tabValue === 1) { // Show slot error only on slot tab
        return <Alert severity="error" sx={{ mb: 2 }}>{errorSchedule}</Alert>;
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
      case 1: // Schedule Management (Replaces Slot Management)
        const year = currentScheduleDate.getFullYear();
        const month = currentScheduleDate.getMonth() + 1;
        const monthStr = currentScheduleDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Basic calendar rendering (replace with actual calendar component later)
        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon...
        const calendarDays = [];
        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) { calendarDays.push(null); }
        // Add actual days
        for (let day = 1; day <= daysInMonth; day++) { calendarDays.push(day); }

        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
              排班管理 ({monthStr})
            </Typography>
             {/* Month Navigation */} 
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                 <Button onClick={handlePrevMonth}>上個月</Button>
                 <Button onClick={handleNextMonth}>下個月</Button>
            </Box>
            {loadingSchedule && <CircularProgress />} 
            {errorSchedule && <Alert severity="error" sx={{ mb: 2 }}>{errorSchedule}</Alert>}
            
            {/* Basic Calendar Grid (Replace with a proper Calendar component) */} 
            <Grid container spacing={1} sx={{ mb: 3 }}>
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                    <Grid item xs={12/7} key={day} textAlign="center"><Typography variant="caption">{day}</Typography></Grid>
                ))}
                {calendarDays.map((day, index) => {
                    const dateStr = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                    const daySchedule = dateStr ? schedule[dateStr] : null;
                    const hasAvailable = daySchedule?.availableSlots?.length > 0;
                    const hasBooked = daySchedule?.bookedSlots && Object.keys(daySchedule.bookedSlots).length > 0;
                    return (
                        <Grid item xs={12/7} key={index} sx={{ height: 80, border: '1px solid lightgray', p: 0.5 }}>
                        {day && (
                            <Button 
                                fullWidth 
                                variant="outlined" 
                                size="small"
                                onClick={() => handleEditDate(dateStr)}
                                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                            >
                            <Typography variant="body2" component="div">{day}</Typography>
                            {/* Display indicators or slot count */} 
                            {hasAvailable && <Chip size="small" label="可預約" color="success" sx={{mt:0.5}} />} 
                            {hasBooked && <Chip size="small" label="已預約" color="warning" sx={{mt:0.5}} />}
                            </Button>
                        )}
                        </Grid>
                    );
                })}
            </Grid>

            {/* Schedule Editor Dialog/Section */} 
            {editingDate && (
                 <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6">編輯 {editingDate} 的可用時段</Typography>
                    {availableSlotsForEdit.map((slot, index) => (
                         <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <TextField 
                                type="time" 
                                size="small" 
                                value={slot} 
                                onChange={(e) => handleSlotInputChange(index, e.target.value)}
                                sx={{ mr: 1 }}
                            />
                            <IconButton size="small" onClick={() => handleRemoveSlotFromEdit(index)} color="error">
                                <DeleteIcon />
                            </IconButton>
                         </Box>
                    ))}
                    <Button startIcon={<AddIcon />} onClick={handleAddSlotToEdit} sx={{ mr: 1 }}>
                        添加時段
                    </Button>
                    <Button variant="contained" onClick={handleSaveScheduleForDate} disabled={loadingSchedule}>
                        {loadingSchedule ? <CircularProgress size={20}/> : '保存排班'}
                    </Button>
                    <Button variant="outlined" onClick={() => { setEditingDate(null); setAvailableSlotsForEdit([]); }} sx={{ ml: 1 }}>
                        取消
                    </Button>
                 </Paper>
            )}
            
            {/* Removed Bulk Generate Section */} 

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

