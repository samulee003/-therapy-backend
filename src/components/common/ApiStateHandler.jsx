import React from 'react';
import { Box, Alert, Collapse } from '@mui/material';
import { ErrorAlert, LoadingIndicator } from './';

/**
 * API 狀態處理元件，用於展示 API 請求的加載、成功或錯誤狀態
 *
 * @param {Object} props 元件屬性
 * @param {boolean} props.loading 是否處於加載狀態
 * @param {string|Object} props.error 錯誤訊息或錯誤物件
 * @param {string|Object} props.success 成功訊息或成功物件
 * @param {string} props.loadingMessage 加載時顯示的訊息
 * @param {string} props.loadingType 加載指示器類型 ('circular', 'linear', 'overlay', 'inline')
 * @param {Function} props.onErrorClose 關閉錯誤提示的處理函數
 * @param {Function} props.onSuccessClose 關閉成功提示的處理函數
 * @param {React.ReactNode} props.children 子元素，當沒有任何狀態需要顯示時展示
 * @param {Object} props.sx 額外的樣式
 */
const ApiStateHandler = ({
  loading = false,
  error = null,
  success = null,
  loadingMessage = '載入中...',
  loadingType = 'circular',
  onErrorClose,
  onSuccessClose,
  children,
  sx = {},
  ...props
}) => {
  // 處理錯誤訊息格式
  const errorMessage =
    typeof error === 'object' && error !== null ? error.message || JSON.stringify(error) : error;

  // 處理成功訊息格式
  const successMessage =
    typeof success === 'object' && success !== null
      ? success.message || JSON.stringify(success)
      : success;

  return (
    <Box sx={{ width: '100%', ...sx }} {...props}>
      {/* 載入狀態 */}
      {loading && (
        <LoadingIndicator loading={loading} type={loadingType} message={loadingMessage} />
      )}

      {/* 錯誤提示 */}
      {errorMessage && (
        <ErrorAlert message={errorMessage} onClose={onErrorClose} showClose={!!onErrorClose} />
      )}

      {/* 成功提示 */}
      {successMessage && (
        <Collapse in={!!successMessage}>
          <Alert severity="success" sx={{ mb: 2 }} onClose={onSuccessClose}>
            {successMessage}
          </Alert>
        </Collapse>
      )}

      {/* 當沒有狀態需要顯示或明確要求顯示子元素時渲染 */}
      {(!loading || loadingType === 'inline') && !errorMessage && children}
    </Box>
  );
};

export default ApiStateHandler;
