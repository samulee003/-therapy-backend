import React from 'react';
import { Alert, AlertTitle, Collapse, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * 通用錯誤提示組件
 *
 * @param {Object} props 組件屬性
 * @param {string} props.message 錯誤訊息
 * @param {string} [props.title] 錯誤標題 (可選)
 * @param {string} [props.severity='error'] 嚴重性 ('error', 'warning', 'info', 'success')
 * @param {boolean} [props.showClose=true] 是否顯示關閉按鈕
 * @param {Function} [props.onClose] 關閉按鈕點擊處理函數
 * @param {Object} [props.sx] 額外的樣式
 */
const ErrorAlert = ({
  message,
  title,
  severity = 'error',
  showClose = true,
  onClose,
  sx = {},
  ...props
}) => {
  if (!message) return null;

  return (
    <Collapse in={!!message}>
      <Alert
        severity={severity}
        sx={{ mb: 2, ...sx }}
        action={
          showClose && onClose ? (
            <IconButton aria-label="關閉" color="inherit" size="small" onClick={onClose}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          ) : null
        }
        {...props}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Collapse>
  );
};

export default ErrorAlert;
