import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Link,
  Typography,
  Box,
  IconButton,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrivacyPolicyContent from './PrivacyPolicyContent';

const PrivacyPolicyDialog = ({ linkText = "個人資料收集條款", linkProps = {} }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* 條款連結 */}
      <Link
        component="button"
        type="button"
        variant={linkProps?.variant || "body2"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpen();
        }}
        sx={{
          color: theme.palette.primary.main,
          textDecoration: 'none',
          fontWeight: 'medium',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
          fontSize: '0.875rem', // 確保與body2一致
          '&:hover': {
            color: theme.palette.primary.dark,
            textDecoration: 'underline',
          },
          ...(linkProps?.sx || {}),
        }}
      >
        {linkText}
      </Link>

      {/* 條款對話框 */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          }
        }}
      >
        {/* 對話框標題 */}
        <DialogTitle
          sx={{
            pb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            個人資料收集條款
          </Typography>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* 對話框內容 */}
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            <PrivacyPolicyContent maxHeight="none" />
          </Box>
        </DialogContent>

        {/* 對話框操作按鈕 */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.grey[50],
          }}
        >
          <Button
            onClick={handleClose}
            variant="contained"
            color="primary"
            size="large"
            sx={{ minWidth: 120 }}
          >
            我已閱讀
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PrivacyPolicyDialog; 