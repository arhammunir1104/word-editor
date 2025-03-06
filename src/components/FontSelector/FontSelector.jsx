import React, { useEffect, useState } from 'react';
import { Select, MenuItem } from '@mui/material';
import WebFont from 'webfontloader';

const COMMON_FONTS = [
  'Arial',
  'Times New Roman',
  'Calibri',
  'Cambria',
  'Georgia',
  'Helvetica',
  'Verdana',
];

const FontSelector = ({ value, onChange }) => {
  const [fonts, setFonts] = useState(COMMON_FONTS);

  useEffect(() => {
    WebFont.load({
      google: {
        families: ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro']
      },
      active: () => {
        setFonts([
          ...COMMON_FONTS,
          'Roboto',
          'Open Sans',
          'Lato',
          'Montserrat',
          'Source Sans Pro'
        ]);
      }
    });
  }, []);

  return (
    <Select
      value={value}
      onChange={onChange}
      size="small"
      sx={{
        minWidth: 120,
        height: 32,
        '& .MuiSelect-select': {
          py: 0.5,
          fontFamily: value,
        }
      }}
    >
      {fonts.map((font) => (
        <MenuItem
          key={font}
          value={font}
          sx={{ fontFamily: font }}
        >
          {font}
        </MenuItem>
      ))}
    </Select>
  );
};

export default FontSelector; 