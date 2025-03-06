import React, { useState } from 'react';
import { Box, Popover, Typography, IconButton } from '@mui/material';
import { ChromePicker } from 'react-color';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import { useEditor } from '../../context/EditorContext';

const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const ColorPicker = ({ anchorEl, onClose, onColorSelect, recentColors = [], type = 'text' }) => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  const { changeFontColor, changeBackgroundColor } = useEditor();
  const [color, setColor] = useState('#000000');

  const handleColorChange = (newColor) => {
    setColor(newColor.hex);
    onColorSelect(newColor.hex);
    saveHistory(ActionTypes.FORMAT);
  };

  const handleColorSelect = (selectedColor) => {
    if (type === 'text') {
      changeFontColor(selectedColor);
    } else if (type === 'highlight') {
      changeBackgroundColor(selectedColor);
    }
    onClose();
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      onMouseDown={(e) => e.preventDefault()}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Box 
        sx={{ p: 2, width: 250 }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {type === 'text' ? 'Text Color' : 'Highlight Color'}
        </Typography>
        
        {recentColors.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ mb: 1 }}>
              Recent Colors
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {recentColors.map((color, index) => (
                <IconButton
                  key={`${color}-${index}`}
                  size="small"
                  onClick={() => handleColorSelect(color)}
                  sx={{
                    width: 24,
                    height: 24,
                    backgroundColor: color,
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ mb: 1 }}>
            Preset Colors
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {PRESET_COLORS.map((presetColor) => (
              <IconButton
                key={presetColor}
                size="small"
                onClick={() => handleColorSelect(presetColor)}
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: presetColor,
                  border: '1px solid #e0e0e0',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        <ChromePicker
          color={color}
          onChange={handleColorChange}
          disableAlpha
          styles={{
            default: {
              picker: {
                width: '100%',
                boxShadow: 'none',
              },
            },
          }}
        />
      </Box>
    </Popover>
  );
};

export default ColorPicker; 