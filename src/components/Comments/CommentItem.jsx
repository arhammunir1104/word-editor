import React, { useState } from 'react';
import { Box, Typography, IconButton, Avatar, TextField, Button, Divider, Tooltip, Collapse } from '@mui/material';
import { Edit, Delete, Done, Reply, Undo, Check, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useComments } from '../../context/CommentContext';

const CommentItem = ({ comment, isActive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(true);
  
  const { 
    editComment, 
    deleteComment, 
    addReply, 
    toggleResolveComment, 
    setActiveComment,
    scrollToComment 
  } = useComments();
  
  const handleEditSubmit = () => {
    if (editText.trim()) {
      editComment(comment.id, editText);
      setIsEditing(false);
    }
  };
  
  const handleReplySubmit = () => {
    if (replyText.trim()) {
      addReply(comment.id, replyText);
      setIsReplying(false);
      setReplyText('');
    }
  };
  
  const handleCommentClick = () => {
    setActiveComment(comment.id);
    scrollToComment(comment.highlightId);
  };
  
  // Helper function to format dates
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    
    // Convert to seconds, minutes, hours, days
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
      return `on ${past.toLocaleDateString()}`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  };
  
  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: isActive ? '#f0f7ff' : '#ffffff',
        borderLeft: isActive ? '4px solid #1976d2' : '4px solid transparent',
        borderBottom: '1px solid #e0e0e0',
        opacity: comment.resolved ? 0.7 : 1,
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: isActive ? '#e3f2fd' : '#f5f5f5'
        }
      }}
      onClick={handleCommentClick}
    >
      {/* Comment Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={comment.user.avatar}
            alt={comment.user.name}
            sx={{ width: 36, height: 36, bgcolor: '#1976d2' }}
          >
            {comment.user.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{comment.user.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatTimeAgo(comment.updatedAt)}
            </Typography>
          </Box>
        </Box>
        
        {/* Comment Status */}
        {comment.resolved && (
          <Box 
            sx={{ 
              px: 1.5,
              py: 0.5,
              borderRadius: '4px',
              backgroundColor: '#e8f5e9',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <Check sx={{ color: '#43a047', fontSize: 16 }} />
            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Resolved
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Comment content */}
      <Box sx={{ ml: 6.5 }}>
        {/* Highlighted text reference */}
        {comment.highlightedText && (
          <Box 
            sx={{ 
              backgroundColor: '#fff9c4', 
              borderLeft: '3px solid #fbc02d',
              px: 1.5,
              py: 0.75,
              mb: 1.5,
              borderRadius: '0 4px 4px 0',
            }}
          >
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#5d4037' }}>
              "{comment.highlightedText}"
            </Typography>
          </Box>
        )}
        
        {/* Comment text */}
        {isEditing ? (
          <Box sx={{ mt: 1, mb: 2 }}>
            <TextField
              fullWidth
              multiline
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              variant="outlined"
              size="small"
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
              <Button 
                size="small" 
                onClick={() => setIsEditing(false)} 
                sx={{ mr: 1, textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button 
                size="small" 
                variant="contained" 
                onClick={handleEditSubmit}
                sx={{ textTransform: 'none' }}
              >
                Save
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 2, 
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          >
            {comment.text}
          </Typography>
        )}
        
        {/* Comment Actions */}
        {!isEditing && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1, mb: 1 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Delete">
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                deleteComment(comment.id);
              }}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Reply">
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                setIsReplying(!isReplying);
              }}>
                <Reply fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={comment.resolved ? "Mark as unresolved" : "Resolve comment"}>
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                toggleResolveComment(comment.id);
              }}>
                {comment.resolved ? <Undo fontSize="small" /> : <Check fontSize="small" />}
              </IconButton>
            </Tooltip>
            
            {comment.replies.length > 0 && (
              <Tooltip title={showReplies ? "Hide replies" : "Show replies"}>
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  setShowReplies(!showReplies);
                }}>
                  {showReplies ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
        
        {/* Reply Form */}
        {isReplying && (
          <Box sx={{ mt: 2, mb: 2, ml: 2 }}>
            <TextField
              fullWidth
              placeholder="Add a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              variant="outlined"
              size="small"
              multiline
              rows={2}
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
              <Button 
                size="small" 
                onClick={() => setIsReplying(false)} 
                sx={{ mr: 1, textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button 
                size="small" 
                variant="contained" 
                onClick={handleReplySubmit}
                disabled={!replyText.trim()}
                sx={{ textTransform: 'none' }}
              >
                Reply
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Replies */}
        {comment.replies.length > 0 && (
          <Collapse in={showReplies}>
            <Box sx={{ mt: 1, ml: 3, borderLeft: '2px solid #e0e0e0', pl: 2 }}>
              {comment.replies.map((reply) => (
                <Box key={reply.id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 0.5 }}>
                    <Avatar
                      src={reply.user.avatar}
                      alt={reply.user.name}
                      sx={{ width: 28, height: 28, mt: 0.5 }}
                    >
                      {reply.user.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {reply.user.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                          {formatTimeAgo(reply.createdAt)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {reply.text}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        )}
      </Box>
    </Box>
  );
};

export default CommentItem; 