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
} from '@mui/icons-material';
import { getSettings, updateSettings } from '../../../services/api';
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

  // 獲取設置
  const fetchSettings = async () => {
    setLoadingSettings(true);
    setErrorSettings('');
    try {
      const response = await getSettings();
      if (response.data && response.data.success && response.data.settings) {
        // 設置預設時段
        setDefaultTimeSlots(response.data.settings.defaultTimeSlots || []);
        // 設置治療師資料
        setDoctorName(response.data.settings.doctorName || '');
        setClinicName(response.data.settings.clinicName || '');
        setNotificationEmail(response.data.settings.notificationEmail || '');
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

  // 初始加載
  useEffect(() => {
    if (user) {
      fetchSettings();
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
      // 獲取當前設置，以保留其他設置字段
      const response = await getSettings();
      if (!response.data || !response.data.success) {
        throw new Error('無法獲取當前設置');
      }

      const currentSettings = response.data.settings;
      // 更新設置
      const updatedSettings = {
        ...currentSettings,
        defaultTimeSlots: [...defaultTimeSlots],
        doctorName,
        clinicName,
        notificationEmail,
      };

      // 發送更新請求
      const updateResponse = await updateSettings(updatedSettings);
      if (updateResponse.data && updateResponse.data.success) {
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