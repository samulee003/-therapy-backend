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
  Tooltip,
  Stepper,
  Step,
  StepLabel
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
  addDays,
  startOfDay,
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

// 預約時間限制相關函數
const getMinimumBookingDate = () => {
  // 返回當前日期的5天後（至少提前五天）
  return startOfDay(addDays(new Date(), 5));
};

const isDateBookable = (date) => {
  // 檢查指定日期是否可以預約（必須至少提前五天）
  const minDate = getMinimumBookingDate();
  const targetDate = startOfDay(date);
  return targetDate >= minDate;
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
    patientName: '', // 就診者姓名，需要用戶填寫
    patientPhone: '', // 將在useEffect中設置
    patientEmail: '', // 將在useEffect中設置
    appointmentReason: '',
    notes: '',
    isNewPatient: 'yes',
    gender: '',
    birthDate: '',
    doctorId: '', // 添加治療師ID欄位
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null); // Changed to null, will store object on success

  // Stepper 相關狀態
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['個人資料', '就診資訊', '確認預約'];

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

        // 新增：過濾掉測試醫生的排班數據並重新計算 isOverallRestDay
        const doctorsToFilter = ["測試醫生", "Dr. Demo"];
        for (const dateStr in processedScheduleData) {
          if (processedScheduleData.hasOwnProperty(dateStr) && processedScheduleData[dateStr] && processedScheduleData[dateStr].doctors) {
            // 1. 過濾掉指定醫生的排班
            processedScheduleData[dateStr].doctors = processedScheduleData[dateStr].doctors.filter(
              doctor => !doctorsToFilter.includes(doctor.doctorName)
            );

            // 2. 重新計算 isOverallRestDay
            const remainingDoctorsOnDate = processedScheduleData[dateStr].doctors;
            if (remainingDoctorsOnDate.length === 0) {
              // 如果過濾後沒有任何醫生，則該日為整體休息日
              processedScheduleData[dateStr].isOverallRestDay = true;
            } else {
              // 否則，檢查剩餘醫生中是否有任何一位有空閒時段且非休息日
              const hasAnyActiveSlot = remainingDoctorsOnDate.some(
                doc => !doc.isRestDay && doc.availableSlots && doc.availableSlots.length > 0
              );
              processedScheduleData[dateStr].isOverallRestDay = !hasAnyActiveSlot;
            }
          }
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
          // 修改過濾邏輯以包含 "測試醫生"
          const filteredDoctors = doctorsData.filter(doctor => doctor.name !== "測試醫生" && doctor.name !== "Dr. Demo");
          setDoctors(filteredDoctors);
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
      console.log('[AppointmentBookingPage] Auto-filling user contact info - Phone:', user.phone, 'Email:', user.email);
      
      setBookingDetails(prev => ({
        ...prev,
        // 只更新預約人的聯絡資訊，不更新就診者姓名
        patientPhone: user.phone || '', // 現在後端已經返回phone欄位
        patientEmail: user.email || '', // 使用user.email
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
    // 檢查日期是否可以預約（至少提前五天）
    if (!isDateBookable(day)) {
      // 如果日期不可預約，不進行任何操作
      console.log(`日期 ${format(day, 'yyyy-MM-dd')} 不可預約，需要至少提前五天的日期`);
      return;
    }
    
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
    setActiveStep(0); // 確保從第一步開始
    setBookingDialogOpen(true);
  };

  const handleBookingDialogClose = () => {
    setBookingDialogOpen(false);
    setBookingError('');
    setActiveStep(0); // Reset step when dialog closes
    // Do not clear bookingSuccess here, let the success dialog handle it.
  };

  const handleBookingSuccessDialogClose = () => {
    setBookingSuccess(null); // Clear success message
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setActiveStep(0); // 重置步驟到第一步
    // Optionally reset parts of bookingDetails if needed for a new booking
    // For example, clear appointmentReason and notes, but keep patient info if logged in
    setBookingDetails(prev => ({
      ...prev,
      patientName: '', // 清空就診者姓名，讓用戶重新填寫
      appointmentReason: '',
      notes: '',
      isNewPatient: 'yes', // 重置為預設值
      gender: '',
      birthDate: '',
      doctorId: '', // 重置治療師選擇，讓用戶重新選擇
    }));
    // Potentially refetch schedule if the booked slot should now appear as unavailable immediately
    // However, this might be better handled by the calendar view updating based on booking.
    fetchSchedule(); // 新增：重新獲取排班數據
  };

  const handleBookingDetailsChange = e => {
    const { name, value } = e.target;
    setBookingDetails({
      ...bookingDetails,
      [name]: value,
    });
  };

  const handleBookingSubmit = async () => {
    if (!user || !selectedDate || !selectedTimeSlot || !bookingDetails.doctorId) {
      setBookingError('請確保已登入，並選擇日期、時段以及治療師。');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess(null);

    try {
      const appointmentData = {
        patientId: user.id, // 改為 patientId
        doctorId: bookingDetails.doctorId,
        appointmentDate: format(selectedDate, 'yyyy-MM-dd'), // 保持
        timeSlot: selectedTimeSlot, // 改為 timeSlot
        reason: bookingDetails.appointmentReason,
        notes: bookingDetails.notes,
        isNewPatient: bookingDetails.isNewPatient === 'yes', // 移至頂層並確認
        patientInfo: { // patientInfo 結構保持
          name: bookingDetails.patientName,
          phone: bookingDetails.patientPhone,
          email: bookingDetails.patientEmail,
          gender: bookingDetails.gender,
          birthDate: bookingDetails.birthDate,
        },
        // 確保所有後端期望的必填欄位都被包含
      };

      console.log('修改後提交預約資料:', appointmentData); // Log the modified data
      const response = await bookAppointment(appointmentData);
      console.log('預約 API 回應:', response);

      if (response && (response.status === 201 || response.status === 200 || response.data?.success)) {
        const bookedDoctor = doctors.find(doc => doc.id === parseInt(bookingDetails.doctorId, 10));
        
        setBookingSuccess({
          message: '您的預約已成功創建！',
          details: {
            doctorName: bookedDoctor ? bookedDoctor.name : 'N/A',
            date: format(selectedDate, 'yyyy年 MMMM d日 (EEEE)', { locale: zhTW }),
            time: selectedTimeSlot,
            patientName: bookingDetails.patientName,
            patientPhone: bookingDetails.patientPhone,
            patientEmail: bookingDetails.patientEmail,
            reason: bookingDetails.appointmentReason,
          }
        });
        setBookingDialogOpen(false); // Close the booking form dialog
        // No need to call fetchSchedule here if the calendar updates via other means or upon closing success dialog
      } else {
        // Handle non-successful but non-error responses if any
        const errorMsg = response?.data?.message || response?.message || '預約失敗，請稍後再試。';
        console.error('預約失敗 (非拋出錯誤):', errorMsg, response);
        setBookingError(formatApiError(response) || errorMsg);
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

  // Function to handle moving to the next step
  const handleNextStep = () => {
    // Add validation logic here before proceeding if needed for current step
    if (activeStep === 0) { // Validating Step 1: Personal Info
      if (!bookingDetails.patientName) {
        setBookingError('請填寫就診者姓名。');
        return;
      }
    }
    
    if (activeStep === 1) { // Validating Step 2: Appointment Info
      if (!bookingDetails.doctorId) {
        setBookingError('請選擇一位治療師。');
        return;
      }
      if (!selectedDate) {
        setBookingError('請選擇預約日期。');
        return;
      }
      if (!selectedTimeSlot) {
        setBookingError('請選擇預約時段。');
        return;
      }
      if (!bookingDetails.isNewPatient || (bookingDetails.isNewPatient !== 'yes' && bookingDetails.isNewPatient !== 'no')) {
        setBookingError('請選擇是否為初診。');
        return;
      }
    }
    
    // Clear previous error when moving to next step if validation passes
    setBookingError(''); 
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Function to handle moving to the previous step
  const handleBackStep = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
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
              // 修改過濾邏輯以包含 "測試醫生"
              .filter(doctor => doctor.name !== "測試醫生" && doctor.name !== "Dr. Demo") 
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
        {/* 預約規則說明 */}
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2, 
            fontSize: isMobile ? '0.85rem' : undefined,
            '& .MuiAlert-icon': {
              fontSize: isMobile ? '1.2rem' : undefined
            }
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
            <strong>預約須知：</strong>為了確保治療師有充分的準備時間，預約需要至少提前五天進行。
            今天是 {format(new Date(), 'M月d日', { locale: zhTW })}，
            最早可預約日期為 {format(getMinimumBookingDate(), 'M月d日', { locale: zhTW })}。
          </Typography>
        </Alert>
        
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
              const isBookable = isDateBookable(day); // 新增：檢查日期是否可預約
              const canSelect = isCurrentDisplayMonth && !dayScheduleInfo?.isOverallRestDay && slotsAvailable > 0 && isBookable; // 修改：加入日期限制檢查

              return (
                <Grid item xs={12 / 7} key={dateStr}>
                  <Tooltip 
                    title={
                      !isBookable && isCurrentDisplayMonth
                        ? "預約需要至少提前五天預訂，請選擇更晚的日期"
                        : ""
                    }
                    arrow
                    disableHoverListener={isBookable || !isCurrentDisplayMonth}
                  >
                    <Paper
                      elevation={isSelected ? 6 : 1}
                      onClick={() => canSelect ? handleDateClick(day) : null}
                      sx={{
                        p: isMobile ? 0.5 : 1,
                        textAlign: 'center',
                        cursor: canSelect ? 'pointer' : 'default',
                        backgroundColor: isSelected
                          ? theme.palette.primary.main
                          : isToday
                          ? theme.palette.action.hover
                          : !isBookable && isCurrentDisplayMonth
                          ? theme.palette.grey[100] // 不可預約日期的背景色
                          : 'background.paper',
                        color: isSelected 
                          ? theme.palette.primary.contrastText 
                          : !isBookable && isCurrentDisplayMonth
                          ? theme.palette.text.disabled // 不可預約日期的文字顏色
                          : 'inherit',
                        opacity: isCurrentDisplayMonth ? (isBookable ? 1 : 0.6) : 0.5, // 修改：不可預約日期降低透明度
                        border: isSelected ? `2px solid ${theme.palette.primary.dark}` : `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        minHeight: isMobile ? 50 : 70,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '1 / 1', // Maintain square-ish cells
                        position: 'relative', // 為斜線覆蓋做準備
                        '&:hover': {
                          backgroundColor: canSelect ? (isSelected ? theme.palette.primary.dark : theme.palette.action.selected) : undefined,
                        },
                        fontSize: isMobile ? '0.8rem' : '1rem',
                        // 為不可預約日期添加斜線效果
                        '&::before': !isBookable && isCurrentDisplayMonth ? {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                          borderRadius: 'inherit',
                          pointerEvents: 'none',
                        } : {},
                      }}
                    >
                      <Typography 
                        variant="body2"
                        component="div"
                        fontWeight={isSelected || isToday ? 'bold' : 'normal'}
                        color={isSelected ? 'inherit' : (isCurrentDisplayMonth ? (isBookable ? 'text.primary' : 'text.disabled') : 'text.disabled')}
                        sx={{ fontSize: 'inherit', zIndex: 1 }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      {/* 只有可預約日期才顯示時段信息 */}
                      {isCurrentDisplayMonth && isBookable && slotsAvailable > 0 && (
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
                            zIndex: 1,
                          }}
                        />
                      )}
                      {/* 不可預約日期的提示 */}
                      {isCurrentDisplayMonth && !isBookable && (
                        <Typography variant="caption" display="block" sx={{ 
                          fontSize: '0.6rem', 
                          color: 'text.disabled',
                          mt: 0.5,
                          zIndex: 1,
                        }}>
                          未開放
                        </Typography>
                      )}
                      {/* 休息日提示（只有在可預約且為休息日時顯示） */}
                      {isCurrentDisplayMonth && isBookable && dayScheduleInfo?.isOverallRestDay && slotsAvailable === 0 && (
                         <Typography variant="caption" display="block" sx={{ 
                           fontSize: '0.6rem', 
                           color: isSelected ? 'common.white' : 'text.secondary', 
                           mt: 0.5,
                           zIndex: 1,
                         }}>
                           休息
                         </Typography>
                       )}
                    </Paper>
                  </Tooltip>
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

      {/* Booking Success Dialog */}
      {bookingSuccess && bookingSuccess.details && (
        <Dialog
          open={Boolean(bookingSuccess)}
          onClose={handleBookingSuccessDialogClose}
          aria-labelledby="booking-success-dialog-title"
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle id="booking-success-dialog-title" sx={{ textAlign: 'center', pb: 1 }}>
            <EventAvailableIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h5" component="div" fontWeight="medium">
              {bookingSuccess.message}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              預約詳情：
            </Typography>
            <Box sx={{ '& > div': { mb: 1.5 } }}>
              <div>
                <Typography variant="body1"><strong>治療師：</strong> {bookingSuccess.details.doctorName}</Typography>
              </div>
              <div>
                <Typography variant="body1"><strong>日期：</strong> {bookingSuccess.details.date}</Typography>
              </div>
              <div>
                <Typography variant="body1"><strong>時間：</strong> {bookingSuccess.details.time}</Typography>
              </div>
              <div>
                <Typography variant="body1"><strong>就診者姓名：</strong> {bookingSuccess.details.patientName}</Typography>
              </div>
              <div>
                <Typography variant="body1"><strong>預約人電話：</strong> {bookingSuccess.details.patientPhone}</Typography>
              </div>
              <div>
                <Typography variant="body1"><strong>預約人Email：</strong> {bookingSuccess.details.patientEmail}</Typography>
              </div>
              {bookingSuccess.details.reason && (
                <div>
                  <Typography variant="body1"><strong>預約主題：</strong> {bookingSuccess.details.reason}</Typography>
                </div>
              )}
            </Box>
            <Alert severity="info" icon={<ScreenshotIcon />} sx={{ mt: 3, mb:1 }}>
              <Typography variant="body2" fontWeight="medium">
                重要提示：請截圖保存您的預約詳情以便查閱。
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p:2 }}>
            <Button onClick={handleBookingSuccessDialogClose} variant="contained" fullWidth>
              關閉
            </Button>
          </DialogActions>
        </Dialog>
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
            // success={bookingSuccess} // Success is handled by a separate dialog
            loadingMessage="處理預約中..."
            onErrorClose={() => setBookingError('')}
            // onSuccessClose={() => setBookingSuccess(null)} // Handled by success dialog
            loadingType="dialog" // Ensures loading covers dialog content
          >
            {/* Stepper UI */}
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: isMobile ? 2 : 3, px: isMobile ? 0 : 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Form Content based on Active Step */}
            <Box sx={{ mt: 2, mb:2, px: isMobile ? 0.5 : 1, minHeight: isMobile ? 'auto' : 250 } /* Added minHeight */}>
              {activeStep === 0 && (
                // Step 1: Personal Information
                <Grid container spacing={isMobile ? 1.5 : 2}>
                  <Grid item xs={12}>
                    <TextField
                      label="就診者姓名 *"
                      name="patientName"
                      value={bookingDetails.patientName}
                      onChange={handleBookingDetailsChange}
                      fullWidth
                      required
                      size={isMobile ? "small" : "medium"}
                      margin="dense"
                      disabled={bookingLoading}
                      autoFocus
                      placeholder="請填寫接受治療的人員姓名"
                      helperText="如果是為他人（如孩子）預約，請填寫就診者的姓名"
                      InputLabelProps={{ shrink: true, style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                      InputProps={{ style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                    />
                  </Grid>
                </Grid>
              )}
              {activeStep === 1 && (
                // Step 2: Appointment Information
                <Grid container spacing={isMobile ? 1.5 : 2}>
                   <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset" margin="dense" fullWidth disabled={bookingLoading}>
                      <FormLabel component="legend" sx={{fontSize: isMobile ? '0.85rem' : '0.9rem', color: 'text.secondary', mb:0.5}}>是否為初診？</FormLabel>
                      <RadioGroup
                        row
                        name="isNewPatient"
                        value={bookingDetails.isNewPatient}
                        onChange={handleBookingDetailsChange}
                      >
                        <FormControlLabel value="yes" control={<Radio size="small" />} label="是" sx={{ '& .MuiTypography-root': { fontSize: isMobile ? '0.9rem' : undefined}}} />
                        <FormControlLabel value="no" control={<Radio size="small" />} label="否" sx={{ '& .MuiTypography-root': { fontSize: isMobile ? '0.9rem' : undefined}}}/>
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                     <TextField
                        label="出生年月日 (選填)"
                        name="birthDate"
                        type="date"
                        value={bookingDetails.birthDate}
                        onChange={handleBookingDetailsChange}
                        fullWidth
                        margin="dense"
                        size={isMobile ? "small" : "medium"}
                        InputLabelProps={{ shrink: true, style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                        InputProps={{ style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                        disabled={bookingLoading}
                        helperText="此資訊為選填，您可以稍後向治療師提供"
                      />
                  </Grid>
                   <Grid item xs={12}>
                     <FormControl fullWidth margin="dense" size={isMobile ? "small" : "medium"} disabled={bookingLoading}>
                        <InputLabel id="gender-select-label" shrink style={{ fontSize: isMobile ? '0.95rem' : undefined }}>性別 (選填)</InputLabel>
                        <Select
                          labelId="gender-select-label"
                          name="gender"
                          value={bookingDetails.gender}
                          onChange={handleBookingDetailsChange}
                          label="性別 (選填)"
                          sx={{ input: {fontSize: isMobile ? '0.95rem' : undefined } }}
                        >
                          <MenuItem value="male">男</MenuItem>
                          <MenuItem value="female">女</MenuItem>
                          <MenuItem value="other">其他</MenuItem>
                          <MenuItem value="prefer_not_to_say">不願透露</MenuItem>
                        </Select>
                        <FormHelperText>此資訊為選填，有助於治療師了解您的需求</FormHelperText>
                      </FormControl>
                   </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="預約原因 (簡述，例如：壓力、焦慮、關係問題)"
                      name="appointmentReason"
                      value={bookingDetails.appointmentReason}
                      onChange={handleBookingDetailsChange}
                      fullWidth
                      multiline
                      rows={isMobile ? 2 : 3}
                      margin="dense"
                      size={isMobile ? "small" : "medium"}
                      disabled={bookingLoading}
                      InputLabelProps={{ shrink: true, style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                      InputProps={{ style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="備註 (選填，例如：希望諮詢的特定方向)"
                      name="notes"
                      value={bookingDetails.notes}
                      onChange={handleBookingDetailsChange}
                      fullWidth
                      multiline
                      rows={isMobile ? 2 : 2}
                      margin="dense"
                      size={isMobile ? "small" : "medium"}
                      disabled={bookingLoading}
                      InputLabelProps={{ shrink: true, style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                      InputProps={{ style: { fontSize: isMobile ? '0.95rem' : undefined } }}
                    />
                  </Grid>
                </Grid>
              )}
              {activeStep === 2 && selectedDate && selectedTimeSlot && (
                // Step 3: Confirmation
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2, fontSize: isMobile ? '1.1rem' : undefined }}>
                    請確認您的預約資訊
                  </Typography>
                  <Paper elevation={0} sx={{ p: isMobile ? 1.5 : 2, borderRadius: 1, bgcolor: 'grey.100', mb:2 }}>
                    <Typography variant="body1" gutterBottom><strong>治療師：</strong> {doctors.find(doc => doc.id === parseInt(bookingDetails.doctorId, 10))?.name || 'N/A'}</Typography>
                    <Typography variant="body1" gutterBottom><strong>日期：</strong> {format(selectedDate, 'yyyy年 MMMM d日 (EEEE)', { locale: zhTW })}</Typography>
                    <Typography variant="body1" gutterBottom><strong>時間：</strong> {selectedTimeSlot}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" gutterBottom><strong>就診者姓名：</strong> {bookingDetails.patientName}</Typography>
                    <Typography variant="body2" gutterBottom><strong>預約人電話：</strong> {bookingDetails.patientPhone}</Typography>
                    <Typography variant="body2" gutterBottom><strong>預約人Email：</strong> {bookingDetails.patientEmail}</Typography>
                    <Typography variant="body2" gutterBottom><strong>初診：</strong> {bookingDetails.isNewPatient === 'yes' ? '是' : '否'}</Typography>
                     {bookingDetails.birthDate && <Typography variant="body2" gutterBottom><strong>生日：</strong> {bookingDetails.birthDate}</Typography>}
                    {bookingDetails.gender && <Typography variant="body2" gutterBottom><strong>性別：</strong> {bookingDetails.gender}</Typography>}
                    <Typography variant="body2" gutterBottom><strong>預約原因：</strong> {bookingDetails.appointmentReason || '未填寫'}</Typography>
                    {bookingDetails.notes && <Typography variant="body2"><strong>備註：</strong> {bookingDetails.notes}</Typography>}
                  </Paper>
                  <Alert severity="info" sx={{fontSize: isMobile ? '0.8rem' : undefined}}>
                    點擊「確認預約」後，系統將為您保留此時段。
                  </Alert>
                </Box>
              )}
            </Box>
          </ApiStateHandler>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 3, py: isMobile ? 1.5 : 2, justifyContent: 'space-between', borderTop: '1px solid', borderColor:'divider' }}>
          <Button
            onClick={activeStep === 0 ? handleBookingDialogClose : handleBackStep}
            disabled={bookingLoading}
            sx={{ fontSize: isMobile ? '0.9rem' : undefined, minHeight: isMobile ? '42px' : undefined }}
          >
            {activeStep === 0 ? '取消' : '上一步'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={activeStep === steps.length - 1 ? handleBookingSubmit : handleNextStep}
            disabled={bookingLoading}
            startIcon={bookingLoading && activeStep === steps.length - 1 ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ minWidth: '100px', fontSize: isMobile ? '0.9rem' : undefined, minHeight: isMobile ? '42px' : undefined }}
          >
            {bookingLoading && activeStep === steps.length - 1 ? '處理中...' : (activeStep === steps.length - 1 ? '確認預約' : '下一步')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AppointmentBookingPage;
