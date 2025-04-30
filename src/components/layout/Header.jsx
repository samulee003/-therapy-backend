import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, useMediaQuery, Drawer, List, ListItem, ListItemText, ListItemIcon, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import LoginIcon from '@mui/icons-material/Login';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = [
    { text: '首頁', icon: <HomeIcon />, path: '/' },
    { text: '預約諮詢', icon: <CalendarMonthIcon />, path: '/appointment' },
    { text: '我的預約', icon: <PersonIcon />, path: '/patient' },
    { text: '登入', icon: <LoginIcon />, path: '/login' },
  ];

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          心理諮詢預約系統
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem button key={item.text} component={RouterLink} to={item.path}>
            <ListItemIcon sx={{ color: theme.palette.primary.main }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
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
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={toggleDrawer(false)}
            >
              {drawer}
            </Drawer>
          </>
        ) : null}
        
        <Typography variant="h6" component="div" sx={{ 
          flexGrow: 1, 
          fontWeight: 'bold',
          color: theme.palette.primary.main,
          display: 'flex',
          alignItems: 'center'
        }}>
          <CalendarMonthIcon sx={{ mr: 1 }} />
          心理諮詢預約系統
        </Typography>
        
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {menuItems.map((item) => (
              <Button 
                key={item.text}
                color="inherit"
                component={RouterLink}
                to={item.path}
                startIcon={item.icon}
                sx={{ 
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'rgba(63, 81, 181, 0.08)',
                  }
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
