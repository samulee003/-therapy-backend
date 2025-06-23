import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';

const PrivacyPolicyContent = ({ maxHeight = 300 }) => {
  const theme = useTheme();

  const containerStyle = maxHeight === 'none' 
    ? {} 
    : { 
        maxHeight, 
        overflowY: 'auto',
        p: 3, 
        backgroundColor: theme.palette.grey[50],
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      };

  const Wrapper = maxHeight === 'none' ? Box : Paper;

  return (
    <Wrapper 
      variant={maxHeight === 'none' ? undefined : "outlined"}
      sx={containerStyle}
    >
      {/* 標題和機構 Logo 區域 */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          {/* 這裡可以放置機構 Logo */}
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            培善心理治療中心
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Nurturing Natures Psychotherapy Centre
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          個人資料收集條款
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        根據第8/2005號法律《個人資料保護法》相關規定：
      </Typography>

      {/* 條款內容 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>
          <strong>1.</strong> 您在此表單上提供的個人資料，只會用作培善心理服務預約、聯絡及跟進之用途。
        </Typography>

        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>
          <strong>2.</strong> 您有權依法申請查閱、更正、刪除或封存於本中心的個人資料。
        </Typography>

        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>
          <strong>3.</strong> 您須注意，在公開網絡上傳送資料，可能存有被未經許可或授權的第三人查到和使用的風險。
        </Typography>

        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>
          <strong>4.</strong> 此表單收集閣下的個人資料，是為配合與本中心提供的內容和服務所需。
        </Typography>

        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>
          一般情況下，本網站只會對資料作記錄和統計用途，且嚴格執行保密原則，但若涉及違反法律之行為(如攻擊本網站)時，基於刑事調查的需要，本網站可能會向執法機關提供所記錄的資料。
        </Typography>

        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>
          <strong>5.</strong> 在本中心在處理所收集的個人資料時，您的資料會根據第8/2005號法律《個人資料保護法》相關規定而受到保障。
        </Typography>

        <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
          <strong>6.</strong> 保密同意：以下問題可以幫助治療師更好地去準備和了解該如何協助您。在首次面談的過程中，治療師可能會根據您的回答提出一些延伸問題。您在此所提供的資料和內容均受到保密保護，除了治療師外，沒有第三方有資格查詢以下資料。
        </Typography>
      </Box>

      {/* 同意聲明 */}
      <Box 
        sx={{ 
          textAlign: 'center', 
          mt: 3, 
          pt: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.action.hover,
          mx: -3,
          px: 3,
          py: 2,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          ※請您回答是否知悉且同意上述條款※
        </Typography>
      </Box>
    </Wrapper>
  );
};

export default PrivacyPolicyContent; 