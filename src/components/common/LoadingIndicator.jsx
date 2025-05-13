import React from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  LinearProgress,
  Backdrop,
  Paper
} from '@mui/material';

/**
 * 通用載入指示器組件
 * 
 * @param {Object} props 組件屬性
 * @param {boolean} [props.loading=true] 是否顯示載入狀態
 * @param {string} [props.type='circular'] 載入指示器類型 ('circular', 'linear', 'overlay', 'inline')
 * @param {string} [props.size='medium'] 大小 ('small', 'medium', 'large')
 * @param {string} [props.message] 載入訊息 (可選)
 * @param {Object} [props.sx] 額外的樣式
 */
const LoadingIndicator = ({
  loading = true,
  type = 'circular',
  size = 'medium',
  message,
  sx = {},
  ...props
}) => {
  if (!loading) return null;
  
  // 尺寸映射
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56
  };

  // 載入指示器類型
  const renderLoader = () => {
    switch (type) {
      case 'linear':
        return (
          <Box sx={{ width: '100%', ...sx }} {...props}>
            <LinearProgress />
            {message && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                align="center" 
                sx={{ mt: 1 }}
              >
                {message}
              </Typography>
            )}
          </Box>
        );
      case 'overlay':
        return (
          <Backdrop 
            open={true} 
            sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, ...sx }} 
            {...props}
          >
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                borderRadius: 2
              }}
            >
              <CircularProgress size={sizeMap[size]} />
              {message && (
                <Typography 
                  variant="body1" 
                  color="text.primary" 
                  sx={{ mt: 2 }}
                >
                  {message}
                </Typography>
              )}
            </Paper>
          </Backdrop>
        );
      case 'inline':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              ...sx 
            }} 
            {...props}
          >
            <CircularProgress 
              size={sizeMap.small} 
              sx={{ mr: message ? 1 : 0 }} 
            />
            {message && (
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            )}
          </Box>
        );
      case 'circular':
      default:
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              ...sx 
            }} 
            {...props}
          >
            <CircularProgress size={sizeMap[size]} />
            {message && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mt: 2 }}
              >
                {message}
              </Typography>
            )}
          </Box>
        );
    }
  };

  return renderLoader();
};

export default LoadingIndicator; 