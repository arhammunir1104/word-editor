import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { 
  FormatListBulleted, 
  FormatListNumbered,
  ArrowDropDown,
  Circle,
  RadioButtonUnchecked,
  Stop,
  ArrowRight,
  Remove,
  Stars
} from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import * as ListUtils from '../../utils/ListUtils';

const ListControls = () => {
  const [bulletAnchorEl, setBulletAnchorEl] = useState(null);
  const [numberAnchorEl, setNumberAnchorEl] = useState(null);
  const { saveHistory, ActionTypes } = useEditorHistory();

  const handleBulletMenuOpen = (event) => {
    setBulletAnchorEl(event.currentTarget);
  };

  const handleNumberMenuOpen = (event) => {
    setNumberAnchorEl(event.currentTarget);
  };

  const handleCloseMenus = () => {
    setBulletAnchorEl(null);
    setNumberAnchorEl(null);
  };

  // Apply bullet list
  const applyBulletList = () => {
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);

    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Find the editable content area
    const contentArea = ListUtils.findContentArea(range.startContainer);
    if (!contentArea) return;

    // Get the container of the selection
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }

    // Find the closest paragraph or list item
    let paragraph = container;
    while (paragraph && 
           !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(paragraph.nodeName) && 
           paragraph !== contentArea) {
      paragraph = paragraph.parentNode;
    }

    // If we didn't find a valid block element, create a new paragraph
    if (!paragraph || paragraph === contentArea) {
      // Create a new paragraph with the selected content
      const newParagraph = document.createElement('p');
      if (!range.collapsed) {
        // If there's a selection, extract it and put it in the paragraph
        const fragment = range.extractContents();
        newParagraph.appendChild(fragment);
        range.insertNode(newParagraph);
      } else {
        // If no selection, just create empty paragraph
        newParagraph.innerHTML = '<br>';
        contentArea.appendChild(newParagraph);
      }
      paragraph = newParagraph;
    }

    // Check if we're already in a list
    const existingListItem = ListUtils.getListItem(paragraph);
    
    if (existingListItem) {
      // Already in a list item
      const parentList = existingListItem.parentNode;
      
      if (parentList.nodeName === 'UL') {
        // Already in a bullet list - convert to paragraph
        const newPara = document.createElement('p');
        newPara.innerHTML = existingListItem.innerHTML;
        
        // Replace list item with paragraph
        if (parentList.childNodes.length === 1) {
          // If this is the only item, replace the entire list
          parentList.parentNode.replaceChild(newPara, parentList);
        } else {
          // Otherwise, just replace this list item
          parentList.parentNode.insertBefore(newPara, parentList);
          existingListItem.remove();
        }
        
        // Set selection to the new paragraph
        const newRange = document.createRange();
        newRange.selectNodeContents(newPara);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else if (parentList.nodeName === 'OL') {
        // In a numbered list - convert to bullet list
        const newList = document.createElement('ul');
        const newItem = document.createElement('li');
        newItem.innerHTML = existingListItem.innerHTML;
        
        // Set appropriate bullet style
        const level = ListUtils.getListLevel(existingListItem);
        newItem.style.listStyleType = ListUtils.getBulletStyleForLevel(level);
        
        newList.appendChild(newItem);
        
        // Replace the list item
        if (parentList.childNodes.length === 1) {
          // If this is the only item, replace the entire list
          parentList.parentNode.replaceChild(newList, parentList);
        } else {
          // Otherwise, just replace this list item
          parentList.parentNode.insertBefore(newList, parentList);
          existingListItem.remove();
        }
        
        // Set selection to the new list item
        const newRange = document.createRange();
        newRange.selectNodeContents(newItem);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Not in a list - create a new bullet list
      const newList = document.createElement('ul');
      const newItem = document.createElement('li');
      
      // Copy content from the paragraph/block element
      newItem.innerHTML = paragraph.innerHTML;
      
      // Set appropriate bullet style
      newItem.style.listStyleType = ListUtils.getBulletStyleForLevel(1);
      
      newList.appendChild(newItem);
      
      // Replace the paragraph with the new list
      paragraph.parentNode.replaceChild(newList, paragraph);
      
      // Set selection to the new list item
      const newRange = document.createRange();
      newRange.selectNodeContents(newItem);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // Trigger input event
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Save history after changes
    setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
  };

  // Apply numbered list (similar structure to bulletList)
  const applyNumberedList = () => {
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);

    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Find the editable content area
    const contentArea = ListUtils.findContentArea(range.startContainer);
    if (!contentArea) return;

    // Get the container of the selection
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }

    // Find the closest paragraph or list item
    let paragraph = container;
    while (paragraph && 
           !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(paragraph.nodeName) && 
           paragraph !== contentArea) {
      paragraph = paragraph.parentNode;
    }

    // If we didn't find a valid block element, create a new paragraph
    if (!paragraph || paragraph === contentArea) {
      // Create a new paragraph with the selected content
      const newParagraph = document.createElement('p');
      if (!range.collapsed) {
        // If there's a selection, extract it and put it in the paragraph
        const fragment = range.extractContents();
        newParagraph.appendChild(fragment);
        range.insertNode(newParagraph);
      } else {
        // If no selection, just create empty paragraph
        newParagraph.innerHTML = '<br>';
        contentArea.appendChild(newParagraph);
      }
      paragraph = newParagraph;
    }

    // Check if we're already in a list
    const existingListItem = ListUtils.getListItem(paragraph);
    
    if (existingListItem) {
      // Already in a list item
      const parentList = existingListItem.parentNode;
      
      if (parentList.nodeName === 'OL') {
        // Already in a numbered list - convert to paragraph
        const newPara = document.createElement('p');
        newPara.innerHTML = existingListItem.innerHTML;
        
        // Replace list item with paragraph
        if (parentList.childNodes.length === 1) {
          // If this is the only item, replace the entire list
          parentList.parentNode.replaceChild(newPara, parentList);
        } else {
          // Otherwise, just replace this list item
          parentList.parentNode.insertBefore(newPara, parentList);
          existingListItem.remove();
        }
        
        // Set selection to the new paragraph
        const newRange = document.createRange();
        newRange.selectNodeContents(newPara);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else if (parentList.nodeName === 'UL') {
        // In a bullet list - convert to numbered list
        const newList = document.createElement('ol');
        const newItem = document.createElement('li');
        newItem.innerHTML = existingListItem.innerHTML;
        
        // Set appropriate number style
        const level = ListUtils.getListLevel(existingListItem);
        newItem.style.listStyleType = ListUtils.getNumberStyleForLevel(level);
        
        newList.appendChild(newItem);
        
        // Replace the list item
        if (parentList.childNodes.length === 1) {
          // If this is the only item, replace the entire list
          parentList.parentNode.replaceChild(newList, parentList);
        } else {
          // Otherwise, just replace this list item
          parentList.parentNode.insertBefore(newList, parentList);
          existingListItem.remove();
        }
        
        // Set selection to the new list item
        const newRange = document.createRange();
        newRange.selectNodeContents(newItem);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Not in a list - create a new numbered list
      const newList = document.createElement('ol');
      const newItem = document.createElement('li');
      
      // Copy content from the paragraph/block element
      newItem.innerHTML = paragraph.innerHTML;
      
      // Set appropriate number style
      newItem.style.listStyleType = ListUtils.getNumberStyleForLevel(1);
      
      newList.appendChild(newItem);
      
      // Replace the paragraph with the new list
      paragraph.parentNode.replaceChild(newList, paragraph);
      
      // Set selection to the new list item
      const newRange = document.createRange();
      newRange.selectNodeContents(newItem);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // Trigger input event
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Save history after changes
    setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
  };

  // Apply bullet style (disc, circle, square, etc.)
  const applyBulletStyle = (style) => {
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      handleCloseMenus();
      return;
    }
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Find if we're in a list item
    const listItem = ListUtils.getListItem(container);
    
    if (listItem) {
      // Already in a list item
      const parentList = listItem.parentNode;
      
      if (parentList.nodeName === 'OL') {
        // In a numbered list - convert to bullet list first
        const newList = document.createElement('ul');
        const newItem = document.createElement('li');
        newItem.innerHTML = listItem.innerHTML;
        newItem.style.listStyleType = style;
        
        newList.appendChild(newItem);
        
        // Replace the list item
        if (parentList.childNodes.length === 1) {
          // If only item, replace the entire list
          parentList.parentNode.replaceChild(newList, parentList);
        } else {
          // Otherwise, just replace this list item
          parentList.parentNode.insertBefore(newList, parentList);
          listItem.remove();
        }
        
        // Update selection
        const newRange = document.createRange();
        newRange.selectNodeContents(newItem);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // In a bullet list - just update the style
        listItem.style.listStyleType = style;
        
        // Also update any child items if necessary to maintain the hierarchy
        const contentArea = ListUtils.findContentArea(listItem);
        if (contentArea) {
          ListUtils.updateAllListStyles(contentArea);
        }
      }
    } else {
      // Not in a list - create a bullet list first
      applyBulletList();
      
      // Then set the style
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (!newSelection || newSelection.rangeCount === 0) return;
        
        const newContainer = newSelection.getRangeAt(0).commonAncestorContainer;
        const newListItem = ListUtils.getListItem(
          newContainer.nodeType === Node.TEXT_NODE ? newContainer.parentNode : newContainer
        );
        
        if (newListItem) {
          newListItem.style.listStyleType = style;
        }
      }, 10);
    }
    
    // Close the menu
    handleCloseMenus();
  };

  // Apply number style (decimal, lower-alpha, etc.)
  const applyNumberStyle = (style) => {
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      handleCloseMenus();
      return;
    }
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Find if we're in a list item
    const listItem = ListUtils.getListItem(container);
    
    if (listItem) {
      // Already in a list item
      const parentList = listItem.parentNode;
      
      if (parentList.nodeName === 'UL') {
        // In a bullet list - convert to numbered list first
        const newList = document.createElement('ol');
        const newItem = document.createElement('li');
        newItem.innerHTML = listItem.innerHTML;
        newItem.style.listStyleType = style;
        
        newList.appendChild(newItem);
        
        // Replace the list item
        if (parentList.childNodes.length === 1) {
          // If only item, replace the entire list
          parentList.parentNode.replaceChild(newList, parentList);
        } else {
          // Otherwise, just replace this list item
          parentList.parentNode.insertBefore(newList, parentList);
          listItem.remove();
        }
        
        // Update selection
        const newRange = document.createRange();
        newRange.selectNodeContents(newItem);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // In a numbered list - just update the style
        listItem.style.listStyleType = style;
        
        // Also update any child items if necessary to maintain the hierarchy
        const contentArea = ListUtils.findContentArea(listItem);
        if (contentArea) {
          ListUtils.updateAllListStyles(contentArea);
        }
      }
    } else {
      // Not in a list - create a numbered list first
      applyNumberedList();
      
      // Then set the style
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (!newSelection || newSelection.rangeCount === 0) return;
        
        const newContainer = newSelection.getRangeAt(0).commonAncestorContainer;
        const newListItem = ListUtils.getListItem(
          newContainer.nodeType === Node.TEXT_NODE ? newContainer.parentNode : newContainer
        );
        
        if (newListItem) {
          newListItem.style.listStyleType = style;
        }
      }, 10);
    }
    
    // Close the menu
    handleCloseMenus();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px' }} className="list-controls">
      {/* Bullet List Button */}
      <Tooltip title="Bulleted list (Ctrl+Shift+8)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={applyBulletList}
        >
          <FormatListBulleted sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
      
      {/* Bullet List Menu Button */}
      <IconButton 
        size="small" 
        sx={{ padding: '2px' }}
        onClick={handleBulletMenuOpen}
      >
        <ArrowDropDown sx={{ fontSize: '16px' }} />
      </IconButton>
      
      {/* Bullet Styles Menu */}
      <Menu
        anchorEl={bulletAnchorEl}
        open={Boolean(bulletAnchorEl)}
        onClose={handleCloseMenus}
      >
        <MenuItem onClick={() => applyBulletStyle('disc')}>
          <ListItemIcon>
            <Circle fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Filled Circle" />
        </MenuItem>
        <MenuItem onClick={() => applyBulletStyle('circle')}>
          <ListItemIcon>
            <RadioButtonUnchecked fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Hollow Circle" />
        </MenuItem>
        <MenuItem onClick={() => applyBulletStyle('square')}>
          <ListItemIcon>
            <Stop fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Square" />
        </MenuItem>
        <MenuItem onClick={() => applyBulletStyle('➤')}>
          <ListItemIcon>
            <ArrowRight fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Arrow" />
        </MenuItem>
        <MenuItem onClick={() => applyBulletStyle('-')}>
          <ListItemIcon>
            <Remove fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Dash" />
        </MenuItem>
        <MenuItem onClick={() => applyBulletStyle('✦')}>
          <ListItemIcon>
            <Stars fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Star" />
        </MenuItem>
      </Menu>
      
      {/* Numbered List Button */}
      <Tooltip title="Numbered list (Ctrl+Shift+7)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={applyNumberedList}
        >
          <FormatListNumbered sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
      
      {/* Numbered List Menu Button */}
      <IconButton 
        size="small" 
        sx={{ padding: '2px' }}
        onClick={handleNumberMenuOpen}
      >
        <ArrowDropDown sx={{ fontSize: '16px' }} />
      </IconButton>
      
      {/* Number Styles Menu */}
      <Menu
        anchorEl={numberAnchorEl}
        open={Boolean(numberAnchorEl)}
        onClose={handleCloseMenus}
      >
        <MenuItem onClick={() => applyNumberStyle('decimal')}>
          <ListItemText primary="1, 2, 3, ..." />
        </MenuItem>
        <MenuItem onClick={() => applyNumberStyle('lower-alpha')}>
          <ListItemText primary="a, b, c, ..." />
        </MenuItem>
        <MenuItem onClick={() => applyNumberStyle('upper-alpha')}>
          <ListItemText primary="A, B, C, ..." />
        </MenuItem>
        <MenuItem onClick={() => applyNumberStyle('lower-roman')}>
          <ListItemText primary="i, ii, iii, ..." />
        </MenuItem>
        <MenuItem onClick={() => applyNumberStyle('upper-roman')}>
          <ListItemText primary="I, II, III, ..." />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ListControls; 