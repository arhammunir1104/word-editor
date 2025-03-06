import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
} from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const AlignmentControls = () => {
  const { saveHistory, ActionTypes } = useEditorHistory();

  const handleAlignment = (alignment) => {
    try {
      // Save history
      saveHistory(ActionTypes.COMPLETE);
      
      // Convert alignment to lowercase
      const alignValue = alignment.toLowerCase();
      
      // Find the current element
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      
      // Navigate to the closest block-level parent element
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      let blockElement = container;
      while (blockElement && blockElement.nodeType === Node.ELEMENT_NODE) {
        const display = window.getComputedStyle(blockElement).display;
        if (display === 'block' || blockElement.contentEditable === 'true') {
          break;
        }
        blockElement = blockElement.parentNode;
      }
      
      if (!blockElement) {
        console.error("Could not find block element");
        return;
      }
      
      // Apply the style directly 
      blockElement.style.textAlign = alignValue === 'full' ? 'justify' : alignValue;
      
    } catch (error) {
      console.error('Alignment change failed:', error);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault();
            handleAlignment('left');
            break;
          case 'e':
            e.preventDefault();
            handleAlignment('center');
            break;
          case 'r':
            e.preventDefault();
            handleAlignment('right');
            break;
          case 'j':
            e.preventDefault();
            handleAlignment('justify');
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <Tooltip title="Align Left (Ctrl+L)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleAlignment('left')}
        >
          <FormatAlignLeft sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Center (Ctrl+E)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleAlignment('center')}
        >
          <FormatAlignCenter sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Align Right (Ctrl+R)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleAlignment('right')}
        >
          <FormatAlignRight sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Justify (Ctrl+J)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleAlignment('justify')}
        >
          <FormatAlignJustify sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default AlignmentControls; 