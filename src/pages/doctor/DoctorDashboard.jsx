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
  DialogTitle,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Tooltip,
  Snackbar
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
    getSettings,           // Added to get defaultTimeSlots
    updateSettings         // 添加更新設置的API調用
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
  
  // 新增狀態：預設時段列表
  const [defaultTimeSlots, setDefaultTimeSlots] = useState([]); // 系統設置中的預設時段列表
  const [loadingSettings, setLoadingSettings] = useState(false); // 加載設置的狀態
  const [errorSettings, setErrorSettings] = useState(''); // 加載設置的錯誤
  const [settingsUpdateSuccess, setSettingsUpdateSuccess] = useState(false); // 設置更新成功狀態

  // 新增狀態：批量排班
  const [showBulkScheduler, setShowBulkScheduler] = useState(false); // 是否顯示批量排班界面
  const [bulkStartDate, setBulkStartDate] = useState(''); // 批量排班開始日期 YYYY-MM-DD
  const [bulkEndDate, setBulkEndDate] = useState(''); // 批量排班結束日期 YYYY-MM-DD
  const [selectedWeekdays, setSelectedWeekdays] = useState([1,2,3,4,5]); // 選擇的星期 [0=周日, 1=周一, ..., 6=周六]
  const [isBulkScheduling, setIsBulkScheduling] = useState(false); // 批量排班處理中狀態

  // --- Data Fetching --- //

  const fetchAppointments = async () => {
    if (!user) return;
    setLoadingAppointments(true);
    setErrorAppointments('');
    try {
      const response = await getDoctorAppointments(); // Uses the alias to getAllAppointments
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
      fetchSettings(); // 加載系統設置和預設時段
    }
  }, [user, authLoading, currentScheduleDate]); // Depend on currentScheduleDate

  // 新增函數：獲取系統設置中的預設時段
  const fetchSettings = async () => {
    if (!user) return;
    setLoadingSettings(true);
    setErrorSettings('');
    try {
      const response = await getSettings();
      if (response.data && response.data.success && response.data.settings) {
        // 設置預設時段
        setDefaultTimeSlots(response.data.settings.defaultTimeSlots || []);
      } else {
        throw new Error('無法獲取預設時段設置');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setErrorSettings(err.response?.data?.message || err.message || '無法加載系統設置。');
    } finally {
      setLoadingSettings(false);
    }
  };

  // 新增處理程序：移除預設時段
  const handleRemoveDefaultTimeSlot = (slotToRemove) => {
    setDefaultTimeSlots(currentSlots => 
      currentSlots.filter(slot => slot !== slotToRemove)
    );
  };
  
  // 新增處理程序：將預設時段添加到全局設置列表 (用於設置頁面 case 3)
  const handleAddDefaultTimeSlotToSettingsList = (slot) => {
    setDefaultTimeSlots(currentSlots => {
      if (!currentSlots.includes(slot)) {
        return [...currentSlots, slot];
      }
      return currentSlots; // If already exists, do nothing, mirroring the previous conditional logic in onClick
    });
  };

  // 保存預設時段設置
  const handleSaveDefaultTimeSlots = async () => {
    setLoadingSettings(true);
    setErrorSettings('');
    setSettingsUpdateSuccess(false);
    
    try {
      // 獲取當前設置，以保留其他設置字段
      const response = await getSettings();
      if (!response.data || !response.data.success) {
        throw new Error('無法獲取當前設置');
      }
      
      const currentSettings = response.data.settings;
      // 更新預設時段
      const updatedSettings = {
        ...currentSettings,
        defaultTimeSlots: [...defaultTimeSlots]
      };
      
      // 發送更新請求
      const updateResponse = await updateSettings(updatedSettings);
      if (updateResponse.data && updateResponse.data.success) {
        setSettingsUpdateSuccess(true);
        // 3秒後關閉成功提示
        setTimeout(() => setSettingsUpdateSuccess(false), 3000);
      } else {
        throw new Error('設置更新失敗');
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      setErrorSettings(err.response?.data?.message || err.message || '無法更新設置。');
    } finally {
      setLoadingSettings(false);
    }
  };

  // --- Event Handlers --- //

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle clicking a date on the schedule calendar to edit it
  const handleEditDate = (dateStr) => { // dateStr is YYYY-MM-DD
    setEditingDate(dateStr);
    // Initialize availableSlotsForEdit based on current schedule data for that date
    const currentSlots = schedule[dateStr]?.availableSlots || [];
    console.log("編輯日期", dateStr, "當前時段", currentSlots);
    setAvailableSlotsForEdit([...currentSlots]); // Use spread to create a new array
  };
  
  // 新增處理程序：點擊預設時段將其添加到編輯中的時段列表
  const handleAddDefaultTimeSlot = (slot) => {
    console.log("嘗試添加預設時段", slot, "目前時段列表", availableSlotsForEdit);
    // 確保 availableSlotsForEdit 是一個數組
    if (!Array.isArray(availableSlotsForEdit)) {
      console.error("availableSlotsForEdit 不是數組:", availableSlotsForEdit);
      setAvailableSlotsForEdit([slot]);
      return;
    }
    
    // 檢查時段是否已經在編輯列表中
    if (!availableSlotsForEdit.includes(slot)) {
      console.log("添加新時段到列表");
      setAvailableSlotsForEdit(prevSlots => {
        const newSlots = [...prevSlots, slot];
        console.log("更新後的時段列表", newSlots);
        return newSlots;
      });
    } else {
      console.log("時段已存在，不添加");
    }
  };
  
  // Handle adding a new time slot input for the editing date
  const handleAddSlotToEdit = () => {
    console.log("添加空時段");
    // Add an empty string or a default time
    setAvailableSlotsForEdit(prevSlots => [...prevSlots, ""]); 
  };

  // Handle changes in the time slot input fields
  const handleSlotInputChange = (index, value) => {
    console.log("修改時段", index, "為", value);
    const updatedSlots = [...availableSlotsForEdit];
    // Basic validation or formatting can be added here
    updatedSlots[index] = value;
    setAvailableSlotsForEdit(updatedSlots);
  };
  
  // Handle removing a time slot input from the editing date
  const handleRemoveSlotFromEdit = (index) => {
    console.log("嘗試刪除索引", index, "的時段");
    // Ensure availableSlotsForEdit is an array before filtering
    if (!Array.isArray(availableSlotsForEdit)) {
        console.error("handleRemoveSlotFromEdit: availableSlotsForEdit is not an array", availableSlotsForEdit);
        return;
    }
    
    const slotToRemove = availableSlotsForEdit[index];
    console.log("要刪除的時段:", slotToRemove);
    
    setAvailableSlotsForEdit(prevSlots => {
      const newSlots = prevSlots.filter((_, i) => i !== index);
      console.log("刪除後的時段列表", newSlots);
      return newSlots;
    });
  };

  // Handle saving the available slots for the currently editing date
  const handleSaveScheduleForDate = async () => {
    if (!editingDate) return;
    
    // Ensure availableSlotsForEdit is an array before filtering
    if (!Array.isArray(availableSlotsForEdit)) {
        console.error("handleSaveScheduleForDate: availableSlotsForEdit is not an array", availableSlotsForEdit);
        setErrorSchedule("儲存排班時發生內部錯誤 (資料格式錯誤)");
        return;
    }

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
  
  // 新增函數：產生批量排班的目標日期列表
  const generateTargetDates = () => {
    if (!bulkStartDate || !bulkEndDate || selectedWeekdays.length === 0) {
      return [];
    }
    
    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    const targetDates = [];
    
    // 遍歷日期範圍
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // 檢查當前日期的星期是否在選擇的星期中
      const weekday = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
      if (selectedWeekdays.includes(weekday)) {
        // 如果日期符合條件，則添加到目標日期列表
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        targetDates.push(`${year}-${month}-${day}`);
      }
    }
    
    return targetDates;
  };

  // 新增函數：執行批量排班
  const handleBulkScheduleSave = async () => {
    if (!availableSlotsForEdit.length) {
      setErrorSchedule('請先添加至少一個可用時段。');
      return;
    }
    
    const targetDates = generateTargetDates();
    if (targetDates.length === 0) {
      setErrorSchedule('請選擇有效的日期範圍和星期。');
      return;
    }
    
    setIsBulkScheduling(true);
    setErrorSchedule('');
    
    try {
      // 為每個目標日期保存相同的可用時段
      const validSlots = availableSlotsForEdit.filter(slot => slot && /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot));
      validSlots.sort();
      
      // 逐一保存每個日期的排班
      for (const date of targetDates) {
        await saveScheduleForDate(date, validSlots);
      }
      
      // 完成後刷新當前月的排班
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      await fetchSchedule(year, month);
      
      // 重置批量排班狀態
      setShowBulkScheduler(false);
      setErrorSchedule('');
    } catch (err) {
      console.error('批量排班失敗:', err);
      setErrorSchedule(err.response?.data?.message || err.message || '批量設置排班失敗。');
    } finally {
      setIsBulkScheduling(false);
    }
  };

  // 處理星期幾選擇變化
  const handleWeekdayToggle = (day) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
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
                    
                    {/* 預設時段區塊 */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>預設時段</Typography>
                      {loadingSettings ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                      ) : errorSettings ? (
                        <Alert severity="error" sx={{ mb: 1 }}>{errorSettings}</Alert>
                      ) : defaultTimeSlots.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          未設置預設時段。您可以在系統設置中添加預設時段。
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {console.log("顯示預設時段列表", defaultTimeSlots)}
                          {defaultTimeSlots.map((slot, idx) => (
                              <Chip 
                                key={idx}
                                label={slot} 
                                color="primary" 
                                variant="outlined"
                                onClick={() => {
                                  console.log("點擊預設時段Chip:", slot);
                                  handleAddDefaultTimeSlot(slot);
                                }}
                                data-testid={`default-timeslot-${idx}`}
                                aria-label={`添加預設時段${slot}`}
                                sx={{ cursor: 'pointer' }}
                              />
                          ))}
                        </Box>
                      )}
                      <Divider sx={{ my: 2 }} />
                    </Box>
                    
                    {/* 已選時段列表 */}
                    <Typography variant="subtitle1" gutterBottom>已選時段</Typography>
                    {console.log("渲染已選時段列表", availableSlotsForEdit)}
                    {!Array.isArray(availableSlotsForEdit) ? (
                      <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                        錯誤：時段列表不是一個數組。請重新加載頁面。
                      </Typography>
                    ) : availableSlotsForEdit.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        尚未添加任何時段。
                      </Typography>
                    ) : (
                      availableSlotsForEdit.map((slot, index) => (
                         <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <TextField 
                                type="time" 
                                size="small" 
                                value={slot || ""}
                                onChange={(e) => handleSlotInputChange(index, e.target.value)}
                                sx={{ mr: 1 }}
                                aria-label={`時段 ${index + 1}`}
                                inputProps={{
                                  "data-testid": `slot-input-${index}`
                                }}
                            />
                            <IconButton 
                                size="small" 
                                onClick={() => {
                                  console.log("點擊刪除按鈕, 索引:", index);
                                  handleRemoveSlotFromEdit(index);
                                }} 
                                color="error"
                                aria-label={`刪除時段 ${slot || index + 1}`}
                                data-testid={`delete-slot-${index}`}
                            >
                                <DeleteIcon />
                            </IconButton>
                         </Box>
                      ))
                    )}
                    
                    {/* 操作按鈕 */}
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Button startIcon={<AddIcon />} onClick={handleAddSlotToEdit}>
                          添加時段
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={() => setShowBulkScheduler(true)}
                        disabled={availableSlotsForEdit.length === 0}
                      >
                        批量排班
                      </Button>
                      <Box sx={{ flexGrow: 1 }} />
                      <Button 
                        variant="contained" 
                        onClick={handleSaveScheduleForDate} 
                        disabled={loadingSchedule || availableSlotsForEdit.length === 0}
                      >
                          {loadingSchedule ? <CircularProgress size={20}/> : '保存排班'}
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => { 
                          setEditingDate(null); 
                          setAvailableSlotsForEdit([]); 
                          setShowBulkScheduler(false);
                        }} 
                      >
                          取消
                      </Button>
                    </Box>
                 </Paper>
            )}
            
            {/* 批量排班對話框 */}
            <Dialog 
              open={showBulkScheduler && editingDate !== null} 
              onClose={() => setShowBulkScheduler(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>批量排班</DialogTitle>
              <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                  選擇日期範圍和星期，將當前編輯的時段批量應用到所選日期。
                </DialogContentText>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="開始日期"
                      type="date"
                      fullWidth
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="結束日期"
                      type="date"
                      fullWidth
                      value={bulkEndDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>選擇星期</Typography>
                <FormGroup row>
                  {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                    <FormControlLabel
                      key={idx}
                      control={
                        <Checkbox 
                          checked={selectedWeekdays.includes(idx)} 
                          onChange={() => handleWeekdayToggle(idx)}
                        />
                      }
                      label={day}
                    />
                  ))}
                </FormGroup>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>將應用以下時段:</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {availableSlotsForEdit.map((slot, idx) => (
                      <Chip key={idx} label={slot} size="small" />
                    ))}
                  </Stack>
                </Box>
                
                {/* 預覽將應用的日期 */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    將應用到 {generateTargetDates().length} 個日期
                  </Typography>
                  {generateTargetDates().length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      例如: {generateTargetDates().slice(0, 3).join(', ')}
                      {generateTargetDates().length > 3 ? '...' : ''}
                    </Typography>
                  )}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowBulkScheduler(false)}>取消</Button>
                <Button 
                  variant="contained" 
                  onClick={handleBulkScheduleSave}
                  disabled={isBulkScheduling || !bulkStartDate || !bulkEndDate || selectedWeekdays.length === 0}
                >
                  {isBulkScheduling ? <CircularProgress size={24} /> : '批量應用'}
                </Button>
              </DialogActions>
            </Dialog>

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
                    {/* Defensive check: Ensure appointments is an array before mapping */}
                    {!Array.isArray(appointments) ? (
                        <Typography color="text.secondary">預約記錄正在加載或不可用。</Typography>
                    ) : appointments.length === 0 ? (
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
              管理您的帳號信息和系統設置。
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
              </CardContent>
            </Card>
            
            {/* 預設時段設置卡片 */}
            <Card sx={{ borderRadius: 2, mt: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="h3" fontWeight="medium">
                    預設時段管理
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveDefaultTimeSlots}
                    disabled={loadingSettings}
                  >
                    {loadingSettings ? <CircularProgress size={24} /> : '保存變更'}
                  </Button>
                </Box>
                
                {errorSettings && <Alert severity="error" sx={{ mb: 2 }}>{errorSettings}</Alert>}
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  設置常用的預設時段，以便在排班時快速選擇。這些時段會在排班頁面上顯示為可點擊的選項。
                </Typography>

                {/* 一至五服務時段 */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    一至五服務時段
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {['2:00-3:00', '3:30-4:30', '5:00-6:00', '6:30-7:30'].map((slot) => (
                      <Chip 
                        key={slot} 
                        label={slot}
                        onDelete={defaultTimeSlots.includes(slot) ? () => handleRemoveDefaultTimeSlot(slot) : undefined}
                        onClick={() => { // Ensure it only calls if not already included, consistent with how color/onDelete behave
                          if (!defaultTimeSlots.includes(slot)) {
                            handleAddDefaultTimeSlotToSettingsList(slot);
                          }
                        }}
                        color={defaultTimeSlots.includes(slot) ? "primary" : "default"}
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Box>
                
                {/* 週六服務時段 */}
                <Box sx={{ my: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    週六服務時段
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {['10:00-11:00', '11:30-12:30'].map((slot) => (
                      <Chip 
                        key={slot} 
                        label={slot}
                        onDelete={defaultTimeSlots.includes(slot) ? () => handleRemoveDefaultTimeSlot(slot) : undefined}
                        onClick={() => { 
                          if (!defaultTimeSlots.includes(slot)) {
                            handleAddDefaultTimeSlotToSettingsList(slot);
                          }
                        }}
                        color={defaultTimeSlots.includes(slot) ? "primary" : "default"}
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Box>
                
                {/* 下午服務時段 */}
                <Box sx={{ my: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    下午服務時段
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {['2:00-3:00', '3:30-4:30', '5:00-6:00'].map((slot) => (
                      <Chip 
                        key={slot} 
                        label={slot}
                        onDelete={defaultTimeSlots.includes(slot) ? () => handleRemoveDefaultTimeSlot(slot) : undefined}
                        onClick={() => { 
                          if (!defaultTimeSlots.includes(slot)) {
                            handleAddDefaultTimeSlotToSettingsList(slot);
                          }
                        }}
                        color={defaultTimeSlots.includes(slot) ? "primary" : "default"}
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Box>
                
                {/* 其他時段 */}
                <Box sx={{ my: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    其他時段
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((slot) => (
                      <Chip 
                        key={slot} 
                        label={slot}
                        onDelete={defaultTimeSlots.includes(slot) ? () => handleRemoveDefaultTimeSlot(slot) : undefined}
                        onClick={() => { 
                          if (!defaultTimeSlots.includes(slot)) {
                            handleAddDefaultTimeSlotToSettingsList(slot);
                          }
                        }}
                        color={defaultTimeSlots.includes(slot) ? "primary" : "default"}
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Stack>
                </Box>
                
                {/* 當前已選預設時段 */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    當前已選預設時段
                  </Typography>
                  {defaultTimeSlots.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      尚未選擇任何預設時段。
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {defaultTimeSlots.map((slot) => (
                        <Chip 
                          key={slot} 
                          label={slot} 
                          onDelete={() => handleRemoveDefaultTimeSlot(slot)} 
                          color="primary"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* 設置更新成功提示 */}
            <Snackbar 
              open={settingsUpdateSuccess}
              autoHideDuration={3000}
              onClose={() => setSettingsUpdateSuccess(false)}
              message="預設時段設置已成功更新"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              sx={{ 
                '& .MuiSnackbarContent-root': { 
                  bgcolor: 'success.main',
                  color: 'common.white'
                }
              }}
            />
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

