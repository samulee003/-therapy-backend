import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  useTheme,
  useMediaQuery,
  Alert,
  Chip,
  CircularProgress,
  DialogContentText,
  Divider,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import {
  ArrowBackIosNew,
  ArrowForwardIos,
  EventAvailable as EventAvailableIcon,
  AccessTime as AccessTimeIcon,
  Screenshot as ScreenshotIcon,
} from '@mui/icons-material';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getScheduleForMonth, bookAppointment, formatApiError, getDoctors } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LoadingIndicator, ErrorAlert, ApiStateHandler } from '../components/common';

const AppointmentBookingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isLoading: authLoading } = useContext(AuthContext);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  // 治療師列表狀態
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState('');

  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    patientName: user?.name || '',
    patientPhone: user?.phone || '',
    patientEmail: user?.username || '', // Assuming username is email
    appointmentReason: '',
    notes: '',
    isNewPatient: 'yes',
    gender: '',
    birthDate: '',
    doctorId: '', // 添加治療師ID欄位
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    setScheduleError('');
    setScheduleSuccess('');
    try {
      console.log(`開始獲取排班數據: 年=${currentYear}, 月=${currentMonth + 1}`);

      const response = await getScheduleForMonth(currentYear, currentMonth + 1); // API expects 1-indexed month
      console.log('排班數據回應:', response.data);

      if (response.data && response.data.success) {
        const scheduleData = response.data.schedule || {};
        console.log('獲取到的排班數據:', scheduleData);
        setSchedule(scheduleData);
        setScheduleSuccess(
          `已成功載入 ${format(currentDate, 'yyyy年 MMMM', { locale: zhTW })} 的排班資料`
        );
      } else {
        console.warn('API 回應格式不符合預期:', response.data);
        throw new Error('無法獲取排班數據');
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);

      // 添加詳細的錯誤日誌
      const errorDetails = {
        message: err.message,
        response: err.response
          ? {
              status: err.response.status,
              data: err.response.data,
            }
          : '無回應',
        request: err.request ? '請求已發送但無回應' : '請求未發送',
        config: err.config
          ? {
              url: err.config.url,
              method: err.config.method,
              baseURL: err.config.baseURL,
            }
          : '無配置',
      };

      console.error('獲取排班錯誤詳情:', errorDetails);

      const formattedError = err.formatted || formatApiError(err, '獲取排班失敗，請稍後重試。');
      setScheduleError(formattedError.message);
      setSchedule({});
    } finally {
      setLoadingSchedule(false);
    }
  };

  // 獲取治療師列表的函數
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    setDoctorsError('');
    try {
      const response = await getDoctors();
      if (response.data && response.data.success) {
        setDoctors(response.data.doctors || []);
      } else {
        throw new Error('無法獲取治療師列表');
      }
    } catch (err) {
      console.error('獲取治療師列表失敗:', err);
      const formattedError = err.formatted || formatApiError(err, '無法獲取治療師列表，請稍後重試。');
      setDoctorsError(formattedError.message);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchDoctors(); // 獲取治療師列表
  }, [currentDate]);

  // Update form with user data when user context changes
  useEffect(() => {
    if (user) {
      setBookingDetails(prev => ({
        ...prev,
        patientName: user.name || '',
        patientPhone: user.phone || '',
        patientEmail: user.username || '',
      }));
    }
  }, [user]);

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };

  const handleDateClick = day => {
    setSelectedDate(day);
    setSelectedTimeSlot(null); // Reset time slot when new date is selected
  };

  const handleTimeSlotClick = slot => {
    setSelectedTimeSlot(slot.time);
    // 如果時段包含治療師信息，自動設置治療師
    if (slot.doctorId) {
      setBookingDetails({
        ...bookingDetails,
        doctorId: slot.doctorId.toString(),
      });
    }
    setBookingDialogOpen(true);
  };

  const handleBookingDialogClose = () => {
    setBookingDialogOpen(false);
    setBookingError('');
    setBookingSuccess('');
  };

  const handleBookingDetailsChange = e => {
    const { name, value } = e.target;
    setBookingDetails({
      ...bookingDetails,
      [name]: value,
    });
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      setBookingError('請選擇日期和時段。');
      return;
    }
    if (!user) {
      setBookingError('請先登入才能預約。');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    const appointmentData = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTimeSlot,
      patientId: user.id,
      patientName: bookingDetails.patientName,
      patientPhone: bookingDetails.patientPhone,
      patientEmail: bookingDetails.patientEmail,
      appointmentReason: bookingDetails.appointmentReason,
      notes: bookingDetails.notes,
      doctorId: bookingDetails.doctorId || null, // 添加治療師ID到預約數據
    };

    try {
      const response = await bookAppointment(appointmentData);
      if (response.data && response.data.success) {
        setBookingSuccess('預約成功！請截圖保存此預約資訊作為憑證。');
        // Refresh schedule to reflect the booked slot
        fetchSchedule();
      } else {
        throw new Error(response.data?.message || '預約失敗。');
      }
    } catch (err) {
      console.error('Failed to book appointment:', err);
      const formattedError = err.formatted || formatApiError(err, '預約失敗，請稍後重試。');
      setBookingError(formattedError.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayOfWeek = getDay(monthStart); // 0 (Sunday) to 6 (Saturday)

  const getAvailableSlotsForDate = dateStr => {
    const daySchedule = schedule[dateStr];
    // 判斷是否是新的數據格式（包含多個治療師）
    if (daySchedule && daySchedule.doctors) {
      // 依據目前是否選擇了治療師決定顯示哪些時段
      if (bookingDetails.doctorId) {
        // 只顯示選定治療師的時段
        const selectedDoctor = daySchedule.doctors.find(
          doc => doc.doctorId === parseInt(bookingDetails.doctorId)
        );
        if (selectedDoctor) {
          const bookedTimes = selectedDoctor.bookedSlots
            ? Object.keys(selectedDoctor.bookedSlots)
            : [];
          return selectedDoctor.availableSlots
            .filter(slot => !bookedTimes.includes(slot))
            .map(slot => ({
              time: slot,
              doctorId: selectedDoctor.doctorId,
              doctorName: selectedDoctor.doctorName,
            }));
        }
        return [];
      } else {
        // 顯示所有治療師的時段（打平列表）
        let allSlots = [];
        daySchedule.doctors.forEach(doctor => {
          const bookedTimes = doctor.bookedSlots ? Object.keys(doctor.bookedSlots) : [];
          const availableSlots = doctor.availableSlots
            .filter(slot => !bookedTimes.includes(slot))
            .map(slot => ({
              time: slot,
              doctorId: doctor.doctorId,
              doctorName: doctor.doctorName,
            }));
          allSlots = [...allSlots, ...availableSlots];
        });
        return allSlots;
      }
    } else if (daySchedule && daySchedule.availableSlots) {
      // 舊的數據格式，向後兼容
      const bookedTimes = daySchedule.bookedSlots ? Object.keys(daySchedule.bookedSlots) : [];
      return daySchedule.availableSlots
        .filter(slot => !bookedTimes.includes(slot))
        .map(slot => ({ time: slot }));
    }
    return [];
  };

  // 選擇治療師的處理函數
  const handleDoctorChange = doctorId => {
    setBookingDetails({
      ...bookingDetails,
      doctorId: doctorId,
    });
    // 重置選中的時段，因為治療師變了，可用時段也會變
    setSelectedTimeSlot(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom 
        fontWeight="bold" 
        color="primary"
        sx={{ mt: isMobile ? 1 : 0 }}
      >
        預約心理治療師
      </Typography>
      <Typography 
        variant="body1" 
        color="text.secondary" 
        paragraph 
        sx={{ mb: isMobile ? 2 : 4 }}
      >
        請選擇您希望預約的日期和時段。
      </Typography>

      {/* 顯示治療師選擇 */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: isMobile ? 2 : 4, 
          borderRadius: 2, 
          mb: isMobile ? 2 : 3,
          width: '100%',
          overflowX: isMobile ? 'auto' : 'visible'
        }}
      >
        <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
          選擇心理治療師
        </Typography>
        <ApiStateHandler
          loading={loadingDoctors}
          error={doctorsError}
          success=""
          loadingMessage="載入治療師列表..."
          onErrorClose={() => setDoctorsError('')}
          loadingType="inline"
        >
          <Grid container spacing={isMobile ? 1 : 2}>
            {doctors
              .filter(doctor => doctor.name !== "Dr. Demo") // 過濾掉 Dr. Demo
              .map(doctor => (
              <Grid item key={doctor.id} xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant={
                    bookingDetails.doctorId === doctor.id.toString() ? 'contained' : 'outlined'
                  }
                  onClick={() => handleDoctorChange(doctor.id.toString())}
                  sx={{
                    py: isMobile ? 1.5 : 2,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    bgcolor:
                      bookingDetails.doctorId === doctor.id.toString()
                        ? 'primary.main'
                        : 'background.paper',
                    color:
                      bookingDetails.doctorId === doctor.id.toString()
                        ? 'common.white'
                        : 'text.primary',
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {doctor.name}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>
        </ApiStateHandler>
      </Paper>

      <Paper elevation={3} sx={{ p: isMobile ? 2 : 4, borderRadius: 2 }}>
        {/* Month Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <IconButton onClick={handlePreviousMonth} aria-label="上個月" disabled={loadingSchedule} size={isMobile ? "small" : "medium"}>
            <ArrowBackIosNew fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h5"} component="div" fontWeight="medium">
            {format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}
          </Typography>
          <IconButton onClick={handleNextMonth} aria-label="下個月" disabled={loadingSchedule} size={isMobile ? "small" : "medium"}>
            <ArrowForwardIos fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Box>

        {/* 使用 ApiStateHandler 處理載入狀態 */}
        <ApiStateHandler
          loading={authLoading || loadingSchedule}
          error={scheduleError}
          success={scheduleSuccess}
          loadingMessage={authLoading ? '載入用戶資訊...' : '載入排班中...'}
          onErrorClose={() => setScheduleError('')}
          onSuccessClose={() => setScheduleSuccess('')}
          loadingType="linear"
        >
          {/* Calendar Grid */}
          <Grid container spacing={isMobile ? 0.5 : 1}>
            {['日', '一', '二', '三', '四', '五', '六'].map(dayName => (
              <Grid
                item
                xs={12 / 7}
                key={dayName}
                sx={{ 
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  color: 'text.secondary', 
                  py: isMobile ? 0.5 : 1,
                  fontSize: isMobile ? '0.8rem' : 'inherit'
                }}
              >
                {dayName}
              </Grid>
            ))}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <Grid item xs={12 / 7} key={`empty-${index}`} />
            ))}
            {daysInMonth.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const availableSlots = getAvailableSlotsForDate(dayStr);
              const isSelectable = availableSlots.length > 0 && isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <Grid item xs={12 / 7} key={dayStr} sx={{ p: isMobile ? 0.3 : 0.5 }}>
                  <Button
                    fullWidth
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => isSelectable && handleDateClick(day)}
                    disabled={!isSelectable}
                    sx={{
                      height: isMobile ? 50 : 80,
                      minWidth: 'auto',
                      p: isMobile ? 0.5 : 1.5,
                      flexDirection: 'column',
                      borderColor: isSelected
                        ? 'primary.main'
                        : isSameDay(day, new Date())
                          ? 'primary.light'
                          : 'divider',
                      bgcolor: isSelected
                        ? 'primary.main'
                        : isSelectable
                          ? 'background.paper'
                          : 'action.disabledBackground',
                      color: isSelected
                        ? 'common.white'
                        : isSelectable
                          ? 'text.primary'
                          : 'text.disabled',
                      '&:hover': {
                        bgcolor: isSelectable
                          ? isSelected
                            ? 'primary.dark'
                            : 'primary.lighter'
                          : undefined,
                      },
                      fontSize: isMobile ? '0.75rem' : 'inherit'
                    }}
                  >
                    <Typography 
                      variant={isMobile ? "body2" : "body1"} 
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {format(day, 'd')}
                    </Typography>
                    {isSelectable && (
                      <Chip
                        label={`${availableSlots.length} 時段`}
                        size="small"
                        sx={{
                          mt: 0.5,
                          height: isMobile ? 16 : 24,
                          fontSize: isMobile ? '0.6rem' : '0.75rem',
                          bgcolor: isSelected ? 'primary.dark' : 'secondary.lighter',
                          color: isSelected ? 'common.white' : 'secondary.darker',
                        }}
                      />
                    )}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </ApiStateHandler>

        {/* Available Time Slots */}
        {selectedDate && !loadingSchedule && (
          <Box mt={isMobile ? 2 : 4}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight="medium">
              {format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW })} 可用時段:
            </Typography>
            {getAvailableSlotsForDate(format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
              <Typography color="text.secondary">此日期已無可用時段。</Typography>
            ) : (
              <Grid container spacing={isMobile ? 0.5 : 1}>
                {getAvailableSlotsForDate(format(selectedDate, 'yyyy-MM-dd')).map(slot => (
                  <Grid
                    item
                    key={`${slot.time}-${slot.doctorId || 'unknown'}`}
                    xs={6}
                    sm={4}
                    md={3}
                    lg={2}
                  >
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      onClick={() => handleTimeSlotClick(slot)}
                      startIcon={isMobile ? null : <AccessTimeIcon />}
                      sx={{
                        py: isMobile ? 0.75 : 1,
                        px: isMobile ? 1 : 2,
                        bgcolor:
                          selectedTimeSlot === slot.time ? 'secondary.dark' : 'secondary.main',
                        '&:hover': { bgcolor: 'secondary.dark' },
                        fontSize: isMobile ? '0.75rem' : 'inherit'
                      }}
                    >
                      {slot.time}
                      {/* 只有在未指定治療師ID時才顯示治療師姓名 */}
                      {!bookingDetails.doctorId && slot.doctorName && (
                        <Typography
                          variant="caption"
                          sx={{ 
                            display: 'block', 
                            width: '100%', 
                            textAlign: 'center', 
                            mt: 0.5,
                            fontSize: isMobile ? '0.6rem' : 'inherit'
                          }}
                        >
                          {slot.doctorName}
                        </Typography>
                      )}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* Booking Dialog */}
      <Dialog 
        open={bookingDialogOpen} 
        onClose={handleBookingDialogClose} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white' }}>
          {bookingSuccess ? '預約成功' : '確認預約資訊'}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <ApiStateHandler
            loading={bookingLoading}
            error={bookingError}
            success={bookingSuccess}
            loadingMessage="處理預約中..."
            onErrorClose={() => setBookingError('')}
            onSuccessClose={() => setBookingSuccess('')}
            loadingType="inline"
          >
            {!bookingSuccess && selectedDate && selectedTimeSlot && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                    預約: {format(selectedDate, 'yyyy年 M月 d日', { locale: zhTW })} -{' '}
                    {selectedTimeSlot}
                  </Typography>
                  {bookingDetails.doctorId &&
                    doctors.find(d => d.id === parseInt(bookingDetails.doctorId)) && (
                      <Typography
                        variant="subtitle1"
                        color="primary.main"
                        fontWeight="medium"
                        gutterBottom
                      >
                        心理治療師: {doctors.find(d => d.id === parseInt(bookingDetails.doctorId)).name}
                      </Typography>
                    )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    個人資料
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="姓名"
                    name="patientName"
                    value={bookingDetails.patientName}
                    onChange={handleBookingDetailsChange}
                    fullWidth
                    required
                    size={isMobile ? "small" : "medium"}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      style: {
                        paddingTop: isMobile ? '4px' : '8px',
                        paddingBottom: isMobile ? '4px' : '8px',
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="電話號碼"
                    name="patientPhone"
                    value={bookingDetails.patientPhone}
                    onChange={handleBookingDetailsChange}
                    fullWidth
                    required
                    size={isMobile ? "small" : "medium"}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      style: {
                        paddingTop: isMobile ? '4px' : '8px',
                        paddingBottom: isMobile ? '4px' : '8px',
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="電子郵件"
                    name="patientEmail"
                    type="email"
                    value={bookingDetails.patientEmail}
                    onChange={handleBookingDetailsChange}
                    fullWidth
                    required
                    size={isMobile ? "small" : "medium"}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      style: {
                        paddingTop: isMobile ? '4px' : '8px',
                        paddingBottom: isMobile ? '4px' : '8px',
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                    就診資訊
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="預約原因 (簡述)"
                    name="appointmentReason"
                    value={bookingDetails.appointmentReason}
                    onChange={handleBookingDetailsChange}
                    fullWidth
                    multiline
                    rows={isMobile ? 2 : 3}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      style: {
                        paddingTop: isMobile ? '4px' : '8px',
                        paddingBottom: isMobile ? '4px' : '8px',
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="備註 (選填)"
                    name="notes"
                    value={bookingDetails.notes}
                    onChange={handleBookingDetailsChange}
                    fullWidth
                    multiline
                    rows={isMobile ? 2 : 2}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      style: {
                        paddingTop: isMobile ? '4px' : '8px',
                        paddingBottom: isMobile ? '4px' : '8px',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            )}

            {bookingSuccess && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <DialogContentText sx={{ mb: 2, fontWeight: 'medium' }}>
                  以下是您的預約摘要：
                </DialogContentText>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, my: 2, textAlign: 'left', display: 'inline-block', width: isMobile ? '100%' : 'auto' }}
                >
                  {selectedDate && (
                    <Typography variant="body1" gutterBottom>
                      <strong>日期：</strong>{' '}
                      {format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW })}
                    </Typography>
                  )}
                  {selectedTimeSlot && (
                    <Typography variant="body1" gutterBottom>
                      <strong>時間：</strong> {selectedTimeSlot}
                    </Typography>
                  )}
                  <Typography variant="body1" gutterBottom>
                    <strong>姓名：</strong> {bookingDetails.patientName}
                  </Typography>
                  {bookingDetails.doctorId &&
                    doctors.find(d => d.id === parseInt(bookingDetails.doctorId)) && (
                      <Typography variant="body1" gutterBottom>
                        <strong>心理治療師：</strong>{' '}
                        {doctors.find(d => d.id === parseInt(bookingDetails.doctorId)).name}
                      </Typography>
                    )}
                  {bookingDetails.appointmentReason && (
                    <Typography variant="body1" gutterBottom>
                      <strong>預約原因：</strong> {bookingDetails.appointmentReason}
                    </Typography>
                  )}
                </Paper>
                <ScreenshotIcon color="primary" sx={{ fontSize: isMobile ? 40 : 60, mb: 1, mt: 3 }} />
                <DialogContentText>
                  請截圖保存此預約資訊。此截圖將作為您的預約憑證，請在就診時出示。
                </DialogContentText>
              </Box>
            )}
          </ApiStateHandler>
        </DialogContent>
        {!bookingSuccess ? (
          <DialogActions sx={{ p: isMobile ? 1.5 : 2 }}>
            <Button onClick={handleBookingDialogClose} disabled={bookingLoading}>
              取消
            </Button>
            <Button
              onClick={handleBookingSubmit}
              variant="contained"
              color="primary"
              disabled={bookingLoading}
              startIcon={bookingLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {bookingLoading ? '處理中...' : '確認預約'}
            </Button>
          </DialogActions>
        ) : (
          <DialogActions sx={{ p: isMobile ? 1.5 : 2 }}>
            <Button onClick={handleBookingDialogClose} variant="outlined">
              關閉
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Container>
  );
};

export default AppointmentBookingPage;
