import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { registerUser, formatApiError } from '../services/api';
import { ErrorAlert, PrivacyPolicyDialog } from '../components/common';
// import GoogleLoginButton from '../components/auth/GoogleLoginButton'; // 暫時隱藏Google註冊功能

const RegisterPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    agreeToPrivacyPolicy: false,
  });

  // 表單驗證錯誤
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    agreeToPrivacyPolicy: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();

  // 表單驗證正則表達式
  const PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PASSWORD_MEDIUM: /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d]{6,}$/,
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateField = (name, value) => {
    let errorMessage = '';

    switch (name) {
      case 'email':
        if (!value.trim()) {
          errorMessage = '請輸入您的電子郵件';
        } else if (!PATTERNS.EMAIL.test(value)) {
          errorMessage = '請輸入有效的電子郵件格式 (例如: user@example.com)';
        }
        break;

      case 'password':
        if (!value) {
          errorMessage = '請輸入密碼';
        } else if (value.length < 6) {
          errorMessage = '密碼長度至少為 6 位';
        } else if (!PATTERNS.PASSWORD_MEDIUM.test(value)) {
          errorMessage = '密碼需包含至少一個字母和一個數字';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          errorMessage = '請確認您的密碼';
        } else if (value !== formData.password) {
          errorMessage = '兩次密碼輸入不一致';
        }
        break;

      case 'agreeToPrivacyPolicy':
        if (!value) {
          errorMessage = '請詳閱並同意個人資料收集條款';
        }
        break;

      default:
        break;
    }

    return errorMessage;
  };

  const handleChange = e => {
    const { name, value } = e.target;

    // 更新表單數據
    setFormData({
      ...formData,
      [name]: value,
    });

    // 更新錯誤訊息
    setErrors({
      ...errors,
      [name]: validateField(name, value),
    });

    // 在密碼欄位變化時，重新驗證確認密碼
    if (name === 'password') {
      setErrors(prev => ({
        ...prev,
        confirmPassword: formData.confirmPassword
          ? value === formData.confirmPassword
            ? ''
            : '兩次密碼輸入不一致'
          : prev.confirmPassword,
      }));
    }
  };

  const validateForm = () => {
    const formErrors = {};

      // 驗證電子郵件
    formErrors.email = validateField('email', formData.email);

      // 驗證密碼
    formErrors.password = validateField('password', formData.password);

      // 驗證確認密碼
    formErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);

      // 驗證條款同意
    formErrors.agreeToPrivacyPolicy = validateField('agreeToPrivacyPolicy', formData.agreeToPrivacyPolicy);

    setErrors(formErrors);

    return !formErrors.email && !formErrors.password && !formErrors.confirmPassword && !formErrors.agreeToPrivacyPolicy;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setError('');
    setLoading(true);

    const registrationData = {
      username: formData.email,
      password: formData.password,
      role: formData.role,
    };

    try {
      const response = await registerUser(registrationData);
      setRegistrationSuccess(true);
      // 顯示成功訊息3秒後跳轉
      setTimeout(() => {
        navigate('/login', { state: { message: '註冊成功！請使用您的帳號登入。' } });
      }, 3000);
    } catch (err) {
      console.error('Registration failed:', err);
      // 使用格式化的錯誤訊息
      const formattedError = err.formatted || formatApiError(err, '註冊失敗，請稍後再試');
      setError(formattedError.message);

      // 如果伺服器返回的是電子郵件已存在的錯誤，設置對應欄位的錯誤
      if (formattedError.code === 409) {
        setErrors(prev => ({
          ...prev,
          email: '此電子郵件已被註冊',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  // 如果註冊成功，顯示成功頁面
  if (registrationSuccess) {
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
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom color="success.main" sx={{ fontWeight: 'bold' }}>
            🎉 註冊成功！
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
            您的帳號已成功創建，系統將在3秒後自動跳轉到登入頁面。
          </Typography>
          <Typography variant="body2" color="text.secondary">
            如果頁面未自動跳轉，請點擊{' '}
            <Link
              component={RouterLink}
              to="/login"
              color="primary"
              fontWeight="medium"
            >
              這裡
            </Link>
            {' '}手動跳轉。
          </Typography>
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
          註冊帳號
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          創建您的帳號以使用心理治療預約系統
        </Typography>

        {error && (
          <ErrorAlert message={error} onClose={() => setError('')} sx={{ width: '100%', mb: 3 }} />
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Grid container spacing={3}>
            {/* 電子郵件欄位 */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="電子郵件 (Email)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email || '這將作為您的登入用戶名'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* 密碼欄位 */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="密碼 (Password)"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
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
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* 確認密碼欄位 */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="確認密碼 (Confirm Password)"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
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
                        aria-label="toggle confirm password visibility"
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* 密碼安全提示 */}
            <Grid item xs={12}>
              <FormHelperText>
                密碼安全規則:
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  <li>至少 6 個字符</li>
                  <li>必須包含至少一個字母和一個數字</li>
                </ul>
              </FormHelperText>
            </Grid>

            {/* 身份選擇 */}
            <Grid item xs={12}>
              <FormControl component="fieldset" required>
                <FormLabel component="legend">註冊身份 (Role)</FormLabel>
                <RadioGroup
                  row
                  aria-label="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  sx={{ mt: 1 }}
                >
                  <FormControlLabel value="patient" control={<Radio />} label="患者 (Patient)" />
                  <FormControlLabel
                    value="doctor"
                    control={<Radio />}
                    label="心理治療師 (Therapist)"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* 個人資料收集條款同意 */}
            <Grid item xs={12}>
              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.agreeToPrivacyPolicy}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setFormData({
                          ...formData,
                          agreeToPrivacyPolicy: newValue,
                        });
                        setErrors({
                          ...errors,
                          agreeToPrivacyPolicy: validateField('agreeToPrivacyPolicy', newValue),
                        });
                      }}
                      name="agreeToPrivacyPolicy"
                      color="primary"
                    />
                  }
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', lineHeight: 1.6 }}>
                      <Typography variant="body2" component="span" sx={{ mr: 0.5 }}>
                        我已詳閱並同意
                      </Typography>
                      <PrivacyPolicyDialog 
                        linkText="個人資料收集條款" 
                        linkProps={{ 
                          variant: 'body2',
                          sx: { fontSize: 'inherit' }
                        }}
                      />
                    </Box>
                  }
                  sx={{
                    alignItems: 'flex-start',
                    '& .MuiFormControlLabel-label': {
                      paddingTop: '2px',
                    }
                  }}
                />
                {errors.agreeToPrivacyPolicy && (
                  <FormHelperText error sx={{ mt: 1, ml: 4 }}>
                    {errors.agreeToPrivacyPolicy}
                  </FormHelperText>
                )}
              </Box>
            </Grid>

            {/* 註冊按鈕 */}
            <Grid item xs={12}>
              <Button
                type="submit"
                fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                sx={{ mt: 2, py: 1.5 }}
                  >
                {loading ? <CircularProgress size={24} color="inherit" /> : '註冊帳號'}
                  </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Google 註冊功能暫時隱藏 */}
        {false && (
          <Box sx={{ width: '100%', mt: 4 }}>
            <Divider sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                或使用社交帳號註冊
              </Typography>
            </Divider>

            {/* Google 註冊按鈕 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                選擇身份進行Google註冊：
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <GoogleLoginButton 
                    mode="register"
                    role="patient"
                    size="medium"
                    onSuccess={(response) => {
                      console.log('Google register success (patient):', response);
                      navigate('/patient-dashboard');
                    }}
                    onError={(error) => {
                      console.error('Google register error:', error);
                      setError(error.message || 'Google註冊失敗');
                    }}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={6}>
                  <GoogleLoginButton 
                    mode="register"
                    role="doctor"
                    size="medium"
                    onSuccess={(response) => {
                      console.log('Google register success (doctor):', response);
                      navigate('/therapist-dashboard');
                    }}
                    onError={(error) => {
                      console.error('Google register error:', error);
                      setError(error.message || 'Google註冊失敗');
                    }}
                    disabled={loading}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />
          </Box>
        )}

        <Box sx={{ width: '100%', mt: 2 }}>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              已有帳號？{' '}
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                color="primary"
                fontWeight="medium"
              >
                立即登入
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
