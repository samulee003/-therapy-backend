import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  CircularProgress, 
  Alert, 
  Grid, 
  Button, 
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
  InputLabel,
  MenuItem,
  Select
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { zhTW } from 'date-fns/locale';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import { getScheduleForMonth, bookAppointment } from '../services/api'; // Import API functions (Changed getAvailableSlots to getScheduleForMonth)
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

// Helper function to get days in month
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Helper function to get the first day of the month
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
}

const AppointmentBookingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(AuthContext); // Get user from AuthContext
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({}); // { 'YYYY-MM-DD': ['HH:MM', ...] }
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState(null); // HH:MM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  
  // 新增用於表單模態框的狀態
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [appointmentReason, setAppointmentReason] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  
  // 新增病患資料欄位
  const [patientName, setPatientName] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientBirthday, setPatientBirthday] = useState(null);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [useAccountInfo, setUseAccountInfo] = useState(true);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // Fetch available slots when month changes
  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      setError('');
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots({}); // Clear previous slots
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // API expects 1-12
        
        console.log(`Fetching schedule for ${year}-${month}`);
        const response = await getScheduleForMonth(year, month); // Changed from getAvailableSlots
        console.log('Received schedule response:', response);
        
        // Extract only the available slots for each date from the schedule object
        const slotsData = {};
        if (response.data && response.data.schedule) {
          for (const dateStr in response.data.schedule) {
            const daySchedule = response.data.schedule[dateStr];
            // Ensure availableSlots exists AND is an array
            if (daySchedule && Array.isArray(daySchedule.availableSlots)) {
              slotsData[dateStr] = daySchedule.availableSlots;
            } else if (daySchedule && daySchedule.availableSlots) {
              // Log if availableSlots exists but is not an array
              console.warn(`Received non-array availableSlots for ${dateStr}:`, daySchedule.availableSlots);
              slotsData[dateStr] = []; // Default to empty array
            } else {
              slotsData[dateStr] = []; // Default to empty array if no slots data
            }
          }
        }
        console.log('Processed available slots:', slotsData);
        setAvailableSlots(slotsData); 
      } catch (err) {
        console.error('Failed to fetch available slots:', err);
        setError(err.response?.data?.message || err.message || '無法加載可預約時段，請稍後再試。');
        setAvailableSlots({});
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [currentDate]);

  // Generate calendar days when month or slots change
  useEffect(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ key: `empty-${i}`, day: null, isAvailable: false, dateStr: null });
    }

    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // Check if slots exist and the array is not empty for this date
      const isAvailable = availableSlots[dateStr] && availableSlots[dateStr].length > 0; 
      days.push({ key: dateStr, day, isAvailable, dateStr });
    }
    setCalendarDays(days);
  }, [currentYear, currentMonth, availableSlots]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDateClick = (dateStr) => {
    // Use the isAvailable flag derived from the slots data
    const dayInfo = calendarDays.find(d => d.dateStr === dateStr);
    if (dayInfo && dayInfo.isAvailable) { 
      setSelectedDate(dateStr);
      setSelectedSlot(null); 
      setBookingError('');
      setBookingSuccess('');
    } else {
      // Optionally clear selection if clicking a non-available date
      // setSelectedDate(null);
      // setSelectedSlot(null);
    }
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setBookingError('');
    setBookingSuccess('');
    
    // 設置預設值為目前登入用戶資料
    if (user) {
      setPatientName(user.name || '');
    }
    
    // 打開表單模態框
    setFormModalOpen(true);
  };

  const handleFormClose = () => {
    setFormModalOpen(false);
  };

  const handleSuccessModalClose = () => {
    setSuccessModalOpen(false);
    // 清除預約詳情
    setSelectedSlot(null);
    setAppointmentReason('');
    setAppointmentNotes('');
    setPatientName('');
    setPatientGender('');
    setPatientBirthday(null);
    setIsFirstVisit(true);
    setUseAccountInfo(true);
  };

  // 處理使用帳戶資訊的切換
  const handleUseAccountInfoChange = (event) => {
    const useAccount = event.target.checked;
    setUseAccountInfo(useAccount);
    
    if (useAccount && user) {
      setPatientName(user.name || '');
    } else {
      setPatientName('');
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot || !user) {
      setBookingError('請先選擇日期和時段，並確保您已登入。');
      setFormModalOpen(false);
      return;
    }

    // 驗證病患資料
    if (!patientName) {
      setBookingError('請填寫病患姓名。');
      return;
    }
    if (!patientGender) {
      setBookingError('請選擇病患性別。');
      return;
    }
    if (!patientBirthday) {
      setBookingError('請選擇病患出生日期。');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    try {
      // 格式化生日
      const formattedBirthday = patientBirthday ? 
        `${patientBirthday.getFullYear()}-${String(patientBirthday.getMonth() + 1).padStart(2, '0')}-${String(patientBirthday.getDate()).padStart(2, '0')}` : '';

      const bookingDetails = {
        date: selectedDate,
        time: selectedSlot,
        appointmentReason: appointmentReason,
        notes: appointmentNotes,
        // 預約者資訊 (登入用戶)
        accountName: user?.name,
        accountEmail: user?.username,
        accountPhone: user?.phone,
        // 病患資訊 (可能是登入用戶本人或其他人)
        patientName: patientName,
        patientGender: patientGender,
        patientBirthday: formattedBirthday,
        isFirstVisit: isFirstVisit
      };

      // Basic check for missing account details
      if (!bookingDetails.accountName || !bookingDetails.accountEmail || !bookingDetails.accountPhone) {
        console.error('Missing account data for booking:', { name: user?.name, email: user?.username, phone: user?.phone });
        throw new Error("無法獲取完整的用戶資訊 (姓名/郵箱/電話)，請檢查您的個人資料或重新登入後再試。");
      }

      console.log("Sending booking details:", bookingDetails);
      const response = await bookAppointment(bookingDetails);
      console.log('Booking successful:', response.data);
      
      // 設置詳細的預約信息用於顯示成功訊息
      setAppointmentDetails({
        date: selectedDate,
        time: selectedSlot,
        reason: appointmentReason || '(未提供)',
        notes: appointmentNotes || '(未提供)',
        accountName: user.name,
        accountEmail: user.username,
        accountPhone: user.phone,
        patientName: patientName,
        patientGender: patientGender === 'male' ? '男' : patientGender === 'female' ? '女' : '其他',
        patientBirthday: formattedBirthday,
        isFirstVisit: isFirstVisit ? '是' : '否',
        appointmentId: response.data.appointmentId
      });
      
      setBookingSuccess(`預約成功！您的預約時間是 ${selectedDate} ${selectedSlot}。`);
      setFormModalOpen(false);
      setSuccessModalOpen(true);
      
      // Refresh available slots for the selected date by filtering the booked slot
      setAvailableSlots(prevSlots => {
        const updatedSlotsForDate = Array.isArray(prevSlots[selectedDate]) 
                                    ? prevSlots[selectedDate].filter(s => s !== selectedSlot)
                                    : [];
        return {
          ...prevSlots,
          [selectedDate]: updatedSlotsForDate
        };
      });

    } catch (err) {
      console.error('Booking failed:', err);
      setBookingError(err.response?.data?.message || err.message || '預約失敗，該時段可能已被預約，請重試或選擇其他時段。');
      setFormModalOpen(false);
    } finally {
      setBookingLoading(false);
    }
  };

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: isMobile ? 2 : 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          預約心理諮詢
        </Typography>

        {/* Month Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <IconButton onClick={handlePrevMonth} aria-label="上個月">
            <ArrowBackIosNew />
          </IconButton>
          <Typography variant="h5">
            {`${currentYear}年 ${currentMonth + 1}月`}
          </Typography>
          <IconButton onClick={handleNextMonth} aria-label="下個月">
            <ArrowForwardIos />
          </IconButton>
        </Box>

        {/* Calendar Grid */}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && (
          <Grid container spacing={1}>
            {dayNames.map(name => (
              <Grid item xs={1.71} key={name} sx={{ textAlign: 'center', fontWeight: 'bold', color: 'text.secondary', pb: 1 }}>
                {name}
              </Grid>
            ))}
            {calendarDays.map((dayInfo) => (
              <Grid item xs={1.71} key={dayInfo.key} sx={{ height: isMobile? 60 : 80, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {dayInfo.day && (
                  <Button
                    variant={selectedDate === dayInfo.dateStr ? 'contained' : (dayInfo.isAvailable ? 'outlined' : 'text')}
                    onClick={() => handleDateClick(dayInfo.dateStr)}
                    disabled={!dayInfo.isAvailable}
                    sx={{
                      width: '90%', // Adjust width for spacing
                      height: '90%', // Adjust height for spacing
                      minWidth: 0,
                      padding: 0,
                      fontSize: isMobile ? '0.8rem' : '1rem',
                      border: selectedDate === dayInfo.dateStr ? '' : (dayInfo.isAvailable ? '' : 'none'),
                      backgroundColor: selectedDate === dayInfo.dateStr ? '' : (dayInfo.isAvailable ? 'transparent' : theme.palette.action.disabledBackground),
                      color: selectedDate === dayInfo.dateStr ? '' : (dayInfo.isAvailable ? theme.palette.primary.main : theme.palette.text.disabled),
                      '&:hover': {
                        backgroundColor: dayInfo.isAvailable ? (selectedDate === dayInfo.dateStr ? '' : theme.palette.action.hover) : theme.palette.action.disabledBackground,
                      },
                      borderRadius: '50%' // Make buttons circular
                    }}
                  >
                    {dayInfo.day}
                  </Button>
                )}
              </Grid>
            ))}
          </Grid>
        )}

        {selectedDate && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              {selectedDate} 可預約時段：
            </Typography>
            {/* Check if slots exist and IS an array before mapping */}
            {!Array.isArray(availableSlots[selectedDate]) ? (
                <Typography color="text.secondary">無法加載時段資訊。</Typography>
            ) : availableSlots[selectedDate].length === 0 ? (
              <Typography color="text.secondary">此日期已無可預約時段。</Typography>
            ) : (
              <Grid container spacing={1}>
                {availableSlots[selectedDate].map(slot => (
                  <Grid item key={slot}>
                    <Button
                      variant={selectedSlot === slot ? 'contained' : 'outlined'}
                      onClick={() => handleSlotClick(slot)}
                    >
                      {slot}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* 預約表單模態框 */}
        <Dialog open={formModalOpen} onClose={handleFormClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
            填寫預約詳情
          </DialogTitle>
          <DialogContent sx={{ pt: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              預約時間：{selectedDate} {selectedSlot}
            </Typography>
            
            <Box sx={{ mb: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                病患資料
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={useAccountInfo} 
                    onChange={handleUseAccountInfoChange}
                  />
                }
                label="使用登入帳戶資料"
                sx={{ mb: 2 }}
              />

              <TextField
                margin="dense"
                id="patientName"
                label="病患姓名"
                type="text"
                fullWidth
                variant="outlined"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                sx={{ mb: 2 }}
                disabled={useAccountInfo}
              />
              
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <FormLabel id="gender-label">性別</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="gender-label"
                  name="gender"
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                >
                  <FormControlLabel value="male" control={<Radio />} label="男" />
                  <FormControlLabel value="female" control={<Radio />} label="女" />
                  <FormControlLabel value="other" control={<Radio />} label="其他" />
                </RadioGroup>
              </FormControl>
              
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
                <DatePicker
                  label="出生日期"
                  value={patientBirthday}
                  onChange={(newValue) => setPatientBirthday(newValue)}
                  renderInput={(params) => 
                    <TextField 
                      {...params} 
                      fullWidth 
                      required 
                      sx={{ mb: 2 }}
                    />
                  }
                />
              </LocalizationProvider>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <FormLabel id="visit-type-label">是否為初診</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="visit-type-label"
                  name="visitType"
                  value={isFirstVisit}
                  onChange={(e) => setIsFirstVisit(e.target.value === 'true')}
                >
                  <FormControlLabel value={true} control={<Radio />} label="是" />
                  <FormControlLabel value={false} control={<Radio />} label="否" />
                </RadioGroup>
              </FormControl>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                預約內容
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TextField
                margin="dense"
                id="appointmentReason"
                label="預約原因"
                type="text"
                fullWidth
                variant="outlined"
                value={appointmentReason}
                onChange={(e) => setAppointmentReason(e.target.value)}
                placeholder="例如：情緒困擾、壓力管理、人際關係問題等"
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="dense"
                id="appointmentNotes"
                label="備註"
                type="text"
                fullWidth
                variant="outlined"
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                placeholder="其他需要告知醫生的事項"
                multiline
                rows={4}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleFormClose} color="inherit">取消</Button>
            <Button 
              onClick={handleBooking} 
              variant="contained" 
              color="primary"
              disabled={bookingLoading}
            >
              {bookingLoading ? <CircularProgress size={24} /> : '確認預約'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 預約成功模態框 */}
        <Dialog 
          open={successModalOpen} 
          onClose={handleSuccessModalClose} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: theme.palette.success.main, color: 'white' }}>
            預約成功！
          </DialogTitle>
          <DialogContent>
            <Alert severity="success" sx={{ my: 2 }}>
              您的預約已成功建立，請保存以下預約詳情（可截圖保存）。
            </Alert>
            
            <Card variant="outlined" sx={{ mb: 2, mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  預約詳情
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">預約編號：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.appointmentId || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">預約日期：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.date || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">預約時間：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.time || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">預約者：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.accountName || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">病患姓名：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.patientName || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">病患性別：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.patientGender || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">出生日期：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.patientBirthday || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">是否初診：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.isFirstVisit || '未知'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">預約原因：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.reason || '未提供'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">備註：</Typography>
                    <Typography variant="body1" gutterBottom>{appointmentDetails?.notes || '無'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              請您準時赴約。如需更改或取消預約，請提前聯繫診所或向醫師說明。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleSuccessModalClose} 
              variant="contained" 
              color="primary"
            >
              確定
            </Button>
          </DialogActions>
        </Dialog>

        {/* 顯示錯誤和成功訊息 */}
        {bookingError && <Alert severity="error" sx={{ mt: 2 }}>{bookingError}</Alert>}
        {bookingSuccess && <Alert severity="success" sx={{ mt: 2 }}>{bookingSuccess}</Alert>}
      </Paper>
    </Container>
  );
};

export default AppointmentBookingPage;

