import React, { useState, useRef } from 'react';
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { FormatLineSpacing, ArrowDropDown, Add } from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import { useEditor } from '../../context/EditorContext';
import LineSpacingDialog from './LineSpacingDialog';

const LineSpacingButton = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { saveHistory, ActionTypes } = useEditorHistory();
  const editorContext = useEditor();
  
  // Store the selection when the button is clicked
  const savedSelectionRef = useRef(null);

  // Predefined spacing options
  const spacingOptions = [
    { label: 'Single', value: '1.0' },
    { label: '1.15', value: '1.15' },
    { label: '1.5', value: '1.5' },
    { label: 'Double', value: '2.0' },
  ];

  // Save selection state for later use
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // Restore the saved selection
  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
      return true;
    }
    return false;
  };

  const handleClick = (event) => {
    // Save the current selection when button is clicked
    saveSelection();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSpacingSelect = (spacing) => {
    try {
      // Restore selection first
      restoreSelection();
      
      // Apply the line spacing - this is a complete operation that will be tracked
      applyLineSpacing(spacing);
    } catch (error) {
      console.error('Error applying line spacing:', error);
    }
    
    handleClose();
  };

  const handleCustomClick = () => {
    setDialogOpen(true);
    handleClose();
  };

  const handleCustomSpacing = (spacing) => {
    try {
      // Restore selection before applying spacing
      restoreSelection();
      
      // Apply the custom line spacing
      applyLineSpacing(spacing);
    } catch (error) {
      console.error('Error applying custom line spacing:', error);
    }
    
    setDialogOpen(false);
    
    // Clear saved selection after use
    savedSelectionRef.current = null;
  };

  const applyLineSpacing = (spacing) => {
    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Find the content area
    const findContentArea = (node) => {
      let current = node;
      while (current && !current.hasAttribute('data-content-area')) {
        current = current.parentNode;
        if (!current) break;
      }
      return current;
    };
    
    // Get the starting nodes
    let startNode = range.startContainer;
    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentNode;
    }
    
    let endNode = range.endContainer;
    if (endNode.nodeType === Node.TEXT_NODE) {
      endNode = endNode.parentNode;
    }
    
    // Find the content area
    const contentArea = findContentArea(startNode);
    if (!contentArea) {
      console.error('Could not find content area');
      return;
    }
    
    // *** CRITICAL FIX: Directly capture the EXACT HTML before changes ***
    const originalHTML = contentArea.innerHTML;
    console.log("Saving original HTML state for undo", originalHTML.substring(0, 100) + "...");
    
    // Get the page number for context updates
    const pageNumber = contentArea.getAttribute('data-page') || '1';
    
    // First explicitly trigger history save
    saveHistory(ActionTypes.COMPLETE);
    
    // Find all affected paragraphs
    const affectedParagraphs = [];
    
    // Find paragraph-level nodes function
    const findParagraphNodes = (node) => {
      let current = node;
      while (current && 
             !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(current.nodeName) && 
             !current.hasAttribute('data-content-area')) {
        current = current.parentNode;
        if (!current) break;
      }
      return current;
    };
    
    let startParagraph = findParagraphNodes(startNode);
    let endParagraph = findParagraphNodes(endNode);
    
    if (!startParagraph || !endParagraph) {
      console.error('Could not find paragraphs to apply line spacing');
      return;
    }
    
    // Simple case - collapsed selection or same paragraph
    if (range.collapsed || startParagraph === endParagraph) {
      affectedParagraphs.push(startParagraph);
    } else {
      // Complex case - multiple paragraphs
      // Get all paragraphs in the content area
      const allParagraphs = contentArea.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
      let inRange = false;
      
      allParagraphs.forEach(para => {
        if (para === startParagraph) {
          inRange = true;
        }
        
        if (inRange) {
          affectedParagraphs.push(para);
        }
        
        if (para === endParagraph) {
          inRange = false;
        }
      });
      
      // Fallback if we didn't find any paragraphs
      if (affectedParagraphs.length === 0) {
        affectedParagraphs.push(startParagraph);
        if (startParagraph !== endParagraph) {
          affectedParagraphs.push(endParagraph);
        }
      }
    }
    
    // *** CRITICAL FIX: Create a marker to ensure DOM structure change is detected ***
    const marker = document.createElement('span');
    marker.id = `line-spacing-marker-${Date.now()}`;
    marker.style.display = 'none';
    marker.innerHTML = `<!--Line spacing changed to ${spacing}-->`;
    contentArea.appendChild(marker);
    
    // Now apply the line spacing to all affected paragraphs
    affectedParagraphs.forEach(paragraph => {
      // Apply changes in a way that's very visible to the mutation observer
      paragraph.innerHTML = `<span style="line-height: ${spacing};">${paragraph.innerHTML}</span>`;
      paragraph.setAttribute('data-line-spacing', spacing);
    });
    
    // *** CRITICAL FIX: Force layout recalculation ***
    void contentArea.offsetHeight;
    
    // Remove the marker to trigger another mutation
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
    
    // This is critical - create a real DOM change event that will trigger MutationObserver
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    contentArea.dispatchEvent(inputEvent);
    
    // *** CRITICAL FIX: Manually set content on React state ***
    if (editorContext && editorContext.setPageContents) {
      console.log("Updating page contents via setPageContents");
      editorContext.setPageContents(pageNumber, contentArea.innerHTML);
    } else if (editorContext && editorContext.updatePage) {
      console.log("Updating page contents via updatePage");
      editorContext.updatePage(pageNumber, contentArea.innerHTML);
    } else if (editorContext && editorContext.setContent) {
      console.log("Updating page contents via setContent");
      editorContext.setContent(contentArea.innerHTML, parseInt(pageNumber));
    }
    
    // Force a second history save AFTER changes
    setTimeout(() => {
      console.log(`Line spacing (${spacing}) applied to ${affectedParagraphs.length} paragraphs`);
      
      // *** CRITICAL FIX: Compare HTML to confirm change ***
      const newHTML = contentArea.innerHTML;
      console.log("New HTML differs from original:", newHTML !== originalHTML);
      
      saveHistory(ActionTypes.COMPLETE);
    }, 50);
  };

  return (
    <>
      <Tooltip title="Line spacing">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ padding: '4px' }}
        >
          <FormatLineSpacing sx={{ fontSize: '18px' }} />
          <ArrowDropDown sx={{ fontSize: '14px' }} />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {spacingOptions.map((option) => (
          <MenuItem key={option.value} onClick={() => handleSpacingSelect(option.value)}>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleCustomClick}>
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Custom spacing..." />
        </MenuItem>
      </Menu>
      
      <LineSpacingDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          // Clear saved selection when dialog is closed without applying
          savedSelectionRef.current = null;
        }}
        onApply={handleCustomSpacing}
      />
    </>
  );
};

export default LineSpacingButton; 