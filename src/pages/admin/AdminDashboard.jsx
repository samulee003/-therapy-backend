import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import UserManagement from '../../components/admin/UserManagement';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // 獲取統計數據
  const getStatistics = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const operations = JSON.parse(localStorage.getItem('admin_operations') || '[]');
    
    return {
      totalUsers: users.length,
      patientCount: users.filter(u => u.role === 'patient').length,
      doctorCount: users.filter(u => u.role === 'doctor').length,
      adminCount: users.filter(u => u.role === 'admin').length,
      recentOperations: operations.slice(-5).reverse(),
    };
  };

  const stats = getStatistics();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        管理員儀表板
      </Typography>

      {/* 統計卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PeopleIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    總用戶數
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PeopleIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.patientCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    患者數量
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SecurityIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.doctorCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    醫生數量
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SettingsIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.adminCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    管理員數量
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 最近操作 */}
      {stats.recentOperations.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            最近操作
          </Typography>
          {stats.recentOperations.map((operation) => (
            <Box 
              key={operation.id} 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center"
              py={1}
              borderBottom="1px solid"
              borderColor="grey.200"
            >
              <Box>
                <Typography variant="body2">
                  {operation.action === 'reset_password' && '重置密碼'}
                  ：{operation.targetUser}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  操作者：{operation.adminUser}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(operation.timestamp).toLocaleString('zh-TW')}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* 功能標籤頁 */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
          >
            <Tab 
              label="用戶管理" 
              icon={<PeopleIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="系統設置" 
              icon={<SettingsIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="統計報告" 
              icon={<AssessmentIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <UserManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              系統設置
            </Typography>
            <Typography variant="body2" color="text.secondary">
              系統設置功能正在開發中...
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              統計報告
            </Typography>
            <Typography variant="body2" color="text.secondary">
              統計報告功能正在開發中...
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminDashboard; 