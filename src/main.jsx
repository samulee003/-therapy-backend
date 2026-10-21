import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // [PATCH] 靜態託管無 SPA fallback，改用 hash 路由避免深連結 404
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import theme from './theme';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { initEmailJS } from './services/emailService'; // Import EmailJS initialization
import './index.css';

// Initialize EmailJS
initEmailJS();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          {' '}
          {/* Wrap App with AuthProvider */}
          <CssBaseline />
          <App />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
