import React, { useState } from 'react';
import { Box } from '@mui/material';

const TableSelectionGrid = ({ onSizeHover, onSizeSelect, maxRows = 8, maxCols = 10 }) => {
  const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 });

  const handleMouseEnter = (row, col) => {
    setHoveredCell({ row, col });
    onSizeHover({ rows: row + 1, cols: col + 1 });
  };

  const handleMouseLeave = () => {
    setHoveredCell({ row: 0, col: 0 });
    onSizeHover({ rows: 0, cols: 0 });
  };

  const handleClick = (row, col) => {
    onSizeSelect(row + 1, col + 1);
  };

  return (
    <Box 
      sx={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${maxCols}, 20px)`,
        gridTemplateRows: `repeat(${maxRows}, 20px)`,
        gap: '2px',
        padding: '8px'
      }}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxRows }).map((_, rowIndex) => (
        Array.from({ length: maxCols }).map((_, colIndex) => (
          <Box
            key={`${rowIndex}-${colIndex}`}
            sx={{
              width: '20px',
              height: '20px',
              backgroundColor: 
                rowIndex <= hoveredCell.row && colIndex <= hoveredCell.col
                  ? '#4285f4'
                  : '#e0e0e0',
              cursor: 'pointer',
              transition: 'background-color 0.1s ease',
              '&:hover': {
                backgroundColor: '#4285f4'
              }
            }}
            onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
            onClick={() => handleClick(rowIndex, colIndex)}
          />
        ))
      ))}
    </Box>
  );
};

export default TableSelectionGrid; 