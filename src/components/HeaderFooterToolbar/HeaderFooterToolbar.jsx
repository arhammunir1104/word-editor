import React from 'react';
import { Box, IconButton, Tooltip, Switch, FormControlLabel } from '@mui/material';
import {
  ViewHeadline as HeaderIcon,
  ViewStream as FooterIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const HeaderFooterToolbar = ({
  isHeaderMode,
  isFooterMode,
  setIsHeaderMode,
  setIsFooterMode,
  differentFirstPage,
  setDifferentFirstPage
}) => {
  const handleHeaderClick = () => {
    setIsHeaderMode(!isHeaderMode);
    setIsFooterMode(false);
  };

  const handleFooterClick = () => {
    setIsFooterMode(!isFooterMode);
    setIsHeaderMode(false);
  };

  const handleClose = () => {
    setIsHeaderMode(false);
    setIsFooterMode(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        marginBottom: '16px'
      }}
    >
      <Tooltip title="Edit Header">
        <IconButton
          onClick={handleHeaderClick}
          color={isHeaderMode ? 'primary' : 'default'}
        >
          <HeaderIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Edit Footer">
        <IconButton
          onClick={handleFooterClick}
          color={isFooterMode ? 'primary' : 'default'}
        >
          <FooterIcon />
        </IconButton>
      </Tooltip>

      <FormControlLabel
        control={
          <Switch
            checked={differentFirstPage}
            onChange={(e) => setDifferentFirstPage(e.target.checked)}
          />
        }
        label="Different First Page"
      />

      {(isHeaderMode || isFooterMode) && (
        <Tooltip title="Close Header/Footer">
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default HeaderFooterToolbar; 