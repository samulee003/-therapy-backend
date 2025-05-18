import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { getScheduleForMonth, saveScheduleForDate } from '../../../services/api';
import { formatDate, defaultSlotOptions } from './utils';

// 排班管理主組件
const ScheduleManager = ({ user }) => {
  // 狀態管理
  const [schedule, setSchedule] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [errorSchedule, setErrorSchedule] = useState('');
  const [currentScheduleDate, setCurrentScheduleDate] = useState(new Date());
  const [editingDate, setEditingDate] = useState(null);
  const [availableSlotsForEdit, setAvailableSlotsForEdit] = useState([]);
  const [isRestDay, setIsRestDay] = useState(false);

  // 批量排班相關狀態
  const [showBulkScheduler, setShowBulkScheduler] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState([1, 2, 3, 4, 5]);
  const [isBulkScheduling, setIsBulkScheduling] = useState(false);

  // 獲取排班數據
  const fetchSchedule = async (year, month) => {
    if (!user) {
      console.warn('嘗試獲取排班但用戶未登入');
      return;
    }

    setLoadingSchedule(true);
    setErrorSchedule('');

    try {
      console.log(`開始獲取 ${year}年${month}月 的排班數據，用戶ID=${user.id}, 角色=${user.role}`);

      // 將用戶 ID 作為 doctorId 參數傳遞，確保醫生查看自己的排班
      const doctorId = user.role === 'doctor' ? user.id : null;
      console.log(`使用 doctorId=${doctorId} 獲取排班`);

      const response = await getScheduleForMonth(year, month, doctorId);
      console.log(`排班數據 (${year}年${month}月): 成功, 狀態=${response.status}`, response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || '獲取排班失敗，服務器未返回成功標誌');
      }

      if (!response.data.schedule) {
        console.warn('獲取排班成功但返回空數據');
        setSchedule({});
        return;
      }

      const scheduleData = response.data.schedule;

      // 檢查並日誌休假日信息
      for (const date in scheduleData) {
        const dayData = scheduleData[date];
        if (dayData.isRestDay) {
          console.log(`發現休假日: ${date}, isRestDay=${dayData.isRestDay}`);
        }
      }

      setSchedule(scheduleData);
    } catch (err) {
      console.error('獲取排班失敗:', err);
      setErrorSchedule(err.response?.data?.message || err.message || '無法獲取排班數據。');
    } finally {
      setLoadingSchedule(false);
    }
  };

  // 初始加載和月份變更時獲取數據
  useEffect(() => {
    if (user) {
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      fetchSchedule(year, month);
    }
  }, [user, currentScheduleDate]);

  // 處理月份導航
  const handlePrevMonth = () => {
    const prevMonth = new Date(currentScheduleDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentScheduleDate(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentScheduleDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentScheduleDate(nextMonth);
  };

  // 處理點擊日期進行編輯
  const handleEditDate = dateStr => {
    setEditingDate(dateStr);
    const currentSlots = schedule[dateStr]?.availableSlots || [];
    console.log('編輯日期', dateStr, '當前時段', currentSlots);
    setAvailableSlotsForEdit([...currentSlots]);
    setIsRestDay(schedule[dateStr]?.isRestDay === true);
  };

  // 處理添加預設時段
  const handleAddDefaultTimeSlot = slot => {
    console.log('嘗試添加預設時段', slot, '目前時段列表', availableSlotsForEdit);
    if (!Array.isArray(availableSlotsForEdit)) {
      console.error('availableSlotsForEdit 不是數組:', availableSlotsForEdit);
      setAvailableSlotsForEdit([slot]);
      return;
    }

    if (!availableSlotsForEdit.includes(slot)) {
      setAvailableSlotsForEdit(prevSlots => {
        const newSlots = [...prevSlots, slot];
        console.log('更新後的時段列表', newSlots);
        return newSlots;
      });
    }
  };

  // 處理添加新的時段輸入框
  const handleAddSlotToEdit = () => {
    setAvailableSlotsForEdit(prevSlots => [...prevSlots, '']);
  };

  // 處理時段輸入變更
  const handleSlotInputChange = (index, value) => {
    const updatedSlots = [...availableSlotsForEdit];
    updatedSlots[index] = value;
    setAvailableSlotsForEdit(updatedSlots);
  };

  // 處理移除時段
  const handleRemoveSlotFromEdit = index => {
    if (!Array.isArray(availableSlotsForEdit)) {
      console.error('handleRemoveSlotFromEdit: availableSlotsForEdit is not an array', availableSlotsForEdit);
      return;
    }

    setAvailableSlotsForEdit(prevSlots => prevSlots.filter((_, i) => i !== index));
  };

  // 處理保存日期排班
  const handleSaveScheduleForDate = async () => {
    if (!editingDate) return;

    if (!Array.isArray(availableSlotsForEdit)) {
      console.error('handleSaveScheduleForDate: availableSlotsForEdit is not an array', availableSlotsForEdit);
      setErrorSchedule('儲存排班時發生內部錯誤 (資料格式錯誤)');
      return;
    }

    let validSlots = [];
    if (!isRestDay) {
      validSlots = availableSlotsForEdit.filter(
        slot => slot && /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)
      );
      validSlots.sort();
    }

    console.log(`正在保存 ${editingDate} 的排班資料:`, {
      isRestDay,
      validSlots: validSlots.length > 0 ? validSlots : '空陣列',
      schedule: schedule[editingDate] ? '已存在' : '尚未存在',
    });

    setLoadingSchedule(true);
    setErrorSchedule('');
    try {
      await saveScheduleForDate(editingDate, validSlots, isRestDay);
      setErrorSchedule('');
      setEditingDate(null);
      setAvailableSlotsForEdit([]);
      setIsRestDay(false);
      
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      fetchSchedule(year, month);
    } catch (err) {
      console.error(`保存 ${editingDate} 排班失敗:`, err);
      setErrorSchedule(
        err.response?.data?.message || err.message || `保存 ${editingDate} 的排班失敗。`
      );
    } finally {
      setLoadingSchedule(false);
    }
  };

  // 處理批量排班保存
  const handleBulkScheduleSave = async () => {
    if (!availableSlotsForEdit.length) {
      setErrorSchedule('請先添加至少一個可用時段。');
      return;
    }

    // 使用從 utils.js 導入的函數
    const targetDates = generateTargetDates(bulkStartDate, bulkEndDate, selectedWeekdays);
    if (targetDates.length === 0) {
      setErrorSchedule('請選擇有效的日期範圍和星期。');
      return;
    }

    setIsBulkScheduling(true);
    setErrorSchedule('');

    try {
      const validSlots = availableSlotsForEdit.filter(
        slot => slot && /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)
      );
      validSlots.sort();

      console.log(`進行批量排班：${targetDates.length} 天，時段數：${validSlots.length}`);

      // 保存每個目標日期的排班
      for (const dateStr of targetDates) {
        await saveScheduleForDate(dateStr, validSlots, isRestDay);
        console.log(`已保存 ${dateStr} 的排班`);
      }

      setShowBulkScheduler(false);
      setErrorSchedule('');
      
      // 刷新當前月份排班
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      fetchSchedule(year, month);
    } catch (err) {
      console.error('批量排班失敗:', err);
      setErrorSchedule(err.response?.data?.message || err.message || '批量排班過程中發生錯誤。');
    } finally {
      setIsBulkScheduling(false);
    }
  };

  // 渲染週計量排班的星期選擇
  const renderWeekdayCheckboxes = () => {
    const weekdays = [
      { value: 0, label: '週日' },
      { value: 1, label: '週一' },
      { value: 2, label: '週二' },
      { value: 3, label: '週三' },
      { value: 4, label: '週四' },
      { value: 5, label: '週五' },
      { value: 6, label: '週六' },
    ];

    return (
      <FormGroup row>
        {weekdays.map(day => (
          <FormControlLabel
            key={day.value}
            control={
              <Checkbox
                checked={selectedWeekdays.includes(day.value)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedWeekdays(prev => [...prev, day.value].sort());
                  } else {
                    setSelectedWeekdays(prev => prev.filter(d => d !== day.value));
                  }
                }}
              />
            }
            label={day.label}
          />
        ))}
      </FormGroup>
    );
  };

  // 從 utils.js 導入的 generateTargetDates 函數
  const generateTargetDates = (start, end, weekdays) => {
    if (!start || !end || weekdays.length === 0) {
      return [];
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const targetDates = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const weekday = date.getDay();
      if (weekdays.includes(weekday)) {
        targetDates.push(formatDate(date));
      }
    }

    return targetDates;
  };

  // 渲染日曆
  const renderCalendar = () => {
    const year = currentScheduleDate.getFullYear();
    const month = currentScheduleDate.getMonth() + 1;
    const monthStr = currentScheduleDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    // 計算日曆相關值
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const calendarDays = [];
    
    // 添加月初空單元格
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    
    // 添加實際日期
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    // 渲染頭部
    return (
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handlePrevMonth} disabled={loadingSchedule}>
            <PrevIcon />
          </IconButton>
          <Typography variant="h6" component="h3">
            {monthStr}
          </Typography>
          <IconButton onClick={handleNextMonth} disabled={loadingSchedule}>
            <NextIcon />
          </IconButton>
        </Box>

        {/* 日曆網格 */}
        <Grid container spacing={1}>
          {/* 星期幾標題 */}
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <Grid key={day} item xs={12 / 7}>
              <Box
                sx={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  py: 1,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                {day}
              </Box>
            </Grid>
          ))}

          {/* 日期單元格 */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return (
                <Grid key={`empty-${index}`} item xs={12 / 7}>
                  <Box sx={{ height: 70 }} />
                </Grid>
              );
            }

            const dateObj = new Date(year, month - 1, day);
            const dateStr = formatDate(dateObj);
            const dateData = schedule[dateStr] || {};
            const isEditing = editingDate === dateStr;
            const isRestDay = dateData.isRestDay === true;
            const hasAvailableSlots = Array.isArray(dateData.availableSlots) && dateData.availableSlots.length > 0;
            const hasBookedSlots = !!(dateData.bookedSlots && Object.keys(dateData.bookedSlots).length > 0);

            return (
              <Grid key={`day-${day}`} item xs={12 / 7}>
                <Paper
                  elevation={isEditing ? 8 : 1}
                  sx={{
                    height: 70,
                    p: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    borderColor: isEditing ? 'primary.main' : 'transparent',
                    borderWidth: isEditing ? 2 : 0,
                    borderStyle: 'solid',
                    bgcolor: isRestDay ? 'grey.100' : hasAvailableSlots ? 'success.50' : 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() => handleEditDate(dateStr)}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'bold',
                      textAlign: 'center',
                      mb: 0.5,
                    }}
                  >
                    {day}
                  </Typography>
                  {isRestDay ? (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                      休假日
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                      {hasAvailableSlots && (
                        <Chip
                          size="small"
                          label={`${dateData.availableSlots.length}個時段`}
                          color="success"
                          sx={{ height: 20, fontSize: '0.625rem' }}
                        />
                      )}
                      {hasBookedSlots && (
                        <Chip
                          size="small"
                          label={`${Object.keys(dateData.bookedSlots).length}個預約`}
                          color="primary"
                          sx={{ height: 20, fontSize: '0.625rem' }}
                        />
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  // 渲染日期編輯區域
  const renderDateEditor = () => {
    if (!editingDate) return null;

    const dateObj = new Date(editingDate);
    const formattedDate = dateObj.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return (
      <Box sx={{ mt: 3, pb: 2 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          編輯 {formattedDate} 的排班
        </Typography>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isRestDay}
                onChange={e => setIsRestDay(e.target.checked)}
              />
            }
            label="標記為休假日"
          />
        </Box>

        {!isRestDay && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              可用時段
            </Typography>

            {/* 快速選擇預設時段 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                快速添加預設時段
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    週一至週五
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {defaultSlotOptions.weekdaySlots.map(slot => (
                      <Chip
                        key={`weekday-${slot}`}
                        label={slot}
                        size="small"
                        onClick={() => handleAddDefaultTimeSlot(slot)}
                        icon={<TimeIcon fontSize="small" />}
                      />
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    週六
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {defaultSlotOptions.saturdaySlots.map(slot => (
                      <Chip
                        key={`saturday-${slot}`}
                        label={slot}
                        size="small"
                        onClick={() => handleAddDefaultTimeSlot(slot)}
                        icon={<TimeIcon fontSize="small" />}
                      />
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    下午
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {defaultSlotOptions.afternoonSlots.map(slot => (
                      <Chip
                        key={`afternoon-${slot}`}
                        label={slot}
                        size="small"
                        onClick={() => handleAddDefaultTimeSlot(slot)}
                        icon={<TimeIcon fontSize="small" />}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                自訂時段
              </Typography>
              {availableSlotsForEdit.map((slot, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TextField
                    label={`時段 ${index + 1}`}
                    variant="outlined"
                    size="small"
                    value={slot}
                    onChange={e => handleSlotInputChange(index, e.target.value)}
                    placeholder="HH:MM"
                    sx={{ mr: 1 }}
                  />
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleRemoveSlotFromEdit(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddSlotToEdit}
                size="small"
                sx={{ mt: 1 }}
              >
                添加時段
              </Button>
            </Box>
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setEditingDate(null);
              setAvailableSlotsForEdit([]);
              setIsRestDay(false);
            }}
            sx={{ mr: 1 }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveScheduleForDate}
            disabled={loadingSchedule}
          >
            {loadingSchedule ? '保存中...' : '保存'}
          </Button>
        </Box>
      </Box>
    );
  };

  // 渲染批量排班界面
  const renderBulkScheduler = () => {
    if (!showBulkScheduler) {
      return (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => setShowBulkScheduler(true)}
          >
            批量排班
          </Button>
        </Box>
      );
    }

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            批量排班設置
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="開始日期"
                type="date"
                value={bulkStartDate}
                onChange={e => setBulkStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="結束日期"
                type="date"
                value={bulkEndDate}
                onChange={e => setBulkEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                選擇星期
              </Typography>
              {renderWeekdayCheckboxes()}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                排班設置
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRestDay}
                    onChange={e => setIsRestDay(e.target.checked)}
                  />
                }
                label="全部標記為休假日"
              />
            </Grid>

            {!isRestDay && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  可用時段設置
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(defaultSlotOptions).map(([key, slots]) => (
                    <Box key={key}>
                      <Typography variant="caption" display="block" gutterBottom>
                        {key === 'weekdaySlots' ? '週一至週五' : 
                         key === 'saturdaySlots' ? '週六' : 
                         key === 'afternoonSlots' ? '下午' : '其他'}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {slots.map(slot => (
                          <Chip
                            key={`${key}-${slot}`}
                            label={slot}
                            size="small"
                            onClick={() => handleAddDefaultTimeSlot(slot)}
                            icon={<TimeIcon fontSize="small" />}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  當前選擇的時段
                </Typography>
                {availableSlotsForEdit.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    尚未選擇任何時段
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableSlotsForEdit.map((slot, index) => (
                      <Chip
                        key={index}
                        label={slot}
                        onDelete={() => handleRemoveSlotFromEdit(index)}
                      />
                    ))}
                  </Box>
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowBulkScheduler(false);
                    setIsRestDay(false);
                    setAvailableSlotsForEdit([]);
                  }}
                  sx={{ mr: 1 }}
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  onClick={handleBulkScheduleSave}
                  disabled={isBulkScheduling}
                >
                  {isBulkScheduling ? '處理中...' : '應用批量排班'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
        排班管理
      </Typography>
      <Typography variant="body1" paragraph>
        在此管理您的服務時段和休假日。點擊日期進行編輯。
      </Typography>

      {errorSchedule && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorSchedule}
        </Alert>
      )}

      {loadingSchedule && !editingDate ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {renderCalendar()}
          {renderDateEditor()}
          {!editingDate && renderBulkScheduler()}
        </>
      )}
    </Box>
  );
};

export default ScheduleManager; 