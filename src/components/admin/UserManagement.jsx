import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';

const UserManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetPasswordDialog, setResetPasswordDialog] = useState({
    open: false,
    user: null,
    newPassword: '',
    confirmPassword: '',
    loading: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 載入用戶列表
  const loadUsers = () => {
    setLoading(true);
    try {
      // 從localStorage獲取用戶數據（模擬後端API）
      const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
      
      // 添加一些示例用戶（如果沒有的話）
      if (storedUsers.length === 0) {
        const defaultUsers = [
          {
            id: 1,
            email: 'patient@example.com',
            name: '張三',
            role: 'patient',
            phone: '12345678',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
          {
            id: 2,
            email: 'doctor@example.com',
            name: '李醫生',
            role: 'doctor',
            phone: '87654321',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        setUsers(defaultUsers);
      } else {
        setUsers(storedUsers);
      }
    } catch (error) {
      console.error('載入用戶列表失敗:', error);
      setError('無法載入用戶列表');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 過濾用戶
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  // 獲取角色顯示
  const getRoleDisplay = (role) => {
    const roleMap = {
      patient: { label: '患者', color: 'primary' },
      doctor: { label: '醫生', color: 'success' },
      admin: { label: '管理員', color: 'error' },
    };
    return roleMap[role] || { label: role, color: 'default' };
  };

  // 開啟重置密碼對話框
  const handleOpenResetPassword = (user) => {
    setResetPasswordDialog({
      open: true,
      user,
      newPassword: '',
      confirmPassword: '',
      loading: false,
    });
  };

  // 關閉重置密碼對話框
  const handleCloseResetPassword = () => {
    setResetPasswordDialog({
      open: false,
      user: null,
      newPassword: '',
      confirmPassword: '',
      loading: false,
    });
  };

  // 執行密碼重置
  const handleResetPassword = async () => {
    const { user, newPassword, confirmPassword } = resetPasswordDialog;
    
    // 驗證密碼
    if (!newPassword || !confirmPassword) {
      setError('請填寫新密碼和確認密碼');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('密碼長度至少為6個字符');
      return;
    }

    setResetPasswordDialog(prev => ({ ...prev, loading: true }));
    setError('');

    try {
      // 更新用戶密碼
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { ...u, password: newPassword, lastPasswordChange: new Date().toISOString() }
          : u
      );
      
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      // 記錄操作日誌
      const operationLog = JSON.parse(localStorage.getItem('admin_operations') || '[]');
      operationLog.push({
        id: Date.now(),
        action: 'reset_password',
        targetUser: user.email,
        adminUser: 'current_admin',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('admin_operations', JSON.stringify(operationLog));
      
      setSuccess(`已成功重置用戶 ${user.name} 的密碼`);
      handleCloseResetPassword();
      
      // 3秒後清除成功訊息
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('重置密碼失敗:', error);
      setError('重置密碼失敗，請稍後再試');
    } finally {
      setResetPasswordDialog(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
        用戶管理
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* 搜索和操作欄 */}
      <Box display="flex" gap={2} mb={3} flexDirection={isMobile ? 'column' : 'row'}>
        <TextField
          placeholder="搜索用戶姓名、郵箱或電話..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth={isMobile}
          sx={{ minWidth: isMobile ? 'auto' : '300px' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title="刷新用戶列表">
          <IconButton onClick={loadUsers} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 用戶列表 */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>用戶信息</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>註冊時間</TableCell>
              <TableCell>最後登入</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => {
              const roleDisplay = getRoleDisplay(user.role);
              return (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {user.name || '未設置'}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                      {user.phone && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {user.phone}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={roleDisplay.label}
                      color={roleDisplay.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString('zh-TW')
                        : '未知'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString('zh-TW')
                        : '從未登入'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="重置密碼">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenResetPassword(user)}
                      >
                        <LockIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredUsers.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm ? '沒有找到符合條件的用戶' : '暫無用戶數據'}
          </Typography>
        </Box>
      )}

      {/* 重置密碼對話框 */}
      <Dialog 
        open={resetPasswordDialog.open} 
        onClose={handleCloseResetPassword}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          重置用戶密碼
        </DialogTitle>
        <DialogContent>
          {resetPasswordDialog.user && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                為用戶 <strong>{resetPasswordDialog.user.name}</strong> ({resetPasswordDialog.user.email}) 設置新密碼
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            margin="normal"
            label="新密碼"
            type="password"
            value={resetPasswordDialog.newPassword}
            onChange={(e) => setResetPasswordDialog(prev => ({
              ...prev,
              newPassword: e.target.value
            }))}
            disabled={resetPasswordDialog.loading}
            helperText="密碼長度至少為6個字符"
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="確認新密碼"
            type="password"
            value={resetPasswordDialog.confirmPassword}
            onChange={(e) => setResetPasswordDialog(prev => ({
              ...prev,
              confirmPassword: e.target.value
            }))}
            disabled={resetPasswordDialog.loading}
            error={
              resetPasswordDialog.confirmPassword && 
              resetPasswordDialog.newPassword !== resetPasswordDialog.confirmPassword
            }
            helperText={
              resetPasswordDialog.confirmPassword && 
              resetPasswordDialog.newPassword !== resetPasswordDialog.confirmPassword
                ? '兩次輸入的密碼不一致'
                : ''
            }
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseResetPassword}
            disabled={resetPasswordDialog.loading}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={
              resetPasswordDialog.loading ||
              !resetPasswordDialog.newPassword ||
              !resetPasswordDialog.confirmPassword ||
              resetPasswordDialog.newPassword !== resetPasswordDialog.confirmPassword
            }
          >
            {resetPasswordDialog.loading ? <CircularProgress size={24} /> : '重置密碼'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement; 