import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  FormControlLabel,
  Switch,
  Snackbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  AccessTime as TimeIcon,
  CalendarMonth as CalendarIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getSettings, updateSettings, getCalendarToken, resetCalendarToken } from '../../../services/api';

import { defaultSlotOptions } from './utils';

const SettingsManager = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 設置狀態
  const [defaultTimeSlots, setDefaultTimeSlots] = useState([]);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [errorSettings, setErrorSettings] = useState('');
  const [settingsUpdateSuccess, setSettingsUpdateSuccess] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);

  // 治療師資料狀態
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  // 行事曆同步狀態
  const [calendarToken, setCalendarToken] = useState('');
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // 獲取設置

  const fetchSettings = async () => {
    setLoadingSettings(true);
    setErrorSettings('');
    try {
      const response = await getSettings();
      console.log('獲取設置響應:', response.data);
      
      // 適應新的API響應格式
      if (response.data) {
        let settings = response.data;
        
        // 處理與舊版本API兼容性
        if (response.data.settings) {
          // 舊版本API格式
          settings = response.data.settings;
        }
        
        // 設置預設時段
        if (Array.isArray(settings.defaultTimeSlots)) {
          setDefaultTimeSlots(settings.defaultTimeSlots);
        } else if (typeof settings.defaultTimeSlots === 'string') {
          try {
            // 嘗試解析JSON字符串
            const parsed = JSON.parse(settings.defaultTimeSlots);
            setDefaultTimeSlots(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            console.error('解析defaultTimeSlots失敗:', e);
            setDefaultTimeSlots([]);
          }
        } else {
          setDefaultTimeSlots([]);
        }
        
        // 設置治療師資料
        setDoctorName(settings.doctorName || '');
        setClinicName(settings.clinicName || '');
        setNotificationEmail(settings.notificationEmail || '');
      } else {
        throw new Error('無法獲取設置資料');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setErrorSettings(err.response?.data?.message || err.message || '無法加載系統設置。');
    } finally {
      setLoadingSettings(false);
      setSettingsDirty(false);
    }
  };

  // 獲取行事曆 Token
  const fetchCalendarToken = async () => {
    setLoadingToken(true);
    try {
      const response = await getCalendarToken();
      if (response.data && response.data.success) {
        setCalendarToken(response.data.token);
      }
    } catch (err) {
      console.error('Failed to fetch calendar token:', err);
    } finally {
      setLoadingToken(false);
    }
  };

  // 重置行事曆 Token
  const handleResetToken = async () => {
    if (!window.confirm('重置 Token 將導致舊的行事曆訂閱失效，確定要重置嗎？')) {
      return;
    }
    
    setLoadingToken(true);
    try {
      const response = await resetCalendarToken();
      if (response.data && response.data.success) {
        setCalendarToken(response.data.token);
        setSettingsUpdateSuccess(true);
        setTimeout(() => setSettingsUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to reset calendar token:', err);
      setErrorSettings('重置 Token 失敗');
    } finally {
      setLoadingToken(false);
    }
  };

  // 複製訂閱網址
  const handleCopyLink = () => {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const feedUrl = `${backendUrl}/api/calendar/feed/${calendarToken}`;
    navigator.clipboard.writeText(feedUrl);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  // 初始加載
  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchCalendarToken();
    }
  }, [user]);


  // 添加預設時段
  const handleAddDefaultTimeSlot = () => {
    if (!newTimeSlot) return;

    // 驗證時間格式 (HH:MM)
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newTimeSlot)) {
      setErrorSettings('請輸入有效的時間格式 (HH:MM)');
      return;
    }

    // 檢查是否已存在
    if (defaultTimeSlots.includes(newTimeSlot)) {
      setErrorSettings('此時段已添加');
      return;
    }

    // 添加並排序
    const updatedSlots = [...defaultTimeSlots, newTimeSlot].sort();
    setDefaultTimeSlots(updatedSlots);
    setNewTimeSlot('');
    setErrorSettings('');
    setSettingsDirty(true);
  };

  // 移除預設時段
  const handleRemoveDefaultTimeSlot = slotToRemove => {
    setDefaultTimeSlots(currentSlots => {
      const updatedSlots = currentSlots.filter(slot => slot !== slotToRemove);
      setSettingsDirty(true);
      return updatedSlots;
    });
  };

  // 添加預定義時段組
  const handleAddPredefinedSlots = slotGroup => {
    const slotsToAdd = defaultSlotOptions[slotGroup] || [];
    if (slotsToAdd.length === 0) return;

    const updatedSlots = [...defaultTimeSlots];
    slotsToAdd.forEach(slot => {
      if (!updatedSlots.includes(slot)) {
        updatedSlots.push(slot);
      }
    });

    setDefaultTimeSlots(updatedSlots.sort());
    setSettingsDirty(true);
  };

  // 保存設置
  const handleSaveSettings = async () => {
    setLoadingSettings(true);
    setErrorSettings('');
    setSettingsUpdateSuccess(false);

    try {
      // 直接更新設置，不需要先獲取
      const updatedSettings = {
        defaultTimeSlots,
        doctorName,
        clinicName,
        notificationEmail,
      };

      console.log('發送更新設置請求:', updatedSettings);
      const updateResponse = await updateSettings(updatedSettings);
      console.log('更新設置響應:', updateResponse.data);
      
      // 檢查響應格式
      if (updateResponse.data) {
        setSettingsUpdateSuccess(true);
        setSettingsDirty(false);
        // 3秒後關閉成功提示
        setTimeout(() => setSettingsUpdateSuccess(false), 3000);
      } else {
        throw new Error('設置更新失敗');
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      setErrorSettings(err.response?.data?.message || err.message || '無法更新設置。');
    } finally {
      setLoadingSettings(false);
    }
  };

  return (
    <Box>
      <Typography 
        variant={isMobile ? "h5" : "h5"} 
        component="h2" 
        gutterBottom 
        fontWeight="medium"
        sx={{ fontSize: isMobile ? '1.3rem' : undefined }}
      >
        系統設置
      </Typography>
      <Typography 
        variant="body1" 
        paragraph
        sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
      >
        管理系統設置和個人資料。
      </Typography>

      {/* 錯誤信息 */}
      {errorSettings && (
        <Alert severity="error" sx={{ mb: 2, fontSize: isMobile ? '0.85rem' : undefined }}>
          {errorSettings}
        </Alert>
      )}

      {/* 成功信息 */}
      <Snackbar
        open={settingsUpdateSuccess}
        autoHideDuration={3000}
        onClose={() => setSettingsUpdateSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%', fontSize: isMobile ? '0.85rem' : undefined }}>
          設置更新成功
        </Alert>
      </Snackbar>

      {loadingSettings && !settingsUpdateSuccess ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* 個人資料設置 */}
          <Grid item xs={12}>
            <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3, borderRadius: '8px' }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: isMobile ? '1.1rem' : undefined }}
              >
                個人資料
              </Typography>
              <Grid container spacing={isMobile ? 1.5 : 2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="治療師姓名"
                    fullWidth
                    margin="normal"
                    size={isMobile ? "small" : "medium"}
                    value={doctorName}
                    onChange={e => {
                      setDoctorName(e.target.value);
                      setSettingsDirty(true);
                    }}
                    InputLabelProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                    InputProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="診所名稱"
                    fullWidth
                    margin="normal"
                    size={isMobile ? "small" : "medium"}
                    value={clinicName}
                    onChange={e => {
                      setClinicName(e.target.value);
                      setSettingsDirty(true);
                    }}
                    InputLabelProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                    InputProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="通知電子郵件"
                    fullWidth
                    margin="normal"
                    size={isMobile ? "small" : "medium"}
                    type="email"
                    value={notificationEmail}
                    onChange={e => {
                      setNotificationEmail(e.target.value);
                      setSettingsDirty(true);
                    }}
                    helperText="用於接收預約通知和系統提醒"
                    InputLabelProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                    InputProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                    FormHelperTextProps={{
                      style: { fontSize: isMobile ? '0.75rem' : undefined }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* 行事曆同步設置 */}
          <Grid item xs={12}>
            <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3, borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography 
                  variant="h6" 
                  sx={{ fontSize: isMobile ? '1.1rem' : undefined }}
                >
                  行事曆同步 (Apple/Outlook/Google)
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                paragraph
                sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
              >
                透過 iCalendar 訂閱功能，自動將預約同步到您的手機行事曆。
              </Typography>

              {loadingToken ? (
                <CircularProgress size={24} />
              ) : (
                <Box>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'grey.100', 
                      borderRadius: 1, 
                      display: 'flex', 
                      alignItems: 'center',
                      mb: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        flexGrow: 1, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mr: 1
                      }}
                    >
                      {calendarToken 
                        ? `${import.meta.env.VITE_API_BASE_URL || window.location.origin}/api/calendar/feed/${calendarToken}`
                        : '未生成 Token'}
                    </Typography>
                    <IconButton size="small" onClick={handleCopyLink} disabled={!calendarToken}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<CopyIcon />} 
                      onClick={handleCopyLink}
                      disabled={!calendarToken}
                    >
                      {tokenCopied ? '已複製' : '複製訂閱網址'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      color="warning"
                      startIcon={<RefreshIcon />} 
                      onClick={handleResetToken}
                    >
                      重置 Token
                    </Button>
                  </Box>

                  <Alert severity="info" sx={{ mt: 2, '& .MuiAlert-message': { width: '100%' } }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                      如何在 iPhone 設定：
                    </Typography>
                    <Typography variant="body2" component="div" sx={{ fontSize: '0.8rem' }}>
                      1. 複製上方網址<br />
                      2. 打開 iPhone「設定」 > 「行事曆」<br />
                      3. 點選「帳號」 > 「加入帳號」 > 「其他」<br />
                      4. 點選「加入已訂閱的行事曆」<br />
                      5. 貼上網址並儲存
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* 預設時段設置 */}

          <Grid item xs={12}>
            <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: '8px' }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: isMobile ? '1.1rem' : undefined }}
              >
                預設時段設置
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                paragraph
                sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
              >
                設置常用時段，方便排班時快速選擇。這些時段將顯示在排班頁面的快速選擇區域。
              </Typography>

              {/* 預定義時段組 */}
              <Box sx={{ mb: isMobile ? 2 : 3 }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
                >
                  快速添加預定義時段組
                </Typography>
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={6} sm={6} md={3}>
                    <Card variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Typography 
                          variant="subtitle2" 
                          gutterBottom
                          sx={{ fontSize: isMobile ? '0.85rem' : undefined }}
                        >
                          週一至週五
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {defaultSlotOptions.weekdaySlots.map(slot => (
                            <Chip 
                              key={slot} 
                              label={slot} 
                              size="small" 
                              sx={{ 
                                fontSize: isMobile ? '0.7rem' : undefined,
                                height: isMobile ? '20px' : undefined
                              }}
                            />
                          ))}
                        </Box>
                        <Button
                          size="small"
                          onClick={() => handleAddPredefinedSlots('weekdaySlots')}
                          startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.9rem' : undefined }} />}
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : undefined,
                            minHeight: isMobile ? '28px' : undefined
                          }}
                        >
                          全部添加
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={6} md={3}>
                    <Card variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Typography 
                          variant="subtitle2" 
                          gutterBottom
                          sx={{ fontSize: isMobile ? '0.85rem' : undefined }}
                        >
                          週六
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {defaultSlotOptions.saturdaySlots.map(slot => (
                            <Chip 
                              key={slot} 
                              label={slot} 
                              size="small" 
                              sx={{ 
                                fontSize: isMobile ? '0.7rem' : undefined,
                                height: isMobile ? '20px' : undefined
                              }}
                            />
                          ))}
                        </Box>
                        <Button
                          size="small"
                          onClick={() => handleAddPredefinedSlots('saturdaySlots')}
                          startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.9rem' : undefined }} />}
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : undefined,
                            minHeight: isMobile ? '28px' : undefined
                          }}
                        >
                          全部添加
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={6} md={3}>
                    <Card variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Typography 
                          variant="subtitle2" 
                          gutterBottom
                          sx={{ fontSize: isMobile ? '0.85rem' : undefined }}
                        >
                          下午
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {defaultSlotOptions.afternoonSlots.map(slot => (
                            <Chip 
                              key={slot} 
                              label={slot} 
                              size="small" 
                              sx={{ 
                                fontSize: isMobile ? '0.7rem' : undefined,
                                height: isMobile ? '20px' : undefined
                              }}
                            />
                          ))}
                        </Box>
                        <Button
                          size="small"
                          onClick={() => handleAddPredefinedSlots('afternoonSlots')}
                          startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.9rem' : undefined }} />}
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : undefined,
                            minHeight: isMobile ? '28px' : undefined
                          }}
                        >
                          全部添加
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={6} md={3}>
                    <Card variant="outlined" sx={{ borderRadius: '8px' }}>
                      <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Typography 
                          variant="subtitle2" 
                          gutterBottom
                          sx={{ fontSize: isMobile ? '0.85rem' : undefined }}
                        >
                          其他時段
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {defaultSlotOptions.otherSlots.map(slot => (
                            <Chip 
                              key={slot} 
                              label={slot} 
                              size="small" 
                              sx={{ 
                                fontSize: isMobile ? '0.7rem' : undefined,
                                height: isMobile ? '20px' : undefined
                              }}
                            />
                          ))}
                        </Box>
                        <Button
                          size="small"
                          onClick={() => handleAddPredefinedSlots('otherSlots')}
                          startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.9rem' : undefined }} />}
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : undefined,
                            minHeight: isMobile ? '28px' : undefined
                          }}
                        >
                          全部添加
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: isMobile ? 1.5 : 2 }} />

              {/* 自定義時段 */}
              <Box sx={{ mb: isMobile ? 2 : 3 }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
                >
                  自定義時段
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                  <TextField
                    label="新增時段"
                    size="small"
                    placeholder="HH:MM"
                    value={newTimeSlot}
                    onChange={e => setNewTimeSlot(e.target.value)}
                    sx={{ 
                      mr: isMobile ? 0 : 1, 
                      mb: isMobile ? 1 : 0,
                      width: isMobile ? '100%' : 'auto'
                    }}
                    InputLabelProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                    InputProps={{
                      style: { fontSize: isMobile ? '0.9rem' : undefined }
                    }}
                  />
                  <Button 
                    variant="outlined" 
                    startIcon={<AddIcon />} 
                    onClick={handleAddDefaultTimeSlot}
                    fullWidth={isMobile}
                    sx={{ 
                      minHeight: isMobile ? '40px' : undefined,
                      fontSize: isMobile ? '0.85rem' : undefined
                    }}
                  >
                    添加
                  </Button>
                </Box>

                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ fontSize: isMobile ? '0.9rem' : undefined }}
                >
                  已設置時段
                </Typography>
                {defaultTimeSlots.length === 0 ? (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: isMobile ? '0.8rem' : undefined }}
                  >
                    尚未設置任何預設時段
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {defaultTimeSlots.map(slot => (
                      <Chip
                        key={slot}
                        label={slot}
                        icon={<TimeIcon sx={{ fontSize: isMobile ? '1rem' : undefined }} />}
                        onDelete={() => handleRemoveDefaultTimeSlot(slot)}
                        color="primary"
                        sx={{ 
                          fontSize: isMobile ? '0.8rem' : undefined,
                          height: isMobile ? '32px' : undefined
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* 保存按鈕 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: isMobile ? 1 : 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={loadingSettings || !settingsDirty}
                size={isMobile ? "medium" : "large"}
                sx={{ 
                  fontSize: isMobile ? '0.9rem' : undefined,
                  minHeight: isMobile ? '42px' : undefined,
                  px: isMobile ? 2 : 3,
                  borderRadius: '8px'
                }}
              >
                {loadingSettings ? '保存中...' : '保存設置'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SettingsManager; 