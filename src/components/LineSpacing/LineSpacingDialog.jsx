import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Alert,
  Typography,
  Box
} from '@mui/material';

const LineSpacingDialog = ({ open, onClose, onApply }) => {
  const [spacing, setSpacing] = useState('1.0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSpacing('1.0');
      setError('');
    }
  }, [open]);

  const handleChange = (e) => {
    const value = e.target.value;
    setSpacing(value);
    
    // Clear any previous errors
    setError('');
  };

  const handleApply = () => {
    // Validate the input
    const numValue = parseFloat(spacing);
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (numValue < 0.5 || numValue > 5.0) {
      setError('Value must be between 0.5 and 5.0');
      return;
    }
    
    // Apply the spacing
    onApply(numValue.toString());
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Custom Line Spacing</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a value between 0.5 and 5.0
          </Typography>
          
          <TextField
            autoFocus
            label="Line spacing"
            type="number"
            inputProps={{
              step: "0.01",
              min: "0.5",
              max: "5.0"
            }}
            fullWidth
            value={spacing}
            onChange={handleChange}
            error={!!error}
            helperText={error}
            variant="outlined"
            size="small"
          />
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Examples:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              {['1.0', '1.15', '1.5', '2.0'].map(value => (
                <Button 
                  key={value} 
                  size="small" 
                  variant={spacing === value ? 'contained' : 'outlined'}
                  onClick={() => setSpacing(value)}
                >
                  {value}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">Apply</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LineSpacingDialog; 