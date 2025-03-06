import React, { useState } from 'react';
import { useComments } from './context/CommentContext';
import { Button, TextField, Box } from '@mui/material';

const TestComments = () => {
  const { 
    comments, 
    addComment, 
    editComment, 
    deleteComment, 
    setShowCommentsSidebar 
  } = useComments();
  const [testText, setTestText] = useState('');

  const handleTestComment = () => {
    // Create a mock range
    const div = document.createElement('div');
    div.textContent = 'Test highlighted text';
    document.body.appendChild(div);
    
    const range = document.createRange();
    range.selectNodeContents(div);
    
    // Add comment using the mock range
    addComment(testText || 'Test comment', range);
    
    // Show the comments sidebar
    setShowCommentsSidebar(true);
    
    // Clean up
    document.body.removeChild(div);
  };

  return (
    <Box sx={{ p: 2 }}>
      <TextField 
        value={testText}
        onChange={(e) => setTestText(e.target.value)}
        placeholder="Test comment text"
        sx={{ mr: 2 }}
      />
      <Button onClick={handleTestComment} variant="contained">
        Add Test Comment
      </Button>
      
      <Box sx={{ mt: 2 }}>
        <h3>Current Comments ({comments.length})</h3>
        {comments.map(comment => (
          <div key={comment.id}>
            {comment.text} - {comment.highlightedText}
          </div>
        ))}
      </Box>
    </Box>
  );
};

export default TestComments; 