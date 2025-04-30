import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';

function NotFoundPage() {
  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh', // Adjust height as needed
        textAlign: 'center'
      }}
    >
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom>
        頁面不存在
      </Typography>
      <Typography variant="body1" gutterBottom>
        抱歉，您要找的頁面不存在。
      </Typography>
      <Button 
        component={Link} 
        to="/" 
        variant="contained" 
        sx={{ mt: 3 }}
      >
        返回首頁
      </Button>
    </Box>
  );
}

export default NotFoundPage; 