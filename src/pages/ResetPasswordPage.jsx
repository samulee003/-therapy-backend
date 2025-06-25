import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { resetPassword } from '../services/api';
import { debugResetTokens, debugUsers } from '../services/emailService';

const ResetPasswordPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
  });
  
  // 從 URL 獲取 token
  const token = searchParams.get('token');
  
  useEffect(() => {
    console.log('重置密碼頁面加載，令牌:', token);
    console.log('URL搜索參數:', searchParams.toString());
    
    // 調試localStorage狀態
    debugResetTokens();
    debugUsers();
    
    // 如果沒有 token，重定向到忘記密碼頁面
    if (!token) {
      console.log('沒有令牌，重定向到忘記密碼頁面');
      navigate('/forgot-password');
    }
  }, [token, navigate, searchParams]);

  // 密碼驗證模式
  const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;

  const validateForm = () => {
    let isValid = true;
    let newErrors = { password: '', confirmPassword: '' };

    // 驗證密碼
    if (!formData.password) {
      newErrors.password = '請輸入新密碼';
      isValid = false;
    } else if (!PASSWORD_PATTERN.test(formData.password)) {
      newErrors.password = '密碼必須至少 6 位，包含字母和數字';
      isValid = false;
    }

    // 驗證確認密碼
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '請確認密碼';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '兩次輸入的密碼不一致';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // 即時驗證
    if (name === 'password') {
      if (!value) {
        setErrors(prev => ({ ...prev, password: '請輸入新密碼' }));
      } else if (!PASSWORD_PATTERN.test(value)) {
        setErrors(prev => ({ ...prev, password: '密碼必須至少 6 位，包含字母和數字' }));
      } else {
        setErrors(prev => ({ ...prev, password: '' }));
      }
    }

    if (name === 'confirmPassword' || (name === 'password' && formData.confirmPassword)) {
      const comparePassword = name === 'password' ? value : formData.password;
      const compareConfirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
      
      if (compareConfirmPassword && comparePassword !== compareConfirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: '兩次輸入的密碼不一致' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('提交重置密碼表單');
    console.log('令牌:', token);
    console.log('密碼長度:', formData.password.length);
    
    if (!validateForm()) {
      console.log('表單驗證失敗');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('開始調用resetPassword API...');
      const response = await resetPassword({
        token,
        password: formData.password,
      });
      
      console.log('resetPassword API 響應:', response);
      
      if (response && response.data) {
        console.log('密碼重置成功');
        setSuccess(true);
        // 3秒後重定向到登入頁面
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      console.error('Password reset failed:', err);
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        '無法重置密碼，請稍後再試。';
      console.error('錯誤訊息:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container component="main" maxWidth="sm" sx={{ mb: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            mt: isMobile ? 2 : 8,
          }}
        >
          <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
            密碼重置成功！
          </Alert>
          
          <Typography variant="h5" component="h1" color="primary" fontWeight="bold" gutterBottom>
            密碼已更新
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            您的密碼已成功重置。即將跳轉到登入頁面...
          </Typography>
          
          <CircularProgress color="primary" />
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
          mt: isMobile ? 2 : 8,
        }}
      >
        <Typography component="h1" variant="h4" color="primary" fontWeight="bold" gutterBottom>
          重置密碼
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          請輸入您的新密碼
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="新密碼"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            autoFocus
            value={formData.password}
            onChange={handleInputChange}
            disabled={loading}
            error={!!errors.password}
            helperText={errors.password || '至少 6 位，需包含字母和數字'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="確認新密碼"
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            disabled={loading}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ position: 'relative', mt: 3, mb: 2 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || !!errors.password || !!errors.confirmPassword}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '重置密碼'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPasswordPage; 