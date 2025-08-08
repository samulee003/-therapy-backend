import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Grid,
  Link,
  InputAdornment,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  FormHelperText,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { loginUser } from '../services/api';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
// import GoogleLoginButton from '../components/auth/GoogleLoginButton'; // 暫時隱藏Google登入功能

const LoginPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(''); // Use email as username
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Get login function from context

  // Email validation pattern
  const EMAIL_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    let formIsValid = true;
    let newErrors = { email: '', password: '' };

    // 驗證電子郵件
    if (!email.trim()) {
      newErrors.email = '請輸入電子郵件';
      formIsValid = false;
    } else if (!EMAIL_PATTERN.test(email)) {
      newErrors.email = '請輸入有效的電子郵件格式';
      formIsValid = false;
    }

    // 驗證密碼
    if (!password) {
      newErrors.password = '請輸入密碼';
      formIsValid = false;
    }

    setErrors(newErrors);
    return formIsValid;
  };

  const handleEmailChange = e => {
    const value = e.target.value;
    setEmail(value);
    // 即時驗證電子郵件格式
    if (!value.trim()) {
      setErrors(prev => ({ ...prev, email: '請輸入電子郵件' }));
    } else if (!EMAIL_PATTERN.test(value)) {
      setErrors(prev => ({ ...prev, email: '請輸入有效的電子郵件格式' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = e => {
    const value = e.target.value;
    setPassword(value);
    // 即時驗證密碼
    if (!value) {
      setErrors(prev => ({ ...prev, password: '請輸入密碼' }));
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  // 初始載入：如果先前在本機勾選了記住密碼，預填資料
  React.useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('remember_me_email');
      const savedPassword = localStorage.getItem('remember_me_password');
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedPassword) {
        setPassword(savedPassword);
        setRememberPassword(true);
      }
    } catch (e) {
      console.warn('讀取本機記住密碼失敗：', e);
    }
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    console.log('[LoginPage.jsx] handleSubmit: starting with email:', email, 'password:', password.substring(0, 3) + '...'); // 僅顯示部分密碼以策安全

    // 進行表單驗證
    if (!validateForm()) {
      console.log('[LoginPage.jsx] handleSubmit: form validation failed');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 修改：使用 email 而不是 username
      console.log('[LoginPage.jsx] handleSubmit: calling loginUser with:', { email, password: password.substring(0, 3) + '...' });
      const response = await loginUser({ email, password });
      console.log('[LoginPage.jsx] handleSubmit: loginUser response:', response);
      // console.log('Login successful:', response.data); // 此行已存在，但上面一行更詳細

      // 檢查回應中是否包含用戶資料
      // 後端直接返回 { message: '登入成功', user: {...} }
      if (response && response.data && response.data.user) {
        console.log('[LoginPage.jsx] handleSubmit: user data found in response:', response.data.user);
        
        // 保存 token 到 localStorage（如果後端提供）
        if (response.data.token) {
          localStorage.setItem('auth_token', response.data.token);
        }

        // 同步記住密碼偏好
        try {
          if (rememberPassword) {
            localStorage.setItem('remember_me_email', email);
            localStorage.setItem('remember_me_password', password);
          } else {
            localStorage.removeItem('remember_me_email');
            localStorage.removeItem('remember_me_password');
          }
        } catch (storageErr) {
          console.warn('同步記住密碼偏好時發生問題：', storageErr);
        }
        
        // 使用 AuthContext 的 login 函數儲存用戶資料
        login(response.data.user);

        // 根據用戶角色重定向
        if (response.data.user.role === 'doctor' || response.data.user.role === 'admin') {
          navigate('/therapist-dashboard');
        } else {
          navigate('/patient-dashboard');
        }
      } else {
        console.error('[LoginPage.jsx] handleSubmit: Login response format incorrect or user data missing. Response data:', response ? response.data : 'No response data');
        // console.error('登入回應格式不正確:', response.data); // 此行已存在
        throw new Error('伺服器回應格式不正確，請聯繫管理員。');
      }
    } catch (err) {
      console.error('[LoginPage.jsx] handleSubmit: Login failed. Full error object:', err);
      if (err.response) {
        console.error('[LoginPage.jsx] handleSubmit: Error response data:', err.response.data);
        console.error('[LoginPage.jsx] handleSubmit: Error response status:', err.response.status);
        console.error('[LoginPage.jsx] handleSubmit: Error response headers:', err.response.headers);
      } else if (err.request) {
        console.error('[LoginPage.jsx] handleSubmit: Error request data:', err.request);
      } else {
        console.error('[LoginPage.jsx] handleSubmit: Error message:', err.message);
      }
      // console.error('Login failed:', err); // 此行已存在
      // 檢查具體的錯誤回應
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message || '登入失敗，請檢查您的帳號或密碼。';
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('[LoginPage.jsx] handleSubmit: finished');
    }
  };

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
          登入
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          歡迎回來！請登入您的帳號以繼續使用心理治療預約系統。
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
            id="email"
            label="電子郵件 (作為用戶名)"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={handleEmailChange}
            disabled={loading}
            error={!!errors.email}
            helperText={errors.email}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="密碼"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            disabled={loading}
            error={!!errors.password}
            helperText={errors.password}
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
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                color="secondary"
                size="small"
              />
            }
            label={<Typography variant="body2">記住密碼（僅在本機瀏覽器保存）</Typography>}
            sx={{ mt: 1 }}
          />

          <Box sx={{ textAlign: 'right', mt: 1 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2" color="primary">
              忘記密碼？
            </Link>
          </Box>

          <Box sx={{ position: 'relative', mt: 3, mb: 2 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || !!errors.email || !!errors.password}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '登入'}
            </Button>
          </Box>

          {/* Google 登入功能暫時隱藏 */}
          {false && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  或使用社交帳號登入
                </Typography>
              </Divider>

              {/* Google 登入按鈕 */}
              <GoogleLoginButton 
                mode="login"
                onSuccess={(response) => {
                  console.log('Google login success:', response);
                  // 根據用戶角色重定向
                  if (response.user.role === 'doctor' || response.user.role === 'admin') {
                    navigate('/therapist-dashboard');
                  } else {
                    navigate('/patient-dashboard');
                  }
                }}
                onError={(error) => {
                  console.error('Google login error:', error);
                  setError(error.message || 'Google登入失敗');
                }}
                disabled={loading}
              />
            </>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              還沒有帳號？{' '}
              <Link
                component={RouterLink}
                to="/register"
                variant="body2"
                color="primary"
                fontWeight="medium"
              >
                立即註冊
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
