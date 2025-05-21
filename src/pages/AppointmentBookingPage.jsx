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
  SwipeableDrawer,
  Tooltip
} from '@mui/material';
import {
  ArrowBackIosNew,
  ArrowForwardIos,
  EventAvailable as EventAvailableIcon,
  AccessTime as AccessTimeIcon,
  Screenshot as ScreenshotIcon,
  CalendarMonth as CalendarMonthIcon,
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

// Helper functions for time conversion (copied from ScheduleManager.jsx)
const timeToMinutes = timeStr => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    console.warn(`Invalid time string for timeToMinutes: ${timeStr}`);
    return 0; // 或者拋出錯誤，或者返回一個標記無效的值
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = totalMinutes => {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes) || totalMinutes < 0) {
    console.warn(`Invalid totalMinutes for minutesToTime: ${totalMinutes}`);
    return '00:00'; // 或者拋出錯誤
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

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
      console.log(`開始獲取排班數據: 年=${currentYear}, 月=${currentMonth + 1}, 治療師ID=${bookingDetails.doctorId || '所有治療師'}`);

      // API 期望1-indexed month。如果選擇了醫生，則傳遞 doctorId。
      const doctorIdToFetch = bookingDetails.doctorId || null;
      const response = await getScheduleForMonth(currentYear, currentMonth + 1, doctorIdToFetch);
      console.log('排班數據 API 回應:', response);

      // 修改：直接處理 response.data (假設它就是後端 scheduleController 回傳的 JSON)
      // 後端 scheduleController.getSchedules 回傳的結構是 { schedules: [...] } 或 { schedule: {date: {...}} } (取決於是否有doctorId)
      // 我們需要將 schedules 陣列 (如果存在) 轉換為前端期望的按日期聚合的 scheduleData 物件結構
      let processedScheduleData = {};
      if (response && response.data) {
        if (response.data.schedules && Array.isArray(response.data.schedules)) {
          // 這是從後端獲取的多個（或單個）醫生的扁平化排班記錄列表
          console.log('收到的 schedules 陣列:', response.data.schedules);
          response.data.schedules.forEach(item => {
            const dateStr = item.date; // 假設 item.date 是 'YYYY-MM-DD'
            if (!processedScheduleData[dateStr]) {
              processedScheduleData[dateStr] = { doctors: [], isOverallRestDay: true }; // 初始化日期條目
            }

            let doctorSlots = [];
            if (item.defined_slots && Array.isArray(item.defined_slots) && item.defined_slots.length > 0) {
              doctorSlots = [...item.defined_slots].sort();
            } else if (!item.is_rest_day && item.start_time && item.end_time && item.slot_duration) {
              const startMinutes = timeToMinutes(item.start_time);
              const endMinutes = timeToMinutes(item.end_time);
              for (let i = startMinutes; i < endMinutes; i += item.slot_duration) {
                doctorSlots.push(minutesToTime(i));
              }
            }
            
            processedScheduleData[dateStr].doctors.push({
              doctorId: item.doctor_id,
              doctorName: item.doctor_name, // 假設後端會join user表得到醫生名字
              availableSlots: doctorSlots,
              definedSlots: item.defined_slots && Array.isArray(item.defined_slots) ? [...item.defined_slots].sort() : null,
              isRestDay: item.is_rest_day,
              bookedSlots: item.booked_slots || {},
              // 可以加入原始的 start_time, end_time, slot_duration 如果需要
              startTime: item.start_time,
              endTime: item.end_time,
              slotDuration: item.slot_duration
            });
            // 如果此日期下有任何一個醫生不是休息日，則該日期總體不視為休息日 (用於日曆顯示可選中狀態)
            if (!item.is_rest_day && doctorSlots.length > 0) {
              processedScheduleData[dateStr].isOverallRestDay = false;
            }
          });
          console.log('轉換後的 processedScheduleData (from schedules array):', processedScheduleData);
        } else if (response.data.schedule && typeof response.data.schedule === 'object') {
          // 這可能是後端已經聚合好的數據 (類似舊格式，或特定醫生的排班)
          // 但我們上面的轉換邏輯是更通用的，能處理多醫生數據
          // 為保持一致，如果直接收到 schedule object，也嘗試按新結構適配或直接使用
          // 但優先採用上面的轉換邏輯，如果後端返回 schedules 陣列
          console.log('收到已聚合的 schedule 物件:', response.data.schedule);
          processedScheduleData = response.data.schedule; // 假設其結構已符合前端期望
                                                      // 或者需要進一步轉換 response.data.schedule 的內部結構
        } else {
           console.warn('API 回應數據格式不符合預期 (無 schedules 陣列或 schedule 物件):', response.data);
           // 即使這樣，也設置為空對象，避免 undefined 錯誤
        }
        setSchedule(processedScheduleData);
        setScheduleSuccess(
          `已成功載入 ${format(currentDate, 'yyyy年 MMMM', { locale: zhTW })} 的排班資料`
        );

      } else {
        console.warn('API 回應無效或無數據:', response);
        throw new Error('無法獲取排班數據，回應無效。');
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
      if (response && response.data) {
        const doctorsData = Array.isArray(response.data) ? response.data : response.data.doctors;
        if (Array.isArray(doctorsData)) {
          setDoctors(doctorsData);
        } else {
          console.warn('獲取治療師列表成功，但數據格式非預期陣列:', response.data);
          setDoctors([]);
        }
      } else {
        throw new Error('無法獲取治療師列表，回應無效。');
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
          let bookedTimes = [];
          if (selectedDoctor.bookedSlots) {
            if (Array.isArray(selectedDoctor.bookedSlots)) {
              // Handles case where bookedSlots is an array of time strings, e.g., ["14:00", "15:30"]
              bookedTimes = selectedDoctor.bookedSlots;
            } else if (typeof selectedDoctor.bookedSlots === 'object' && selectedDoctor.bookedSlots !== null) {
              // Handles case where bookedSlots is an object, e.g., {"14:00": true, "15:30": {}}
              bookedTimes = Object.keys(selectedDoctor.bookedSlots);
            }
          }
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
          let bookedTimes = [];
          if (doctor.bookedSlots) {
            if (Array.isArray(doctor.bookedSlots)) {
              // Handles case where bookedSlots is an array of time strings
              bookedTimes = doctor.bookedSlots;
            } else if (typeof doctor.bookedSlots === 'object' && doctor.bookedSlots !== null) {
              // Handles case where bookedSlots is an object
              bookedTimes = Object.keys(doctor.bookedSlots);
            }
          }
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
      let bookedTimes = [];
      if (daySchedule.bookedSlots) {
        if (Array.isArray(daySchedule.bookedSlots)) {
          bookedTimes = daySchedule.bookedSlots;
        } else if (typeof daySchedule.bookedSlots === 'object' && daySchedule.bookedSlots !== null) {
          bookedTimes = Object.keys(daySchedule.bookedSlots);
        }
      }
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
    <Container maxWidth="lg" sx={{ py: isMobile ? 1 : 4, px: isMobile ? 1 : 2 }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom 
        fontWeight="bold" 
        color="primary"
        sx={{ mt: isMobile ? 1 : 0, fontSize: isMobile ? '1.5rem' : undefined }}
      >
        預約心理治療師
      </Typography>
      <Typography 
        variant="body1" 
        color="text.secondary" 
        paragraph 
        sx={{ mb: isMobile ? 1 : 4, fontSize: isMobile ? '0.9rem' : undefined }}
      >
        請選擇您希望預約的日期和時段。
      </Typography>

      {/* 顯示治療師選擇 */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: isMobile ? 1.5 : 4, 
          borderRadius: 2, 
          mb: isMobile ? 2 : 3,
          width: '100%',
          overflowX: 'auto'
        }}
      >
        <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight="medium">
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
              <Grid item key={doctor.id} xs={6} sm={6} md={isTablet ? 4 : 3} lg={2}>
                <Button
                  fullWidth
                  variant={
                    bookingDetails.doctorId === doctor.id.toString() ? 'contained' : 'outlined'
                  }
                  onClick={() => handleDoctorChange(doctor.id.toString())}
                  sx={{
                    py: isMobile ? 1.5 : 2,
                    height: '100%', // 確保按鈕等高
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                    minHeight: isMobile ? '60px' : '80px',
                    whiteSpace: 'normal', // 允許文字換行
                    lineHeight: 1.2,
                    '& .MuiButton-startIcon': { // 如果有圖標
                      marginRight: 0,
                      marginBottom: 0.5,
                    },
                  }}
                >
                  {doctor.name}
                  {doctor.specialties && (
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', mt: 0.5, color: 'text.secondary' }}>
                      ({doctor.specialties.join(', ')})
                    </Typography>
                  )}
                </Button>
              </Grid>
            ))}
          </Grid>
        </ApiStateHandler>
      </Paper>

      {/* Calendar Display - START */}
      <Box sx={{ mt: isMobile ? 2 : 4, mb: isMobile ? 2 : 3 }}>
        {/* Month Navigation */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            px: isMobile ? 0 : 1,
          }}
        >
          <IconButton onClick={handlePreviousMonth} disabled={loadingSchedule} aria-label="上個月">
            <ArrowBackIosNew />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h5"} component="h2" fontWeight="medium">
            {format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}
          </Typography>
          <IconButton onClick={handleNextMonth} disabled={loadingSchedule} aria-label="下個月">
            <ArrowForwardIos />
          </IconButton>
        </Box>

        {/* Weekday Headers */}
        <Grid container spacing={isMobile ? 0.5 : 1} sx={{ mb: 1, px: isMobile ? 0.5 : 0 }}>
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <Grid item xs={12 / 7} key={day} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar Grid */}
        {loadingSchedule ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={isMobile ? 0.5 : 1} sx={{ px: isMobile ? 0.5 : 0 }}>
            {/* Empty cells at the start of the month */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <Grid item xs={12 / 7} key={`empty-start-${index}`}>
                <Box sx={{ height: isMobile ? 40 : 60, borderRadius: 1 }} />
              </Grid>
            ))}

            {/* Day cells */}
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayScheduleInfo = schedule[dateStr];
              const slotsAvailable = getAvailableSlotsForDate(dateStr).length;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrentDisplayMonth = isSameMonth(day, currentDate);
              const canSelect = isCurrentDisplayMonth && !dayScheduleInfo?.isOverallRestDay && slotsAvailable > 0;

              return (
                <Grid item xs={12 / 7} key={dateStr}>
                  <Paper
                    elevation={isSelected ? 6 : 1}
                    onClick={() => (isCurrentDisplayMonth && (slotsAvailable > 0 || dayScheduleInfo?.isOverallRestDay === false)) ? handleDateClick(day) : null}
                    sx={{
                      p: isMobile ? 0.5 : 1,
                      textAlign: 'center',
                      cursor: (isCurrentDisplayMonth && (slotsAvailable > 0 || dayScheduleInfo?.isOverallRestDay === false)) ? 'pointer' : 'default',
                      backgroundColor: isSelected
                        ? theme.palette.primary.main
                        : isToday
                        ? theme.palette.action.hover
                        : 'background.paper',
                      color: isSelected ? theme.palette.primary.contrastText : 'inherit',
                      opacity: isCurrentDisplayMonth ? 1 : 0.5,
                      border: isSelected ? `2px solid ${theme.palette.primary.dark}` : `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      minHeight: isMobile ? 50 : 70,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      aspectRatio: '1 / 1', // Maintain square-ish cells
                      '&:hover': {
                        backgroundColor: (isCurrentDisplayMonth && (slotsAvailable > 0 || dayScheduleInfo?.isOverallRestDay === false)) ? (isSelected ? theme.palette.primary.dark : theme.palette.action.selected) : undefined,
                      },
                      fontSize: isMobile ? '0.8rem' : '1rem',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="div"
                      fontWeight={isSelected || isToday ? 'bold' : 'normal'}
                      color={isSelected ? 'inherit' : (isCurrentDisplayMonth ? 'text.primary' : 'text.disabled')}
                      sx={{ fontSize: 'inherit' }}
                    >
                      {format(day, 'd')}
                    </Typography>
                    {isCurrentDisplayMonth && slotsAvailable > 0 && (
                      <Chip
                        label={`${slotsAvailable} 時段`}
                        size="small"
                        color={isSelected ? "default" : "secondary"}
                        variant={isSelected ? "filled" : "outlined"}
                        sx={{ 
                          mt: 0.5, 
                          height: isMobile ? 16 : 20, 
                          fontSize: isMobile ? '0.6rem' : '0.65rem',
                          bgcolor: isSelected ? 'common.white' : undefined,
                          color: isSelected ? 'secondary.main' : undefined,
                         }}
                      />
                    )}
                    {isCurrentDisplayMonth && dayScheduleInfo?.isOverallRestDay && slotsAvailable === 0 && (
                       <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', color: isSelected ? 'common.white' : 'text.secondary', mt:0.5 }}>
                         休息
                       </Typography>
                     )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
      {/* Calendar Display - END */}

      {/* Available Time Slots */}
      {selectedDate && !loadingSchedule && (
        <Box mt={isMobile ? 2 : 4}>
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            gutterBottom 
            fontWeight="medium"
            sx={{ fontSize: isMobile ? '0.95rem' : undefined }}
          >
            {format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW })} 可用時段:
          </Typography>
          {getAvailableSlotsForDate(format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
            <Typography color="text.secondary" sx={{ fontSize: isMobile ? '0.85rem' : undefined }}>
              此日期已無可用時段。
            </Typography>
          ) : (
            <Grid container spacing={isMobile ? 1 : 1.5}>
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
                      py: isMobile ? 1.5 : 1.5,
                      px: isMobile ? 0.5 : 2,
                      bgcolor:
                        selectedTimeSlot === slot.time ? 'secondary.dark' : 'secondary.main',
                      '&:hover': { bgcolor: 'secondary.dark' },
                      fontSize: isMobile ? '0.9rem' : 'inherit',
                      borderRadius: '8px',
                      minHeight: isMobile ? '48px' : undefined,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:active': {
                        transform: 'scale(0.95)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }
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
                          mt: 0.3,
                          fontSize: isMobile ? '0.65rem' : 'inherit',
                          fontWeight: 'medium',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
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

      {/* Booking Dialog */}
      <Dialog 
        open={bookingDialogOpen} 
        onClose={handleBookingDialogClose} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: isMobile ? 0 : '8px'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'common.white',
            px: isMobile ? 2 : 3,
            py: isMobile ? 1.5 : 2,
            fontSize: isMobile ? '1.1rem' : undefined,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box>{bookingSuccess ? '預約成功' : '確認預約資訊'}</Box>
          {isMobile && (
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleBookingDialogClose}
              aria-label="關閉"
              size="small"
            >
              <ScreenshotIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent 
          dividers 
          sx={{ 
            pt: isMobile ? 1.5 : 2,
            px: isMobile ? 1.5 : 3,
            pb: isMobile ? 1 : 2,
            maxHeight: isMobile ? '80vh' : '80vh',
            overflowY: 'auto',
            '::-webkit-scrollbar': {
              width: '8px',
            },
            '::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
            },
            '::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            }
          }}
        >
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
              <Box>
                {/* 選擇日期時間摘要 */}
                {isMobile && (
                  <Box 
                    sx={{ 
                      mb: 2, 
                      p: 1.5, 
                      borderRadius: 1, 
                      bgcolor: 'primary.lighter', 
                      color: 'primary.darker',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <CalendarMonthIcon fontSize="small" />
                    <Typography variant="body2" fontWeight="medium">
                      {format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW })} {selectedTimeSlot}
                    </Typography>
                  </Box>
                )}
              
                {/* 個人資料區塊 */}
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" sx={{ mb: isMobile ? 1 : 2, fontSize: isMobile ? '1rem' : undefined }}>
                  個人資料
                </Typography>
                <Divider sx={{ mb: isMobile ? 1 : 2 }} />
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12}>
                    <TextField
                      label="姓名"
                      name="patientName"
                      value={bookingDetails.patientName}
                      onChange={handleBookingDetailsChange}
                      fullWidth
                      required
                      size={isMobile ? "small" : "medium"}
                      margin="dense"
                      disabled={bookingLoading}
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: isMobile ? '0.95rem' : undefined }
                      }}
                      InputProps={{
                        style: {
                          fontSize: isMobile ? '0.95rem' : undefined
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
                      margin="dense"
                      disabled={bookingLoading}
                      type="tel"
                      inputMode="tel"
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: isMobile ? '0.95rem' : undefined }
                      }}
                      InputProps={{
                        style: {
                          fontSize: isMobile ? '0.95rem' : undefined
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="電子郵件"
                      name="patientEmail"
                      type="email"
                      inputMode="email"
                      value={bookingDetails.patientEmail}
                      onChange={handleBookingDetailsChange}
                      fullWidth
                      required
                      size={isMobile ? "small" : "medium"}
                      margin="dense"
                      disabled={bookingLoading}
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: isMobile ? '0.95rem' : undefined }
                      }}
                      InputProps={{
                        style: {
                          fontSize: isMobile ? '0.95rem' : undefined
                        },
                      }}
                    />
                  </Grid>
                </Grid>
                {/* 就診資訊區塊 */}
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" sx={{ mt: isMobile ? 2 : 3, mb: isMobile ? 1 : 2, fontSize: isMobile ? '1rem' : undefined }}>
                  就診資訊
                </Typography>
                <Divider sx={{ mb: isMobile ? 1 : 2 }} />
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12}>
                    <TextField
                      label="預約原因 (簡述)"
                      name="appointmentReason"
                      value={bookingDetails.appointmentReason}
                      onChange={handleBookingDetailsChange}
                      fullWidth
                      multiline
                      rows={isMobile ? 2 : 3}
                      margin="dense"
                      size={isMobile ? "small" : "medium"}
                      disabled={bookingLoading}
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: isMobile ? '0.95rem' : undefined }
                      }}
                      InputProps={{
                        style: {
                          fontSize: isMobile ? '0.95rem' : undefined
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
                      margin="dense"
                      size={isMobile ? "small" : "medium"}
                      disabled={bookingLoading}
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: isMobile ? '0.95rem' : undefined }
                      }}
                      InputProps={{
                        style: {
                          fontSize: isMobile ? '0.95rem' : undefined
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {bookingSuccess && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 2,
                  }}
                >
                  <EventAvailableIcon sx={{ fontSize: 40 }} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  預約成功！
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: 'grey.100',
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    textAlign: 'left',
                    maxWidth: 400,
                    margin: '0 auto',
                  }}
                >
                  <Typography variant="body2" paragraph>
                    日期：{selectedDate ? format(selectedDate, 'yyyy年 M月 d日 (eeee)', { locale: zhTW }) : '未指定'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    時間：{selectedTimeSlot || '未指定'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    預約者：{bookingDetails.patientName}
                  </Typography>
                  <Typography variant="body2">
                    聯絡電話：{bookingDetails.patientPhone}
                  </Typography>
                </Paper>
              </Box>
            )}
          </ApiStateHandler>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, py: isMobile ? 1.5 : 2, justifyContent: isMobile && bookingSuccess ? 'center' : 'space-between' }}>
          {!bookingSuccess ? (
            <>
              <Button 
                onClick={handleBookingDialogClose} 
                disabled={bookingLoading}
                sx={{ 
                  fontSize: isMobile ? '0.9rem' : undefined,
                  mr: 1,
                  minHeight: isMobile ? '42px' : undefined
                }}
              >
                取消
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBookingSubmit}
                disabled={
                  bookingLoading ||
                  !bookingDetails.patientName ||
                  !bookingDetails.patientPhone ||
                  !bookingDetails.patientEmail
                }
                startIcon={bookingLoading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ 
                  minWidth: '100px',
                  fontSize: isMobile ? '0.9rem' : undefined, 
                  minHeight: isMobile ? '42px' : undefined
                }}
              >
                {bookingLoading ? '處理中...' : '確認預約'}
              </Button>
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: isMobile ? 'space-around' : 'center', width: '100%', gap: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleBookingDialogClose}
                sx={{ 
                  minWidth: '100px',
                  fontSize: isMobile ? '0.9rem' : undefined,
                  py: isMobile ? 1 : undefined
                }}
              >
                關閉
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ScreenshotIcon />}
                onClick={() => {
                  alert('系統提示：請手動截圖此畫面作為預約憑證。');
                }}
                sx={{ 
                  minWidth: '100px',
                  fontSize: isMobile ? '0.9rem' : undefined,
                  py: isMobile ? 1 : undefined
                }}
              >
                截圖提示
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AppointmentBookingPage;
