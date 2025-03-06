import React, { useState } from 'react';
import { IconButton, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Select, FormControl, InputLabel, TextField, Grid, Divider } from '@mui/material';
import { FormatSize, ArrowDropDown } from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

// Constants for unit conversion
const INCH_TO_PX = 96;
const CM_TO_PX = 37.8;
const MM_TO_PX = 3.78;

// Page size presets
const PAGE_SIZES = {
  LETTER: {
    name: 'Letter',
    width: 8.5 * INCH_TO_PX,
    height: 11 * INCH_TO_PX,
  },
  A4: {
    name: 'A4',
    width: 8.27 * INCH_TO_PX,
    height: 11.69 * INCH_TO_PX,
  },
  LEGAL: {
    name: 'Legal',
    width: 8.5 * INCH_TO_PX,
    height: 14 * INCH_TO_PX,
  },
  TABLOID: {
    name: 'Tabloid',
    width: 11 * INCH_TO_PX,
    height: 17 * INCH_TO_PX,
  },
  CUSTOM: {
    name: 'Custom',
    width: 8.5 * INCH_TO_PX,
    height: 11 * INCH_TO_PX,
  }
};

const DEFAULT_PAGE_SIZE = PAGE_SIZES.LETTER;
const DEFAULT_ORIENTATION = 'portrait';

const PageSettingsButton = ({ 
  currentPage,
  pageOrientations,
  pageSizes, 
  customPageSizes,
  onOrientationChange,
  onPageSizeChange,
  onCustomSizeChange
}) => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempOrientation, setTempOrientation] = useState(DEFAULT_ORIENTATION);
  const [tempPageSize, setTempPageSize] = useState(DEFAULT_PAGE_SIZE.name);
  const [tempCustomWidth, setTempCustomWidth] = useState(DEFAULT_PAGE_SIZE.width / INCH_TO_PX);
  const [tempCustomHeight, setTempCustomHeight] = useState(DEFAULT_PAGE_SIZE.height / INCH_TO_PX);
  const [tempUnit, setTempUnit] = useState('in');
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    
    // Initialize temp values with current page settings
    const orientation = pageOrientations[currentPage] || DEFAULT_ORIENTATION;
    const pageSize = pageSizes[currentPage] || DEFAULT_PAGE_SIZE.name;
    setTempOrientation(orientation);
    setTempPageSize(pageSize);
    
    if (pageSize === 'CUSTOM') {
      const customSize = customPageSizes[currentPage] || {
        width: DEFAULT_PAGE_SIZE.width,
        height: DEFAULT_PAGE_SIZE.height
      };
      setTempCustomWidth(customSize.width / INCH_TO_PX);
      setTempCustomHeight(customSize.height / INCH_TO_PX);
    } else {
      const dimensions = PAGE_SIZES[pageSize] || DEFAULT_PAGE_SIZE;
      setTempCustomWidth(dimensions.width / INCH_TO_PX);
      setTempCustomHeight(dimensions.height / INCH_TO_PX);
    }
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleOpenDialog = () => {
    setDialogOpen(true);
    handleClose();
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  const handleQuickOrientationChange = (orientation) => {
    saveHistory(ActionTypes.COMPLETE);
    
    onOrientationChange(currentPage, orientation);
    handleClose();
    
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 0);
  };
  
  const handlePageSizeSelectChange = (event) => {
    const newSize = event.target.value;
    setTempPageSize(newSize);
    
    // Update custom dimensions based on preset
    if (newSize !== 'CUSTOM') {
      const dimensions = PAGE_SIZES[newSize] || DEFAULT_PAGE_SIZE;
      setTempCustomWidth(dimensions.width / INCH_TO_PX);
      setTempCustomHeight(dimensions.height / INCH_TO_PX);
    }
  };
  
  const handleCustomDimensionChange = (dimension, value) => {
    if (dimension === 'width') {
      setTempCustomWidth(value);
    } else {
      setTempCustomHeight(value);
    }
    // If changing custom dimensions, ensure we're set to CUSTOM
    setTempPageSize('CUSTOM');
  };
  
  const handleUnitChange = (event) => {
    const newUnit = event.target.value;
    const oldUnit = tempUnit;
    let conversionFactor = 1;
    
    // Convert dimensions based on unit change
    if (oldUnit === 'in' && newUnit === 'cm') {
      conversionFactor = 2.54;
    } else if (oldUnit === 'in' && newUnit === 'mm') {
      conversionFactor = 25.4;
    } else if (oldUnit === 'cm' && newUnit === 'in') {
      conversionFactor = 1/2.54;
    } else if (oldUnit === 'cm' && newUnit === 'mm') {
      conversionFactor = 10;
    } else if (oldUnit === 'mm' && newUnit === 'in') {
      conversionFactor = 1/25.4;
    } else if (oldUnit === 'mm' && newUnit === 'cm') {
      conversionFactor = 0.1;
    }
    
    setTempCustomWidth(prev => prev * conversionFactor);
    setTempCustomHeight(prev => prev * conversionFactor);
    setTempUnit(newUnit);
  };
  
  const applySettings = () => {
    // Save history before changes
    saveHistory(ActionTypes.COMPLETE);
    
    // Update orientation
    onOrientationChange(currentPage, tempOrientation);
    
    // Update page size
    onPageSizeChange(currentPage, tempPageSize);
    
    // Calculate dimensions in pixels
    let widthInPx = tempCustomWidth;
    let heightInPx = tempCustomHeight;
    
    if (tempUnit === 'in') {
      widthInPx *= INCH_TO_PX;
      heightInPx *= INCH_TO_PX;
    } else if (tempUnit === 'cm') {
      widthInPx *= CM_TO_PX;
      heightInPx *= CM_TO_PX;
    } else if (tempUnit === 'mm') {
      widthInPx *= MM_TO_PX;
      heightInPx *= MM_TO_PX;
    }
    
    // Update custom dimensions if needed
    if (tempPageSize === 'CUSTOM') {
      onCustomSizeChange(currentPage, widthInPx, heightInPx);
    }
    
    // Close dialog
    handleCloseDialog();
    
    // Save history after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 0);
  };
  
  return (
    <>
      <Tooltip title="Page setup">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ padding: '4px' }}
          data-testid="page-settings-button"
        >
          <FormatSize sx={{ fontSize: '18px' }} />
          <ArrowDropDown sx={{ fontSize: '14px' }} />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleQuickOrientationChange('portrait')}>
          Portrait Orientation
        </MenuItem>
        <MenuItem onClick={() => handleQuickOrientationChange('landscape')}>
          Landscape Orientation
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleOpenDialog}>
          Page Setup...
        </MenuItem>
      </Menu>
      
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Page Setup</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Orientation</Typography>
                <Box sx={{ display: 'flex', mt: 1 }}>
                  <Button
                    variant={tempOrientation === 'portrait' ? 'contained' : 'outlined'}
                    onClick={() => setTempOrientation('portrait')}
                    sx={{ mr: 1, minWidth: '100px' }}
                  >
                    Portrait
                  </Button>
                  <Button
                    variant={tempOrientation === 'landscape' ? 'contained' : 'outlined'}
                    onClick={() => setTempOrientation('landscape')}
                    sx={{ minWidth: '100px' }}
                  >
                    Landscape
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Page Size</Typography>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <Select
                    value={tempPageSize}
                    onChange={handlePageSizeSelectChange}
                  >
                    <MenuItem value="LETTER">Letter (8.5" x 11")</MenuItem>
                    <MenuItem value="A4">A4 (8.27" x 11.69")</MenuItem>
                    <MenuItem value="LEGAL">Legal (8.5" x 14")</MenuItem>
                    <MenuItem value="TABLOID">Tabloid (11" x 17")</MenuItem>
                    <MenuItem value="CUSTOM">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {tempPageSize === 'CUSTOM' && (
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Custom Page Size</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TextField
                      label="Width"
                      type="number"
                      value={tempCustomWidth}
                      onChange={(e) => handleCustomDimensionChange('width', parseFloat(e.target.value))}
                      inputProps={{ step: 0.1, min: 3, max: 48 }}
                      sx={{ mr: 1, width: '120px' }}
                    />
                    <Typography sx={{ mx: 1 }}>×</Typography>
                    <TextField
                      label="Height"
                      type="number"
                      value={tempCustomHeight}
                      onChange={(e) => handleCustomDimensionChange('height', parseFloat(e.target.value))}
                      inputProps={{ step: 0.1, min: 3, max: 48 }}
                      sx={{ mr: 1, width: '120px' }}
                    />
                    <FormControl sx={{ width: '80px' }}>
                      <Select
                        value={tempUnit}
                        onChange={handleUnitChange}
                      >
                        <MenuItem value="in">in</MenuItem>
                        <MenuItem value="cm">cm</MenuItem>
                        <MenuItem value="mm">mm</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={applySettings} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PageSettingsButton; 