import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Typography,
  Box,
  Alert,
  Popover
} from '@mui/material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const HyperlinkModal = ({ 
  open, 
  onClose, 
  onSave, 
  initialUrl = '', 
  selectedText = '' 
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const { saveHistory, ActionTypes } = useEditorHistory();

  useEffect(() => {
    setUrl(initialUrl);
    setError('');
    
    // Set anchor element based on current selection when opened
    if (open) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Create a temporary anchor element at the selection position
        const tempAnchor = document.createElement('div');
        tempAnchor.style.position = 'absolute';
        tempAnchor.style.left = `${rect.left + window.scrollX}px`;
        tempAnchor.style.top = `${rect.bottom + window.scrollY}px`;
        tempAnchor.style.width = '1px';
        tempAnchor.style.height = '1px';
        tempAnchor.style.pointerEvents = 'none';
        
        document.body.appendChild(tempAnchor);
        setAnchorEl(tempAnchor);
      }
    } else {
      // Clean up temporary anchor element
      if (anchorEl) {
        document.body.removeChild(anchorEl);
        setAnchorEl(null);
      }
    }
    
    return () => {
      // Clean up on unmount
      if (anchorEl) {
        try {
          document.body.removeChild(anchorEl);
        } catch (e) {
          console.error('Error removing anchor element:', e);
        }
      }
    };
  }, [initialUrl, open]);

  const validateUrl = (url) => {
    // Check if URL is empty
    if (!url.trim()) {
      setError('URL cannot be empty');
      return false;
    }
    
    // Check if URL starts with http:// or https://
    if (!url.match(/^https?:\/\//i)) {
      setError('URL must start with http:// or https://');
      return false;
    }
    
    // Clear any previous errors
    setError('');
    return true;
  };

  const handleSave = () => {
    if (validateUrl(url)) {
      // Save history before applying the hyperlink
      saveHistory(ActionTypes.COMPLETE);
      onSave(url);
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Popover
      open={open && !!anchorEl}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          width: '450px',
          p: 2,
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle sx={{ p: 0, pb: 2, fontWeight: 600 }}>
        Insert Hyperlink
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, pb: 2 }}>
        {selectedText && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
              Text to display:
            </Typography>
            <Typography variant="body2" sx={{ 
              p: 1, 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              borderLeft: '4px solid #1976d2'
            }}>
              {selectedText}
            </Typography>
          </Box>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          label="Web Address"
          type="url"
          fullWidth
          variant="outlined"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          helperText="External URLs only (must start with http:// or https://)"
          error={!!error}
          sx={{ mt: 2, mb: 1 }}
        />
        
        {error && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 0, pt: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          sx={{ textTransform: 'none' }}
        >
          Insert Link
        </Button>
      </DialogActions>
    </Popover>
  );
};

export default HyperlinkModal; 