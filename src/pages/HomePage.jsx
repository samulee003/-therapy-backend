import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import heroImage from '../assets/hero-image.jpg'; // Corrected relative path

const HomePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <EventAvailableIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: '靈活預約',
      description: '隨時隨地在線預約心理治療，無需電話或親自前往。',
    },
    {
      icon: <AccessTimeIcon fontSize="large" />,
      title: '時間靈活',
      description: '查看所有可用時段，選擇最適合您的時間。',
    },
    {
      icon: <PersonIcon fontSize="large" />,
      title: '個人管理',
      description: '輕鬆管理您的預約，查看歷史記錄和即將到來的諮詢。',
    },
    {
      icon: <SecurityIcon fontSize="large" />,
      title: '隱私保護',
      description: '所有個人信息和諮詢內容均受到嚴格保密。',
    },
  ];

  return (
    <Box>
      {/* 英雄區域 */}
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          backgroundColor: 'transparent',
          color: 'white',
          mb: 8,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage})`,
          height: isMobile ? '60vh' : '70vh',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2} justifyContent="center" textAlign="center">
            <Grid item xs={12} md={8}>
              <Typography
                component="h1"
                variant={isMobile ? 'h3' : 'h2'}
                color="inherit"
                gutterBottom
                sx={{ fontWeight: 'bold' }}
              >
                專業心理治療，一鍵預約
              </Typography>
              <Typography
                variant={isMobile ? 'body1' : 'h6'}
                color="inherit"
                paragraph
                sx={{ mb: 4 }}
              >
                我們提供便捷的心理治療預約服務，讓您隨時隨地關注自己的心理健康。
                專業心理治療師團隊，為您提供全面的心理支持和幫助。
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                component={RouterLink}
                to="/appointment"
                sx={{
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 8px rgba(255, 64, 129, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 12px rgba(255, 64, 129, 0.4)',
                  },
                }}
              >
                立即預約
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Paper>

      {/* 特色服務 */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" component="h2" color="primary" gutterBottom fontWeight="medium">
            我們的服務
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            心理治療預約系統為您提供全方位的預約管理服務，讓心理健康管理變得簡單高效。
            無論您是初次尋求幫助，還是需要定期的心理支持，我們都能滿足您的需求。
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'center',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 64,
                      height: 64,
                      mb: 2,
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Typography gutterBottom variant="h5" component="h3" fontWeight="medium">
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">{feature.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 行動召喚 */}
      <Box
        sx={{
          bgcolor: theme.palette.primary.main,
          color: 'white',
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography variant="h4" component="h2" gutterBottom fontWeight="medium">
              準備好開始您的心理健康之旅了嗎？
            </Typography>
            <Typography variant="h6" paragraph sx={{ mb: 4, opacity: 0.9 }}>
              立即註冊並預約您的第一次心理治療，邁出關愛自己的第一步。
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              component={RouterLink}
              to="/register"
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                mr: 2,
                mb: isMobile ? 2 : 0,
                boxShadow: '0 4px 8px rgba(255, 64, 129, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 12px rgba(255, 64, 129, 0.4)',
                },
              }}
            >
              立即註冊
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/login"
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              登入系統
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
