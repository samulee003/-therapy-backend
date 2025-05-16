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
  Divider
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos, EventAvailable as EventAvailableIcon, AccessTime as AccessTimeIcon, Screenshot as ScreenshotIcon } from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getScheduleForMonth, bookAppointment, formatApiError } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LoadingIndicator, ErrorAlert, ApiStateHandler } from '../components/common';


const AppointmentBookingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, isLoading: authLoading } = useContext(AuthContext);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

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
      const response = await getScheduleForMonth(currentYear, currentMonth + 1); // API expects 1-indexed month
      if (response.data && response.data.success) {
        setSchedule(response.data.schedule || {});
        setScheduleSuccess(`已成功載入 ${format(currentDate, 'yyyy年 MMMM', { locale: zhTW })} 的排班資料`);
      } else {
        throw new Error('無法獲取排班數據');
      }
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
      const formattedError = err.formatted || formatApiError(err, '獲取排班失敗，請稍後重試。');
      setScheduleError(formattedError.message);
      setSchedule({});
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
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

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setSelectedTimeSlot(null); // Reset time slot when new date is selected
  };

  const handleTimeSlotClick = (slot) => {
    setSelectedTimeSlot(slot);
    setBookingDialogOpen(true); // Open booking dialog when time slot is selected
  };

  const handleBookingDialogClose = () => {
    setBookingDialogOpen(false);
    setBookingError('');
    setBookingSuccess('');
  };

  const handleBookingDetailsChange = (e) => {
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
      // Add other fields if necessary based on backend requirements
      // isNewPatient: bookingDetails.isNewPatient === 'yes',
      // gender: bookingDetails.gender,
      // birthDate: bookingDetails.birthDate ? format(new Date(bookingDetails.birthDate), 'yyyy-MM-dd') : null,
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
      console.error("Failed to book appointment:", err);
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

  const getAvailableSlotsForDate = (dateStr) => {
    const daySchedule = schedule[dateStr];
    if (daySchedule && daySchedule.availableSlots) {
      // Filter out booked slots if necessary, though backend should ideally provide only available ones
      const bookedTimes = daySchedule.bookedSlots ? Object.keys(daySchedule.bookedSlots) : [];
      return daySchedule.availableSlots.filter(slot => !bookedTimes.includes(slot));
    }
    return [];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
        預約心理治療師
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
        請選擇您希望預約的日期和時段。
      </Typography>

      <Paper elevation={3} sx={{ p: isMobile ? 2 : 4, borderRadius: 2 }}>
        {/* Month Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <IconButton onClick={handlePreviousMonth} aria-label="上個月" disabled={loadingSchedule}>
            <ArrowBackIosNew />
          </IconButton>
          <Typography variant="h5" component="div" fontWeight="medium">
            {format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}
          </Typography>
          <IconButton onClick={handleNextMonth} aria-label="下個月" disabled={loadingSchedule}>
            <ArrowForwardIos />
          </IconButton>
        </Box>

        {/* 使用 ApiStateHandler 處理載入狀態 */}
        <ApiStateHandler
          loading={authLoading || loadingSchedule}
          error={scheduleError}
          success={scheduleSuccess}
          loadingMessage={authLoading ? "載入用戶資訊..." : "載入排班中..."}
          onErrorClose={() => setScheduleError('')}
          onSuccessClose={() => setScheduleSuccess('')}
          loadingType="linear"
        >
          {/* Calendar Grid */}
          <Grid container spacing={1}>
            {['日', '一', '二', '三', '四', '五', '六'].map((dayName) => (
              <Grid item xs={12/7} key={dayName} sx={{ textAlign: 'center', fontWeight: 'bold', color: 'text.secondary', py:1 }}>
                {dayName}
              </Grid>
            ))}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <Grid item xs={12/7} key={`empty-${index}`} />
            ))}
            {daysInMonth.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const availableSlots = getAvailableSlotsForDate(dayStr);
              const isSelectable = availableSlots.length > 0 && isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <Grid item xs={12/7} key={dayStr} sx={{ p: 0.5 }}>
                  <Button
                    fullWidth
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => isSelectable && handleDateClick(day)}
                    disabled={!isSelectable}
                    sx={{
                      height: isMobile? 'auto' : 80,
                      minWidth: 'auto',
                      p: isMobile? 1: 1.5,
                      flexDirection: 'column',
                      borderColor: isSelected ? 'primary.main' : (isSameDay(day, new Date()) ? 'primary.light' : 'divider'),
                      bgcolor: isSelected ? 'primary.main' : (isSelectable ? 'background.paper' : 'action.disabledBackground'),
                      color: isSelected ? 'common.white' : (isSelectable ? 'text.primary' : 'text.disabled'),
                      '&:hover': {
                        bgcolor: isSelectable ? (isSelected? 'primary.dark' : 'primary.lighter') : undefined,
                      },
                    }}
                  >
                    <Typography variant="body1" fontWeight={isSelected ? 'bold' : 'normal'}>
                      {format(day, 'd')}
                    </Typography>
                    {isSelectable && (
                       <Chip label={`${availableSlots.length} 時段`} size="small" sx={{mt:0.5, bgcolor: isSelected? 'primary.dark' : 'secondary.lighter', color: isSelected? 'common.white' : 'secondary.darker'}} />
                    )}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </ApiStateHandler>

        {/* Available Time Slots */}
        {selectedDate && !loadingSchedule && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom fontWeight="medium">
              {format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW })} 可用時段:
            </Typography>
            {getAvailableSlotsForDate(format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
              <Typography color="text.secondary">此日期已無可用時段。</Typography>
            ) : (
              <Grid container spacing={1}>
                {getAvailableSlotsForDate(format(selectedDate, 'yyyy-MM-dd')).map((slot) => (
                  <Grid item key={slot} xs={6} sm={4} md={3} lg={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      onClick={() => handleTimeSlotClick(slot)}
                      startIcon={<AccessTimeIcon />}
                      sx={{
                        bgcolor: selectedTimeSlot === slot ? 'secondary.dark' : 'secondary.main',
                        '&:hover': { bgcolor: 'secondary.dark' },
                      }}
                    >
                      {slot}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={handleBookingDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'common.white' }}>
          {bookingSuccess ? "預約成功" : "確認預約資訊"}
        </DialogTitle>
        <DialogContent dividers sx={{pt: 2}}>
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
                  <Typography variant="h6" gutterBottom>
                    預約: {format(selectedDate, 'yyyy年 M月 d日', { locale: zhTW })} - {selectedTimeSlot}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>個人資料</Typography>
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
                    size="medium"  
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
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
                    size="medium"
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
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
                    size="medium"
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>就診資訊</Typography>
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
                    rows={3}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
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
                    rows={2}
                    margin="normal"
                    disabled={bookingLoading}
                    InputLabelProps={{
                      shrink: true,
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
                <Paper variant="outlined" sx={{ p: 2, my: 2, textAlign: 'left', display: 'inline-block' }}>
                  {selectedDate && (
                    <Typography variant="body1" gutterBottom>
                      <strong>日期：</strong> {format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW })}
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
                  {bookingDetails.appointmentReason && (
                    <Typography variant="body1" gutterBottom>
                      <strong>預約原因：</strong> {bookingDetails.appointmentReason}
                    </Typography>
                  )}
                </Paper>
                <ScreenshotIcon color="primary" sx={{ fontSize: 60, mb: 1, mt: 3 }} />
                <DialogContentText>
                  請截圖保存此預約資訊。此截圖將作為您的預約憑證，請在就診時出示。
                </DialogContentText>
              </Box>
            )}
          </ApiStateHandler>
        </DialogContent>
        {!bookingSuccess ? (
          <DialogActions sx={{p:2}}>
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
          <DialogActions sx={{p:2}}>
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

