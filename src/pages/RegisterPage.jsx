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
      phone: formData.phone,
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
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="name"
                label="姓名 (Name)"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="電子郵件 (Email/Username)"
                name="username"
                type="email"
                value={formData.username}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="phone"
                label="電話號碼 (Phone Number)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset" required>
                <FormLabel component="legend">註冊身份 (Role)</FormLabel>
                <RadioGroup
                  row
                  aria-label="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <FormControlLabel value="patient" control={<Radio />} label="患者 (Patient)" />
                  <FormControlLabel value="doctor" control={<Radio />} label="醫生 (Doctor)" />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="密碼 (Password)"
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={handleChange}
                InputProps={{
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
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="確認密碼 (Confirm Password)"
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">註冊資訊確認</Typography>
            <Typography>姓名: {formData.name}</Typography>
            <Typography>郵箱: {formData.username}</Typography>
            <Typography>電話: {formData.phone}</Typography>
            <Typography>身份: {formData.role === 'patient' ? '患者' : '醫生'}</Typography>
            <Typography>請確認以上資訊無誤。</Typography>
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
