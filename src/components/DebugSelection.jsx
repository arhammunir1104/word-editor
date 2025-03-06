import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useComments } from '../context/CommentContext';

// Add this component temporarily to your app to debug selection issues
const DebugSelection = () => {
  const [selectionInfo, setSelectionInfo] = useState('No selection');
  const [selectionInterval, setSelectionInterval] = useState(null);
  const { captureCurrentSelection } = useComments();
  
  // Monitor selection continuously
  useEffect(() => {
    const interval = setInterval(() => {
      checkSelection();
    }, 1000);
    
    setSelectionInterval(interval);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  const checkSelection = () => {
    const selection = window.getSelection();
    if (!selection) {
      setSelectionInfo('Selection API not available');
      return;
    }
    
    if (selection.rangeCount === 0) {
      setSelectionInfo('No range in selection');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const text = selection.toString();
    
    if (!text || text.trim() === '') {
      setSelectionInfo('No text selected');
      return;
    }
    
    setSelectionInfo(`
      Selection text: "${text}"
      Range collapsed: ${range.collapsed}
      Start container: ${range.startContainer.nodeName}
      End container: ${range.endContainer.nodeName}
      Start offset: ${range.startOffset}
      End offset: ${range.endOffset}
    `);
  };
  
  const testManualHighlighting = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectionInfo('No selection to highlight');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const text = selection.toString();
    
    if (!text || text.trim() === '') {
      setSelectionInfo('No text to highlight');
      return;
    }
    
    try {
      // Create a span for highlighting
      const span = document.createElement('span');
      span.style.backgroundColor = 'yellow';
      span.style.display = 'inline';
      
      // Try simple approach first
      try {
        span.textContent = range.toString(); // Pre-fill with text
        range.deleteContents();
        range.insertNode(span);
        setSelectionInfo('Highlight success (simple method)');
      } catch (e) {
        // Try alternative approach
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
        setSelectionInfo('Highlight success (complex method)');
      }
    } catch (e) {
      setSelectionInfo(`Highlight failed: ${e.message}`);
    }
  };
  
  const testSelectionCapture = () => {
    const range = captureCurrentSelection();
    if (range) {
      setSelectionInfo(`CAPTURED: "${range.toString()}"`);
    } else {
      setSelectionInfo("Failed to capture selection");
    }
  };
  
  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 20, 
      left: 20, 
      zIndex: 9999,
      backgroundColor: 'white',
      padding: 2,
      border: '1px solid #ccc',
      borderRadius: 2,
      maxWidth: 400,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <Button 
        variant="contained" 
        onClick={checkSelection}
        sx={{ mb: 2, mr: 1 }}
      >
        Debug Selection
      </Button>
      <Button 
        variant="contained" 
        color="success"
        onClick={testManualHighlighting}
        sx={{ mb: 2, mr: 1 }}
      >
        Test Highlight
      </Button>
      <Button 
        variant="contained" 
        color="primary"
        onClick={testSelectionCapture}
        sx={{ mb: 2 }}
      >
        Test Capture
      </Button>
      <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', p: 1, borderRadius: 1 }}>
        {selectionInfo}
      </Typography>
    </Box>
  );
};

export default DebugSelection; 