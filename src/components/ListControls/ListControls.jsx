import React, { useState, useEffect } from 'react';
import { Box, IconButton, Menu, MenuItem, Tooltip, Divider, ListItemIcon, ListItemText } from '@mui/material';
import {
  FormatListBulleted,
  FormatListNumbered,
  ArrowDropDown,
  Check as CheckIcon,
  Circle as CircleIcon,
  Stop as SquareIcon,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

// Constants for bullet styles
const BULLET_STYLES = {
  DISC: 'disc',
  CIRCLE: 'circle',
  SQUARE: 'square',
  TRIANGLE: 'triangle',
};

// Constants for number styles
const NUMBER_STYLES = {
  DECIMAL: 'decimal',
  LOWER_ALPHA: 'lower-alpha',
  UPPER_ALPHA: 'upper-alpha',
  LOWER_ROMAN: 'lower-roman',
  UPPER_ROMAN: 'upper-roman',
};

// Map of indent levels to default bullet styles
const DEFAULT_BULLET_STYLES = {
  1: BULLET_STYLES.DISC,
  2: BULLET_STYLES.CIRCLE,
  3: BULLET_STYLES.SQUARE,
  4: BULLET_STYLES.TRIANGLE,
};

const ListControls = () => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  const [bulletMenuAnchor, setBulletMenuAnchor] = useState(null);
  const [numberMenuAnchor, setNumberMenuAnchor] = useState(null);
  const [bulletSubMenuAnchor, setBulletSubMenuAnchor] = useState(null);
  const [numberSubMenuAnchor, setNumberSubMenuAnchor] = useState(null);
  const [bulletMenuAnchorEl, setBulletMenuAnchorEl] = useState(null);
  const [numberMenuAnchorEl, setNumberMenuAnchorEl] = useState(null);

  // Get the current list level of an element
  const getListLevel = (element) => {
    if (!element) return 0;
    
    if (element.nodeName === 'LI') {
      // Check for data-level attribute
      if (element.hasAttribute('data-level')) {
        return parseInt(element.getAttribute('data-level'));
      }
      
      // Check for parent list's data-level
      const parentList = element.parentElement;
      if (parentList && parentList.hasAttribute('data-level')) {
        return parseInt(parentList.getAttribute('data-level'));
      }
      
      // If no data-level, check nesting
    let level = 1;
    let parent = element.parentElement;
    while (parent) {
        if (parent.nodeName === 'UL' || parent.nodeName === 'OL') {
          const parentLi = parent.parentElement;
          if (parentLi && parentLi.nodeName === 'LI') {
          level++;
            parent = parentLi.parentElement;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      return level;
    }
    
    return 0;
  };

  // Update all list items' styles based on their levels
  const updateAllListItemStyles = (list) => {
    if (!list) return;

    const processListRecursively = (listElement, level = 1) => {
      if (!listElement) return;
      
      // Set data-level attribute on the list
      listElement.setAttribute('data-level', level);
      
      // Process each list item
      Array.from(listElement.children).forEach(li => {
        if (li.nodeName !== 'LI') return;
        
        // Set data-level attribute on the list item
        li.setAttribute('data-level', level);
        
        // Set appropriate bullet style based on level
        if (listElement.nodeName === 'UL') {
          const bulletStyle = DEFAULT_BULLET_STYLES[level] || BULLET_STYLES.DISC;
          listElement.style.listStyleType = bulletStyle;
        }
        
        // Find nested lists within this li and process them
        const nestedLists = li.querySelectorAll(':scope > ul, :scope > ol');
        nestedLists.forEach(nestedList => {
          processListRecursively(nestedList, level + 1);
        });
      });
    };
    
    processListRecursively(list);
  };

  // Get list item from node or its parent
  const getListItem = (node) => {
    let current = node;
    
    // If it's a text node, get its parent
    if (current.nodeType === Node.TEXT_NODE) {
      current = current.parentNode;
    }
    
    // Traverse up to find a list item
    while (current && current.nodeName !== 'LI') {
      if (current.nodeName === 'DIV' && current.getAttribute('data-content-area') === 'true') {
        return null; // Reached content area without finding a list item
      }
      
      current = current.parentNode;
      if (!current) return null;
    }
    
    return current;
  };

  // Handle empty list item (e.g., when backspace is pressed or Enter on empty line)
  const handleEmptyListItem = (listItem, action) => {
    if (!listItem) return false;
    
    // Save before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const listElement = listItem.parentNode;
    if (!listElement) return false;
    
    // Get the current level
    const level = getListLevel(listItem);
    
    if (action === 'outdent') {
      // If at level 1, convert to paragraph
      if (level === 1) {
        const newP = document.createElement('p');
        newP.innerHTML = listItem.innerHTML;
        listElement.parentNode.insertBefore(newP, listElement);
        
        // If this was the last item, remove the entire list
        if (listElement.children.length === 1) {
          listElement.parentNode.removeChild(listElement);
        } else {
          listElement.removeChild(listItem);
        }
        
        // Position cursor in new paragraph
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(newP, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Save after changes
        saveHistory(ActionTypes.COMPLETE);
        return true;
      }
      
      // If in nested list, move up one level
      const parentListItem = listElement.parentNode;
      if (parentListItem && parentListItem.nodeName === 'LI') {
        const parentList = parentListItem.parentNode;
        
        // Create a new list item at the parent level
        const newLi = document.createElement('li');
        newLi.innerHTML = listItem.innerHTML;
        
        // Insert after parent list item
        const nextSibling = parentListItem.nextSibling;
        if (nextSibling) {
          parentList.insertBefore(newLi, nextSibling);
        } else {
          parentList.appendChild(newLi);
        }
        
        // Remove original item
        listElement.removeChild(listItem);
        
        // If original list is now empty, remove it
        if (listElement.children.length === 0) {
          parentListItem.removeChild(listElement);
        }
        
        // Position cursor in new list item
        const selection = window.getSelection();
            const range = document.createRange();
        range.setStart(newLi, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        
        // Save after changes
        saveHistory(ActionTypes.COMPLETE);
        return true;
      }
    } else if (action === 'exit') {
      // Convert current list item to paragraph
      const newP = document.createElement('p');
      newP.innerHTML = listItem.innerHTML || '<br>'; // Add <br> if empty
      
      // Insert after list or parent list item
      if (listElement.parentNode.nodeName === 'LI') {
        const parentItem = listElement.parentNode;
        const parentList = parentItem.parentNode;
        const nextSibling = parentItem.nextSibling;
        
        if (nextSibling) {
          parentList.insertBefore(newP, nextSibling);
        } else {
          parentList.parentNode.insertBefore(newP, parentList.nextSibling);
        }
      } else {
        listElement.parentNode.insertBefore(newP, listElement.nextSibling);
      }
      
      // Remove original item
      listElement.removeChild(listItem);
      
      // If list is now empty, remove it
      if (listElement.children.length === 0) {
        listElement.parentNode.removeChild(listElement);
      }
      
      // Position cursor in new paragraph
      const selection = window.getSelection();
          const range = document.createRange();
      range.setStart(newP, 0);
      range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
      // Save after changes
      saveHistory(ActionTypes.COMPLETE);
      return true;
    }
    
    return false;
  };

  // Handle indentation (Tab / Shift+Tab) within lists
  const handleIndent = (direction) => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      
      // Save state before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      // Case 1: Cursor in a list item
      const listItem = getListItem(startContainer);
      
      if (listItem) {
        if (direction === 'indent') {
          // Check if there's a previous list item to nest under
          const prevLi = listItem.previousElementSibling;
          if (!prevLi) return; // Can't indent first item
          
          // Find or create a sublist in the previous item
          let sublist = Array.from(prevLi.children).find(child => 
            child.nodeName === 'UL' || child.nodeName === 'OL'
          );
          
          if (!sublist) {
            // Create same type of list as parent
            const parentList = listItem.parentNode;
            sublist = document.createElement(parentList.nodeName);
            prevLi.appendChild(sublist);
          }
          
          // Move this item to the sublist
          sublist.appendChild(listItem);
          
          // Update styles for all items in the hierarchy
          updateAllListItemStyles(sublist);
          
          // Save history after changes
          saveHistory(ActionTypes.COMPLETE);
          return true;
        } else if (direction === 'outdent') {
          // Find parent list and list item
          const parentList = listItem.parentNode;
          if (!parentList) return false;
          
          // If already at top level, do nothing
          const level = getListLevel(listItem);
          if (level <= 1) return false;
          
          // Find grandparent list item
          const grandparentLi = parentList.parentNode;
          if (!grandparentLi || grandparentLi.nodeName !== 'LI') return false;
          
          // Find great-grandparent list
          const greatGrandparentList = grandparentLi.parentNode;
          if (!greatGrandparentList) return false;
          
          // Insert this item after grandparent list item
          if (grandparentLi.nextSibling) {
            greatGrandparentList.insertBefore(listItem, grandparentLi.nextSibling);
        } else {
            greatGrandparentList.appendChild(listItem);
          }
          
          // If parent list is now empty, remove it
          if (parentList.children.length === 0) {
            grandparentLi.removeChild(parentList);
          }
          
          // Update styles for all items
          updateAllListItemStyles(greatGrandparentList);
          
          // Save history after changes
          saveHistory(ActionTypes.COMPLETE);
          return true;
        }
      }
      
      // Case 2: Multiple items selected (potentially spanning lists)
      if (!range.collapsed) {
        // Find all selected list items
        const commonAncestor = range.commonAncestorContainer;
        const allLists = commonAncestor.querySelectorAll('ul, ol');
        
        // Check if selection contains any list items
        const containsListItems = Array.from(allLists).some(list => {
          return Array.from(list.querySelectorAll('li')).some(li => {
            return range.intersectsNode(li);
          });
        });
        
        if (containsListItems) {
          // Implement selected range indentation logic
          // This is more complex and requires identifying all selected list items
          // For now, we'll handle single-item case only
          console.log("Multi-item indentation not yet implemented");
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error in list indentation:", error);
      return false;
    }
  };

  // Set up keyboard event handlers
  useEffect(() => {
    const handleKeyboardEvents = (e) => {
      if (e.key === 'Tab') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const listItem = getListItem(range.startContainer);
        
        if (listItem) {
          e.preventDefault(); // Prevent default Tab behavior
        
        if (e.shiftKey) {
            // Shift+Tab: outdent
            handleIndent('outdent');
          } else {
            // Tab: indent
            handleIndent('indent');
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyboardEvents);
    return () => document.removeEventListener('keydown', handleKeyboardEvents);
  }, []);

  // Handle bullet list button click
  const handleBulletStyle = (style = BULLET_STYLES.DISC) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const range = selection.getRangeAt(0);
    
    // Find any existing list item
    let listItem = getListItem(range.commonAncestorContainer);
    
    // If already in a list, change the list style
    if (listItem) {
      const parentList = listItem.parentNode;
      if (parentList.nodeName === 'UL') {
        // Apply the new style to the entire list
        if (style === BULLET_STYLES.TRIANGLE) {
          // Special case for triangle bullets
          parentList.style.listStyleType = 'disclosure-closed';
          parentList.classList.add('triangle-bullets');
        } else {
          // Standard CSS bullet styles
          parentList.style.listStyleType = style;
          parentList.classList.remove('triangle-bullets');
        }
        
        // Store the style as a data attribute for persistence
        parentList.setAttribute('data-bullet-style', style);
      } else if (parentList.nodeName === 'OL') {
        // Convert numbered list to bullet list
        const newList = document.createElement('ul');
        
        // Apply the selected style
        if (style === BULLET_STYLES.TRIANGLE) {
          newList.style.listStyleType = 'disclosure-closed';
          newList.classList.add('triangle-bullets');
        } else {
          newList.style.listStyleType = style;
        }
        
        newList.setAttribute('data-bullet-style', style);
        
        // Move all items to the new list
        while (parentList.firstChild) {
          newList.appendChild(parentList.firstChild);
        }
        
        // Replace the OL with UL
        parentList.parentNode.replaceChild(newList, parentList);
      }
    } else {
      // Not in a list - create a new bullet list
      document.execCommand('insertUnorderedList');
      
      // Find the newly created list
      listItem = getListItem(range.commonAncestorContainer);
      if (listItem) {
        const parentList = listItem.parentNode;
        
        // Apply the selected style
        if (style === BULLET_STYLES.TRIANGLE) {
          parentList.style.listStyleType = 'disclosure-closed';
          parentList.classList.add('triangle-bullets');
        } else {
          parentList.style.listStyleType = style;
        }
        
        parentList.setAttribute('data-bullet-style', style);
      }
    }
    
    // Save after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
    
    // Close any open menus
    handleBulletMenuClose();
  };

  // Handle numbered list button click
  const handleNumberedList = (style = NUMBER_STYLES.DECIMAL) => {
    try {
      // Save before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Check if selection is already in a list
      const listItem = getListItem(range.startContainer);
      const contentArea = document.querySelector('[data-content-area="true"]');
      
      if (listItem) {
        // Already in a list
        const list = listItem.parentNode;
        
        // Check if it's already a numbered list
        if (list.nodeName === 'OL') {
          // Just update the style
          switch (style) {
            case NUMBER_STYLES.DECIMAL:
              list.style.listStyleType = 'decimal';
              break;
            case NUMBER_STYLES.LOWER_ALPHA:
              list.style.listStyleType = 'lower-alpha';
              break;
            case NUMBER_STYLES.UPPER_ALPHA:
              list.style.listStyleType = 'upper-alpha';
              break;
            case NUMBER_STYLES.LOWER_ROMAN:
              list.style.listStyleType = 'lower-roman';
              break;
            case NUMBER_STYLES.UPPER_ROMAN:
              list.style.listStyleType = 'upper-roman';
              break;
          }
        } else if (list.nodeName === 'UL') {
          // Convert from bullet to numbered list
          const newList = document.createElement('ol');
          
          // Set style
          switch (style) {
            case NUMBER_STYLES.DECIMAL:
              newList.style.listStyleType = 'decimal';
              break;
            case NUMBER_STYLES.LOWER_ALPHA:
              newList.style.listStyleType = 'lower-alpha';
              break;
            case NUMBER_STYLES.UPPER_ALPHA:
              newList.style.listStyleType = 'upper-alpha';
              break;
            case NUMBER_STYLES.LOWER_ROMAN:
              newList.style.listStyleType = 'lower-roman';
              break;
            case NUMBER_STYLES.UPPER_ROMAN:
              newList.style.listStyleType = 'upper-roman';
              break;
          }
          
          // Copy all children
          while (list.firstChild) {
            newList.appendChild(list.firstChild);
          }
          
          // Replace the old list
          list.parentNode.replaceChild(newList, list);
          
          // Update styles for all items
          updateAllListItemStyles(newList);
        }
      } else {
        // Not in a list - create a new one
        let targetNode;
        
        if (range.collapsed) {
          // Cursor position - convert paragraph or line
          targetNode = range.startContainer;
          
          // If it's a text node, get its parent
          if (targetNode.nodeType === Node.TEXT_NODE) {
            targetNode = targetNode.parentNode;
          }
          
          // Find block-level element
          while (targetNode && 
                 !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(targetNode.nodeName) &&
                 targetNode !== contentArea) {
            targetNode = targetNode.parentNode;
          }
          
          if (!targetNode || targetNode === contentArea) {
            // Create a new paragraph if we couldn't find one
            targetNode = document.createElement('p');
            
            // Get content at cursor and insert
            const textContent = range.startContainer.textContent;
            if (textContent) {
              targetNode.textContent = textContent;
              range.startContainer.textContent = '';
            } else {
              targetNode.innerHTML = '<br>';
            }
            
            // Insert into content area
            contentArea.appendChild(targetNode);
          }
          
          // Create list and item
          const ol = document.createElement('ol');
          
          // Set style
          switch (style) {
            case NUMBER_STYLES.DECIMAL:
              ol.style.listStyleType = 'decimal';
              break;
            case NUMBER_STYLES.LOWER_ALPHA:
              ol.style.listStyleType = 'lower-alpha';
              break;
            case NUMBER_STYLES.UPPER_ALPHA:
              ol.style.listStyleType = 'upper-alpha';
              break;
            case NUMBER_STYLES.LOWER_ROMAN:
              ol.style.listStyleType = 'lower-roman';
              break;
            case NUMBER_STYLES.UPPER_ROMAN:
              ol.style.listStyleType = 'upper-roman';
              break;
          }
          
          const li = document.createElement('li');
          li.innerHTML = targetNode.innerHTML;
          
          ol.appendChild(li);
          targetNode.parentNode.replaceChild(ol, targetNode);
          
          // Update styles
          updateAllListItemStyles(ol);
          
          // Place cursor in list item
          const newRange = document.createRange();
          newRange.setStart(li, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Text selection - convert all paragraphs in selection
          const fragment = range.extractContents();
          
          // Create a new list
          const ol = document.createElement('ol');
          
          // Set style
          switch (style) {
            case NUMBER_STYLES.DECIMAL:
              ol.style.listStyleType = 'decimal';
              break;
            case NUMBER_STYLES.LOWER_ALPHA:
              ol.style.listStyleType = 'lower-alpha';
              break;
            case NUMBER_STYLES.UPPER_ALPHA:
              ol.style.listStyleType = 'upper-alpha';
              break;
            case NUMBER_STYLES.LOWER_ROMAN:
              ol.style.listStyleType = 'lower-roman';
              break;
            case NUMBER_STYLES.UPPER_ROMAN:
              ol.style.listStyleType = 'upper-roman';
              break;
          }
          
          // Process the extracted content
          let currentNode = fragment.firstChild;
          
          while (currentNode) {
            const li = document.createElement('li');
            
            if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentNode.nodeName)) {
              // Block element - convert to list item
              li.innerHTML = currentNode.innerHTML;
              ol.appendChild(li);
            } else if (currentNode.nodeType === Node.TEXT_NODE) {
              // Text node - create list item with this text
              li.textContent = currentNode.textContent;
              ol.appendChild(li);
            } else {
              // Other element - just add as is
              ol.appendChild(currentNode.cloneNode(true));
            }
            
            currentNode = currentNode.nextSibling;
          }
          
          // Insert the list
          range.insertNode(ol);
          
          // Update styles
          updateAllListItemStyles(ol);
        }
      }
      
      // Save after changes
      saveHistory(ActionTypes.COMPLETE);
    } catch (error) {
      console.error("Error applying numbered list:", error);
    }
  };

  // Auto-detection of list patterns in typed text
  useEffect(() => {
    const handleInput = (e) => {
      if (!e.target.isContentEditable) return;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Only process if in paragraph and at the beginning
      if (range.startOffset !== 1) return;
      
      // Get current line
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      
      const text = node.textContent;
      if (!text) return;
      
      // Check for list marker patterns
      const bulletPattern = /^[*\-] $/;
      const numberPattern = /^1[.)] $/;
      
      if (bulletPattern.test(text)) {
        // Save state before transformation
        saveHistory(ActionTypes.COMPLETE);
        
        // Remove the bullet marker
        node.textContent = '';
        
        // Find the parent paragraph/element
        let paragraph = node.parentNode;
        while (paragraph && !['P', 'DIV', 'LI'].includes(paragraph.nodeName)) {
          paragraph = paragraph.parentNode;
        }
        
        if (!paragraph) return;
        
        // Don't process if already in a list
        if (paragraph.nodeName === 'LI') return;
        
        // Create bullet list
        const ul = document.createElement('ul');
        const li = document.createElement('li');
        
        // Copy contents except the marker
        li.appendChild(document.createElement('br'));
        
        // Replace paragraph with list
        ul.appendChild(li);
        paragraph.parentNode.replaceChild(ul, paragraph);
        
        // Position cursor in list item
        const newRange = document.createRange();
        newRange.setStart(li, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Save history after changes
        saveHistory(ActionTypes.COMPLETE);
      } else if (numberPattern.test(text)) {
        // Save state before transformation
        saveHistory(ActionTypes.COMPLETE);
        
        // Remove the number marker
        node.textContent = '';
        
        // Find the parent paragraph/element
        let paragraph = node.parentNode;
        while (paragraph && !['P', 'DIV', 'LI'].includes(paragraph.nodeName)) {
          paragraph = paragraph.parentNode;
        }
        
        if (!paragraph) return;
        
        // Don't process if already in a list
        if (paragraph.nodeName === 'LI') return;
        
        // Create numbered list
        const ol = document.createElement('ol');
        const li = document.createElement('li');
        
        // Copy contents except the marker
        li.appendChild(document.createElement('br'));
        
        // Replace paragraph with list
        ol.appendChild(li);
        paragraph.parentNode.replaceChild(ol, paragraph);
        
        // Position cursor in list item
        const newRange = document.createRange();
        newRange.setStart(li, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Save history after changes
        saveHistory(ActionTypes.COMPLETE);
      }
    };
    
    document.addEventListener('input', handleInput);
    return () => document.removeEventListener('input', handleInput);
  }, []);

  // Menu handlers
  const handleBulletMenuOpen = (event) => {
    setBulletMenuAnchorEl(event.currentTarget);
  };
  
  const handleBulletMenuClose = () => {
    setBulletMenuAnchorEl(null);
  };
  
  const handleNumberMenuOpen = (event) => {
    setNumberMenuAnchorEl(event.currentTarget);
  };
  
  const handleNumberMenuClose = () => {
    setNumberMenuAnchorEl(null);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ position: 'relative' }}>
      <Tooltip title="Bullet list">
        <IconButton
          size="small"
            onClick={handleBulletMenuOpen}
          sx={{ padding: '4px' }}
        >
          <FormatListBulleted sx={{ fontSize: '18px' }} />
            <ArrowDropDown sx={{ fontSize: '14px', marginLeft: '-5px' }} />
        </IconButton>
      </Tooltip>
        <Menu
          anchorEl={bulletMenuAnchorEl}
          open={Boolean(bulletMenuAnchorEl)}
          onClose={handleBulletMenuClose}
        >
          <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.DISC)}>
            <ListItemIcon>
              <span style={{ fontSize: '18px' }}>•</span>
            </ListItemIcon>
            <ListItemText primary="Bullet (Dot)" />
          </MenuItem>
          <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.CIRCLE)}>
            <ListItemIcon>
              <span style={{ fontSize: '18px' }}>○</span>
            </ListItemIcon>
            <ListItemText primary="Circle" />
          </MenuItem>
          <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.SQUARE)}>
            <ListItemIcon>
              <span style={{ fontSize: '18px' }}>▪</span>
            </ListItemIcon>
            <ListItemText primary="Square" />
          </MenuItem>
          <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.TRIANGLE)}>
            <ListItemIcon>
              <span style={{ fontSize: '18px' }}>▶</span>
            </ListItemIcon>
            <ListItemText primary="Triangle" />
          </MenuItem>
        </Menu>
      </Box>
      
      <Box sx={{ position: 'relative', ml: 0.5 }}>
      <Tooltip title="Numbered list">
        <IconButton
          size="small"
            onClick={handleNumberMenuOpen}
          sx={{ padding: '4px' }}
        >
          <FormatListNumbered sx={{ fontSize: '18px' }} />
            <ArrowDropDown sx={{ fontSize: '14px', marginLeft: '-5px' }} />
        </IconButton>
      </Tooltip>
        <Menu
          anchorEl={numberMenuAnchorEl}
          open={Boolean(numberMenuAnchorEl)}
          onClose={handleNumberMenuClose}
        >
          <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.DECIMAL)}>
            <ListItemIcon>
              <span style={{ fontSize: '16px' }}>1.</span>
            </ListItemIcon>
            <ListItemText primary="1, 2, 3..." />
          </MenuItem>
          <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.LOWER_ALPHA)}>
            <ListItemIcon>
              <span style={{ fontSize: '16px' }}>a.</span>
            </ListItemIcon>
            <ListItemText primary="a, b, c..." />
          </MenuItem>
          <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.UPPER_ALPHA)}>
            <ListItemIcon>
              <span style={{ fontSize: '16px' }}>A.</span>
            </ListItemIcon>
            <ListItemText primary="A, B, C..." />
          </MenuItem>
          <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.LOWER_ROMAN)}>
            <ListItemIcon>
              <span style={{ fontSize: '16px' }}>i.</span>
            </ListItemIcon>
            <ListItemText primary="i, ii, iii..." />
          </MenuItem>
          <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.UPPER_ROMAN)}>
            <ListItemIcon>
              <span style={{ fontSize: '16px' }}>I.</span>
            </ListItemIcon>
            <ListItemText primary="I, II, III..." />
          </MenuItem>
      </Menu>
      </Box>
    </Box>
  );
};

export default ListControls; 