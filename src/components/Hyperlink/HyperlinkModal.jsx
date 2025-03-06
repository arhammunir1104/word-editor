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
  Alert
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
  const { saveHistory, ActionTypes } = useEditorHistory();

  useEffect(() => {
    setUrl(initialUrl);
    setError('');
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

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        Insert Hyperlink
      </DialogTitle>
      
      <DialogContent>
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
          sx={{ mt: 2 }}
        />
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
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
    </Dialog>
  );
};

export default HyperlinkModal; 