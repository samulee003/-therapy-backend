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
  useMediaQuery
} from '@mui/material';
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
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot || !user) {
      setBookingError('請先選擇日期和時段，並確保您已登入。');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    try {
      const appointmentDetails = {
        date: selectedDate,
        time: selectedSlot,
        // Add patient details from context
        patientName: user?.name, 
        patientEmail: user?.username, // Assuming username is email
        patientPhone: user?.phone // ADDED PHONE
      };

      // Basic check for missing user details before sending
      if (!appointmentDetails.patientName || !appointmentDetails.patientEmail || !appointmentDetails.patientPhone) { // Added phone check
          console.error('Missing user data for booking:', { name: user?.name, email: user?.username, phone: user?.phone });
          throw new Error("無法獲取完整的用戶資訊 (姓名/郵箱/電話)，請檢查您的個人資料或重新登入後再試。");
      }

      console.log("Sending booking details:", appointmentDetails);
      const response = await bookAppointment(appointmentDetails);
      console.log('Booking successful:', response.data);
      setBookingSuccess(`預約成功！您的預約時間是 ${selectedDate} ${selectedSlot}。`);
      setSelectedSlot(null); // Clear selection after successful booking
      
      // Refresh available slots for the selected date by filtering the booked slot
      // The availableSlots state already holds the correct structure: { 'YYYY-MM-DD': [...] }
      setAvailableSlots(prevSlots => {
        // Ensure prevSlots[selectedDate] is an array before filtering
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

        {/* Available Slots */}
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

        {/* Booking Action */} 
        {selectedDate && selectedSlot && (
          <Box mt={3} textAlign="center">
            {bookingError && <Alert severity="error" sx={{ mb: 2 }}>{bookingError}</Alert>}
            {bookingSuccess && <Alert severity="success" sx={{ mb: 2 }}>{bookingSuccess}</Alert>}
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={handleBooking}
              disabled={bookingLoading || !!bookingSuccess} // Disable if loading or already succeeded
              sx={{ minWidth: 150 }}
            >
              {bookingLoading ? <CircularProgress size={24} color="inherit" /> : '確認預約'}
            </Button>
          </Box>
        )}

      </Paper>
    </Container>
  );
};

export default AppointmentBookingPage;

