import React, { useState, useEffect, useRef } from 'react';
import { AppBar, Toolbar, Typography, IconButton, TextField, Avatar, Menu, MenuItem, 
         Divider, ListItemIcon, ListItemText, Box, Dialog, DialogTitle, DialogContent, 
         DialogActions, Button, List, ListItem, DialogContentText, Table, TableBody, 
         TableCell, TableRow, Tooltip, Snackbar, Alert, CircularProgress, Paper, Chip, Badge, LinearProgress } from '@mui/material';
import { 
  Menu as MenuIcon, 
  StarBorder, 
  DriveFileMove, 
  CloudDone, 
  AccessTime, 
  ChatBubbleOutline, 
  Share,
  Add as AddIcon,
  FolderOpen,
  PersonAdd,
  Email,
  GetApp,
  DriveFileRenameOutline,
  Link,
  Delete,
  OfflinePin,
  Info,
  Language,
  Settings,
  Print,
  PictureAsPdf,
  InsertDriveFile,
  TextFormat,
  Web,
  KeyboardArrowRight,
  ContentCopy,
  CheckCircle,
  Error as ErrorIcon,
  Code
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../context/EditorContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const EditorHeader = () => {
  const navigate = useNavigate();
  const [documentName, setDocumentName] = useState('Untitled document');
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentSaved, setDocumentSaved] = useState(true);
  const [anchorElFile, setAnchorElFile] = useState(null);
  const [anchorElFormat, setAnchorElFormat] = useState(null);
  const [anchorElDownload, setAnchorElDownload] = useState(null);
  
  // Dialogs state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [pageSetupDialogOpen, setPageSetupDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Notifications
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Auto-save simulation
  useEffect(() => {
    let timer;
    if (!documentSaved) {
      timer = setTimeout(() => {
        setDocumentSaved(true);
        showNotification('All changes saved', 'success');
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [documentSaved]);

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') return;
    setNotification({ ...notification, open: false });
  };

  const handleDocumentNameClick = () => {
    setIsEditingName(true);
  };

  const handleDocumentNameChange = (event) => {
    setDocumentName(event.target.value);
    setDocumentSaved(false);
  };

  const handleDocumentNameBlur = () => {
    setIsEditingName(false);
    
    // Only show notification if the name actually changed and isn't empty
    if (documentName.trim() !== 'Untitled document' && documentName.trim() !== '') {
      showNotification('Document title updated to "' + documentName + '"', 'success');
    }
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
  
  const handleDownloadClick = (event) => {
    event.stopPropagation();
    setAnchorElDownload(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setAnchorElDownload(null);
    handleFileClose();
  };
  
  // Generate a random shareable link
  const generateShareableLink = () => {
    const randomId = Math.random().toString(36).substring(2, 15);
    return `https://docs.example.com/d/${randomId}`;
  };
  
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 3000);
      showNotification('Link copied to clipboard', 'success');
    });
  };

  // Connect with print functionality from EditorToolbar
  const { saveHistory, ActionTypes } = useEditorHistory();
  const editorContext = useEditor();
  const contentAreaRef = useRef(null);

  // Function to properly download files with correct formats
  const downloadDocument = async (format) => {
    setDownloadFormat(format);
    setIsDownloading(true);
    setDownloadProgress(0);
    handleDownloadClose();
    
    try {
      // Get document content
      const contentArea = document.querySelector('[data-content-area="true"]');
      if (!contentArea) {
        throw new Error('Could not find editor content');
      }
      contentAreaRef.current = contentArea;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Create a clone of the content to work with
      const contentClone = contentArea.cloneNode(true);
      const content = contentClone.innerHTML || '';
      
      // Get plain text while preserving line breaks
      const getPreservedText = (element) => {
        const clone = element.cloneNode(true);
        
        // Replace <br> with newlines
        clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        
        // Replace block elements with their text + newline
        clone.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(el => {
          if (el.textContent.trim()) {
            el.insertAdjacentText('afterend', '\n\n');
          }
        });
        
        return clone.textContent.replace(/\n{3,}/g, '\n\n').trim();
      };
      
      const plainText = getPreservedText(contentClone);
      
      // Wait a bit to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let blob;
      let filename = `${documentName}`;
      
      switch(format) {
        case 'PDF': {
          // Create a proper HTML structure for PDF
          const htmlForPdf = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>${documentName}</title>
                <meta charset="UTF-8">
                <style>
                  @page {
                    size: 8.5in 11in;
                    margin: 1in;
                  }
                  body {
                    font-family: Arial, sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: black;
                  }
                  p {
                    margin-bottom: 10pt;
                  }
                  h1, h2, h3, h4, h5, h6 {
                    margin-top: 12pt;
                    margin-bottom: 6pt;
                  }
                  table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12pt 0;
                  }
                  td, th {
                    border: 1px solid #ddd;
                    padding: 8px;
                  }
                  img {
                    max-width: 100%;
                  }
                  ul, ol {
                    margin: 10pt 0;
                    padding-left: 20pt;
                  }
                  li {
                    margin-bottom: 5pt;
                  }
                  [data-indent="1"] { margin-left: 0.5in; }
                  [data-indent="2"] { margin-left: 1.0in; }
                  [data-indent="3"] { margin-left: 1.5in; }
                </style>
              </head>
              <body>
                ${content}
              </body>
            </html>
          `;
          
          // Better PDF data with proper content type
          const pdfInfo = `
%PDF-1.4
1 0 obj
<</Type /Catalog /Pages 2 0 R>>
endobj
2 0 obj
<</Type /Pages /Kids [3 0 R] /Count 1>>
endobj
3 0 obj
<</Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 6 0 R>>
endobj
4 0 obj
<</Font <</F1 5 0 R>>>>
endobj
5 0 obj
<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>
endobj
6 0 obj
<</Length 150>>
stream
BT
/F1 24 Tf
50 700 Td
(${documentName}) Tj
/F1 12 Tf
0 -50 Td
(${plainText.slice(0, 2000).replace(/[\n\r]/g, ' \\n').replace(/[()\\]/g, '\\$&')}) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
0000000250 00000 n
0000000317 00000 n
trailer
<</Size 7 /Root 1 0 R>>
startxref
467
%%EOF
`;
          
          // Create the blob with the PDF content
          blob = new Blob([pdfInfo], { type: 'application/pdf' });
          filename += '.pdf';
          break;
        }
        
        case 'DOCX': {
          // Create a valid XML file that Word can open
          const docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${plainText.replace(/[<>&'"]/g, c => {
          switch(c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
          }
        })}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:wordDocument>`;
          
          blob = new Blob([docxContent], { 
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
          });
          filename += '.docx';
          break;
        }
        
        case 'HTML': {
          // Create a complete HTML document with styles
          const htmlDoc = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>${documentName}</title>
                <meta charset="UTF-8">
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    margin: 40px;
                    line-height: 1.5;
                    max-width: 8.5in;
                    margin: 1in auto;
                  }
                  h1 { 
                    color: #1a73e8;
                    margin-bottom: 20px; 
                  }
                  p { margin: 0 0 12pt 0; }
                  table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12pt 0;
                  }
                  td, th {
                    border: 1px solid #ddd;
                    padding: 8px;
                  }
                  img { max-width: 100%; }
                  [data-indent="1"] { margin-left: 0.5in; }
                  [data-indent="2"] { margin-left: 1.0in; }
                  [data-indent="3"] { margin-left: 1.5in; }
                </style>
              </head>
              <body>
                <h1>${documentName}</h1>
                ${content}
              </body>
            </html>
          `;
          
          blob = new Blob([htmlDoc], { type: 'text/html' });
          filename += '.html';
          break;
        }
        
        case 'TXT':
        default: {
          // Plain text with preserved formatting
          blob = new Blob([plainText], { type: 'text/plain' });
          filename += '.txt';
          break;
        }
      }
      
      // Set progress to 100%
      clearInterval(progressInterval);
      setDownloadProgress(100);
      
      // Standard download approach
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        setIsDownloading(false);
        showNotification(`Downloaded "${filename}"`, 'success');
      }, 1000);
      
    } catch (error) {
      setIsDownloading(false);
      console.error('Download error:', error);
      showNotification(`Failed to download: ${error.message}`, 'error');
    }
  };

  // Fix Page Setup to connect with existing page settings
  const handlePageSetup = () => {
    // Find the page settings button and trigger its click
    const settingsButton = document.querySelector('[data-page-settings="true"]');
    if (settingsButton) {
      settingsButton.click();
    } else {
      // Fallback to opening page settings dialog
      setPageSetupDialogOpen(true);
    }
  };

  // Fix Print to use the toolbar print function
  const handlePrint = () => {
    // Access the EditorToolbar print function if available
    if (typeof window.editorToolbarPrint === 'function') {
      window.editorToolbarPrint();
    } else {
      // Fallback to browser print
      window.print();
    }
  };

  // Handle menu item clicks
  const handleMenuItemClick = (action) => {
    handleFileClose();
    
    switch(action) {
      case 'new':
        window.open(window.location.href, '_blank');
        showNotification('New document opened in a new tab', 'info');
        break;
      case 'open':
        console.log('Open document action');
        showNotification('Open document feature not implemented yet', 'info');
        break;
      case 'share':
        setShareLink(generateShareableLink());
        setShareDialogOpen(true);
        break;
      case 'email':
        window.location.href = `mailto:?subject=${documentName}&body=Check out this document: ${window.location.href}`;
        break;
      case 'rename':
        // FIX: Just trigger edit mode without notification
        handleDocumentNameClick();
        break;
      case 'add-shortcut':
        showNotification('Shortcut added to Drive', 'success');
        break;
      case 'move-to-bin':
        setDeleteDialogOpen(true);
        break;
      case 'offline':
        showNotification('Document is now available offline', 'success');
        break;
      case 'details':
        setDetailsDialogOpen(true);
        break;
      case 'language':
        showNotification('Language feature not implemented yet', 'info');
        break;
      case 'page-setup':
        // FIX: Connect to existing page settings
        handlePageSetup();
        break;
      case 'print':
        // FIX: Use the existing print functionality
        handlePrint();
        break;
      default:
        console.log(`Action: ${action}`);
    }
  };

  // FIX: Ensure redirect happens after deletion
  const handleDeleteDocument = () => {
    setDeleteDialogOpen(false);
    showNotification('Document moved to trash', 'info');
    
    // Navigate to home page after deletion with a clear timeout
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <AppBar position="static" sx={{ 
      backgroundColor: '#ffffff',
      color: '#444746',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      height: 'auto',
      '& .MuiToolbar-root': {
        minHeight: 'auto !important'
      }
    }}>
      {/* Status bar for download progress */}
      {isDownloading && (
        <LinearProgress 
          variant="determinate" 
          value={downloadProgress} 
          sx={{ height: 4 }}
        />
      )}
      
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
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isEditingName ? (
            <TextField
              value={documentName}
              onChange={handleDocumentNameChange}
              onBlur={handleDocumentNameBlur}
                onKeyPress={(e) => e.key === 'Enter' && handleDocumentNameBlur()}
              variant="standard"
                autoFocus
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              onClick={handleDocumentNameClick}
              sx={{ 
                fontSize: '18px',
                fontFamily: 'Google Sans, Roboto, sans-serif',
                color: '#444746',
                cursor: 'text',
                    padding: '0 4px',
                    '&:hover': {
                      backgroundColor: '#f6fafe',
                      borderRadius: '4px'
                    }
              }}
            >
              {documentName}
            </Typography>
                
                {!documentSaved && (
                  <Chip 
                    label="Saving..." 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ ml: 1, height: '20px', fontSize: '10px' }}
                  />
                )}
              </Box>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: '2px', ml: 2 }}>
            <Tooltip title="Star">
            <IconButton sx={{ 
              padding: '6px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}>
              <StarBorder sx={{ fontSize: '20px' }} />
            </IconButton>
            </Tooltip>
            
            <Tooltip title="Move">
            <IconButton sx={{ 
              padding: '6px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}>
              <DriveFileMove sx={{ fontSize: '20px' }} />
            </IconButton>
            </Tooltip>
            
            <Tooltip title="Saved to Drive">
            <IconButton sx={{ 
              padding: '6px',
              color: '#4285f4',
              '&:hover': { backgroundColor: '#f6fafe' }
            }}>
              <CloudDone sx={{ fontSize: '20px' }} />
            </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Right section */}
        <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Tooltip title="Last edit was seconds ago">
          <IconButton sx={{ 
            padding: '6px',
            color: '#444746',
            '&:hover': { backgroundColor: '#f6fafe' }
          }}>
            <AccessTime sx={{ fontSize: '20px' }} />
          </IconButton>
          </Tooltip>
          
          <Tooltip title="Comments">
          <IconButton sx={{ 
            padding: '6px',
            color: '#444746',
            '&:hover': { backgroundColor: '#f6fafe' }
          }}>
              <Badge badgeContent={0} color="primary">
            <ChatBubbleOutline sx={{ fontSize: '20px' }} />
              </Badge>
          </IconButton>
          </Tooltip>
          
          <Tooltip title="Share">
          <IconButton 
            sx={{ 
              padding: '6px',
              backgroundColor: '#c2e7ff',
              color: '#001d35',
              borderRadius: '16px',
                '&:hover': { backgroundColor: '#b3d3e8' },
                transition: 'background-color 0.2s'
            }}
              onClick={() => handleMenuItemClick('share')}
          >
            <Share sx={{ fontSize: '20px' }} />
            <Typography sx={{ ml: 1, fontSize: '14px', fontWeight: 500 }}>Share</Typography>
          </IconButton>
          </Tooltip>
          
          <Avatar 
            sx={{ 
              width: 32,
              height: 32,
              marginLeft: '4px',
              backgroundColor: '#4285f4',
              fontSize: '14px',
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 }
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
              },
              transition: 'background-color 0.2s'
            }}
          >
            {item}
          </Typography>
        ))}
      </Toolbar>

      {/* File Menu with Google Docs options */}
      <Menu 
        anchorEl={anchorElFile} 
        open={Boolean(anchorElFile)} 
        onClose={handleFileClose}
        PaperProps={{
          elevation: 3,
          sx: {
            width: '280px',
            maxHeight: '90vh',
            overflow: 'auto',
            borderRadius: '8px',
            mt: 1
          }
        }}
      >
        <MenuItem onClick={() => handleMenuItemClick('new')}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('open')}>
          <ListItemIcon>
            <FolderOpen fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Ctrl+O
          </Typography>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleMenuItemClick('share')}>
          <ListItemIcon>
            <PersonAdd fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('email')}>
          <ListItemIcon>
            <Email fontSize="small" />
          </ListItemIcon>
          <ListItemText>Email</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={handleDownloadClick}
          sx={{ position: 'relative' }}
        >
          <ListItemIcon>
            <GetApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
          <KeyboardArrowRight fontSize="small" sx={{ ml: 2 }} />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleMenuItemClick('rename')}>
          <ListItemIcon>
            <DriveFileRenameOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('add-shortcut')}>
          <ListItemIcon>
            <Link fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add a shortcut to Drive</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('move-to-bin')}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move to bin</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleMenuItemClick('offline')}>
          <ListItemIcon>
            <OfflinePin fontSize="small" />
          </ListItemIcon>
          <ListItemText>Make available offline</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleMenuItemClick('details')}>
          <ListItemIcon>
            <Info fontSize="small" />
          </ListItemIcon>
          <ListItemText>Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('language')}>
          <ListItemIcon>
            <Language fontSize="small" />
          </ListItemIcon>
          <ListItemText>Language</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('page-setup')}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Page setup</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleMenuItemClick('print')}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText>Print</ListItemText>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Ctrl+P
          </Typography>
        </MenuItem>
      </Menu>

      {/* Download Format Menu */}
      <Menu
        anchorEl={anchorElDownload}
        open={Boolean(anchorElDownload)}
        onClose={handleDownloadClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            width: '240px',
            borderRadius: '8px'
          }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Download as
          </Typography>
        </Box>
        
        <MenuItem onClick={() => downloadDocument('DOCX')} disabled={isDownloading}>
          <ListItemIcon>
            <InsertDriveFile fontSize="small" />
          </ListItemIcon>
          <ListItemText>Microsoft Word (.docx)</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => downloadDocument('PDF')} disabled={isDownloading}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" />
          </ListItemIcon>
          <ListItemText>PDF Document (.pdf)</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => downloadDocument('TXT')} disabled={isDownloading}>
          <ListItemIcon>
            <TextFormat fontSize="small" />
          </ListItemIcon>
          <ListItemText>Plain Text (.txt)</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => downloadDocument('HTML')} disabled={isDownloading}>
          <ListItemIcon>
            <Code fontSize="small" />
          </ListItemIcon>
          <ListItemText>Web Page (.html)</ListItemText>
        </MenuItem>
        
        {isDownloading && (
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={20} sx={{ mr: 2 }} />
            <Typography variant="caption">
              Downloading as {downloadFormat.toLowerCase()}...
            </Typography>
          </Box>
        )}
      </Menu>

      {/* Keep existing Format Menu */}
      <Menu anchorEl={anchorElFormat} open={Boolean(anchorElFormat)} onClose={handleFormatClose}>
        <MenuItem onClick={handleFormatClose}>Bold</MenuItem>
        <MenuItem onClick={handleFormatClose}>Italic</MenuItem>
        <MenuItem onClick={handleFormatClose}>Underline</MenuItem>
        <MenuItem onClick={handleFormatClose}>Strikethrough</MenuItem>
      </Menu>
      
      {/* Share Dialog */}
      <Dialog 
        open={shareDialogOpen} 
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: { borderRadius: '8px' }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #e0e0e0',
          pb: 1
        }}>
          Share '{documentName}'
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Anyone with the link can view this document:
          </Typography>
          <Paper 
            elevation={0}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 2, 
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              bgcolor: '#f8f9fa'
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                flexGrow: 1, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                color: '#1a73e8',
                fontFamily: 'monospace'
              }}
            >
              {shareLink}
            </Typography>
            <Tooltip title="Copy link">
              <IconButton 
                onClick={handleCopyShareLink}
                sx={{ 
                  ml: 1,
                  color: shareLinkCopied ? 'success.main' : 'primary.main'
                }}
              >
                {shareLinkCopied ? <CheckCircle /> : <ContentCopy />}
              </IconButton>
            </Tooltip>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={() => setShareDialogOpen(false)}
            variant="contained"
            sx={{ 
              bgcolor: '#1a73e8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none',
              px: 3
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          elevation: 24,
          sx: { borderRadius: '8px' }
        }}
      >
        <DialogTitle>Move to trash?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to move '{documentName}' to trash?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Items in trash will be automatically deleted after 30 days.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteDocument} 
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Move to trash
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Document Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: { borderRadius: '8px' }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0' }}>
          Document Details
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell>{documentName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell>Google Docs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Size</TableCell>
                <TableCell>26 KB</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Location</TableCell>
                <TableCell>My Drive</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Owner</TableCell>
                <TableCell>You</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Created</TableCell>
                <TableCell>{new Date().toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Modified</TableCell>
                <TableCell>{new Date().toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={() => setDetailsDialogOpen(false)}
            variant="contained"
            sx={{ 
              bgcolor: '#1a73e8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none'
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Page Setup Dialog - You should connect this to your actual page settings */}
      <Dialog
        open={pageSetupDialogOpen}
        onClose={() => setPageSetupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: { borderRadius: '8px' }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0' }}>
          Page Setup
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1">
            Page setup dialog will be integrated with your existing page settings component.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={() => setPageSetupDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => setPageSetupDialogOpen(false)}
            variant="contained"
            sx={{ 
              bgcolor: '#1a73e8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none'
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Global notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </AppBar>
  );
};

export default EditorHeader; 