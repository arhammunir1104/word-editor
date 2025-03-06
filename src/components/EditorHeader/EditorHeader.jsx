import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, TextField, Avatar, Menu, MenuItem, Box } from '@mui/material';
import { Menu as MenuIcon, StarBorder, DriveFileMove, CloudDone, AccessTime, ChatBubbleOutline, Share } from '@mui/icons-material';

const EditorHeader = () => {
  const [documentName, setDocumentName] = useState('Untitled document');
  const [isEditingName, setIsEditingName] = useState(false);
  const [anchorElFile, setAnchorElFile] = useState(null);
  const [anchorElFormat, setAnchorElFormat] = useState(null);

  const handleDocumentNameClick = () => {
    setIsEditingName(true);
  };

  const handleDocumentNameChange = (event) => {
    setDocumentName(event.target.value);
  };

  const handleDocumentNameBlur = () => {
    setIsEditingName(false);
  };

  const handleFileClick = (event) => {
    setAnchorElFile(event.currentTarget);
  };

  const handleFileClose = () => {
    setAnchorElFile(null);
  };

  const handleFormatClick = (event) => {
    setAnchorElFormat(event.currentTarget);
  };

  const handleFormatClose = () => {
    setAnchorElFormat(null);
  };

  return (
    <AppBar position="static" sx={{ 
      backgroundColor: '#ffffff',
      color: '#444746',
      boxShadow: 'none',
      height: 'auto',
      '& .MuiToolbar-root': {
        minHeight: 'auto !important'
      }
    }}>
      <Toolbar sx={{ 
        borderBottom: '1px solid #e0e0e0',
        padding: '5px 5px',
        gap: '4px',
        height: '30px',
        minHeight: '48px !important'
      }}>
        {/* Left section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconButton 
            edge="start" 
            sx={{ 
              padding: '8px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}
          >
            <MenuIcon />
          </IconButton>
          {isEditingName ? (
            <TextField
              value={documentName}
              onChange={handleDocumentNameChange}
              onBlur={handleDocumentNameBlur}
              variant="standard"
              sx={{ 
                width: '200px',
                '& input': {
                  fontSize: '18px',
                  fontFamily: 'Google Sans, Roboto, sans-serif',
                  color: '#444746'
                }
              }}
            />
          ) : (
            <Typography
              onClick={handleDocumentNameClick}
              sx={{ 
                fontSize: '18px',
                fontFamily: 'Google Sans, Roboto, sans-serif',
                color: '#444746',
                cursor: 'text',
                padding: '0 4px'
              }}
            >
              {documentName}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: '2px' }}>
            <IconButton sx={{ 
              padding: '6px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}>
              <StarBorder sx={{ fontSize: '20px' }} />
            </IconButton>
            <IconButton sx={{ 
              padding: '6px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}>
              <DriveFileMove sx={{ fontSize: '20px' }} />
            </IconButton>
            <IconButton sx={{ 
              padding: '6px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}>
              <CloudDone sx={{ fontSize: '20px' }} />
            </IconButton>
          </Box>
        </Box>

        {/* Right section */}
        <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconButton sx={{ 
            padding: '6px',
            color: '#444746',
            '&:hover': { backgroundColor: '#f6fafe' }
          }}>
            <AccessTime sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton sx={{ 
            padding: '6px',
            color: '#444746',
            '&:hover': { backgroundColor: '#f6fafe' }
          }}>
            <ChatBubbleOutline sx={{ fontSize: '20px' }} />
          </IconButton>
          <IconButton 
            sx={{ 
              padding: '6px',
              backgroundColor: '#c2e7ff',
              color: '#001d35',
              borderRadius: '16px',
              '&:hover': { backgroundColor: '#b3d3e8' }
            }}
          >
            <Share sx={{ fontSize: '20px' }} />
            <Typography sx={{ ml: 1, fontSize: '14px', fontWeight: 500 }}>Share</Typography>
          </IconButton>
          <Avatar 
            sx={{ 
              width: 32,
              height: 32,
              marginLeft: '4px',
              backgroundColor: '#4285f4',
              fontSize: '14px'
            }}
          >
            A
          </Avatar>
        </Box>
      </Toolbar>

      {/* Menu bar */}
      <Toolbar sx={{ 
        height: '36px',
        minHeight: '36px !important',
        padding: '0 8px',
        borderBottom: '1px solid #e0e0e0',
      }}>
        {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'].map((item) => (
          <Typography
            key={item}
            onClick={item === 'File' ? handleFileClick : item === 'Format' ? handleFormatClick : undefined}
            sx={{
              fontSize: '14px',
              color: '#444746',
              padding: '0 8px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f6fafe',
                borderRadius: '4px'
              }
            }}
          >
            {item}
          </Typography>
        ))}
      </Toolbar>

      {/* Keep existing Menu components */}
      <Menu anchorEl={anchorElFile} open={Boolean(anchorElFile)} onClose={handleFileClose}>
        <MenuItem onClick={handleFileClose}>New</MenuItem>
        <MenuItem onClick={handleFileClose}>Open</MenuItem>
        <MenuItem onClick={handleFileClose}>Save</MenuItem>
        <MenuItem onClick={handleFileClose}>Save as</MenuItem>
      </Menu>
      <Menu anchorEl={anchorElFormat} open={Boolean(anchorElFormat)} onClose={handleFormatClose}>
        <MenuItem onClick={handleFormatClose}>Bold</MenuItem>
        <MenuItem onClick={handleFormatClose}>Italic</MenuItem>
        <MenuItem onClick={handleFormatClose}>Underline</MenuItem>
        <MenuItem onClick={handleFormatClose}>Strikethrough</MenuItem>
      </Menu>
    </AppBar>
  );
};

export default EditorHeader; 