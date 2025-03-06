import React, { useEffect } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  FormatListBulleted,
  FormatListNumbered,
  ArrowDropDown
} from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

// Bullet styles and their corresponding HTML entity codes/characters
const BULLET_STYLES = {
  DISC: 'disc',       // Filled Circle (Level 1)
  CIRCLE: 'circle',   // Hollow Circle (Level 2)
  SQUARE: 'square',   // Filled Square (Level 3) 
  HOLLOW_CIRCLE: 'circle', // Small Hollow Circle (Level 4)
  HOLLOW_SQUARE: 'square', // Small Hollow Square (Level 5)
};

// Numbered list types and their formats
const NUMBER_STYLES = {
  DECIMAL: 'decimal',           // 1, 2, 3
  LOWER_ALPHA: 'lower-alpha',   // a, b, c
  LOWER_ROMAN: 'lower-roman',   // i, ii, iii
  UPPER_ALPHA: 'upper-alpha',   // A, B, C
  UPPER_ROMAN: 'upper-roman',   // I, II, III
};

// Nesting patterns for each list type (Google Docs patterns)
const BULLET_NEST_PATTERN = [
  BULLET_STYLES.DISC,
  BULLET_STYLES.CIRCLE, 
  BULLET_STYLES.SQUARE,
  BULLET_STYLES.HOLLOW_CIRCLE,
  BULLET_STYLES.HOLLOW_SQUARE,
];

const NUMBER_NEST_PATTERN = [
  NUMBER_STYLES.DECIMAL,
  NUMBER_STYLES.LOWER_ALPHA,
  NUMBER_STYLES.LOWER_ROMAN,
  NUMBER_STYLES.UPPER_ALPHA,
  NUMBER_STYLES.UPPER_ROMAN,
];

const ListControls = () => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  const [bulletMenuAnchor, setBulletMenuAnchor] = React.useState(null);
  const [numberMenuAnchor, setNumberMenuAnchor] = React.useState(null);
  const [lastBulletStyle, setLastBulletStyle] = React.useState(BULLET_STYLES.DISC);
  const [lastNumberStyle, setLastNumberStyle] = React.useState(NUMBER_STYLES.DECIMAL);

  // Helper function to determine list nesting level
  const getListLevel = (element) => {
    if (!element) return 0;
    
    // Check for list item element
    if (element.nodeName === 'LI') {
      // Find parent list
      const parentList = element.closest('ul, ol');
      if (!parentList) return 0;
      
      // Check for nesting by counting parent lists
      let level = 0;
      let current = parentList;
      
      while (current) {
        // Only count if it's a list within a list item
        if (current.nodeName === 'UL' || current.nodeName === 'OL') {
          level++;
          
          // Go up to parent list item, then to its parent list
          const parentLi = current.parentElement;
          if (parentLi && parentLi.nodeName === 'LI') {
            current = parentLi.parentElement;
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
  
  // Update all items in a list with correct styles
  const updateAllListItemStyles = (list) => {
    if (!list) return;
    
    const processListRecursively = (listElement, level = 1) => {
      if (!listElement) return;
      
      // Set data attribute on the list
      listElement.setAttribute('data-list-level', level);
      
      // Apply custom bullet style if available
      if (listElement.nodeName === 'UL') {
        // Get the stored style or use the pattern
        const bulletStyle = listElement.getAttribute('data-bullet-style') || 
                           BULLET_NEST_PATTERN[(level - 1) % BULLET_NEST_PATTERN.length];
        listElement.setAttribute('data-bullet-style', bulletStyle);
      } else if (listElement.nodeName === 'OL') {
        // Get the stored style or use the pattern
        const numberStyle = listElement.getAttribute('data-number-style') || 
                           NUMBER_NEST_PATTERN[(level - 1) % NUMBER_NEST_PATTERN.length];
        listElement.setAttribute('data-number-style', numberStyle);
      }
      
      // Process all list items
      Array.from(listElement.children).forEach(item => {
        if (item.nodeName === 'LI') {
          // Set level attribute on the list item
          item.setAttribute('data-list-level', level);
          
          // Find nested lists and process with incremented level
          Array.from(item.children).forEach(child => {
            if (child.nodeName === 'UL' || child.nodeName === 'OL') {
              // For new nested lists, inherit style from parent
              if (child.nodeName === 'UL' && !child.hasAttribute('data-bullet-style')) {
                const bulletStyle = listElement.getAttribute('data-bullet-style') || lastBulletStyle;
                child.setAttribute('data-bullet-style', bulletStyle);
              } else if (child.nodeName === 'OL' && !child.hasAttribute('data-number-style')) {
                const numberStyle = listElement.getAttribute('data-number-style') || lastNumberStyle;
                child.setAttribute('data-number-style', numberStyle);
              }
              
              processListRecursively(child, level + 1);
            }
          });
        }
      });
    };
    
    // Start processing from the root list
    processListRecursively(list, 1);
    
    // Force a reflow for the styles to take effect
    void list.offsetHeight;
  };
  
  // Helper to find current list item
  const getListItem = (node) => {
    if (!node) return null;
    
    // If we're already on a list item, return it
    if (node.nodeName === 'LI') {
      return node;
    }
    
    // If we're on a text node, get its parent
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    // Walk up the DOM to find a list item
    while (node && node.nodeName !== 'LI') {
      node = node.parentNode;
      if (!node || node.nodeName === 'BODY') return null;
    }
    
    return node;
  };

  // Handle empty list item action (Enter on empty item or Backspace at start)
  const handleEmptyListItem = (listItem, action) => {
    if (!listItem) return false;
    
    const isEmpty = listItem.textContent.trim() === '';
    
    if (isEmpty || action === 'force') {
      const parentList = listItem.parentNode;
      const parentListItem = parentList.parentNode;
      
      if (action === 'exit' || action === 'force' || action === 'backspace') {
        // When we're handling a backspace on an empty list item,
        // we want to convert it to a paragraph in place
        if (action === 'backspace') {
          // Save history before change
          saveHistory(ActionTypes.COMPLETE);
          
          // Create a new paragraph to replace the empty list item
          const p = document.createElement('p');
          p.innerHTML = '\u200B'; // Zero-width space
          
          // Replace the list item with the paragraph in the same position
          parentList.insertBefore(p, listItem);
          parentList.removeChild(listItem);
          
          // If list is now empty, remove it
          if (parentList.childNodes.length === 0) {
            parentList.parentNode.removeChild(parentList);
          }
          
          // Set cursor in the new paragraph
          setTimeout(() => {
            const range = document.createRange();
            const textNode = p.firstChild || p;
            range.setStart(textNode, 0);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Save history after change
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
          
          return true;
        }
        
        // Exit list behavior - Google Docs style
        if (parentListItem && parentListItem.nodeName === 'LI') {
          // We're in a nested list, move up one level
          const grandparentList = parentListItem.parentNode;
          
          // Create a new empty list item at the parent's level
          const newLi = document.createElement('li');
          newLi.innerHTML = '\u200B'; // Zero-width space
          
          // Insert after the parent list item
          if (parentListItem.nextSibling) {
            grandparentList.insertBefore(newLi, parentListItem.nextSibling);
          } else {
            grandparentList.appendChild(newLi);
          }
          
          // Remove the empty list item
          parentList.removeChild(listItem);
          
          // If this was the last item, remove the empty nested list
          if (parentList.childNodes.length === 0) {
            parentListItem.removeChild(parentList);
          }
          
          // Set cursor in the new list item
          setTimeout(() => {
            const range = document.createRange();
            const textNode = newLi.firstChild || newLi;
            range.setStart(textNode, 0);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Save history after the action
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
          
          return true;
        } else {
          // Top level - convert to paragraph (Google Docs behavior)
          const p = document.createElement('p');
          p.innerHTML = '\u200B'; // Zero-width space for cursor position
          
          // Insert after the list (Google Docs behavior)
          if (parentList.nextSibling) {
            parentList.parentNode.insertBefore(p, parentList.nextSibling);
          } else {
            parentList.parentNode.appendChild(p);
          }
          
          // Remove the list item
          parentList.removeChild(listItem);
          
          // If list is now empty, remove it
          if (parentList.childNodes.length === 0) {
            parentList.parentNode.removeChild(parentList);
          }
          
          // Set cursor in the new paragraph
          setTimeout(() => {
            const range = document.createRange();
            const textNode = p.firstChild || p;
            range.setStart(textNode, 0);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Save history after the action
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
          
          return true;
        }
      } else if (action === 'outdent') {
        // Google Docs outdent behavior for empty list items
        
        // Save history before change
        saveHistory(ActionTypes.COMPLETE);
        
        if (parentListItem && parentListItem.nodeName === 'LI') {
          // We're in a nested list, move up one level
          const grandparentList = parentListItem.parentNode;
          
          // Create a new list item at the parent level
          const newLi = document.createElement('li');
          newLi.innerHTML = '\u200B'; // Zero-width space
          
          // Insert after the parent list item
          if (parentListItem.nextSibling) {
            grandparentList.insertBefore(newLi, parentListItem.nextSibling);
          } else {
            grandparentList.appendChild(newLi);
          }
          
          // Remove the empty list item
          parentList.removeChild(listItem);
          
          // If this was the last item, remove the empty nested list
          if (parentList.childNodes.length === 0) {
            parentListItem.removeChild(parentList);
          }
          
          // Set cursor in the new list item
          setTimeout(() => {
            const range = document.createRange();
            const textNode = newLi.firstChild || newLi;
            range.setStart(textNode, 0);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
          
          return true;
        } else {
          // Top level - convert to paragraph
          const p = document.createElement('p');
          p.innerHTML = '\u200B'; // Zero-width space
          
          // Insert before the list
          parentList.parentNode.insertBefore(p, parentList);
          
          // Remove the list item
          parentList.removeChild(listItem);
          
          // If list is now empty, remove it
          if (parentList.childNodes.length === 0) {
            parentList.parentNode.removeChild(parentList);
          }
          
          // Set cursor in the paragraph
          setTimeout(() => {
            const range = document.createRange();
            const textNode = p.firstChild || p;
            range.setStart(textNode, 0);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
          
          return true;
        }
      }
    }
    
    return false;
  };

  // Handle Tab and Shift+Tab for indentation (exactly like Google Docs)
  const handleIndent = (direction) => {
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Find the list item we're in
    const listItem = getListItem(node);
    if (!listItem) return;

    // If it's an empty list item, handle special case
    if (listItem.textContent.trim() === '' && direction === 'outdent') {
      return handleEmptyListItem(listItem, 'outdent');
    }
    
    if (direction === 'indent') {
      // Google Docs indent behavior
      const prevSibling = listItem.previousElementSibling;
      
      if (prevSibling) {
        // Only indent if there's a previous item (Google Docs behavior)
        const parentList = listItem.parentNode;
        const isOrderedList = parentList.nodeName === 'OL';
        
        // Find or create a sublist in the previous sibling
        let subList = Array.from(prevSibling.children).find(child => 
          child.nodeName === (isOrderedList ? 'OL' : 'UL')
        );
        
        if (!subList) {
          // Create a new sublist with the same type
          subList = document.createElement(isOrderedList ? 'OL' : 'UL');
          prevSibling.appendChild(subList);
        }
        
        // Save the cursor position info
        const cursorOffset = range.startOffset;
        let cursorNode = range.startContainer;
        
        // Move this item to the sublist
        subList.appendChild(listItem);
        
        // Update the nested list styles
        updateAllListItemStyles(parentList);
        updateAllListItemStyles(subList);
        
        // Restore cursor position
        setTimeout(() => {
          try {
            // Make sure the node still exists
            if (!document.body.contains(cursorNode)) {
              // Find first text node in the list item
              const walker = document.createTreeWalker(
                listItem, 
                NodeFilter.SHOW_TEXT, 
                null, 
                false
              );
              
              cursorNode = walker.nextNode() || listItem;
              cursorOffset = 0;
            }
            
            const newRange = document.createRange();
            newRange.setStart(cursorNode, cursorOffset);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // Save history after the change
            saveHistory(ActionTypes.COMPLETE);
          } catch (e) {
            console.error("Error restoring selection after indent:", e);
          }
        }, 0);
      }
    } else if (direction === 'outdent') {
      // Google Docs outdent behavior
      const parentList = listItem.parentNode;
      const parentLi = parentList.parentNode;
      
      if (parentLi && parentLi.nodeName === 'LI') {
        // We're in a nested list, move up one level
        const grandparentList = parentLi.parentNode;
        
        // Save cursor position info
        const cursorOffset = range.startOffset;
        let cursorNode = range.startContainer;
        
        // Insert the list item after its parent in the grandparent list
        if (parentLi.nextSibling) {
          grandparentList.insertBefore(listItem, parentLi.nextSibling);
        } else {
          grandparentList.appendChild(listItem);
        }
        
        // If the sublist is now empty, remove it
        if (parentList.childNodes.length === 0) {
          parentLi.removeChild(parentList);
        }
        
        // Update list styles
        updateAllListItemStyles(grandparentList);
        
        // Restore cursor position
        setTimeout(() => {
          try {
            // Make sure the node still exists
            if (!document.body.contains(cursorNode)) {
              // Find first text node in the list item
              const walker = document.createTreeWalker(
                listItem, 
                NodeFilter.SHOW_TEXT, 
                null, 
                false
              );
              
              cursorNode = walker.nextNode() || listItem;
              cursorOffset = 0;
            }
            
            const newRange = document.createRange();
            newRange.setStart(cursorNode, cursorOffset);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // Save history after the change
            saveHistory(ActionTypes.COMPLETE);
          } catch (e) {
            console.error("Error restoring selection after outdent:", e);
          }
        }, 0);
      } else {
        // We're at the top level, convert to paragraph (Google Docs behavior)
        const p = document.createElement('p');
        p.innerHTML = listItem.innerHTML;
        
        // Replace list item with paragraph - put it before the list
        parentList.parentNode.insertBefore(p, parentList);
        parentList.removeChild(listItem);
        
        // If the list is now empty, remove it
        if (parentList.childNodes.length === 0) {
          parentList.parentNode.removeChild(parentList);
        }
        
        // Focus on the new paragraph
        setTimeout(() => {
          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false); // Set cursor at end
          
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Save history after the change
          saveHistory(ActionTypes.COMPLETE);
        }, 0);
      }
    }
  };

  // Set up keyboard event handlers for TAB, BACKSPACE, ENTER and DELETE
  useEffect(() => {
    const handleKeyboardEvents = (e) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let node = range.startContainer;

      // Find if we're in a list item
      const listItem = getListItem(node);
      if (!listItem) return;

      // Handle TAB key for indentation - exactly like Google Docs
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent default tab behavior
        
        if (e.shiftKey) {
          // Shift+Tab: Outdent (Google Docs behavior)
          handleIndent('outdent');
        } else {
          // Tab: Indent (Google Docs behavior)
          handleIndent('indent');
        }
      }
      
      // Enter key handling is now in EditorContent.jsx
      
      // Backspace at beginning is now in EditorContent.jsx
    };
    
    document.addEventListener('keydown', handleKeyboardEvents);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardEvents);
    };
  }, []);
  
  // Toggle or apply bullet list - 100% Google Docs style
  const handleBulletStyle = (style = BULLET_STYLES.DISC) => {
    // Save the style for future use
    setLastBulletStyle(style);
    
    // Save history before changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if we're already in a list
    const listItem = getListItem(range.startContainer);
    
    if (listItem) {
      const list = listItem.parentNode;
      
      if (list.nodeName === 'UL') {
        // Store the bullet style as an attribute
        list.setAttribute('data-bullet-style', style);
        
        // If already a bullet list, toggle it off (Google Docs behavior)
        // Create a paragraph to replace the list item
        const p = document.createElement('p');
        p.innerHTML = listItem.innerHTML;
        
        // Replace list item with paragraph
        list.parentNode.insertBefore(p, list);
        list.removeChild(listItem);
        
        // If the list is now empty, remove it
        if (list.childNodes.length === 0) {
          list.parentNode.removeChild(list);
        }
        
        // Set cursor in the paragraph
        setTimeout(() => {
          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
        }, 0);
      } else if (list.nodeName === 'OL') {
        // Convert from numbered to bulleted (Google Docs behavior)
        const newList = document.createElement('ul');
        
        // Move all items from the OL to the UL
        while (list.firstChild) {
          newList.appendChild(list.firstChild);
        }
        
        // Replace the OL with UL
        list.parentNode.replaceChild(newList, list);
        
        // Apply correct styling
        updateAllListItemStyles(newList);
      }
    } else {
      // Create a new bullet list (Google Docs behavior)
      
      // Use execCommand to create the list - most reliable method
      document.execCommand('insertUnorderedList');
      
      // Find the new list that was created
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (newSelection && newSelection.rangeCount > 0) {
          const newListItem = getListItem(newSelection.getRangeAt(0).startContainer);
          if (newListItem) {
            const newList = newListItem.parentNode;
            // Store the custom bullet style
            newList.setAttribute('data-bullet-style', style);
            // Apply proper styling
            updateAllListItemStyles(newList);
          }
        }
      }, 0);
    }
    
    // Save history after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
    
    // Close any open menu
    setBulletMenuAnchor(null);
  };
  
  // Toggle or apply numbered list - 100% Google Docs style
  const handleNumberedList = (style = NUMBER_STYLES.DECIMAL) => {
    // Save the style for future use
    setLastNumberStyle(style);
    
    // Save history before changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if we're already in a list
    const listItem = getListItem(range.startContainer);
    
    if (listItem) {
      const list = listItem.parentNode;
      
      if (list.nodeName === 'OL') {
        // If already a numbered list, toggle it off (Google Docs behavior)
        // Create a paragraph to replace the list item
        const p = document.createElement('p');
        p.innerHTML = listItem.innerHTML;
        
        // Replace list item with paragraph
        list.parentNode.insertBefore(p, list);
        list.removeChild(listItem);
        
        // If the list is now empty, remove it
        if (list.childNodes.length === 0) {
          list.parentNode.removeChild(list);
        }
        
        // Set cursor in the paragraph
        setTimeout(() => {
          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(false);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
        }, 0);
      } else if (list.nodeName === 'UL') {
        // Convert from bulleted to numbered (Google Docs behavior)
        const newList = document.createElement('ol');
        
        // Move all items from the UL to the OL
        while (list.firstChild) {
          newList.appendChild(list.firstChild);
        }
        
        // Replace the UL with OL
        list.parentNode.replaceChild(newList, list);
        
        // Apply correct styling
        updateAllListItemStyles(newList);
      }
    } else {
      // Create a new numbered list (Google Docs behavior)
      
      // Use execCommand to create the list - most reliable method
      document.execCommand('insertOrderedList');
      
      // Find the new list that was created
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (newSelection && newSelection.rangeCount > 0) {
          const newListItem = getListItem(newSelection.getRangeAt(0).startContainer);
          if (newListItem) {
            const newList = newListItem.parentNode;
            // Store the custom bullet style
            newList.setAttribute('data-bullet-style', style);
            // Apply proper styling
            updateAllListItemStyles(newList);
          }
        }
      }, 0);
    }
    
    // Save history after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
    
    // Close any open menu
    setNumberMenuAnchor(null);
  };
  
  // Handle auto-listing with markdown shortcuts (* or 1. + space)
  useEffect(() => {
    const handleInput = (e) => {
      if (e.inputType === 'insertText' && e.data === ' ') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        
        // Check if we're in a list already
        if (getListItem(node)) return;
        
        // Only check text nodes
        if (node.nodeType !== Node.TEXT_NODE) return;
        
        const text = node.textContent;
        const cursorPos = range.startOffset;
        
        // Check if we're right after potential list markers
        if (cursorPos > 1) {
          const segment = text.substring(0, cursorPos);
          
          // Check for bullet patterns
          if (segment === '* ' || segment === '- ') {
            e.preventDefault();
            
            // Save history before change
            saveHistory(ActionTypes.COMPLETE);
            
            // Delete the marker text
            const newRange = document.createRange();
            newRange.setStart(node, 0);
            newRange.setEnd(node, 2);
            newRange.deleteContents();
            
            // Create bullet list
            document.execCommand('insertUnorderedList');
            
            // Save history after change
            setTimeout(() => {
              saveHistory(ActionTypes.COMPLETE);
            }, 10);
            return;
          }
          
          // Check for number patterns (e.g., "1. ")
          const numberPattern = /^\d+\.\s$/;
          if (numberPattern.test(segment)) {
            e.preventDefault();
            
            // Save history before change
            saveHistory(ActionTypes.COMPLETE);
            
            // Delete the marker text
            const newRange = document.createRange();
            newRange.setStart(node, 0);
            newRange.setEnd(node, segment.length);
            newRange.deleteContents();
            
            // Create numbered list
            document.execCommand('insertOrderedList');
            
            // Save history after change
            setTimeout(() => {
              saveHistory(ActionTypes.COMPLETE);
            }, 10);
            return;
          }
        }
      }
    };
    
    document.addEventListener('beforeinput', handleInput);
    
    return () => {
      document.removeEventListener('beforeinput', handleInput);
    };
  }, [saveHistory]);
  
  // Menu handlers
  const handleBulletMenuOpen = (event) => {
    setBulletMenuAnchor(event.currentTarget);
  };
  
  const handleBulletMenuClose = () => {
    setBulletMenuAnchor(null);
  };
  
  const handleNumberMenuOpen = (event) => {
    setNumberMenuAnchor(event.currentTarget);
  };
  
  const handleNumberMenuClose = () => {
    setNumberMenuAnchor(null);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {/* Bullet List Button */}
      <Tooltip title="Bulleted List (Ctrl+Shift+8)">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleBulletStyle(BULLET_STYLES.DISC)}
          onMouseDown={(e) => e.preventDefault()}
          data-list-control="bullet"
        >
          <FormatListBulleted sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      {/* Bullet Style Menu Button */}
      <Tooltip title="Bullet Style">
        <IconButton
          size="small"
          sx={{ padding: '2px', marginLeft: '-5px' }}
          onClick={handleBulletMenuOpen}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ArrowDropDown sx={{ fontSize: '14px' }} />
        </IconButton>
      </Tooltip>

      {/* Numbered List Button */}
      <Tooltip title="Numbered List (Ctrl+Shift+7)">
        <IconButton
          size="small"
          sx={{ padding: '4px', marginLeft: '2px' }}
          onClick={() => handleNumberedList(NUMBER_STYLES.DECIMAL)}
          onMouseDown={(e) => e.preventDefault()}
          data-list-control="number"
        >
          <FormatListNumbered sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      {/* Number Style Menu Button */}
      <Tooltip title="Numbering Style">
        <IconButton
          size="small"
          sx={{ padding: '2px', marginLeft: '-5px' }}
          onClick={handleNumberMenuOpen}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ArrowDropDown sx={{ fontSize: '14px' }} />
        </IconButton>
      </Tooltip>

      {/* Bullet Style Menu */}
      <Menu
        anchorEl={bulletMenuAnchor}
        open={Boolean(bulletMenuAnchor)}
        onClose={handleBulletMenuClose}
      >
        <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.DISC)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>•</ListItemIcon>
          <ListItemText primary="Disc" />
        </MenuItem>
        <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.CIRCLE)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>○</ListItemIcon>
          <ListItemText primary="Circle" />
        </MenuItem>
        <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.SQUARE)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>■</ListItemIcon>
          <ListItemText primary="Square" />
        </MenuItem>
        <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.HOLLOW_CIRCLE)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>◦</ListItemIcon>
          <ListItemText primary="Hollow Circle" />
        </MenuItem>
        <MenuItem onClick={() => handleBulletStyle(BULLET_STYLES.HOLLOW_SQUARE)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>▫</ListItemIcon>
          <ListItemText primary="Hollow Square" />
        </MenuItem>
      </Menu>

      {/* Number Style Menu */}
      <Menu
        anchorEl={numberMenuAnchor}
        open={Boolean(numberMenuAnchor)}
        onClose={handleNumberMenuClose}
      >
        <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.DECIMAL)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>1.</ListItemIcon>
          <ListItemText primary="1, 2, 3..." />
        </MenuItem>
        <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.LOWER_ALPHA)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>a.</ListItemIcon>
          <ListItemText primary="a, b, c..." />
        </MenuItem>
        <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.LOWER_ROMAN)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>i.</ListItemIcon>
          <ListItemText primary="i, ii, iii..." />
        </MenuItem>
        <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.UPPER_ALPHA)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>A.</ListItemIcon>
          <ListItemText primary="A, B, C..." />
        </MenuItem>
        <MenuItem onClick={() => handleNumberedList(NUMBER_STYLES.UPPER_ROMAN)}>
          <ListItemIcon sx={{ minWidth: '30px' }}>I.</ListItemIcon>
          <ListItemText primary="I, II, III..." />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ListControls; 