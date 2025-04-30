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
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import { registerUser } from '../services/api';

const RegisterPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'patient' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('密碼和確認密碼不匹配。');
      setLoading(false);
      return;
    }

    const registrationData = {
      username: formData.email,
      password: formData.password,
      name: formData.name,
      role: formData.role,
    };

    console.log('Attempting registration with:', registrationData);

    try {
      const response = await registerUser(registrationData);
      console.log('Registration successful:', response.data);
      alert('註冊成功！請使用您的帳號登入。'); 
      navigate('/login'); 

    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.message || err.message || '註冊失敗，請稍後再試。');

    } finally {
      setLoading(false);
    }
  };

  const steps = ['基本信息', '帳號設置', '完成註冊'];

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="姓名"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="電子郵件"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
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
              id="phone"
              label="電話號碼"
              name="phone"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </>
        );
      case 1:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密碼"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="確認密碼"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <FormLabel component="legend">註冊身份</FormLabel>
              <RadioGroup
                row
                aria-label="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <FormControlLabel value="patient" control={<Radio />} label="患者" />
                <FormControlLabel value="doctor" control={<Radio />} label="醫生" />
              </RadioGroup>
            </FormControl>
          </>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" gutterBottom>
              確認您的註冊信息
            </Typography>
            <Grid container spacing={1.5} sx={{ mt: 2, textAlign: 'left', maxWidth: 400, mx: 'auto' }}> 
              <Grid item xs={5}><Typography variant="body2" color="text.secondary">姓名:</Typography></Grid>
              <Grid item xs={7}><Typography variant="body1">{formData.name}</Typography></Grid>
              <Grid item xs={5}><Typography variant="body2" color="text.secondary">電子郵件:</Typography></Grid>
              <Grid item xs={7}><Typography variant="body1">{formData.email}</Typography></Grid>
              <Grid item xs={5}><Typography variant="body2" color="text.secondary">電話號碼:</Typography></Grid>
              <Grid item xs={7}><Typography variant="body1">{formData.phone}</Typography></Grid>
              <Grid item xs={5}><Typography variant="body2" color="text.secondary">註冊身份:</Typography></Grid>
              <Grid item xs={7}><Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{formData.role}</Typography></Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mt: 3, mb: 1, textAlign: 'left' }}>{error}</Alert>}

            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit} 
              disabled={loading}   
              sx={{ mt: 3, minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '完成註冊'}
            </Button>
             <Button
                disabled={loading}
                onClick={handleBack}
                sx={{ mt: 3, ml: 1 }}
             >
                上一步
              </Button>
          </Box>
        );
      default:
        return 'Unknown step';
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
          註冊帳號
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          創建您的帳號以使用心理諮詢預約系統
        </Typography>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ width: '100%', mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          {getStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              上一步
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ py: 1, px: 4 }}
                >
                  完成註冊
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  size="large"
                  sx={{ py: 1, px: 4 }}
                >
                  下一步
                </Button>
              )}
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ width: '100%', mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            或使用社交媒體帳號註冊
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                sx={{ py: 1.5 }}
              >
                Google 註冊
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FacebookIcon />}
                sx={{ py: 1.5 }}
              >
                Facebook 註冊
              </Button>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              已有帳號？{' '}
              <Link component={RouterLink} to="/login" variant="body2" color="primary" fontWeight="medium">
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
