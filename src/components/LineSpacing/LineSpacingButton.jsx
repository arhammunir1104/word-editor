import React, { useState, useRef } from 'react';
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { FormatLineSpacing, ArrowDropDown, Add } from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import LineSpacingDialog from './LineSpacingDialog';

const LineSpacingButton = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { saveHistory, ActionTypes } = useEditorHistory();
  
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
    // Save current state for undo
    saveHistory(ActionTypes.FORMAT);
    
    // Restore selection first
    restoreSelection();
    
    // Apply the line spacing
    applyLineSpacing(spacing);
    
    handleClose();
  };

  const handleCustomClick = () => {
    setDialogOpen(true);
    handleClose();
    // Note: We don't need to restore selection here because
    // we'll do it when applying the custom spacing
  };

  const handleCustomSpacing = (spacing) => {
    // Save current state for undo
    saveHistory(ActionTypes.FORMAT);
    
    // Restore selection before applying spacing
    restoreSelection();
    
    // Apply the custom line spacing
    applyLineSpacing(spacing);
    
    setDialogOpen(false);
    
    // Clear saved selection after use
    savedSelectionRef.current = null;
  };

  const applyLineSpacing = (spacing) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Find all affected paragraphs
    const affectedParagraphs = [];
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    // Get the highest block-level parent elements (paragraphs)
    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentNode;
    }
    
    if (endNode.nodeType === Node.TEXT_NODE) {
      endNode = endNode.parentNode;
    }
    
    // Find paragraph-level nodes
    const findParagraphNodes = (node) => {
      let current = node;
      while (current && 
             !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(current.nodeName) && 
             !current.hasAttribute('data-content-area')) {
        current = current.parentNode;
      }
      return current;
    };
    
    let startParagraph = findParagraphNodes(startNode);
    let endParagraph = findParagraphNodes(endNode);
    
    // If no specific text is selected, apply to the entire paragraph
    if (range.collapsed) {
      if (startParagraph) {
        affectedParagraphs.push(startParagraph);
      }
    } 
    // If text is selected across multiple paragraphs
    else {
      // If selection is in the same paragraph
      if (startParagraph === endParagraph) {
        affectedParagraphs.push(startParagraph);
      } 
      // If selection spans multiple paragraphs
      else {
        // Create a TreeWalker to iterate through all paragraph-level nodes between start and end
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(node.nodeName)) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_SKIP;
            }
          }
        );
        
        walker.currentNode = startParagraph;
        
        // Collect all paragraph nodes in the range
        let inRange = true;
        while (inRange && walker.currentNode) {
          affectedParagraphs.push(walker.currentNode);
          
          if (walker.currentNode === endParagraph) {
            inRange = false;
          }
          
          if (!walker.nextNode()) {
            break;
          }
        }
      }
    }
    
    // Apply line spacing to all affected paragraphs
    affectedParagraphs.forEach((p) => {
      p.style.lineHeight = spacing;
    });
    
    // Trigger input event to update content state
    const inputEvent = new Event('input', { bubbles: true });
    const contentArea = document.querySelector('[data-content-area="true"]');
    if (contentArea) {
      contentArea.dispatchEvent(inputEvent);
    }
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