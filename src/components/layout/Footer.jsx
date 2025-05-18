import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Grid,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';

const Footer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'white',
        py: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
              心理諮詢預約系統
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              提供便捷的心理諮詢預約服務，讓您隨時隨地管理您的心理健康。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Link href="#" color="inherit" aria-label="Facebook">
                <FacebookIcon />
              </Link>
              <Link href="#" color="inherit" aria-label="Instagram">
                <InstagramIcon />
              </Link>
              <Link href="mailto:contact@example.com" color="inherit" aria-label="Email">
                <EmailIcon />
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom fontWeight="medium">
              快速連結
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link component={RouterLink} to="/" color="text.secondary" underline="hover">
                首頁
              </Link>
              <Link
                component={RouterLink}
                to="/appointment"
                color="text.secondary"
                underline="hover"
              >
                預約諮詢
              </Link>
              <Link component={RouterLink} to="/patient" color="text.secondary" underline="hover">
                我的預約
              </Link>
              <Link component={RouterLink} to="/login" color="text.secondary" underline="hover">
                登入/註冊
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom fontWeight="medium">
              聯絡我們
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  contact@example.com
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  +886 2 1234 5678
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'center' : 'flex-start',
            gap: isMobile ? 1 : 0,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} 心理諮詢預約系統. 保留所有權利.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-end',
            }}
          >
            <Link href="#" color="text.secondary" underline="hover" variant="body2">
              隱私政策
            </Link>
            <Link href="#" color="text.secondary" underline="hover" variant="body2">
              使用條款
            </Link>
            <Link href="#" color="text.secondary" underline="hover" variant="body2">
              幫助中心
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
