import React, { useState } from 'react';
import { IconButton, Tooltip, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Avatar, Typography } from '@mui/material';
import { Comment, Close } from '@mui/icons-material';
import { useComments } from '../../context/CommentContext';

const CommentButton = () => {
  const { 
    comments, 
    showCommentsSidebar, 
    setShowCommentsSidebar,
    addComment,
    selectedTextRange,
    saveSelectionRange,
    captureCurrentSelection
  } = useComments();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const activeCommentsCount = comments.filter(c => !c.resolved).length;
  
  // Handle button click
  const handleCommentButtonClick = () => {
    // Get the current selection
    const selection = window.getSelection();
    const isTextSelected = selection && 
                            selection.rangeCount > 0 && 
                            !selection.isCollapsed && 
                            selection.toString().trim() !== '';
    
    if (isTextSelected) {
      // If text is selected, capture it and open the dialog
      const range = captureCurrentSelection();
      if (range) {
        console.log("Selection captured for comment:", range.toString());
        setIsDialogOpen(true);
      }
    } else {
      // If no text is selected, just toggle the sidebar
      setShowCommentsSidebar(!showCommentsSidebar);
    }
  };
  
  // Handle adding a comment
  const handleAddComment = () => {
    if (commentText.trim()) {
      const result = addComment(commentText);
      if (result) {
        console.log("Comment added successfully");
      } else {
        console.error("Failed to add comment");
      }
      setIsDialogOpen(false);
      setCommentText('');
    }
  };
  
  return (
    <>
      <Tooltip title="Comments">
        <IconButton 
          size="small"
          onClick={handleCommentButtonClick}
          color={showCommentsSidebar ? "primary" : "default"}
        >
          <Badge badgeContent={activeCommentsCount} color="primary">
            <Comment sx={{ fontSize: '18px' }} />
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Comment Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          pb: 1
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Comment
          </Typography>
          <IconButton onClick={() => setIsDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: '#1976d2' }}>
              Y
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <TextField
                autoFocus
                placeholder="Add your comment here..."
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '14px'
                  }
                }}
              />
            </Box>
          </Box>
          
          {selectedTextRange && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: '#f5f5f5', 
              borderRadius: '4px',
              borderLeft: '4px solid #1976d2'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Selected text:
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                "{selectedTextRange.toString()}"
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button 
            onClick={() => setIsDialogOpen(false)}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddComment}
            variant="contained" 
            disabled={!commentText.trim()}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 3
            }}
          >
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CommentButton; 