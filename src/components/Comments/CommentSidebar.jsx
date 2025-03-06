import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tabs, Tab, Badge, Divider, Button } from '@mui/material';
import { Close, NavigateNext, NavigateBefore, Delete, Comment, Check } from '@mui/icons-material';
import { useComments } from '../../context/CommentContext';
import CommentItem from './CommentItem';

const CommentSidebar = () => {
  const {
    comments,
    activeComment,
    showCommentsSidebar,
    setShowCommentsSidebar,
    deleteAllComments,
    goToNextComment,
    goToPrevComment
  } = useComments();
  
  const [tabValue, setTabValue] = useState(0);
  
  const activeComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);
  
  // Update tab value when comments change
  useEffect(() => {
    if (activeComments.length === 0 && resolvedComments.length > 0) {
      setTabValue(1);
    }
  }, [activeComments.length, resolvedComments.length]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  if (!showCommentsSidebar) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '340px',
        height: '100vh',
        backgroundColor: '#fff',
        boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
        zIndex: 1250,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeft: '1px solid #e0e0e0'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #e0e0e0', 
        bgcolor: '#f8f9fa',
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Comment sx={{ mr: 1, color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Comments
            </Typography>
            <Badge 
              badgeContent={comments.length} 
              color="primary"
              sx={{ ml: 1 }}
            />
          </Box>
          <Box>
            <IconButton size="small" onClick={() => setShowCommentsSidebar(false)}>
              <Close />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<NavigateBefore />}
            onClick={goToPrevComment}
            disabled={comments.length === 0}
            sx={{ textTransform: 'none', borderRadius: '4px' }}
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<NavigateNext />}
            onClick={goToNextComment}
            disabled={comments.length === 0}
            sx={{ textTransform: 'none', borderRadius: '4px' }}
          >
            Next
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<Delete />}
            onClick={deleteAllComments}
            disabled={comments.length === 0}
            sx={{ 
              textTransform: 'none', 
              borderRadius: '4px',
              ml: 'auto'
            }}
          >
            Delete All
          </Button>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ 
          borderBottom: '1px solid #e0e0e0',
          minHeight: '48px',
          '& .MuiTabs-indicator': {
            backgroundColor: '#1976d2',
            height: '3px'
          }
        }}
      >
        <Tab 
          label={
            <Badge badgeContent={activeComments.length} color="primary">
              <Box sx={{ px: 1 }}>Active</Box>
            </Badge>
          }
          sx={{ textTransform: 'none', fontWeight: 600, minHeight: '48px' }}
        />
        <Tab 
          label={
            <Badge badgeContent={resolvedComments.length} color="default">
              <Box sx={{ px: 1 }}>Resolved</Box>
            </Badge>
          }
          sx={{ textTransform: 'none', fontWeight: 600, minHeight: '48px' }}
        />
      </Tabs>
      
      {/* Comments List */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 0, 
          bgcolor: '#f8f9fa'
        }}
      >
        {tabValue === 0 ? (
          activeComments.length > 0 ? (
            activeComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isActive={comment.id === activeComment}
              />
            ))
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 4,
              height: '100%'
            }}>
              <Comment sx={{ fontSize: 40, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                No active comments
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center' }}>
                Select some text and click the comment button to add a comment
              </Typography>
            </Box>
          )
        ) : (
          resolvedComments.length > 0 ? (
            resolvedComments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isActive={comment.id === activeComment}
              />
            ))
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 4,
              height: '100%'
            }}>
              <Check sx={{ fontSize: 40, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                No resolved comments
              </Typography>
            </Box>
          )
        )}
      </Box>
    </Box>
  );
};

export default CommentSidebar; 