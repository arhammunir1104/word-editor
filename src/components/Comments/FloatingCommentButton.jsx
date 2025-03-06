import React, { useState, useEffect } from 'react';
import { IconButton, Paper, Tooltip, TextField, Button, Box } from '@mui/material';
import { Comment } from '@mui/icons-material';
import { useComments } from '../../context/CommentContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const FloatingCommentButton = () => {
  const { isAddingComment, selectedTextRange, addComment } = useComments();
  const { saveHistory, ActionTypes } = useEditorHistory();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Update position based on text selection
  useEffect(() => {
    if (isAddingComment && selectedTextRange) {
      const rangeRects = selectedTextRange.getClientRects();
      if (rangeRects.length > 0) {
        const lastRect = rangeRects[rangeRects.length - 1];
        
        setPosition({
          top: lastRect.bottom + window.scrollY + 10,
          left: lastRect.left + window.scrollX
        });
      }
    }
  }, [isAddingComment, selectedTextRange]);
  
  const handleCommentButtonClick = () => {
    setShowCommentForm(true);
  };
  
  const handleSubmitComment = () => {
    if (commentText.trim()) {
      // Save history before adding comment
      saveHistory(ActionTypes.COMPLETE);
      
      // Add the comment
      addComment(commentText);
      
      // Reset form state
      setCommentText('');
      setShowCommentForm(false);
      
      // Save history after adding comment
      saveHistory(ActionTypes.COMPLETE);
    }
  };
  
  const handleCancelComment = () => {
    setCommentText('');
    setShowCommentForm(false);
  };
  
  if (!isAddingComment) return null;
  
  return (
    <div
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1200,
        pointerEvents: 'auto'
      }}
    >
      {showCommentForm ? (
        <Paper elevation={3} sx={{ p: 2, width: '300px', borderRadius: '8px' }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            autoFocus
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '14px'
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
            <Button 
              size="small" 
              onClick={handleCancelComment} 
              sx={{ mr: 1, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              color="primary" 
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              sx={{ textTransform: 'none' }}
            >
              Comment
            </Button>
          </Box>
        </Paper>
      ) : (
        <Tooltip title="Add comment">
          <IconButton
            onClick={handleCommentButtonClick}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1565c0',
              },
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
          >
            <Comment />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
};

export default FloatingCommentButton; 