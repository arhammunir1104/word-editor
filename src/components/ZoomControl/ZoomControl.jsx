import React from 'react';
import { Box, Select, MenuItem } from '@mui/material';

const zoomLevels = [50, 75, 90, 100, 125, 150, 175, 200];

const ZoomControl = ({ zoom, onZoomChange }) => {
  return (
    <Box sx={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: '#fff',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
    }}>
      <Select
        value={zoom}
        onChange={(e) => onZoomChange(e.target.value)}
        size="small"
        sx={{
          fontSize: '14px',
          '& .MuiSelect-select': {
            padding: '4px 8px'
          }
        }}
      >
        {zoomLevels.map((level) => (
          <MenuItem key={level} value={level}>
            {level}%
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

export default ZoomControl; 