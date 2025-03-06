import React from 'react';
import { Box } from '@mui/material';

const Editor = () => {
  // Standard US Letter size in pixels (at 96 DPI)
  const PAGE_WIDTH = '8.5in';
  const PAGE_HEIGHT = '11in';
  const PAGE_MARGIN = '1in';
  const WRAPPER_HEIGHT = '128px'; // Adjust based on your actual wrapper height

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#e0e0e0',
      minHeight: '100vh',
      marginTop: WRAPPER_HEIGHT, // Use margin instead of padding
      padding: '20px'
    }}>
      <Box
        contentEditable
        sx={{
          width: PAGE_WIDTH,
          minHeight: PAGE_HEIGHT,
          margin: '0 auto',
          padding: PAGE_MARGIN,
          backgroundColor: 'white',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          outline: 'none',
          overflowY: 'hidden',
          '&[contenteditable="true"]': {
            '&:empty:before': {
              content: '"Start typing..."',
              color: '#999',
            }
          },
          '@media print': {
            width: '100%',
            height: '100%',
            margin: 0,
            padding: PAGE_MARGIN,
            boxShadow: 'none',
            breakInside: 'avoid',
            pageBreakAfter: 'always',
          }
        }}
        onInput={(e) => {
          // Auto-create new pages when content exceeds page height
          const target = e.currentTarget;
          if (target.scrollHeight > target.clientHeight) {
            const currentHeight = parseFloat(target.style.height || PAGE_HEIGHT);
            target.style.height = `${currentHeight + parseFloat(PAGE_HEIGHT)}px`;
          }
        }}
      />
    </Box>
  );
};

export default Editor; 