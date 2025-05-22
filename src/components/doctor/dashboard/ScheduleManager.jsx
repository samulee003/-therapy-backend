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

// Helper function to convert HH:MM string to total minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) {
    console.error('Invalid time string format for timeToMinutes:', timeStr);
    return 0; // Return 0 or handle error appropriately
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert total minutes from midnight to HH:MM string
const minutesToTime = (totalMinutes) => {
  if (typeof totalMinutes !== 'number' || totalMinutes < 0) {
    console.error('Invalid totalMinutes for minutesToTime:', totalMinutes);
    return '00:00'; // Return a default or handle error
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper function to add minutes to a HH:MM time string
const addMinutesToTime = (timeStr, minutesToAdd) => {
  if (!timeStr || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) {
    console.error('Invalid time string format for addMinutesToTime:', timeStr);
    return null; // Or throw an error
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + minutesToAdd);
  
  const newHours = String(date.getHours()).padStart(2, '0');
  const newMinutes = String(date.getMinutes()).padStart(2, '0');
  return `${newHours}:${newMinutes}`;
};

// 排班管理主組件
const ScheduleManager = ({ user }) => {
  // 狀態管理
  const [schedule, setSchedule] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [errorSchedule, setErrorSchedule] = useState('');
  const [currentScheduleDate, setCurrentScheduleDate] = useState(new Date());
  const [editingDate, setEditingDate] = useState(null);
  const [availableSlotsForEdit, setAvailableSlotsForEdit] = useState([]);
  const [isRestDayForEdit, setIsRestDayForEdit] = useState(false);

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

      // 修正：適應後端API不同的回應格式
      // 檢查是否成功及數據格式
      if (response.data && response.data.schedules) {
        // 新增：先過濾掉測試醫生的原始排班記錄
        const doctorsToFilterByName = ["測試醫生", "Dr. Demo"]; // 假設我們用名字過濾
        // 假設 response.data.schedules 中的每個 item 都有 doctorName 屬性
        // 如果是用 ID 過濾，這裡需要 doctorsToFilterById 和 item.doctorId
        const filteredRawSchedules = response.data.schedules.filter(
          item => !doctorsToFilterByName.includes(item.doctorName) 
        );

        // 將後端返回的排班數據轉換為前端需要的格式
        const scheduleData = {};
        
        // 遍歷過濾後的排班數據，按日期組織
        filteredRawSchedules.forEach(scheduleItem => {
          const dateStr = scheduleItem.date;
          
          let finalAvailableSlots = [];
          // 優先使用後端提供的 defined_slots (假設後端欄位名為 defined_slots)
          if (scheduleItem.defined_slots && Array.isArray(scheduleItem.defined_slots) && scheduleItem.defined_slots.length > 0) {
            finalAvailableSlots = [...scheduleItem.defined_slots].sort(); // 使用副本並排序
             console.log(`日期 ${dateStr}: 使用後端提供的 defined_slots:`, finalAvailableSlots);
          } else if (scheduleItem.start_time && scheduleItem.end_time && scheduleItem.slot_duration) {
            // 如果沒有 defined_slots，則根據 start_time, end_time, slot_duration 生成
            const startMinutes = timeToMinutes(scheduleItem.start_time);
            const endMinutes = timeToMinutes(scheduleItem.end_time);
            for (let i = startMinutes; i < endMinutes; i += scheduleItem.slot_duration) {
              finalAvailableSlots.push(minutesToTime(i));
            }
            console.log(`日期 ${dateStr}: 根據 start/end time 生成 availableSlots:`, finalAvailableSlots);
          }
          
          scheduleData[dateStr] = {
            availableSlots: finalAvailableSlots, // 用於日曆概要顯示
            definedSlots: scheduleItem.defined_slots && Array.isArray(scheduleItem.defined_slots) ? [...scheduleItem.defined_slots].sort() : null, // 儲存原始的 defined_slots 或 null
            isRestDay: scheduleItem.is_rest_day === true || scheduleItem.is_rest_day === 1 // 新增：保存原始的休假狀態
          };
        });
        
        console.log('轉換後的排班數據:', scheduleData);
        setSchedule(scheduleData);
      } else if (response.data && response.data.success && response.data.schedule) {
        // 保留舊的處理邏輯，以防後端API返回舊格式
        const scheduleData = response.data.schedule;

        setSchedule(scheduleData);
      } else {
        console.warn('獲取排班成功但返回格式不明確:', response.data);
        setSchedule({});
      }
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
    console.log('[ScheduleManager] handleEditDate called with date:', dateStr);
    setEditingDate(dateStr);
    const dayData = schedule[dateStr] || {};
    let rawSlots = [];

    // 優先使用 definedSlots，如果不存在或為空，再考慮 availableSlots (可能是舊資料的備援)
    if (dayData.definedSlots && Array.isArray(dayData.definedSlots)) {
      rawSlots = [...dayData.definedSlots];
      console.log('編輯日期', dateStr, '使用 definedSlots (原始):', rawSlots);
    } else if (dayData.availableSlots && Array.isArray(dayData.availableSlots)) {
      // 這是備援，理想情況下前端應只依賴 definedSlots 進行編輯
      rawSlots = [...dayData.availableSlots]; 
      console.warn('編輯日期', dateStr, 'definedSlots 為空/不存在，回退使用 availableSlots (原始):', rawSlots);
    }

    const cleanedSlots = rawSlots.map(slot => {
      if (typeof slot === 'string') {
        const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (hhmmRegex.test(slot)) {
          return slot; // Correct HH:MM format
        }

        // 嘗試轉換常見的非標準格式
        const lowerSlot = slot.toLowerCase();
        // Regex to capture hours and optional minutes, allowing for formats like "下午 02:" or "2pm" or "14:30"
        const timePattern = /(\d{1,2})(:(\d{2}))?/; 
        const match = lowerSlot.match(timePattern);

        if (match) {
          let hours = parseInt(match[1], 10);
          // Minutes are optional in the regex (group 3). If undefined, default to 0.
          const minutes = match[3] ? parseInt(match[3], 10) : 0; 

          if (isNaN(hours) || isNaN(minutes)) {
            console.warn(`無法從 "${slot}" 解析出有效的數字時和分。`);
            return null;
          }

          // Adjust hours for AM/PM if present
          if (lowerSlot.includes('pm') || lowerSlot.includes('下午')) {
            if (hours < 12) hours += 12;
          } else if (lowerSlot.includes('am') || lowerSlot.includes('上午')) {
            if (hours === 12) hours = 0; // 12 AM is 00 hours
          }

          // Final validation and formatting
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(minutes).padStart(2, '0');
            const convertedSlot = `${formattedHours}:${formattedMinutes}`;
            console.log(`時段 "${slot}" 已轉換為 "${convertedSlot}"`);
            return convertedSlot;
          } else {
            console.warn(`轉換後的時段 "${hours}:${minutes}" (來自 "${slot}") 無效。`);
            return null;
          }
        }
      }
      console.warn(`時段 "${slot}" (類型: ${typeof slot}) 格式不正確或無法轉換，將被忽略。`);
      return null;
    }).filter(Boolean); // 移除所有 null 值

    setAvailableSlotsForEdit(cleanedSlots);

    // 新增：設置 isRestDayForEdit 狀態
    // 假設 dayData.isRestDay 是在 fetchSchedule 中正確填充的布林值
    setIsRestDayForEdit(dayData.isRestDay === true); // 確保是布林值

    if (rawSlots.length > 0 && cleanedSlots.length < rawSlots.length) {
      setErrorSchedule('注意：部分已儲存的時段格式不正確，已自動過濾或嘗試轉換。請檢查並重新儲存以確保格式統一。');
    } else {
      setErrorSchedule(''); // 如果沒有格式問題，清除之前的錯誤訊息
    }
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
    // 檢查輸入值是否為非標準格式 (如 "上午 10:")
    let formattedValue = value;
    
    // 處理中文上午/下午格式
    if (value.includes('上午') || value.includes('下午')) {
      const timePattern = /(\d{1,2})(?::(\d{0,2}))?/;
      const match = value.match(timePattern);
      
      if (match) {
        let hours = parseInt(match[1], 10);
        // 如果分鐘部分未指定或不完整，默認為 00
        let minutes = match[2] ? parseInt(match[2], 10) : 0;
        
        // 調整小時 (AM/PM)
        if (value.includes('下午') && hours < 12) {
          hours += 12;
        } else if (value.includes('上午') && hours === 12) {
          hours = 0;
        }
        
        // 格式化為標準 HH:MM
        formattedValue = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        console.log(`時間格式已標準化: "${value}" -> "${formattedValue}"`);
      }
    } 
    // 處理僅有小時沒有分鐘的情況 (如 "10:")
    else if (/^\d{1,2}:$/.test(value)) {
      const hours = parseInt(value.replace(':', ''), 10);
      formattedValue = `${String(hours).padStart(2, '0')}:00`;
      console.log(`時間格式已補充分鐘: "${value}" -> "${formattedValue}"`);
    }
    
    const updatedSlots = [...availableSlotsForEdit];
    updatedSlots[index] = formattedValue;
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
    if (!editingDate || !user || !user.id) {
      setErrorSchedule('無法保存排班：缺少日期或使用者資訊。');
      console.error('handleSaveScheduleForDate: missing editingDate or user.id', { editingDate, user });
      return;
    }

    const doctorId = user.id;

    if (!Array.isArray(availableSlotsForEdit)) {
      console.error('handleSaveScheduleForDate: availableSlotsForEdit is not an array', availableSlotsForEdit);
      setErrorSchedule('儲存排班時發生內部錯誤 (資料格式錯誤)');
      return;
    }

    setLoadingSchedule(true);
    setErrorSchedule('');

    try {
      const validSlots = availableSlotsForEdit
        .filter(slot => slot && /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))
        .sort();
      
      // 檢查是否有格式不符合的時間
      const invalidSlots = availableSlotsForEdit.filter(
        slot => slot && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)
      );
      
      if (invalidSlots.length > 0) {
        setErrorSchedule(`存在 ${invalidSlots.length} 個時間格式不正確 (必須為 HH:MM 格式)，請修正後再儲存`);
        console.error('時間格式不正確:', invalidSlots);
        return;
      }

      // isRestDay 直接來自 isRestDayForEdit 狀態
      const finalIsRestDay = isRestDayForEdit;

      // 如果清空了所有時段，我們將其視為休息日來保存，以避免後端關於 startTime/endTime 的錯誤
      // const isEffectivelyRestDay = validSlots.length === 0; // 這行不再需要

      // 只有在不是休息日且有有效時段的情況下，才計算 startTime 和 endTime
      // 否則，它們將是 null，這對於休息日或沒有時段的排班是可接受的
      let startTime = null;
      let endTime = null;
      const slotDurationMinutes = 30; // 假設的持續時間，後端可能也有自己的預設

      // 只有當不是休假日且有有效時段時，才計算 startTime 和 endTime
      if (!finalIsRestDay && validSlots.length > 0) {
        startTime = validSlots[0];
        const lastSlotStartTime = validSlots[validSlots.length - 1];
        endTime = addMinutesToTime(lastSlotStartTime, slotDurationMinutes);
      }

      const payload = {
        doctorId,
        date: editingDate,
        startTime, // 如果 finalIsRestDay 為 true 或 validSlots 為空, 這會是 null
        endTime,   // 同上
        isRestDay: finalIsRestDay, // 使用 isRestDayForEdit 的值
        slotDuration: slotDurationMinutes, // 或者後端處理此值
        definedSlots: finalIsRestDay ? [] : validSlots // 如果休假，則 definedSlots 為空
      };

      console.log(`正在保存 ${editingDate} 的排班資料 (來自勾選框):`, payload);
      // 確認 saveScheduleForDate API 服務函式能正確傳遞 isRestDay
      // await saveScheduleForDate(doctorId, editingDate, startTime, endTime, isEffectivelyRestDay, slotDurationMinutes, validSlots);
      // 更新調用以匹配 payload
      await saveScheduleForDate(
        payload.doctorId, 
        payload.date, 
        payload.startTime, 
        payload.endTime, 
        payload.isRestDay, 
        payload.slotDuration, 
        payload.definedSlots
      );

      setErrorSchedule(''); // 清除之前的錯誤或提示
      setEditingDate(null);
      setAvailableSlotsForEdit([]);
      
      const year = currentScheduleDate.getFullYear();
      const month = currentScheduleDate.getMonth() + 1;
      fetchSchedule(year, month); // 重新獲取排班數據以更新日曆顯示

    } catch (err) {
      console.error(`保存 ${editingDate} 排班失敗:`, err);
      const apiErrorMessage = err.response?.data?.message || err.message || `保存 ${editingDate} 的排班失敗。`;
      const detailedError = err.formatted?.message || apiErrorMessage;
      setErrorSchedule(detailedError);
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

      const doctorId = user.id;
      const slotDurationMinutes = 30; // 預設或從配置讀取
      const isRestDayForBulk = validSlots.length === 0; // 如果沒有提供有效時段，則視為批量休假

      // 保存每個目標日期的排班
      for (const dateStr of targetDates) {
        let startTime = null;
        let endTime = null;

        if (!isRestDayForBulk && validSlots.length > 0) {
          startTime = validSlots[0];
          const lastSlotStartTime = validSlots[validSlots.length - 1];
          endTime = addMinutesToTime(lastSlotStartTime, slotDurationMinutes);
        }

        // 準備 payload，與單日保存的 payload 結構一致
        const payload = {
          doctorId,
          date: dateStr,
          startTime,
          endTime,
          isRestDay: isRestDayForBulk, // 如果沒有有效時段，則設為休假日
          slotDuration: slotDurationMinutes,
          definedSlots: validSlots // 即使是休假日，也傳遞空陣列（後端會處理）
        };

        console.log(`批量保存 ${dateStr} 的排班資料:`, payload);

        console.log('[DEBUG] Bulk Save - Before calling API service for date:', dateStr, {
          isRestDayForAPI: payload.isRestDay,
          startTimeForAPI: payload.startTime,
          endTimeForAPI: payload.endTime,
          definedSlotsForAPI: payload.definedSlots,
          originalValidSlotsLength: validSlots.length,
          isRestDayForBulkInternalLogic: isRestDayForBulk
        });

        await saveScheduleForDate(
          payload.doctorId,
          payload.date,
          payload.startTime,
          payload.endTime,
          payload.isRestDay,
          payload.slotDuration,
          payload.definedSlots
        );
        console.log(`已批量保存 ${dateStr} 的排班`);
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
                    bgcolor: hasAvailableSlots ? 'success.50' : 'background.paper',
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
                  {hasAvailableSlots && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                      <Chip
                        size="small"
                        label={`${dateData.availableSlots.length}個時段`}
                        color="success"
                        sx={{ height: 20, fontSize: '0.625rem' }}
                      />
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
            </Grid>

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

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowBulkScheduler(false);
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
          {editingDate && (
            <Paper elevation={3} sx={{ mt: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                編輯 {editingDate} 的排班
              </Typography>

              {/* 新增：設為休假日勾選框 */}
              <FormGroup sx={{ mb: 1, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isRestDayForEdit}
                      onChange={(e) => {
                        setIsRestDayForEdit(e.target.checked);
                        if (e.target.checked) {
                          setAvailableSlotsForEdit([]); // 如果設為休假，清空時段
                        }
                      }}
                      color="primary"
                    />
                  }
                  label="設定為休假日 (當日將不提供任何時段)"
                />
              </FormGroup>
              <Divider sx={{ mb: 2 }} />
              
              {/* 時段編輯區域，現在受 isRestDayForEdit 控制 */}
              {!isRestDayForEdit && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    可用時段 (格式 HH:MM):
                  </Typography>
                  {availableSlotsForEdit.map((slot, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TextField
                        size="small"
                        variant="outlined"
                        type="time"
                        value={slot}
                        onChange={(e) => handleSlotInputChange(index, e.target.value)}
                        sx={{ width: '140px', mr: 1 }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ 
                          step: 1800, /* 30分鐘步進 */
                          pattern: "[0-9]{2}:[0-9]{2}" /* 強制 HH:MM 格式 */
                        }}
                        placeholder="HH:MM"
                        helperText={!/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot) ? "請使用 HH:MM 格式" : ""}
                        error={slot && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)}
                      />
                      <IconButton onClick={() => handleRemoveSlotFromEdit(index)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddSlotToEdit}
                    sx={{ mt: 1 }}
                    // disabled 屬性不再需要
                  >
                    新增時段
                  </Button>

                  <Box sx={{ mt: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Object.entries(defaultSlotOptions).map(([key, slots]) => (
                      <Box key={key} sx={{ mb:1}}>
                        <Typography variant="caption" display="block" gutterBottom>
                          {key === 'weekdaySlots' ? '常用(平日)' : 
                          key === 'saturdaySlots' ? '常用(週六)' : 
                          key === 'afternoonSlots' ? '常用(下午)' : '其他'}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {slots.map(slotValue => (
                            <Chip
                              key={`${key}-${slotValue}`}
                              label={slotValue}
                              size="small"
                              onClick={() => handleAddDefaultTimeSlot(slotValue)}
                              icon={<TimeIcon fontSize="small" />}
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Box mt={3} display="flex" justifyContent="flex-end">
                <Button onClick={() => setEditingDate(null)} sx={{ mr: 1 }}>
                  取消
                </Button>
                <Button variant="contained" onClick={handleSaveScheduleForDate} disabled={loadingSchedule}>
                  {loadingSchedule ? <CircularProgress size={24} /> : '保存更改'}
                </Button>
              </Box>
            </Paper>
          )}
          {!editingDate && renderBulkScheduler()}
        </>
      )}
    </Box>
  );
};

export default ScheduleManager; 