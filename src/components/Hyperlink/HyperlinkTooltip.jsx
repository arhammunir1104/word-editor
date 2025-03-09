import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  IconButton, 
  TextField,
  Button,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  Fade
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  ContentCopy, 
  OpenInNew,
  Check,
  Close
} from '@mui/icons-material';

const HyperlinkTooltip = ({ 
  url,
  onClose,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState(url);
  const [error, setError] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

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

  const handleEdit = (e) => {
    // Stop propagation to prevent the document click handler from closing the tooltip
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    e.stopPropagation();
    if (validateUrl(editedUrl)) {
      onEdit(editedUrl);
      setIsEditing(false);
      onClose();
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditedUrl(url);
    setError('');
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
    onClose();
  };

  const handleRedirect = (e) => {
    e.stopPropagation();
    window.open(url, '_blank');
    onClose();
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url)
      .then(() => {
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 3000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  return (
    <>
      <Fade in={true} timeout={150}>
        <Paper
          elevation={4}
          sx={{
            position: 'relative',
            zIndex: 2000,
            width: 320,
            p: 2,
            borderRadius: '8px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: '#ffffff',
            maxHeight: '85vh',
            overflowY: 'auto',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-5px',
              left: '15px',
              width: '10px',
              height: '10px',
              backgroundColor: '#ffffff',
              transform: 'rotate(45deg)',
              borderTop: '1px solid rgba(0,0,0,0.12)',
              borderLeft: '1px solid rgba(0,0,0,0.12)',
              zIndex: 1
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0A1929' }}>
              {isEditing ? 'Edit Hyperlink' : 'Hyperlink'}
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {isEditing ? (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                placeholder="https://example.com"
                error={!!error}
                helperText={error || "External URLs only (http:// or https://)"}
                autoFocus
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  size="small" 
                  onClick={handleCancelEdit}
                  sx={{ mr: 1, textTransform: 'none' }}
                >
                  Cancel
                </Button>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={handleSaveEdit}
                  sx={{ textTransform: 'none' }}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <Box 
                sx={{ 
                  p: 1.5, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px',
                  wordBreak: 'break-all',
                  maxHeight: '80px',
                  overflowY: 'auto',
                  borderLeft: '4px solid #1976d2',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: 'inherit' }}>
                  {url}
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={handleEdit}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Copy link">
                  <IconButton size="small" onClick={handleCopy}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Remove link">
                  <IconButton size="small" onClick={handleDelete}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Open link">
                  <IconButton size="small" onClick={handleRedirect} color="primary">
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
        </Paper>
      </Fade>

      <Snackbar 
        open={showCopySuccess} 
        autoHideDuration={3000} 
        onClose={() => setShowCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          variant="filled"
          icon={<Check fontSize="inherit" />}
        >
          Link copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
};

export default HyperlinkTooltip; 