import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box sx={{ backgroundColor: 'gray', padding: '16px', textAlign: 'center' }}>
      <Typography variant="body2">&copy; 2023 Google Docs Clone. All rights reserved.</Typography>
    </Box>
  );
};

export default Footer; 