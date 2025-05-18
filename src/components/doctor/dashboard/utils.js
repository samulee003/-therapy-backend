// 格式化日期為 YYYY-MM-DD 格式，供 API 使用
export const formatDate = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 獲取預約狀態的顯示文本
export const getStatusText = status => {
  switch (status) {
    case 'confirmed':
      return '已確認';
    case 'cancelled':
      return '已取消';
    case 'completed':
      return '已完成';
    default:
      return '待確認';
  }
};

// 獲取預約狀態對應的顏色
export const getStatusColor = status => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'cancelled':
      return 'default';
    case 'completed':
      return 'primary';
    default:
      return 'warning';
  }
};

// 預設時段列表
export const defaultSlotOptions = {
  weekdaySlots: ['14:00', '15:30', '17:00', '18:30'],
  saturdaySlots: ['10:00', '11:30'],
  afternoonSlots: ['14:00', '15:30', '17:00'],
  otherSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
};

// 產生批量排班的目標日期列表
export const generateTargetDates = (bulkStartDate, bulkEndDate, selectedWeekdays) => {
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