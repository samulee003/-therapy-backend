import { createTheme } from '@mui/material/styles';

// 根據UI設計指南創建主題
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5', // 靛藍色 - 主色調
      light: '#757de8',
      dark: '#002984',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff4081', // 粉紅色 - 輔助色
      light: '#ff79b0',
      dark: '#c60055',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f7fa', // 淺灰藍 - 背景色
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#424242',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#2196f3',
    },
  },
  typography: {
    fontFamily: '"Noto Sans TC", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8, // 基礎間距單位為8px
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
          minHeight: 40,
          '@media (max-width: 600px)': {
            minHeight: 48,
          },
          transition: 'all 0.3s ease',
        },
        containedPrimary: {
          '&:hover': {
            filter: 'brightness(1.1)',
          },
        },
        outlinedPrimary: {
          '&:hover': {
            backgroundColor: 'rgba(63, 81, 181, 0.1)',
          },
        },
        textPrimary: {
          '&:hover': {
            backgroundColor: 'rgba(63, 81, 181, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          padding: 24,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            height: 48,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3f51b5',
              boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.2)',
            },
          },
        },
      },
    },
  },
});

export default theme;
