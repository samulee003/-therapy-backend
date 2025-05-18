import React, { useContext } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAuthenticated, user, logout, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openUserMenu = Boolean(anchorEl);

  const handleUserMenuClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/');
  };

  const toggleDrawer = open => event => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const generateMenuItems = () => {
    const baseItems = [
      { text: '首頁', icon: <HomeIcon />, path: '/' },
      { text: '預約治療', icon: <CalendarMonthIcon />, path: '/appointment' },
    ];

    if (isAuthenticated) {
      const dashboardPath =
        user?.role === 'doctor' || user?.role === 'admin'
          ? '/therapist-dashboard'
          : '/patient-dashboard';
      return [...baseItems];
    } else {
      return [
        ...baseItems,
        { text: '登入', icon: <LoginIcon />, path: '/login' },
        { text: '註冊', icon: <PersonIcon />, path: '/register' },
      ];
    }
  };

  const menuItems = generateMenuItems();

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}
        >
          心理治療預約系統
        </Typography>
      </Box>
      <Divider />
      <List>
        {generateMenuItems().map(item => (
          <ListItem
            button
            key={item.text}
            component={item.path ? RouterLink : 'button'}
            to={item.path}
            onClick={item.action}
          >
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        {isAuthenticated && (
          <ListItem button key="logout-drawer" onClick={handleLogout}>
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="登出" />
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: 'white' }}>
      <Toolbar>
        {isMobile ? (
          <>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
              {drawer}
            </Drawer>
          </>
        ) : null}

        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <CalendarMonthIcon sx={{ mr: 1 }} />
          心理治療預約系統
        </Typography>

        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/"
              startIcon={<HomeIcon />}
              sx={{ fontWeight: 500 }}
            >
              首頁
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/appointment"
              startIcon={<CalendarMonthIcon />}
              sx={{ fontWeight: 500 }}
            >
              預約治療
            </Button>

            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isAuthenticated ? (
              <>
                <Button
                  color="inherit"
                  onClick={handleUserMenuClick}
                  startIcon={<AccountCircleIcon />}
                  aria-controls={openUserMenu ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={openUserMenu ? 'true' : undefined}
                  sx={{ fontWeight: 500, textTransform: 'none' }}
                >
                  {user?.name || user?.username}
                </Button>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={openUserMenu}
                  onClose={handleUserMenuClose}
                  MenuListProps={{
                    'aria-labelledby': 'basic-button',
                  }}
                >
                  <MenuItem
                    component={RouterLink}
                    to={
                      user?.role === 'doctor' || user?.role === 'admin'
                        ? '/therapist-dashboard'
                        : '/patient-dashboard'
                    }
                    onClick={handleUserMenuClose}
                  >
                    <ListItemIcon>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                    我的儀表板
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    登出
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                  startIcon={<LoginIcon />}
                  sx={{ fontWeight: 500 }}
                >
                  登入
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/register"
                  startIcon={<PersonIcon />}
                  sx={{ fontWeight: 500 }}
                >
                  註冊
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
