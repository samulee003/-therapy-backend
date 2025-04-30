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
  Alert
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { loginUser } from '../services/api';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

const LoginPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(''); // Use email as username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Get login function from context

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Use email as username for login
      const response = await loginUser({ username: email, password });
      console.log('Login successful:', response.data);
      
      // Use the login function from AuthContext
      // Check if the user object exists in the response
      if (response.data && response.data.user) { // Changed condition to only check for user
        login(response.data.user, null); // Pass user data, token is null for now
        
        // Redirect based on user role
        if (response.data.user.role === 'doctor' || response.data.user.role === 'admin') {
          navigate('/doctor-dashboard'); 
        } else {
          navigate('/patient-dashboard');
        }
      } else {
        // This case should ideally not happen if backend sends { success: true, user: ... }
        throw new Error('登入成功，但未收到用戶資料。'); // More accurate error message
      }

    } catch (err) {
      console.error('Login failed:', err);
      // Check for specific error response from backend
      const errorMessage = err.response?.data?.message || err.message || '登入失敗，請檢查您的帳號或密碼。';
      setError(errorMessage);
    } finally {
      setLoading(false);
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
          mt: isMobile ? 2 : 8
        }}
      >
        <Typography component="h1" variant="h4" color="primary" fontWeight="bold" gutterBottom>
          登入
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          歡迎回來！請登入您的帳號以繼續使用心理諮詢預約系統。
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>} 

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
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
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
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
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
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '登入'}
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
              或使用以下方式登入
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                sx={{ py: 1.5 }}
                disabled // Disable social login for now
              >
                Google 登入
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FacebookIcon />}
                sx={{ py: 1.5 }}
                disabled // Disable social login for now
              >
                Facebook 登入
              </Button>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              還沒有帳號？{' '}
              <Link component={RouterLink} to="/register" variant="body2" color="primary" fontWeight="medium">
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

