import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FormatIndentIncrease, FormatIndentDecrease } from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const IndentationControls = () => {
  const { saveHistory, ActionTypes } = useEditorHistory();

  // Helper function to find content area
  const findContentArea = (node) => {
    while (node) {
      if (node.hasAttribute && node.hasAttribute('data-content-area')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  const handleIndent = (direction) => {
    try {
      // Save history before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      
      // Navigate to the element if we're in a text node
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      // Find the content area
      const contentArea = findContentArea(container);
      if (!contentArea) return;
      
      // Get the page number
      const pageNumber = parseInt(contentArea.getAttribute('data-page')) || 1;
      
      // Call the main indentation handler from EditorContent
      window.dispatchEvent(new CustomEvent('handle-indentation', {
        detail: {
          direction: direction,
          pageNumber: pageNumber
        }
      }));
      
      // Save history after making changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
    } catch (error) {
      console.error('Indentation change failed:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <Tooltip title="Decrease indent (Ctrl+[)">
        <IconButton
          size="small"
          onClick={() => handleIndent('decrease')}
          sx={{ padding: '4px' }}
        >
          <FormatIndentDecrease sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Increase indent (Ctrl+])">
        <IconButton
          size="small"
          onClick={() => handleIndent('increase')}
          sx={{ padding: '4px' }}
        >
          <FormatIndentIncrease sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default IndentationControls; 