import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Container,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';

// 導入拆分出的組件
import DashboardOverview from '../../components/doctor/dashboard/DashboardOverview';
import ScheduleManager from '../../components/doctor/dashboard/ScheduleManager';
import AppointmentManager from '../../components/doctor/dashboard/AppointmentManager';
import SettingsManager from '../../components/doctor/dashboard/SettingsManager';

const DoctorDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const [tabValue, setTabValue] = useState(0);

  // --- Event Handlers --- //
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // --- Render Content --- //
  const renderDashboardContent = () => {
    if (authLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!user) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          無法載入用戶資料，請重新登入。
        </Alert>
      );
    }

    switch (tabValue) {
      case 0: // Dashboard Overview
        return <DashboardOverview user={user} onNavigateToTab={setTabValue} />;
      case 1: // Schedule Management
        return <ScheduleManager user={user} />;
      case 2: // Appointments List
        return <AppointmentManager user={user} />;
      case 3: // Settings
        return <SettingsManager user={user} />;
      default:
        return <DashboardOverview user={user} onNavigateToTab={setTabValue} />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: isMobile ? 1 : 2, pb: isMobile ? 2 : 4, px: isMobile ? 1 : 2 }}>
      <Paper 
        elevation={1} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%'
        }}>
          {/* Tab Navigation */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? 'fullWidth' : 'standard'}
            centered={!isMobile}
            aria-label="doctor dashboard tabs"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider', 
              mb: isMobile ? 1 : 3,
              minHeight: isMobile ? '48px' : undefined,
              '& .MuiTabs-indicator': {
                height: 3
              }
            }}
          >
            <Tab
              icon={<DashboardIcon fontSize={isMobile ? "small" : "medium"} />}
              label={isMobile ? undefined : '總覽'}
              aria-label="Dashboard Overview"
              sx={{ 
                minHeight: isMobile ? '48px' : undefined,
                py: isMobile ? 1 : 1.5
              }}
            />
            <Tab
              icon={<CalendarIcon fontSize={isMobile ? "small" : "medium"} />}
              label={isMobile ? undefined : '排班管理'}
              aria-label="Schedule Management"
              sx={{ 
                minHeight: isMobile ? '48px' : undefined,
                py: isMobile ? 1 : 1.5
              }}
            />
            <Tab
              icon={<PeopleIcon fontSize={isMobile ? "small" : "medium"} />}
              label={isMobile ? undefined : '預約管理'}
              aria-label="Appointments Management"
              sx={{ 
                minHeight: isMobile ? '48px' : undefined,
                py: isMobile ? 1 : 1.5
              }}
            />
            <Tab
              icon={<SettingsIcon fontSize={isMobile ? "small" : "medium"} />}
              label={isMobile ? undefined : '設定'}
              aria-label="Settings"
              sx={{ 
                minHeight: isMobile ? '48px' : undefined,
                py: isMobile ? 1 : 1.5
              }}
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: isMobile ? 1.5 : 2 
          }}>
            {renderDashboardContent()}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default DoctorDashboard;
