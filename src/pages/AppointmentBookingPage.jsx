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
  CircularProgress
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos, EventAvailable as EventAvailableIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getScheduleForMonth, bookAppointment, formatApiError } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { LoadingIndicator, ErrorAlert } from '../../components/common';


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
    try {
      const response = await getScheduleForMonth(currentYear, currentMonth + 1); // API expects 1-indexed month
      if (response.data && response.data.success) {
        setSchedule(response.data.schedule || {});
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
        setBookingSuccess('預約成功！詳情已發送至您的電子郵件。');
        // Refresh schedule to reflect the booked slot
        fetchSchedule(); 
        // Close dialog after a delay
        setTimeout(() => {
          setBookingDialogOpen(false);
          setSelectedTimeSlot(null); // Reset selection
        }, 2000);
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


  if (authLoading) {
    return <LoadingIndicator message="正在載入用戶資訊..." type="overlay" />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
        預約心理治療
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

        {scheduleError && <ErrorAlert message={scheduleError} onClose={() => setScheduleError('')} sx={{mb:2}} />}

        {/* Calendar Grid */}
        {loadingSchedule ? (
          <LoadingIndicator message="載入排班中..." sx={{my: 4}} />
        ) : (
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
        )}

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
          確認預約資訊
        </DialogTitle>
        <DialogContent dividers sx={{pt: 2}}>
          {bookingSuccess && <Alert severity="success" sx={{ mb: 2 }}>{bookingSuccess}</Alert>}
          {bookingError && <ErrorAlert message={bookingError} onClose={() => setBookingError('')} sx={{ mb: 2 }} />}
          
          {!bookingSuccess && selectedDate && selectedTimeSlot && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  預約: {format(selectedDate, 'yyyy年 M月 d日', { locale: zhTW })} - {selectedTimeSlot}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="姓名"
                  name="patientName"
                  value={bookingDetails.patientName}
                  onChange={handleBookingDetailsChange}
                  fullWidth
                  required
                  margin="dense"
                  disabled={bookingLoading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="電話號碼"
                  name="patientPhone"
                  value={bookingDetails.patientPhone}
                  onChange={handleBookingDetailsChange}
                  fullWidth
                  required
                  margin="dense"
                  disabled={bookingLoading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="電子郵件"
                  name="patientEmail"
                  type="email"
                  value={bookingDetails.patientEmail}
                  onChange={handleBookingDetailsChange}
                  fullWidth
                  required
                  margin="dense"
                  disabled={bookingLoading}
                />
              </Grid>
              {/* 
              // More fields if needed
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" margin="dense">
                  <FormLabel component="legend">是否為初診？</FormLabel>
                  <RadioGroup
                    row
                    name="isNewPatient"
                    value={bookingDetails.isNewPatient}
                    onChange={handleBookingDetailsChange}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label="是" disabled={bookingLoading} />
                    <FormControlLabel value="no" control={<Radio />} label="否" disabled={bookingLoading} />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="出生日期"
                  name="birthDate"
                  type="date"
                  value={bookingDetails.birthDate}
                  onChange={handleBookingDetailsChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  margin="dense"
                  disabled={bookingLoading}
                />
              </Grid>
              <Grid item xs={12}>
                 <FormControl component="fieldset" margin="dense">
                  <FormLabel component="legend">性別</FormLabel>
                  <RadioGroup
                    row
                    name="gender"
                    value={bookingDetails.gender}
                    onChange={handleBookingDetailsChange}
                  >
                    <FormControlLabel value="male" control={<Radio />} label="男" disabled={bookingLoading}/>
                    <FormControlLabel value="female" control={<Radio />} label="女" disabled={bookingLoading}/>
                    <FormControlLabel value="other" control={<Radio />} label="其他" disabled={bookingLoading}/>
                  </RadioGroup>
                </FormControl>
              </Grid>
              */}
              <Grid item xs={12}>
                <TextField
                  label="預約原因 (簡述)"
                  name="appointmentReason"
                  value={bookingDetails.appointmentReason}
                  onChange={handleBookingDetailsChange}
                  fullWidth
                  multiline
                  rows={3}
                  margin="dense"
                  disabled={bookingLoading}
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
                  margin="dense"
                  disabled={bookingLoading}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        {!bookingSuccess && (
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
        )}
      </Dialog>
    </Container>
  );
};

export default AppointmentBookingPage;

