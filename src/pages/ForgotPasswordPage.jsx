import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Link,
  InputAdornment,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { requestPasswordReset } from '../services/api';

const ForgotPasswordPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Email validation pattern
  const EMAIL_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('請輸入電子郵件');
      return false;
    } else if (!EMAIL_PATTERN.test(email)) {
      setEmailError('請輸入有效的電子郵件格式');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    // 即時驗證
    if (!value.trim()) {
      setEmailError('請輸入電子郵件');
    } else if (!EMAIL_PATTERN.test(value)) {
      setEmailError('請輸入有效的電子郵件格式');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await requestPasswordReset({ email });
      
      if (response && response.data) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Password reset request failed:', err);
      const errorMessage = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        '無法發送密碼重置郵件，請稍後再試。';
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
            密碼重置郵件已發送！
          </Alert>
          
          <Typography variant="h5" component="h1" color="primary" fontWeight="bold" gutterBottom>
            請檢查您的電子郵件
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            我們已向 <strong>{email}</strong> 發送了密碼重置連結。
            請檢查您的收件箱並按照郵件中的指示重置密碼。
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            如果您沒有收到郵件，請檢查垃圾郵件資料夾。
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/login"
            fullWidth
            sx={{ mt: 2 }}
          >
            返回登入
          </Button>
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
          忘記密碼
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          請輸入您的電子郵件地址，我們將向您發送密碼重置連結。
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
            label="電子郵件"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={handleEmailChange}
            disabled={loading}
            error={!!emailError}
            helperText={emailError}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon color="action" />
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
              disabled={loading || !!emailError}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '發送重置郵件'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Link
              component={RouterLink}
              to="/login"
              variant="body2"
              color="primary"
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 20, mr: 0.5 }} />
              返回登入
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPasswordPage; 