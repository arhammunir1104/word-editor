import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import {
  FormatListBulleted,
  FormatListNumbered,
  FormatIndentDecrease,
  FormatIndentIncrease,
} from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

// Define bullet styles that repeat every 3 levels
const BULLET_LEVELS = {
  1: 'disc',      // ●
  2: 'circle',    // ○
  3: 'square',    // ■
  4: 'disc',      // Back to ●
  5: 'circle',    // Back to ○
  6: 'square',    // Back to ■
  // Pattern continues...
};

// Define number styles that repeat every 3 levels
const NUMBER_LEVELS = {
  1: 'decimal',      // 1, 2, 3
  2: 'lower-alpha',  // a, b, c
  3: 'lower-roman',  // i, ii, iii
  4: 'decimal',      // Back to 1, 2, 3
  5: 'lower-alpha',  // Back to a, b, c
  6: 'lower-roman',  // Back to i, ii, iii
  // Pattern continues...
};

// Define bullet styles for toolbar menu
const bulletStyles = [
  { name: 'Disc (●)', value: 'disc' },
  { name: 'Circle (○)', value: 'circle' },
  { name: 'Square (■)', value: 'square' },
];

// Define number styles for toolbar menu
const numberStyles = [
  { name: 'Numbers (1, 2, 3)', value: 'decimal' },
  { name: 'Letters (a, b, c)', value: 'lower-alpha' },
  { name: 'Roman (i, ii, iii)', value: 'lower-roman' },
  { name: 'Capital Letters (A, B, C)', value: 'upper-alpha' },
  { name: 'Capital Roman (I, II, III)', value: 'upper-roman' },
];

const ListControls = () => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  const [bulletAnchorEl, setBulletAnchorEl] = useState(null);
  const [numberAnchorEl, setNumberAnchorEl] = useState(null);

  const getListLevel = (element) => {
    let level = 1;
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'UL' || parent.tagName === 'OL') {
        if (parent.parentElement.closest('li')) {
          level++;
        }
      }
      parent = parent.parentElement;
    }
    return level;
  };

  const updateListStyles = (listItem) => {
    const list = listItem.closest('ul, ol');
    if (!list) return;

    const level = getListLevel(list);
    const normalizedLevel = ((level - 1) % 3) + 1;

    if (list.tagName === 'UL') {
      list.style.listStyleType = BULLET_LEVELS[normalizedLevel];
    } else {
      list.style.listStyleType = NUMBER_LEVELS[normalizedLevel];
    }
  };

  const getListItem = (node) => {
    if (!node) return null;
    
    // If node is text node, get its parent
    if (node.nodeType === 3) {
      node = node.parentElement;
    }
    
    // Find closest li element
    while (node && node.tagName !== 'LI') {
      node = node.parentElement;
    }
    
    return node;
  };

  const handleEmptyListItem = (listItem, action) => {
    try {
      if (!listItem || !listItem.parentNode) return;
      
      const selection = window.getSelection();
      const parentList = listItem.closest('ul, ol');
      
      if (!parentList || !parentList.parentNode) return;
      
      const hitCount = parseInt(listItem.dataset.emptyHitCount || '0');
      listItem.dataset.emptyHitCount = (hitCount + 1).toString();
      
      if (hitCount === 0) {
        // First press: Just remove bullet
        const textNode = document.createElement('div');
        textNode.innerHTML = '<br>';
        
        if (listItem.parentNode) {
          listItem.parentNode.insertBefore(textNode, listItem);
          if (listItem.parentNode.contains(listItem)) {
            listItem.parentNode.removeChild(listItem);
          }
        }
        
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } 
      else if (hitCount === 1) {
        // Second press: Move up one level
        const parentLI = parentList?.parentElement?.closest('li');
        if (parentLI && parentLI.parentNode) {
          const grandparentList = parentLI.closest('ul, ol');
          if (grandparentList) {
            const textNode = document.createElement('div');
            textNode.innerHTML = '<br>';
            grandparentList.insertBefore(textNode, parentLI.nextSibling);
            
            if (listItem.parentNode.contains(listItem)) {
              listItem.parentNode.removeChild(listItem);
            }
            
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
      else {
        // Third press: Move to previous item
        const prevItem = listItem.previousElementSibling || parentList?.parentElement?.closest('li');
        if (prevItem) {
          const range = document.createRange();
          range.selectNodeContents(prevItem);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          
          if (listItem.parentNode.contains(listItem)) {
            listItem.parentNode.removeChild(listItem);
          }
        }
      }
    } catch (error) {
      console.error('Error in handleEmptyListItem:', error);
    }
  };

  const handleIndent = (direction) => {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const listItem = getListItem(selection.anchorNode);
      if (!listItem) return;

      // Save state for undo/redo
      saveHistory(ActionTypes.STRUCTURE);

      if (direction === 'increase') {
        // Can only indent if there's a previous sibling
        const prevSibling = listItem.previousElementSibling;
        if (!prevSibling) return;

        const currentList = listItem.parentElement;
        if (!currentList) return;

        // Find or create nested list in previous sibling
        let nestedList = Array.from(prevSibling.children)
          .find(child => child.tagName === currentList.tagName);

        if (!nestedList) {
          nestedList = document.createElement(currentList.tagName);
          nestedList.style.listStyleType = currentList.style.listStyleType;
          prevSibling.appendChild(nestedList);
        }

        // Move the item
        nestedList.appendChild(listItem);

        // Update styles
        if (nestedList.tagName === 'UL') {
          const level = getListLevel(nestedList);
          const style = BULLET_LEVELS[((level - 1) % 3) + 1];
          nestedList.style.listStyleType = style;
        } else {
          const level = getListLevel(nestedList);
          const style = NUMBER_LEVELS[((level - 1) % 3) + 1];
          nestedList.style.listStyleType = style;
        }

        // Clean up empty lists
        if (currentList.children.length === 0) {
          currentList.remove();
        }

        // Maintain selection
        const range = document.createRange();
        range.selectNodeContents(listItem);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Decrease indent
        const parentList = listItem.parentElement;
        if (!parentList) return;

        const parentItem = parentList.parentElement;
        if (!parentItem || !parentItem.tagName === 'LI') return;

        const grandparentList = parentItem.parentElement;
        if (!grandparentList) return;

        // Move item after its parent item
        grandparentList.insertBefore(listItem, parentItem.nextSibling);

        // Update styles
        if (grandparentList.tagName === 'UL') {
          const level = getListLevel(grandparentList);
          const style = BULLET_LEVELS[((level - 1) % 3) + 1];
          listItem.style.listStyleType = style;
        } else {
          const level = getListLevel(grandparentList);
          const style = NUMBER_LEVELS[((level - 1) % 3) + 1];
          listItem.style.listStyleType = style;
        }

        // Clean up empty lists
        if (parentList.children.length === 0) {
          parentList.remove();
        }

        // Maintain selection
        const range = document.createRange();
        range.selectNodeContents(listItem);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.error('Indentation failed:', error);
    }
  };

  useEffect(() => {
    const handleKeyboardEvents = (e) => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const listItem = getListItem(selection.anchorNode);
      if (!listItem) return;

      // Handle Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.shiftKey) {
          handleIndent('decrease');
        } else {
          handleIndent('increase');
        }
      }

      // Handle Backspace/Enter
      if ((e.key === 'Enter' || e.key === 'Backspace') && !e.shiftKey) {
        const isEmpty = !listItem.textContent.trim();
        const isAtStart = selection.anchorOffset === 0;
        
        if (isEmpty || (e.key === 'Backspace' && isAtStart)) {
          e.preventDefault();
          saveHistory(ActionTypes.STRUCTURE);
          handleEmptyListItem(listItem, e.key);
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardEvents, true);
    return () => document.removeEventListener('keydown', handleKeyboardEvents, true);
  }, [saveHistory]);

  const handleBulletStyle = (style) => {
    try {
      saveHistory(ActionTypes.STRUCTURE);
      
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      document.execCommand('insertUnorderedList');
      
      // Apply selected bullet style
      const listItem = selection.anchorNode.closest('li');
      if (listItem) {
        const list = listItem.closest('ul');
        if (list) {
          list.style.listStyleType = style || 'disc';
        }
      }
    } catch (error) {
      console.error('Bullet style change failed:', error);
    }
    setBulletAnchorEl(null);
  };

  const handleNumberedList = (style) => {
    try {
      saveHistory(ActionTypes.STRUCTURE);
      
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      document.execCommand('insertOrderedList');
      
      // Apply selected number style
      const listItem = selection.anchorNode.closest('li');
      if (listItem) {
        const list = listItem.closest('ol');
        if (list) {
          list.style.listStyleType = style || 'decimal';
        }
      }
    } catch (error) {
      console.error('Number style change failed:', error);
    }
    setNumberAnchorEl(null);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <Tooltip title="Bullet list">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={(e) => setBulletAnchorEl(e.currentTarget)}
        >
          <FormatListBulleted sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Numbered list">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={(e) => setNumberAnchorEl(e.currentTarget)}
        >
          <FormatListNumbered sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Decrease indent">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleIndent('decrease')}
        >
          <FormatIndentDecrease sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Increase indent">
        <IconButton
          size="small"
          sx={{ padding: '4px' }}
          onClick={() => handleIndent('increase')}
        >
          <FormatIndentIncrease sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>

      {/* Bullet styles menu */}
      <Menu
        anchorEl={bulletAnchorEl}
        open={Boolean(bulletAnchorEl)}
        onClose={() => setBulletAnchorEl(null)}
      >
        {bulletStyles.map((style) => (
          <MenuItem
            key={style.value}
            onClick={() => handleBulletStyle(style.value)}
          >
            {style.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Number styles menu */}
      <Menu
        anchorEl={numberAnchorEl}
        open={Boolean(numberAnchorEl)}
        onClose={() => setNumberAnchorEl(null)}
      >
        {numberStyles.map((style) => (
          <MenuItem
            key={style.value}
            onClick={() => handleNumberedList(style.value)}
          >
            {style.name}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default ListControls; 