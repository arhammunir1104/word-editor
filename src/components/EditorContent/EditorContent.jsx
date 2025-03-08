import React ,{ useState, useRef, useEffect } from 'react';
import ZoomControl from '../ZoomControl/ZoomControl';
// import DebugSelection from "../DebugSelection";
import { useComments } from '../../context/CommentContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  // Dialog, 
  // DialogTitle, 
  // DialogContent, 
  // DialogActions, 
  // Button, 
  // TextField, 
  // Select, 
  // FormControl, 
  // InputLabel, 
  Typography, 
  Box, 
  // Grid, 
  Divider, 
  Tooltip, 
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Settings,
  // FormatBold, 
  // FormatItalic, 
  // FormatUnderlined, 
  CropPortrait, 
  ViewArray, 
  // ScreenRotation, 
  // FormatSize, 
  // ArrowDropDown 
} from '@mui/icons-material';
import { 
  getListLevel, 
  findListItemParent, 
  findRootList, 
  getBulletStyleForLevel, 
  getNumberStyleForLevel, 
  createEmptyListItem,
  updateListStyles,
  isListItemEmpty,
  isAtStartOfNode,
  isAtEndOfNode,
  findContentArea
} from '../../utils/ListUtils';

// A4 dimensions in pixels (96 DPI)
const INCH_TO_PX = 96;
// const CM_TO_PX = 37.8;
// const MM_TO_PX = 3.78;

// Standard page sizes in inches
const PAGE_SIZES = {
  LETTER: {
    name: 'Letter',
    width: 8.5 * INCH_TO_PX,
    height: 11 * INCH_TO_PX,
  },
  A4: {
    name: 'A4',
    width: 8.27 * INCH_TO_PX,
    height: 11.69 * INCH_TO_PX,
  },
  LEGAL: {
    name: 'Legal',
    width: 8.5 * INCH_TO_PX,
    height: 14 * INCH_TO_PX,
  },
  TABLOID: {
    name: 'Tabloid',
    width: 11 * INCH_TO_PX,
    height: 17 * INCH_TO_PX,
  },
  CUSTOM: {
    name: 'Custom',
    width: 8.5 * INCH_TO_PX,
    height: 11 * INCH_TO_PX,
  }
};

// Replace the current PAGE_WIDTH and PAGE_HEIGHT constants with default values
const DEFAULT_PAGE_SIZE = PAGE_SIZES.LETTER;
const DEFAULT_ORIENTATION = 'portrait';

// Predefined margin presets (in pixels)
const MARGIN_PRESETS = {
  NORMAL: {
    top: INCH_TO_PX,
    bottom: INCH_TO_PX,
    left: INCH_TO_PX,
    right: INCH_TO_PX,
  },
  NARROW: {
    top: INCH_TO_PX * 0.5,
    bottom: INCH_TO_PX * 0.5,
    left: INCH_TO_PX * 0.5,
    right: INCH_TO_PX * 0.5,
  },
  MODERATE: {
    top: INCH_TO_PX,
    bottom: INCH_TO_PX,
    left: INCH_TO_PX * 0.75,
    right: INCH_TO_PX * 0.75,
  },
  WIDE: {
    top: INCH_TO_PX,
    bottom: INCH_TO_PX,
    left: INCH_TO_PX * 1.5,
    right: INCH_TO_PX * 1.5,
  },
};

const EditorContent = () => {
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState([1]);
  const [margins, setMargins] = useState(MARGIN_PRESETS.NORMAL);
  const [pageContents, setPageContents] = useState({1: ''});
  const [headers, setHeaders] = useState({1: ''});
  const [footers, setFooters] = useState({1: ''});
  
  // Add new state for page orientation and dimensions
  const [pageOrientations, setPageOrientations] = useState({1: DEFAULT_ORIENTATION});
  const [pageSizes, setPageSizes] = useState({1: DEFAULT_PAGE_SIZE.name});
  const [customPageSizes, setCustomPageSizes] = useState({1: {width: DEFAULT_PAGE_SIZE.width, height: DEFAULT_PAGE_SIZE.height}});
  
  // Page settings dialog state
  const [pageSettingsAnchorEl, setPageSettingsAnchorEl] = useState(null);
  const [pageSettingsDialogOpen, setPageSettingsDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);
  const [tempPageSize, setTempPageSize] = useState(DEFAULT_PAGE_SIZE.name);
  const [tempOrientation, setTempOrientation] = useState(DEFAULT_ORIENTATION);
  const [tempCustomWidth, setTempCustomWidth] = useState(DEFAULT_PAGE_SIZE.width / INCH_TO_PX);
  const [tempCustomHeight, setTempCustomHeight] = useState(DEFAULT_PAGE_SIZE.height / INCH_TO_PX);
  const [tempUnit, setTempUnit] = useState('in');
  
  const [currentSettingsPage, setCurrentSettingsPage] = useState('1');
  
  const contentRefs = useRef({});
  const headerRefs = useRef({});
  const footerRefs = useRef({});
  const measureRef = useRef(null);
  
  const { saveSelectionRange } = useComments();
  const { saveHistory, ActionTypes } = useEditorHistory();

  // Function to get the actual page dimensions based on orientation and size
  const getPageDimensions = (pageNumber) => {
    const orientation = pageOrientations[pageNumber] || DEFAULT_ORIENTATION;
    const pageSize = pageSizes[pageNumber] || DEFAULT_PAGE_SIZE.name;
    let width, height;
    
    if (pageSize === 'CUSTOM') {
      const customSize = customPageSizes[pageNumber] || {
        width: DEFAULT_PAGE_SIZE.width,
        height: DEFAULT_PAGE_SIZE.height
      };
      width = customSize.width;
      height = customSize.height;
    } else {
      const dimensions = PAGE_SIZES[pageSize] || DEFAULT_PAGE_SIZE;
      width = dimensions.width;
      height = dimensions.height;
    }
    
    // Swap width and height for landscape orientation
    if (orientation === 'landscape') {
      return { width: height, height: width };
    }
    
    return { width, height };
  };

  const getZoomedSize = (size) => `${size * (zoom / 100)}px`;

  // Add functions for indentation handling
  const getNextBulletStyle = (currentStyle) => {
    switch (currentStyle) {
      case 'disc': return 'circle';
      case 'circle': return 'square';
      case 'square': return 'disc';
      default: return 'circle';
    }
  };

  const getNextNumberStyle = (currentStyle) => {
    switch (currentStyle) {
      case 'decimal': return 'lower-alpha';
      case 'lower-alpha': return 'lower-roman';
      case 'lower-roman': return 'upper-alpha';
      case 'upper-alpha': return 'upper-roman';
      case 'upper-roman': return 'decimal';
      default: return 'lower-alpha';
    }
  };

  // Get the first text node in an element (for cursor positioning)
  const getFirstTextNode = (element) => {
    if (!element) return null;
    
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    for (let i = 0; i < element.childNodes.length; i++) {
      const result = getFirstTextNode(element.childNodes[i]);
      if (result) return result;
    }
    
    return null;
  };

  // Add or update this function in your EditorContent component
  const handleTabKey = (e, pageNumber) => {
    // Prevent default tab behavior
    e.preventDefault();
    
    // Add debug logging
    console.log('handleTabKey called with shift key:', e.shiftKey);
    
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    // Store original range to restore later
    const originalRange = range.cloneRange();
    
    // Determine indent direction: Tab = increase, Shift+Tab = decrease
    const direction = e.shiftKey ? 'decrease' : 'increase';
    console.log('Tab direction determined as:', direction);
    
    // Check if the selection is within a list item
    const listItem = getListItem(node);
    if (listItem) {
      // Handle indentation within lists
      const parentList = listItem.parentNode;
      
      // Special case: List indentation
      try {
        // Apply list-specific indentation logic
        const success = handleListIndentation(listItem, e.shiftKey ? 'outdent' : 'indent');
        
        if (success) {
          // List indentation was handled successfully
          try {
            // Restore the selection where possible
            selection.removeAllRanges();
            selection.addRange(originalRange);
          } catch (error) {
            console.error('Error restoring selection after list indentation:', error);
          }
          
          // Save history after changes
          setTimeout(() => saveHistory(ActionTypes.COMPLETE), 100);
          return;
        }
      } catch (error) {
        console.error('Error handling list indentation:', error);
      }
    }
    
    // Get the paragraphs in the current selection
    const paragraph = findParagraphNode(node);
    
    if (paragraph) {
      // Apply paragraph indentation
      const success = applyIndentation(paragraph, direction);
      
      // If indentation was successful, restore selection and save history
      if (success) {
        try {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        } catch (error) {
          console.error('Error restoring selection after indentation:', error);
        }
        
        // Save history after changes
        setTimeout(() => saveHistory(ActionTypes.COMPLETE), 100);
        return;
      }
    }
    
    // If we have text selected, we need special handling to avoid deleting it
    if (!range.collapsed) {
      // Find all paragraphs in the selection
      const contentArea = findContentArea(range.commonAncestorContainer);
      if (!contentArea) return;
      
      const selectedParagraphs = findAllParagraphsInSelection(range, contentArea);
      
      if (selectedParagraphs.length > 0) {
        // Apply indentation to all selected paragraphs
        let indentChanged = false;
        selectedParagraphs.forEach(para => {
          if (para) {
            const result = applyIndentation(para, direction);
            if (result) indentChanged = true;
          }
        });
        
        // Try to restore the original selection
        try {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        } catch (error) {
          console.error('Error restoring selection:', error);
        }
        
        // Save history if changes were made
        if (indentChanged) {
          setTimeout(() => saveHistory(ActionTypes.COMPLETE), 100);
        }
        
        return;
      }
      
      // If we didn't find paragraphs but have a selection, create a wrapper
      try {
        // Create a span to wrap the selection
        const span = document.createElement('span');
        range.surroundContents(span);
        
        // Apply indentation to the span
        applyIndentation(span, direction);
        
        // Save history after changes
        setTimeout(() => saveHistory(ActionTypes.COMPLETE), 100);
        return;
      } catch (error) {
        console.error('Error wrapping selection:', error);
      }
    }
    
    // Fallback: If nothing else worked, try inserting a tab character
    const tab = document.createElement('span');
    tab.className = 'tab-space';
    tab.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;';
    
    // Insert at current position
    range.insertNode(tab);
    
    // Move selection after the tab
    range.setStartAfter(tab);
    range.setEndAfter(tab);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Save history after changes
    setTimeout(() => saveHistory(ActionTypes.COMPLETE), 100);
  };

  // Enhanced applyIndentation function that fixes the decrease indent issue
  const applyIndentation = (paragraph, direction) => {
    if (!paragraph) return false;
    
    try {
      // Get current indentation from computed style
      const computedStyle = window.getComputedStyle(paragraph);
      const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
      
      // Google Docs indentation step (0.5 inch = 40px at 96 DPI)
      const INDENT_STEP = 40;
      const MAX_INDENT_LEVEL = 10; // Prevent excessive indentation
      
      // For tracking what indent level we're at and if any changes occurred
      let indentationChanged = false;
      
      // If it's a span, we might need to convert to a div for proper indentation
      if (paragraph.tagName === 'SPAN' && !paragraph.getAttribute('data-indent-level')) {
        // Check if it has a parent paragraph we can indent instead
        const parentParagraph = findParagraphNode(paragraph.parentNode);
        if (parentParagraph) {
          return applyIndentation(parentParagraph, direction);
        }
        
        // Otherwise convert it to a div
        const div = document.createElement('div');
        div.innerHTML = paragraph.innerHTML;
        paragraph.parentNode.replaceChild(div, paragraph);
        paragraph = div;
      }
      
      // Increase indentation
      if (direction === 'increase') {
        // Calculate the exact current level without rounding
        const exactLevel = currentMarginLeft / INDENT_STEP;
        // Get the next higher level (exact steps)
        const newLevel = Math.floor(exactLevel) + 1;
        
        // Check if we're at max indent level
        if (newLevel > MAX_INDENT_LEVEL) {
          return false;
        }
        
        // Calculate the new margin based on the exact level
        const newMargin = newLevel * INDENT_STEP;
        
        // Better handling of existing styles
        const existingStyles = paragraph.style.cssText || '';
        
        // Create a clean version without any margin-left or transition properties
        const cleanedStyles = existingStyles
          .replace(/margin-left\s*:[^;]+;?/gi, '')
          .replace(/transition\s*:[^;]+;?/gi, '');
        
        // Apply indentation with animation
        paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}margin-left: ${newMargin}px; transition: margin-left 0.15s ease-out;`;
        paragraph.style.marginLeft = `${newMargin}px`; // Explicitly set
        
        // Store indentation level for future reference
        paragraph.setAttribute('data-indent-level', newLevel.toString());
        indentationChanged = true;
        
        // Clean up transition after animation
        setTimeout(() => {
          const styles = paragraph.style.cssText.replace(/transition\s*:[^;]+;?/gi, '');
          paragraph.style.cssText = styles;
        }, 200);
      } 
      // Decrease indentation
      else if (direction === 'decrease') {
        // Only apply decrease if we have margin to decrease
        if (currentMarginLeft <= 0) {
          return false;
        }
        
        // Calculate the exact current level without rounding
        const exactLevel = currentMarginLeft / INDENT_STEP;
        // Get the next lower level (exact steps) - use ceil to ensure moving to the previous step
        const newLevel = Math.max(0, Math.ceil(exactLevel) - 1);
        // Calculate the new margin based on the exact level
        const newMargin = newLevel * INDENT_STEP;
        
        // Better handling of existing styles
        const existingStyles = paragraph.style.cssText || '';
        
        // Create a clean version without any margin-left or transition properties
        const cleanedStyles = existingStyles
          .replace(/margin-left\s*:[^;]+;?/gi, '')
          .replace(/transition\s*:[^;]+;?/gi, '');
        
        // Apply with smooth animation
        if (newMargin === 0) {
          // Remove indentation completely but preserve other styles
          paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}margin-left: 0px; transition: margin-left 0.15s ease-out;`;
          paragraph.style.marginLeft = '0px'; // Explicitly set to 0
          paragraph.removeAttribute('data-indent-level');
        } else {
          // Apply reduced indentation
          paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}margin-left: ${newMargin}px; transition: margin-left 0.15s ease-out;`;
          paragraph.style.marginLeft = `${newMargin}px`; // Explicitly set
          
          // Set the data-indent-level attribute to the new level
          paragraph.setAttribute('data-indent-level', newLevel.toString());
        }
        
        indentationChanged = true;
        
        // Clean up transition after animation
        setTimeout(() => {
          const styles = paragraph.style.cssText.replace(/transition\s*:[^;]+;?/gi, '');
          paragraph.style.cssText = styles;
        }, 200);
      }
      
      // If indentation changed, update content and provide visual feedback
      if (indentationChanged) {
        const contentArea = findContentArea(paragraph);
        if (contentArea) {
          // Add a subtle highlight to show the paragraph being indented
          const originalBackground = paragraph.style.backgroundColor || '';
          
          // Apply a subtle animation to show the change
          paragraph.style.backgroundColor = 'rgba(232, 240, 254, 0.4)';
          
          setTimeout(() => {
            paragraph.style.transition = 'background-color 0.3s ease-out';
            paragraph.style.backgroundColor = originalBackground;
            
            setTimeout(() => {
              paragraph.style.removeProperty('transition');
            }, 350);
          }, 150);
          
          // Trigger input event to ensure changes are detected
          contentArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error applying indentation:', error);
      return false;
    }
  };

  // Function to find all paragraphs in a selection
  const findAllParagraphsInSelection = (range, contentArea) => {
    if (!range || !contentArea) return [];
    
    const result = [];
    
    // Method 1: Check all paragraphs in content area for intersection
    const allParagraphs = Array.from(
      contentArea.querySelectorAll('p, div:not([data-content-area]), h1, h2, h3, h4, h5, h6, li')
    );
    
    // Filter to paragraphs that intersect with the selection
    const intersectingParagraphs = allParagraphs.filter(node => {
      try {
        return range.intersectsNode(node);
      } catch {
        return false;
      }
    });
    
    if (intersectingParagraphs.length > 0) {
      return intersectingParagraphs;
    }
    
    // Method 2: Use common ancestor if no paragraphs found
    const commonAncestor = range.commonAncestorContainer;
    const paragraph = findParagraphNode(commonAncestor);
    
    if (paragraph) {
      return [paragraph];
    }
    
    return [];
  };

  // Enhanced function to get all selected paragraphs reliably
  const getSelectedParagraphs = (range) => {
    if (!range) return [];
    
    console.log('Getting selected paragraphs for range:', range);
    const result = [];
    
    // Method 1: Check all paragraphs in the document
    const allParagraphs = Array.from(
      document.querySelectorAll('p, div:not([data-content-area]), h1, h2, h3, h4, h5, h6')
    );
    
    // Filter to paragraphs that intersect with the selection
    const intersectingParagraphs = allParagraphs.filter(node => {
      try {
        return range.intersectsNode(node);
      } catch (error) {
        console.warn('Error checking if range intersects node:', error);
        return false;
      }
    });
    
    if (intersectingParagraphs.length > 0) {
      console.log(`Found ${intersectingParagraphs.length} paragraphs via intersection`);
      return intersectingParagraphs;
    }
    
    // Method 2: Direct traversal between start and end
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentNode;
    if (endNode.nodeType === Node.TEXT_NODE) endNode = endNode.parentNode;
    
    const startPara = findParagraphNode(startNode);
    const endPara = findParagraphNode(endNode);
    
    if (startPara === endPara && startPara) {
      console.log('Start and end paragraph are the same');
      return [startPara];
    }
    
    if (startPara && endPara) {
      result.push(startPara);
      
      let current = startPara;
      while (current && current !== endPara) {
        if (current.nextElementSibling) {
          current = current.nextElementSibling;
          const para = findParagraphNode(current);
          if (para && !result.includes(para)) {
            result.push(para);
          }
        } else {
          // Move up and over to get to the next element
          let parent = current.parentNode;
          while (parent && !parent.nextElementSibling) {
            parent = parent.parentNode;
          }
          if (!parent || !parent.nextElementSibling) break;
          
          current = parent.nextElementSibling;
          const para = findParagraphNode(current);
          if (para && !result.includes(para)) {
            result.push(para);
          }
        }
      }
      
      if (endPara && !result.includes(endPara)) {
        result.push(endPara);
      }
      
      if (result.length > 0) {
        console.log(`Found ${result.length} paragraphs via traversal`);
        return result;
      }
    }
    
    // Method 3: Fallback to common ancestor paragraph
    const commonPara = findParagraphNode(range.commonAncestorContainer);
    if (commonPara) {
      console.log('Found paragraph via common ancestor');
      return [commonPara];
    }
    
    // Method 4: Ultimate fallback - any element with text content in the selection
    const contentArea = findContentArea(range.commonAncestorContainer);
    if (contentArea) {
      // Look for any element that could be considered a paragraph-like block
      const blockElements = contentArea.querySelectorAll('*');
      for (let i = 0; i < blockElements.length; i++) {
        const element = blockElements[i];
        if (element.textContent && 
            element.textContent.trim() && 
            element !== contentArea &&
            !['UL', 'OL', 'TABLE', 'TBODY', 'TR'].includes(element.nodeName)) {
          try {
            if (range.intersectsNode(element)) {
              console.log('Found element with text content intersecting selection:', element);
              result.push(element);
            }
          } catch (error) {
            console.warn('Error in fallback paragraph detection:', error);
          }
        }
      }
    }
    
    console.log(`Final result: ${result.length} paragraphs found`);
    return result;
  };

  // Add a better paragraph finder
  const findParagraphNode = (node) => {
    if (!node) return null;
    
    // Start with the node itself
    let current = node;
    
    // If it's a text node, get its parent
    if (current.nodeType === Node.TEXT_NODE) {
      current = current.parentNode;
    }
    
    // Find the block-level container (paragraph)
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      // Special check for content area - if we reach this, we've gone too far
      if (current.getAttribute && current.getAttribute('data-content-area') === 'true') {
        return null;
      }
      
      // Check if it's a block element that would act as a paragraph
      const display = window.getComputedStyle(current).display;
      if (display === 'block' || 
          current.nodeName === 'P' || 
          current.nodeName === 'DIV' || 
          current.nodeName === 'H1' || 
          current.nodeName === 'H2' || 
          current.nodeName === 'H3' || 
          current.nodeName === 'H4' || 
          current.nodeName === 'H5' || 
          current.nodeName === 'H6') {
        return current;
      }
      
      current = current.parentNode;
    }
    
    return null;
  };

  // Helper function to get list item
  const getListItem = (node) => {
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.nodeName === 'LI') {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  // Helper function to find root list (for updating styles)
  const findRootList = (listElement) => {
    if (!listElement) return null;
    
    let current = listElement;
    while (current.parentNode && 
           current.parentNode.nodeName === 'LI' && 
           current.parentNode.parentNode && 
           (current.parentNode.parentNode.nodeName === 'UL' || 
            current.parentNode.parentNode.nodeName === 'OL')) {
      current = current.parentNode.parentNode;
    }
    
    return current;
  };

  // Add helper functions for table navigation
  const findParentWithTag = (node, tagName) => {
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.nodeName === tagName) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  const moveToNextTableCell = (cell, backwards = false) => {
    const row = cell.parentNode;
    const table = row.parentNode;
    const cellIndex = Array.from(row.cells).indexOf(cell);
    
    if (backwards) {
      // Move to previous cell
      if (cellIndex > 0) {
        // Previous cell in same row
        row.cells[cellIndex - 1].focus();
      } else if (row.previousElementSibling) {
        // Last cell in previous row
        const prevRow = row.previousElementSibling;
        prevRow.cells[prevRow.cells.length - 1].focus();
      }
    } else {
      // Move to next cell
      if (cellIndex < row.cells.length - 1) {
        // Next cell in same row
        row.cells[cellIndex + 1].focus();
      } else if (row.nextElementSibling) {
        // First cell in next row
        row.nextElementSibling.cells[0].focus();
      } else {
        // Add a new row if at the last cell
        const newRow = table.insertRow();
        for (let i = 0; i < row.cells.length; i++) {
          const newCell = newRow.insertCell();
          newCell.contentEditable = true;
          if (i === 0) newCell.focus();
        }
      }
    }
  };

  // Comprehensive indentation handler for indent/outdent buttons
  const handleIndent = (direction, pageNumber) => {
    console.log(`handleIndent called with direction: ${direction}, page: ${pageNumber}`);
    
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      console.log('No selection found, aborting indent');
      return false;
    }
    
    const range = selection.getRangeAt(0);
    const originalRange = range.cloneRange(); // Save for later restoration
    
    // Find the content area
    const contentArea = findContentArea(range.commonAncestorContainer);
    if (!contentArea) {
      console.log('No content area found, aborting indent');
      return false;
    }
    
    console.log('Content area found:', contentArea);
    console.log('Selection is collapsed:', range.collapsed);
    
    // Track if any changes were applied (for undo/redo)
    let anyChangesApplied = false;
    
    // Handle multiple paragraphs if text is selected
    if (!range.collapsed) {
      console.log('Processing selection with text');
      
      // First check if selection contains list items
      const listItems = getSelectedListItems(range);
      console.log(`Found ${listItems.length} list items in selection`);
      
      if (listItems.length > 0) {
        // Handle list items in selection
        listItems.forEach(listItem => {
          console.log('Processing list item:', listItem);
          const success = handleListIndentation(listItem, direction === 'increase' ? 'indent' : 'outdent');
          if (success) anyChangesApplied = true;
        });
      }
      
      // Also handle regular paragraphs in the same selection
      const paragraphs = getSelectedParagraphs(range);
      console.log(`Found ${paragraphs.length} paragraphs in selection`);
      
      // Filter out paragraphs that are part of list items we already processed
      const nonListParagraphs = paragraphs.filter(para => {
        // Skip paragraphs inside list items we've already handled
        return !listItems.some(li => li.contains(para));
      });
      
      console.log(`After filtering, processing ${nonListParagraphs.length} non-list paragraphs`);
      
      if (nonListParagraphs.length > 0) {
        nonListParagraphs.forEach(para => {
          console.log('Processing paragraph:', para);
          // For decrease indent, only apply if there's actual indentation to decrease
          if (direction === 'decrease') {
            const computedStyle = window.getComputedStyle(para);
            const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
            console.log(`Paragraph has margin-left: ${currentMarginLeft}px`);
            
            // Only apply decrease if there's actual margin to decrease
            if (currentMarginLeft > 0) {
              const success = applyIndentation(para, direction);
              if (success) anyChangesApplied = true;
            }
          } else {
            // For increase, always apply
            const success = applyIndentation(para, direction);
            if (success) anyChangesApplied = true;
          }
        });
      }
      
      // If we didn't find any paragraphs or list items, try a fallback method
      if (!anyChangesApplied && paragraphs.length === 0 && listItems.length === 0) {
        console.log('No paragraphs or list items found, trying fallback methods');
        
        // FALLBACK 1: Try to directly create a paragraph from the selection
        try {
          console.log('Attempting to create a paragraph from selection');
          // Create a new paragraph to wrap the selection
          const tempSpan = document.createElement('span');
          const extractedContents = range.extractContents();
          tempSpan.appendChild(extractedContents);
          range.insertNode(tempSpan);
          
          // Apply indentation to the temporary span
          const success = applyIndentation(tempSpan, direction);
          if (success) {
            anyChangesApplied = true;
            console.log('Successfully applied indentation to created span');
          }
        } catch (error) {
          console.error('Error in fallback 1:', error);
          
          // FALLBACK 2: Try to find the closest paragraph or container
          try {
            // Fallback for when our selection methods fail
            let container = range.commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) {
              container = container.parentNode;
            }
            
            console.log('Fallback processing container:', container);
            
            // Check if in a list
            const listItem = getListItem(container);
            if (listItem) {
              const success = handleListIndentation(listItem, direction === 'increase' ? 'indent' : 'outdent');
              if (success) anyChangesApplied = true;
            } else {
              const paragraph = findParagraphNode(container);
              if (paragraph) {
                console.log('Found paragraph in fallback:', paragraph);
                // For decrease, only if there's margin to decrease
                if (direction === 'decrease') {
                  const computedStyle = window.getComputedStyle(paragraph);
                  const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
                  if (currentMarginLeft > 0) {
                    const success = applyIndentation(paragraph, direction);
                    if (success) anyChangesApplied = true;
                  }
                } else {
                  const success = applyIndentation(paragraph, direction);
                  if (success) anyChangesApplied = true;
                }
              } else {
                // FALLBACK 3: Try the direct parent of the selection if all else fails
                console.log('Trying direct parent as last resort');
                const directParent = container;
                if (directParent && directParent !== contentArea) {
                  const success = applyIndentation(directParent, direction);
                  if (success) anyChangesApplied = true;
                }
              }
            }
          } catch (fallbackError) {
            console.error('Error in fallback 2:', fallbackError);
          }
        }
      }
    } else {
      console.log('Processing cursor placement (no selection)');
      // Just cursor placement - handle current element
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      // Check if in list item
      const listItem = getListItem(container);
      if (listItem) {
        console.log('Found cursor in list item');
        const success = handleListIndentation(listItem, direction === 'increase' ? 'indent' : 'outdent');
        if (success) anyChangesApplied = true;
      } else {
        // Regular paragraph
        const paragraph = findParagraphNode(container);
        if (paragraph) {
          console.log('Found cursor in paragraph');
          // For decrease, only if there's margin to decrease
          if (direction === 'decrease') {
            const computedStyle = window.getComputedStyle(paragraph);
            const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
            if (currentMarginLeft > 0) {
              const success = applyIndentation(paragraph, direction);
              if (success) anyChangesApplied = true;
            }
          } else {
            const success = applyIndentation(paragraph, direction);
            if (success) anyChangesApplied = true;
          }
        }
      }
    }
    
    // Make sure changes are saved to state
    if (contentArea) {
      handleContentChange({ target: contentArea }, pageNumber);
    }
    
    // Restore the selection
    try {
      selection.removeAllRanges();
      selection.addRange(originalRange);
    } catch (error) {
      console.error('Error restoring selection after indent:', error);
    }
    
    // Save history after changes (but only if something actually changed)
    if (anyChangesApplied) {
      console.log('Changes applied, saving to history');
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
    } else {
      console.log('No changes were applied during indentation');
    }
    
    return anyChangesApplied;
  };

  // Handle backspace at the start of an indented paragraph
  const handleBackspaceIndent = (e, node) => {
    if (!node) return false;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    
    // Check if we're at the start of a node
    if (!isAtStartOfNode(range, node)) return false;
    
    // Find the paragraph containing the cursor
    const paragraph = findParagraphNode(node);
    if (!paragraph) return false;
    
    // Check if the paragraph has indentation
    const computedStyle = window.getComputedStyle(paragraph);
    const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
    
    if (currentMarginLeft > 0) {
      e.preventDefault();
      
      // Save history before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      // Decrease the indentation by one level
      applyIndentation(paragraph, 'decrease');
      
      // Save history after making changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
      
      return true;
    }
    
    return false;
  };

  // Enhanced keyboard handler with proper Tab/Shift+Tab prioritization
  const handleKeyDown = (e, pageNumber) => {
    // Tab & Shift+Tab highest priority handling
    if (e.key === 'Tab') {
      // Use all three stop methods to ensure no other handlers interfere
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
      
      // Use our enhanced Tab handler with Google Docs behavior
      handleTabKey(e, pageNumber);
      return;
    }
    
    // Regular selection and container determination
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // List item special handling
    const listItem = getListItem(container);
    if (listItem) {
      if (handleListSpecialKeys(e, listItem)) {
        return;
      }
    }
    
    // Handle table cells
    const tableCell = findParentWithTag(container, 'TD');
    if (tableCell && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      return;
    }
    
    // Handle Enter key for indentation preservation
    if (e.key === 'Enter') {
      if (handleEnterKey(e, pageNumber)) {
        return;
      }
    }
    
    // Handle Backspace for indentation reduction
    if (e.key === 'Backspace' && range.collapsed) {
      if (handleBackspaceIndent(e, container)) {
        return;
      }
    }
    
    // Handle keyboard shortcuts for indentation
    if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      e.preventDefault();
      handleIndent('increase', pageNumber);
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === '[') {
      e.preventDefault();
      handleIndent('decrease', pageNumber);
      return;
    }
    
    // Handle other special keys
    if (handleSpecialKeys(e, pageNumber)) {
      return;
    }
  };

  // Handle header/footer changes
  const handleHeaderChange = (e, pageNumber) => {
    const newContent = e.target.textContent;
    setHeaders(prev => ({
      ...prev,
      [pageNumber]: newContent
    }));
  };

  const handleFooterChange = (e, pageNumber) => {
    const newContent = e.target.textContent;
    setFooters(prev => ({
      ...prev,
      [pageNumber]: newContent
    }));
  };

  // Handle content changes
  const handleContentChange = (e, pageNumber) => {
    // You need to implement this function based on your existing code
    // It should update the page contents state and handle any other necessary effects
    setPageContents(prev => ({
      [pageNumber]: e.target.innerHTML,
      ...prev,
    }));
  };

  // Replace the current useEffect with this fixed version
  useEffect(() => {
    // First, add styles for comment highlights (but keep this part)
    const style = document.createElement('style');
    style.textContent = `
      .comment-highlight {
        background-color: #FFEB3B80 !important;
        border-bottom: 2px solid #FFC107 !important;
        cursor: pointer !important;
        display: inline !important;
      }
      .comment-highlight.resolved {
        background-color: #E0E0E080 !important;
        border-bottom: 2px solid #9E9E9E !important;
      }
      [contenteditable] {
        direction: ltr !important;
      }
      
      /* Tab character properties for Google Docs-like spacing */
      [contenteditable="true"] {
        tab-size: 4;
        -moz-tab-size: 4;
      }
      
      /* Style for tab characters to ensure they're visible */
      .tab-space {
        display: inline-block;
        width: 0.5in;
      }
      
      /* Style for highlighting the active list level */
      ul[data-list-level="1"] > li {
        list-style-type: disc !important;
      }
      
      ul[data-list-level="2"] > li {
        list-style-type: circle !important;
      }
      
      ul[data-list-level="3"] > li {
        list-style-type: square !important;
      }
      
      ul[data-list-level="4"] > li {
        list-style-type: disclosure-closed !important;
      }
      
      ol[data-list-level="1"] > li {
        list-style-type: decimal !important;
      }
      
      ol[data-list-level="2"] > li {
        list-style-type: lower-alpha !important;
      }
      
      ol[data-list-level="3"] > li {
        list-style-type: lower-roman !important;
      }
      
      ol[data-list-level="4"] > li {
        list-style-type: upper-alpha !important;
      }
      
      ol[data-list-level="5"] > li {
        list-style-type: upper-roman !important;
      }
    `;
    document.head.appendChild(style);

    // Apply direction settings to all editable areas
    const applyLTRDirection = (el) => {
      if (!el) return;
      el.dir = 'ltr';
      el.style.direction = 'ltr';
      el.style.textAlign = 'left';
      el.lang = 'en';
    };
    
    // Apply to all editable areas without adding beforeinput handler
    Object.values(contentRefs.current).forEach(applyLTRDirection);
    Object.values(headerRefs.current).forEach(applyLTRDirection);
    Object.values(footerRefs.current).forEach(applyLTRDirection);
    
    // Set document direction
    document.documentElement.dir = 'ltr';
    document.body.dir = 'ltr';
    
    return () => {
      document.head.removeChild(style);
    };
  }, [pages]);

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      
      if (selectedText) {
        console.log("Selection detected in EditorContent:", selectedText);
        
        // Check if within one of our content areas
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
          container = container.parentNode;
        }
        
        // Find if selection is inside any of our content areas
        let isInContentArea = false;
        Object.values(contentRefs.current).forEach(ref => {
          if (ref && (ref.contains(container) || ref === container)) {
            isInContentArea = true;
          }
        });
        
        if (isInContentArea) {
          console.log("Valid selection in content area:", selectedText);
          saveSelectionRange(range);
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    
    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 50); // Small delay to ensure selection is complete
    };
    
    const handleKeyUp = (e) => {
      // Only check selection after key combinations often used for selection
      if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
          e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
          e.key === 'Home' || e.key === 'End') {
        setTimeout(handleSelectionChange, 50);
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [saveSelectionRange]);

  // Add these helper functions if they don't already exist
  const isAtStartOfNode = (range, node) => {
    if (range.startContainer === node) {
      return range.startOffset === 0;
    } else if (range.startContainer.nodeType === Node.TEXT_NODE && 
               range.startContainer.parentNode === node) {
      return range.startOffset === 0 && 
             (!range.startContainer.previousSibling || 
              (range.startContainer.previousSibling.nodeType === Node.ELEMENT_NODE && 
               range.startContainer.previousSibling.tagName === 'BR'));
    }
    
    return false;
  };

  const isAtEndOfNode = (range, node) => {
    if (range.endContainer === node) {
      return range.endOffset === node.childNodes.length;
    } else if (range.endContainer.nodeType === Node.TEXT_NODE && 
               range.endContainer.parentNode === node) {
      return range.endOffset === range.endContainer.length && 
             !range.endContainer.nextSibling;
    }
    
    return false;
  };

  const getListLevel = (listItem) => {
    if (!listItem || listItem.nodeName !== 'LI') return 0;
    
    let level = 1;
    let parent = listItem.parentNode;
    
    while (parent) {
      if ((parent.nodeName === 'UL' || parent.nodeName === 'OL') && 
          parent.parentNode && 
          parent.parentNode.nodeName === 'LI') {
        level++;
        parent = parent.parentNode.parentNode;
      } else {
        break;
      }
    }
    
    return level;
  };

  const createNewListItem = (listItem, preserveFormat = true) => {
    if (!listItem || listItem.nodeName !== 'LI') return null;
    
    // Save history before creating new item
    saveHistory(ActionTypes.COMPLETE);
    
    const parentList = listItem.parentNode;
    const newLi = document.createElement('li');
    
    // If we want to preserve formatting, copy styles
    if (preserveFormat) {
      // Copy style attributes but not content
      const computedStyle = window.getComputedStyle(listItem);
      
      // Apply basic text formatting styles
      ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'text-decoration']
        .forEach(style => {
          if (computedStyle[style]) {
            newLi.style[style] = computedStyle[style];
          }
        });
    }
    
    // Add a BR to ensure the list item has height
    newLi.appendChild(document.createElement('br'));
    
    // Insert after current list item
    if (listItem.nextSibling) {
      parentList.insertBefore(newLi, listItem.nextSibling);
    } else {
      parentList.appendChild(newLi);
    }
    
    // Move cursor to new list item
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(newLi, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    return newLi;
  };

  // Enhanced implementation of handleEmptyListItem for Google Docs-like behavior
  const handleEmptyListItem = (listItem, action = 'auto') => {
    if (!listItem) return false;
    
    // Save state before making changes (for undo/redo)
    saveHistory(ActionTypes.COMPLETE);
    
    const parentList = listItem.parentNode;
    if (!parentList) return false;
    
    // Get the previous list item
    const prevListItem = listItem.previousElementSibling;
    
    // Google Docs behavior: If there's a previous list item and this is empty
    if (prevListItem && action === 'auto') {
      // Remove the current empty list item
      parentList.removeChild(listItem);
      
      // Place cursor at the end of the previous list item's content
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Find the last text node or element to place cursor properly
      const findLastTextNodeOrElement = (node) => {
        if (!node) return null;
        
        // Go through children in reverse order to find last text node
        if (node.childNodes.length > 0) {
          for (let i = node.childNodes.length - 1; i >= 0; i--) {
            const result = findLastTextNodeOrElement(node.childNodes[i]);
            if (result) return result;
          }
        }
        
        // If we're a text node with content, return this node
        if (node.nodeType === Node.TEXT_NODE) {
          return { node: node, offset: node.textContent.length };
        }
        
        // If we're an element node (but not BR), return position after it
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'BR') {
          return { node: node.parentNode, offset: Array.from(node.parentNode.childNodes).indexOf(node) + 1 };
        }
        
        // If we're a BR element, return position before it
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'BR') {
          return { node: node.parentNode, offset: Array.from(node.parentNode.childNodes).indexOf(node) };
        }
        
        return null;
      };
      
      let cursorPosition = findLastTextNodeOrElement(prevListItem);
      
      // If we couldn't find a good position, create one
      if (!cursorPosition) {
        if (prevListItem.lastChild && prevListItem.lastChild.nodeName === 'BR') {
          // Remove BR element if it's the last child
          const brElem = prevListItem.lastChild;
          cursorPosition = { node: prevListItem, offset: Array.from(prevListItem.childNodes).indexOf(brElem) };
        } else {
          // Just place cursor at the end of the list item
          cursorPosition = { node: prevListItem, offset: prevListItem.childNodes.length };
        }
      }
      
      // Set the cursor at the found position
      range.setStart(cursorPosition.node, cursorPosition.offset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Make sure to update the content area
      const contentArea = findContentArea(prevListItem);
      if (contentArea) {
        const pageNumber = parseInt(contentArea.getAttribute('data-page')) || 1;
        handleContentChange({ target: contentArea }, pageNumber);
      }
      
      // Save after changes (for redo)
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
      
      return true;
    }
    
    // Rest of your existing function for other cases (can keep as is)
    // ...
    
    return false;
  };

  // REPLACE the existing function body with this enhanced implementation
  const updateListStyles = (list) => {
    if (!list) return;
    
    // Enhanced recursive function to process list and all nested lists
    const processListRecursively = (listElement, level = 1) => {
      if (!listElement) return;
      
      // Apply appropriate style based on list type and nesting level
      if (listElement.nodeName === 'UL') {
        // Bullet styles cycle: disc → circle → square → disc
        const bulletStyles = ['disc', 'circle', 'square'];
        const styleIndex = (level - 1) % bulletStyles.length;
        listElement.style.listStyleType = bulletStyles[styleIndex];
      } else if (listElement.nodeName === 'OL') {
        // Number styles cycle: decimal → lower-alpha → lower-roman → decimal
        const numberStyles = ['decimal', 'lower-alpha', 'lower-roman'];
        const styleIndex = (level - 1) % numberStyles.length;
        listElement.style.listStyleType = numberStyles[styleIndex];
      }
      
      // Process all list items
      Array.from(listElement.children).forEach(child => {
        if (child.nodeName === 'LI') {
          // Process any nested lists with increased level
          Array.from(child.children).forEach(grandchild => {
            if (grandchild.nodeName === 'UL' || grandchild.nodeName === 'OL') {
              processListRecursively(grandchild, level + 1);
            }
          });
          
          // Apply visual style to list item based on its level
          if (level > 1) {
            // Add subtle margin to show nesting (Google Docs style)
            child.style.position = 'relative';
          } else {
            child.style.position = '';
          }
        }
      });
    };
    
    // Start processing from the root list
    processListRecursively(list);
    
    // Force browser to refresh list numbering for ordered lists
    if (list.nodeName === 'OL') {
      const originalDisplay = list.style.display || '';
      list.style.display = 'none';
      setTimeout(() => {
        list.style.display = originalDisplay;
      }, 10);
    }
  };

  // If this function doesn't exist, add it
  const handleListEnterKey = (e) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    
    // Find if we're in a list item
    let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      
    const listItem = findListItemParent(node);
    if (!listItem) return false;
    
    // Check if list item is empty
    if (isListItemEmpty(listItem)) {
      e.preventDefault();
      
      // Get list level
      const level = getListLevel(listItem);
      
      if (level > 1) {
        // If nested, outdent (like Tab+Shift in Google Docs)
        handleListIndentation(listItem, 'outdent');
        return true;
      } else {
        // If at top level and empty, exit the list (convert to paragraph)
        const list = listItem.parentNode;
        const newParagraph = document.createElement('p');
        newParagraph.innerHTML = '<br>';
        
        // Insert after the list or current item
        if (listItem.nextSibling) {
          // If there are items after this one, split the list
          const newList = document.createElement(list.nodeName);
          
          // Clone attributes
          for (let i = 0; i < list.attributes.length; i++) {
            const attr = list.attributes[i];
            newList.setAttribute(attr.name, attr.value);
          }
          
          // Move all following items to new list
          let nextItem = listItem.nextSibling;
          while (nextItem) {
            const itemToMove = nextItem;
            nextItem = nextItem.nextSibling;
            newList.appendChild(itemToMove);
          }
          
          // Insert paragraph and new list
          list.parentNode.insertBefore(newParagraph, list.nextSibling);
          if (newList.children.length > 0) {
            list.parentNode.insertBefore(newList, newParagraph.nextSibling);
          }
        } else {
          // Simply add paragraph after list
          list.parentNode.insertBefore(newParagraph, list.nextSibling);
        }
        
        // Remove the empty list item
        listItem.remove();
        
        // If list is now empty, remove it
        if (list.children.length === 0) {
          list.remove();
        }
        
        // Set focus to new paragraph
        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Save history
        saveHistory(ActionTypes.COMPLETE);
        return true;
      }
    }
    
    // Handle Enter in middle or end of list item
    e.preventDefault();
    
    // Create new list item
    const list = listItem.parentNode;
    const newItem = document.createElement('li');
    
    // Set list style based on level
    const level = getListLevel(listItem);
    if (list.nodeName === 'UL') {
      newItem.style.listStyleType = getBulletStyleForLevel(level);
    } else {
      newItem.style.listStyleType = getNumberStyleForLevel(level);
    }
    
    // Handle split based on cursor position
    if (range.collapsed) {
      // Handle cursor position
      let container = range.startContainer;
      let offset = range.startOffset;
      
      // If text node
      if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent;
        
        // Split text at cursor
        const beforeText = text.substring(0, offset);
        const afterText = text.substring(offset);
        
        // Update current node
        container.textContent = beforeText;
        
        // Create text for new item
        if (afterText) {
          const newText = document.createTextNode(afterText);
          newItem.appendChild(newText);
        } else {
          newItem.innerHTML = '<br>';
        }
      } else {
        // Handle element nodes
        // Check if cursor is at the end
        const isAtEnd = isAtEndOfNode(range, listItem);
        
        if (isAtEnd) {
          newItem.innerHTML = '<br>';
        } else {
          // This is more complex - we need to clone nodes after cursor
          // Create a range from cursor to end
          const endRange = document.createRange();
          endRange.setStart(range.startContainer, range.startOffset);
          endRange.setEndAfter(listItem.lastChild);
          
          // Extract content after cursor
          const fragment = endRange.extractContents();
          newItem.appendChild(fragment);
          
          // If current item is now empty, add a break
          if (!listItem.hasChildNodes() || listItem.textContent.trim() === '') {
            listItem.innerHTML = '<br>';
          }
        }
      }
    } else {
      // Selection not collapsed - delete selected content and add empty item
      range.deleteContents();
      newItem.innerHTML = '<br>';
    }
    
    // Insert the new list item
    if (listItem.nextSibling) {
      list.insertBefore(newItem, listItem.nextSibling);
    } else {
      list.appendChild(newItem);
    }
    
    // Move caret to start of new list item
    const newRange = document.createRange();
    newRange.selectNodeContents(newItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    // Save history
    saveHistory(ActionTypes.COMPLETE);
    return true;
  };

  // Make sure this call is added to handleSpecialKeys if not already there
  const handleSpecialKeys = (e, pageNumber) => {
    // Make sure there's a section that checks for list items
    // This might already exist in your code
    
    // Check for list item and delegate to list handler
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const listItem = findParentWithTag(range.startContainer, 'LI');
      
      if (listItem) {
        const handled = handleListSpecialKeys(e, listItem);
        if (handled) return true;
      }
    }
    
    // Rest of your existing code
  };

  // Add this CSS file to your project
  // Create src/styles/listStyles.css
  // And import it in your main file

  // Add this component definition above your return statement but inside the EditorContent component
  const PageSettingsButton = ({ pageNumber }) => {
    const handlePageSettingsClick = (e, pageNum) => {
      setPageSettingsAnchorEl(e.currentTarget);
      setCurrentSettingsPage(pageNum.toString());
    };

    return (
      <Tooltip title="Page settings">
        <IconButton
          data-page-settings="true"
          size="small"
          onClick={(e) => handlePageSettingsClick(e, pageNumber)}
          sx={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              backgroundColor: 'rgba(240, 240, 240, 0.9)',
            },
            zIndex: 10,
            padding: '4px',
          }}
        >
          <Settings fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  // Add the PageSettingsMenu component definition
  const PageSettingsMenu = () => {
    const handlePageSettingsClose = () => {
      setPageSettingsAnchorEl(null);
    };

    const handleOpenPageSettingsDialog = () => {
      setPageSettingsDialogOpen(true);
      handlePageSettingsClose();
    };

    const handleOrientationChange = (orientation) => {
      setPageOrientations(prev => ({
        ...prev,
        [currentSettingsPage]: orientation
      }));
      handlePageSettingsClose();
    };

    return (
      <Menu
        anchorEl={pageSettingsAnchorEl}
        open={Boolean(pageSettingsAnchorEl)}
        onClose={handlePageSettingsClose}
      >
        <MenuItem onClick={handleOpenPageSettingsDialog}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Page setup" />
        </MenuItem>
        
        <Divider />
        
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Orientation
          </Typography>
        </Box>
        
        <MenuItem 
          onClick={() => handleOrientationChange('portrait')}
          selected={pageOrientations[currentSettingsPage] === 'portrait'}
        >
          <ListItemIcon>
            <CropPortrait fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Portrait" />
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleOrientationChange('landscape')}
          selected={pageOrientations[currentSettingsPage] === 'landscape'}
        >
          <ListItemIcon>
            <ViewArray fontSize="small" sx={{ transform: 'rotate(90deg)' }} />
          </ListItemIcon>
          <ListItemText primary="Landscape" />
        </MenuItem>
      </Menu>
    );
  };

  // Set up event listeners for indentation and keyboard shortcuts
  useEffect(() => {
    // Enhanced global Tab key handler to ensure we capture all Tab events
    const handleTabGlobally = (e) => {
        if (e.key === 'Tab') {
        console.log(`Global Tab handler caught: ${e.shiftKey ? 'Shift+Tab' : 'Tab'}`);
        
        // Enhanced shift+tab debugging: Log the actual event object
        if (e.shiftKey) {
          console.log('Shift+Tab event detected with properties:', {
            key: e.key,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            composed: e.composed,
            timeStamp: e.timeStamp,
            defaultPrevented: e.defaultPrevented
          });
        }
        
        // Check if any editor area is active or contains selection
        const contentAreas = document.querySelectorAll('[data-content-area="true"]');
        let editorHasFocus = false;
        let focusedPageNumber = 1;
        
        // First check if selection is inside any editor area
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          contentAreas.forEach(area => {
            // Robustly check if area contains selection or active element
            if (area.contains(range.commonAncestorContainer) || 
                area === document.activeElement || 
                area.contains(document.activeElement) ||
                area.querySelector(':focus')) {
              editorHasFocus = true;
              focusedPageNumber = parseInt(area.getAttribute('data-page') || '1');
            }
          });
        }
        
        // Secondary check for any editor elements having focus
        if (!editorHasFocus) {
          const activeElement = document.activeElement;
          if (activeElement) {
            const contentArea = findContentArea(activeElement);
            if (contentArea) {
              editorHasFocus = true;
              focusedPageNumber = parseInt(contentArea.getAttribute('data-page') || '1');
            }
          }
          
          // Final check for any content areas that have focus
          if (!editorHasFocus) {
            contentAreas.forEach(area => {
              if (area.contains(document.activeElement) || area === document.activeElement) {
                editorHasFocus = true;
                focusedPageNumber = parseInt(area.getAttribute('data-page') || '1');
              }
            });
          }
        }
        
        // Special handling for focusable elements inside the editor that shouldn't capture Tab
        // (like form elements, text inputs, etc.)
        const tagName = document.activeElement ? document.activeElement.tagName : null;
        const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tagName);
        
        // If editor is focused and not on a form element, handle Tab with our custom handler
        if (editorHasFocus && !isFormElement) {
          // Prevent all default behaviors and event propagation
          e.stopImmediatePropagation();
          e.stopPropagation();
          e.preventDefault();
          
          console.log(`Global Tab handler: ${e.shiftKey ? 'Shift+Tab' : 'Tab'} captured on page ${focusedPageNumber}`);
          
          if (e.shiftKey) {
            // For Shift+Tab, try direct approach first for better reliability
            try {
              // Get current selection
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                let container = range.commonAncestorContainer;
                
                // Get to element node if we're in text node
                if (container.nodeType === Node.TEXT_NODE) {
                  container = container.parentNode;
                }
                
                // Find appropriate paragraph to outdent
                const paragraph = findParagraphNode(container);
                if (paragraph) {
                  console.log('Direct Shift+Tab processing on paragraph:', paragraph);
                  
                  // Get computed style to check if we can outdent
                  const computedStyle = window.getComputedStyle(paragraph);
                  const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
                  
                  if (currentMarginLeft > 0) {
                    // Handle outdent directly
                    saveHistory(ActionTypes.COMPLETE);
                    
                    // Can outdent
                    const INDENT_STEP = 40; // 0.5 inch at 96 DPI
                    const newMargin = Math.max(0, currentMarginLeft - INDENT_STEP);
                    
                    // Apply styling
                    paragraph.style.marginLeft = `${newMargin}px`;
                    
                    // Dispatch update event
                    const contentArea = findContentArea(paragraph);
                    if (contentArea) {
                      handleContentChange({ target: contentArea }, focusedPageNumber);
                    }
                    
                    // Save history
                    setTimeout(() => {
                      saveHistory(ActionTypes.COMPLETE);
                    }, 10);
                    
                    return false;
                  }
                }
              }
            } catch (error) {
              console.error('Error in direct Shift+Tab handling:', error);
            }
          }
          
          // Use our enhanced Tab handler as fallback - create a fresh event object to ensure 
          // the shift key state is properly preserved
          const newEvent = {
            ...e,
            key: 'Tab',
            shiftKey: e.shiftKey,
            preventDefault: e.preventDefault.bind(e),
            stopPropagation: e.stopPropagation.bind(e),
            stopImmediatePropagation: e.stopImmediatePropagation.bind(e)
          };
          handleTabKey(newEvent, focusedPageNumber);
          return false;
        }
      }
    };
    
    // Listen for indentation events from toolbar
    const handleIndentationEvent = (e) => {
      const { direction, pageNumber = getCurrentPageNumber() } = e.detail;
      handleIndent(direction, pageNumber);
    };
    
    // Listen for editor-indent events from toolbar buttons
    const handleEditorIndentEvent = (e) => {
      console.log('Editor indent event received:', e.detail);
      const { direction, fromToolbar, selectionData } = e.detail;
      const currentPage = getCurrentPageNumber();
      
      console.log(`Executing indent ${direction} on page ${currentPage}, fromToolbar:`, fromToolbar);
      
      // More robust selection handling for toolbar clicks
      if (fromToolbar && selectionData) {
        console.log('Using selection data from toolbar:', selectionData);
        
        // Make sure we have a valid selection
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
          console.warn('No selection available despite having selection data');
          
          // Direct element approach if no valid selection
          try {
            // Last resort: Try to apply indentation to any focused or active element
            const activeElement = document.activeElement;
            if (activeElement && ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(activeElement.nodeName)) {
              console.log('Applying direct indentation to active element:', activeElement);
              applyIndentation(activeElement, direction);
              
              // Make sure content is saved
              const contentArea = findContentArea(activeElement);
              if (contentArea) {
                handleContentChange({ target: contentArea }, currentPage);
              }
              
              // Save history
              saveHistory(ActionTypes.COMPLETE);
              return;
            }
            
            // Try content area paragraphs if no active element is suitable
            const contentAreas = document.querySelectorAll('[data-content-area="true"]');
            if (contentAreas.length > 0) {
              const currentContentArea = contentAreas[0];
              const paragraphs = Array.from(currentContentArea.querySelectorAll('p, div:not([data-content-area])'));
              
              if (paragraphs.length > 0) {
                console.log('Applying indentation to first paragraph in content area:', paragraphs[0]);
                applyIndentation(paragraphs[0], direction);
                
                // Make sure content is saved
                handleContentChange({ target: currentContentArea }, currentPage);
                
                // Save history
                saveHistory(ActionTypes.COMPLETE);
                return;
              }
            }
          } catch (e) {
            console.error('Error in direct element indentation fallback:', e);
          }
        }
      }
      
      // If we reach here, use the normal handleIndent
      const result = handleIndent(direction, currentPage);
      
      // If handleIndent failed, try one more direct approach
      if (!result) {
        console.log('handleIndent failed, trying final direct approach');
        
        try {
          const contentAreas = document.querySelectorAll('[data-content-area="true"]');
          if (contentAreas.length > 0) {
            const currentContentArea = contentAreas[0];
            
            // Create a paragraph if needed
            let paragraph = currentContentArea.querySelector('p, div:not([data-content-area])');
            
            if (!paragraph) {
              // If no paragraph exists, create one
              paragraph = document.createElement('p');
              paragraph.textContent = ' '; // Need some content
              currentContentArea.appendChild(paragraph);
            }
            
            console.log('Applying indentation to found/created paragraph:', paragraph);
            applyIndentation(paragraph, direction);
            
            // Make sure content is saved
            handleContentChange({ target: currentContentArea }, currentPage);
            
            // Save history
            saveHistory(ActionTypes.COMPLETE);
          }
        } catch (e) {
          console.error('Error in final direct approach:', e);
        }
      }
    };
    
    // Keyboard shortcuts for indentation (Ctrl+[ and Ctrl+])
    const handleKeyboardShortcuts = (e) => {
      // Tab key for indent/outdent (handled by handleTabGlobally)
      
      // Ctrl+] or Cmd+] for indent
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        const currentPage = getCurrentPageNumber();
        console.log('Keyboard shortcut: Increase indent (Ctrl+])');
        handleIndent('increase', currentPage);
      }
      
      // Ctrl+[ or Cmd+[ for outdent
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        const currentPage = getCurrentPageNumber();
        console.log('Keyboard shortcut: Decrease indent (Ctrl+[)');
        handleIndent('decrease', currentPage);
      }
      
      // Handle Tab/Shift+Tab globally using the dedicated global handler
    };
    
    // Set up all event listeners with appropriate capture options
    document.addEventListener('keydown', handleTabGlobally, true); // Use capture phase
    window.addEventListener('handle-indentation', handleIndentationEvent);
    document.addEventListener('editor-indent', handleEditorIndentEvent);
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Clean up all listeners on unmount
    return () => {
      document.removeEventListener('keydown', handleTabGlobally, true);
      window.removeEventListener('handle-indentation', handleIndentationEvent);
      document.removeEventListener('editor-indent', handleEditorIndentEvent);
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, []);

  // Handle special keys for lists (Tab, Enter, Backspace)
  const handleListSpecialKeys = (e, listItem) => {
    if (!listItem || listItem.nodeName !== 'LI') return false;
    
    // Handle Tab key for list indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Save history before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      // Increase or decrease list indentation
      handleListIndentation(listItem, e.shiftKey ? 'outdent' : 'indent');
      
      // Save history after making changes
      setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
      
      return true;
    }
    
    // Handle Enter key for new list items
    if (e.key === 'Enter' && !e.shiftKey) {
      // Check if the list item is empty (just contains BR or is completely empty)
      const listItemContent = listItem.textContent.trim();
      if (!listItemContent) {
        e.preventDefault();
        
        // Convert empty list item to paragraph at the same indentation level
        const listIndentLevel = listItem.closest('ul, ol').getAttribute('data-indent-level') || '0';
        const indentPx = parseInt(listIndentLevel) * 40; // 40px per indent level
        
        // Create a new paragraph with the same indentation
        const newPara = document.createElement('p');
        newPara.innerHTML = '<br>';
        if (indentPx > 0) {
          newPara.style.marginLeft = `${indentPx}px`;
          newPara.setAttribute('data-indent-level', listIndentLevel);
        }
        
        // Replace the list item with the paragraph
        const parentList = listItem.parentNode;
        parentList.parentNode.insertBefore(newPara, parentList.nextSibling);
        
        // If this was the only item in the list, remove the list
        if (parentList.children.length === 1) {
          parentList.parentNode.removeChild(parentList);
        } else {
          // Just remove this item
          parentList.removeChild(listItem);
        }
        
        // Set selection to the new paragraph
        const newRange = document.createRange();
        newRange.setStart(newPara, 0);
        newRange.collapse(true);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        return true;
      }
      
      // Normal list item handling for Enter - create new list item
      // (Let the browser handle the basic list item creation)
      return false;
    }
    
    // Handle Backspace for empty list items
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      
      // Check if we're at the start of the list item
      if (isAtStartOfNode(range, listItem)) {
        const listItemContent = listItem.textContent.trim();
        if (!listItemContent) {
          e.preventDefault();
          
          // Convert empty list item to paragraph (same as Enter key)
          const listIndentLevel = listItem.closest('ul, ol').getAttribute('data-indent-level') || '0';
          const indentPx = parseInt(listIndentLevel) * 40;
          
          const newPara = document.createElement('p');
          newPara.innerHTML = '<br>';
          if (indentPx > 0) {
            newPara.style.marginLeft = `${indentPx}px`;
            newPara.setAttribute('data-indent-level', listIndentLevel);
          }
          
          const parentList = listItem.parentNode;
          parentList.parentNode.insertBefore(newPara, parentList);
          
          if (parentList.children.length === 1) {
            parentList.parentNode.removeChild(parentList);
          } else {
            parentList.removeChild(listItem);
          }
          
          const newRange = document.createRange();
          newRange.setStart(newPara, 0);
          newRange.collapse(true);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Handle Enter key specifically for indentation preservation
  const handleEnterKey = (e, pageNumber) => {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      
      // Get parent node if we're in a text node
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      
      // Check if we're in a list item - let handleListSpecialKeys handle it
      const listItem = getListItem(node);
      if (listItem) {
        return handleListSpecialKeys(e, listItem);
      }
      
      // Find paragraph containing the cursor
      const paragraph = findParagraphNode(node);
      if (!paragraph) return false;
      
      // Check if paragraph has indentation
      const computedStyle = window.getComputedStyle(paragraph);
      const marginLeft = parseInt(computedStyle.marginLeft) || 0;
      
      if (marginLeft > 0) {
        // Save history before making changes
        saveHistory(ActionTypes.COMPLETE);
        
        // Let default Enter behavior create the new paragraph first
        setTimeout(() => {
          // Try to find the newly created paragraph (after the current paragraph)
          let newParagraph = paragraph.nextElementSibling;
          if (!newParagraph) return;
          
          // Apply the same indentation to the new paragraph
          newParagraph.style.marginLeft = `${marginLeft}px`;
          
          // Copy data-indent-level attribute if it exists
          const indentLevel = paragraph.getAttribute('data-indent-level');
          if (indentLevel) {
            newParagraph.setAttribute('data-indent-level', indentLevel);
          }
          
          // Save history after making changes
          setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
        }, 0);
        
        // Don't prevent default - let the browser handle the basic paragraph creation
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error handling Enter key:', error);
      return false;
    }
  };

  // Helper function to get all list items in a selection range
  const getSelectedListItems = (range) => {
    if (!range) return [];
    
    const result = [];
    
    // Method 1: Check all list items in the entire document
    const allListItems = Array.from(document.querySelectorAll('li'));
    
    // Filter to list items that intersect with the selection
    const intersectingListItems = allListItems.filter(node => {
      try {
        return range.intersectsNode(node);
      } catch (error) {
        return false;
      }
    });
    
    if (intersectingListItems.length > 0) {
      return intersectingListItems;
    }
    
    // Method 2: Direct traversal between start and end
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentNode;
    if (endNode.nodeType === Node.TEXT_NODE) endNode = endNode.parentNode;
    
    const startListItem = getListItem(startNode);
    const endListItem = getListItem(endNode);
    
    if (startListItem === endListItem && startListItem) {
      return [startListItem];
    }
    
    if (startListItem && endListItem) {
      result.push(startListItem);
      
      let current = startListItem;
      while (current && current !== endListItem) {
        if (current.nextElementSibling) {
          current = current.nextElementSibling;
          if (current.nodeName === 'LI' && !result.includes(current)) {
            result.push(current);
          }
        } else {
          // Move up and over to get to the next list item
          let parent = current.parentNode;
          while (parent && !parent.nextElementSibling) {
            parent = parent.parentNode;
          }
          if (!parent || !parent.nextElementSibling) break;
          
          current = parent.nextElementSibling;
          if (current.nodeName === 'LI' && !result.includes(current)) {
            result.push(current);
          } else {
            // If not a list item, check children
            const listItem = current.querySelector('li');
            if (listItem && !result.includes(listItem)) {
              result.push(listItem);
              current = listItem;
            }
          }
        }
      }
      
      if (endListItem && !result.includes(endListItem)) {
        result.push(endListItem);
      }
      
      return result;
    }
    
    // Method 3: Try to find list items within the common ancestor
    const commonAncestor = range.commonAncestorContainer;
    if (commonAncestor) {
      const listItems = commonAncestor.querySelectorAll('li');
      if (listItems.length > 0) {
        listItems.forEach(item => {
          if (range.intersectsNode(item) && !result.includes(item)) {
            result.push(item);
          }
        });
      }
    }
    
    return result;
  };

  // Add event listeners
  useEffect(() => {
    // ... existing event listeners
    
    // Listen for list formatting events
    const handleListFormat = (e) => {
      handleListFormatEvent(e);
    };
    
    document.addEventListener('editor-list-format', handleListFormat);
    
    // Listen for input events to handle auto-formatting
    const contentAreas = document.querySelectorAll('[data-content-area]');
    contentAreas.forEach(area => {
      area.addEventListener('input', handleAutoListFormat);
    });
    
    return () => {
      // ... existing cleanup
      document.removeEventListener('editor-list-format', handleListFormat);
      
      contentAreas.forEach(area => {
        area.removeEventListener('input', handleAutoListFormat);
      });
    };
  }, [/* dependencies */]);

  // Add or update these list-specific functions in the EditorContent component:

  // Handle list formatting events (from toolbar or keyboard shortcuts)
  const handleListFormatEvent = (e) => {
    e.stopPropagation(); // Stop event from bubbling further
    
    // Extract list type and style from the event
    const { listType, listStyle } = e.detail;
    
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.error("No selection found when formatting list");
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Determine the content area - use the one the event was dispatched to
    const contentArea = e.currentTarget;
    if (!contentArea || !contentArea.hasAttribute('data-content-area')) {
      console.error("Event not dispatched to a content area");
      return;
    }
    
    console.log(`Applying ${listType} list with style ${listStyle} to content area:`, contentArea);
    
    // Get the current page number
    const pageNumber = contentArea.getAttribute('data-page') || '1';
    
    // Get all paragraphs in the selection
    const paragraphs = getSelectedParagraphs(range);
    
    // If no paragraphs in selection, try to get the paragraph at cursor
    if (paragraphs.length === 0) {
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      
      const paragraph = findParagraphNode(node);
      if (paragraph) {
        paragraphs.push(paragraph);
      } else {
        console.error("Could not find paragraph to format");
        return;
      }
    }
    
    console.log("Paragraphs to format:", paragraphs);
    
    // Check if all selected paragraphs are already in the requested list type
    const allInSameListType = paragraphs.every(p => {
      const listItem = findListItemParent(p);
      if (!listItem) return false;
      
      const list = listItem.parentNode;
      return (listType === 'bullet' && list.nodeName === 'UL') ||
             (listType === 'number' && list.nodeName === 'OL');
    });
    
    // If all paragraphs are already in the requested list type, remove the list formatting
    if (allInSameListType) {
      // Convert list items back to paragraphs
      paragraphs.forEach(p => {
        const listItem = findListItemParent(p);
        if (!listItem) return;
        
        const list = listItem.parentNode;
        
        // Create a new paragraph
        const newP = document.createElement('p');
        newP.innerHTML = listItem.innerHTML;
        
        // Replace the list item with the paragraph
        list.parentNode.insertBefore(newP, list);
        listItem.remove();
        
        // If the list is now empty, remove it
        if (list.children.length === 0) {
          list.remove();
        }
      });
    } else {
      // Apply list formatting
      
      // Determine the list element to use
      const newListType = listType === 'bullet' ? 'UL' : 'OL';
      
      // Group adjacent paragraphs to create separate lists
      const paragraphGroups = [];
      let currentGroup = [];
      
      paragraphs.forEach((p, index) => {
        if (index === 0) {
          currentGroup.push(p);
        } else {
          const prevP = paragraphs[index - 1];
          
          // Check if paragraphs are siblings or directly adjacent
          const areAdjacent = prevP.nextElementSibling === p || 
                             prevP.parentNode === p.parentNode;
          
          if (areAdjacent) {
            currentGroup.push(p);
          } else {
            // Start a new group
            paragraphGroups.push([...currentGroup]);
            currentGroup = [p];
          }
        }
      });
      
      // Add the last group if it's not empty
      if (currentGroup.length > 0) {
        paragraphGroups.push(currentGroup);
      }
      
      // Process each group of paragraphs
      paragraphGroups.forEach(group => {
        // Create a new list
        const newList = document.createElement(newListType);
        
        // Insert the list before the first paragraph in the group
        const firstPara = group[0];
        firstPara.parentNode.insertBefore(newList, firstPara);
        
        // Convert each paragraph to a list item
        group.forEach(p => {
          // Create a new list item
          const newItem = document.createElement('LI');
          newItem.style.listStyleType = listStyle;
          newItem.innerHTML = p.innerHTML;
          
          // Add the list item to the list
          newList.appendChild(newItem);
          
          // Remove the original paragraph
          p.remove();
        });
        
        // Update styles for nested lists
        updateListStyles(newList);
      });
    }
    
    // Dispatch an input event to ensure changes are detected
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Force a history save after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
  };

  // Handle creating a list when user types * or - or 1. at the start of a line
  const handleAutoListFormat = (e) => {
    // Check if we're in a content area
    const contentArea = findContentArea(e.target);
    if (!contentArea) return;
    
    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if we're in a text node
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;
    
    // Find the current paragraph
    const paragraph = findParagraphNode(range.startContainer);
    if (!paragraph) return;
    
    // Don't process if already in a list
    if (findListItemParent(paragraph)) return;
    
    // Get text content of the paragraph
    const text = paragraph.textContent;
    
    // Check bullet markers (*, -, •)
    if (text === '* ' || text === '- ' || text === '• ') {
      e.preventDefault();
      
      // Create bullet list
      const list = document.createElement('ul');
      const item = document.createElement('li');
      item.style.listStyleType = 'disc';
      item.innerHTML = '<br>';
      list.appendChild(item);
      
      // Replace paragraph
      paragraph.parentNode.insertBefore(list, paragraph);
      paragraph.remove();
      
      // Place cursor in new list item
      const newRange = document.createRange();
      newRange.setStart(item, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      saveHistory(ActionTypes.COMPLETE);
      return;
    }
    
    // Check numbered list markers (1. or 1))
    const numberPattern = /^(\d+)[.)] $/;
    const match = text.match(numberPattern);
    
    if (match) {
      e.preventDefault();
      
      // Create numbered list
      const list = document.createElement('ol');
      const item = document.createElement('li');
      item.style.listStyleType = 'decimal';
      item.innerHTML = '<br>';
      list.appendChild(item);
      
      // Replace paragraph
      paragraph.parentNode.insertBefore(list, paragraph);
      paragraph.remove();
      
      // Place cursor in new list item
      const newRange = document.createRange();
      newRange.setStart(item, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      saveHistory(ActionTypes.COMPLETE);
    }
  };

  // Add this function right after getListItem function
  const handleListIndentation = (listItem, action) => {
    if (!listItem) return false;
    
    // Log the action for debugging
    console.log('List indentation action:', action, 'on list item:', listItem);
    
    try {
      const parentList = listItem.parentNode;
      if (!parentList) return false;
      
      // Get the root list to determine level
      const rootList = findRootList(parentList);
      if (!rootList) return false;
      
      // Get current list level
      const currentLevel = getListLevel(listItem);
      console.log('Current list level:', currentLevel);
      
      // Handle indentation increase
      if (action === 'indent' && currentLevel < 5) {
        const prevSibling = listItem.previousElementSibling;
        
        // Can only indent if there's a previous list item at the same level
        if (!prevSibling) return false;
        
        // Check if the previous sibling already has a nested list
        let nestedList = Array.from(prevSibling.children).find(child => 
          child.nodeName === 'UL' || child.nodeName === 'OL'
        );
        
        // If no nested list exists, create one
        if (!nestedList) {
          // Create new sublist with same type as parent
          nestedList = document.createElement(parentList.nodeName);
          prevSibling.appendChild(nestedList);
        }
        
        // Move current list item to the nested list
        nestedList.appendChild(listItem);
        
        // Update styles in the affected lists
        updateListStyles(rootList);
        
        return true;
      }
      // Handle outdentation (decrease indent)
      else if (action === 'outdent' && currentLevel > 1) {
        // Get the parent list item that contains this list
        const parentItem = findParentWithTag(parentList, 'LI');
        
        if (parentItem && parentItem.parentNode) {
          // Insert the list item after its grandparent item
          parentItem.parentNode.insertBefore(listItem, parentItem.nextSibling);
          
          // Clean up: if the sublist is now empty, remove it
          if (!parentList.children.length) {
            parentList.remove();
          }
          
          // Update styles in all affected lists
          updateListStyles(rootList);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error in handleListIndentation:', error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] p-8">
      <div className="flex flex-col items-center justify-center gap-2">
        {pages.map(pageNumber => {
          // Get dimensions for this specific page
          const { width, height } = getPageDimensions(pageNumber);
          
          return (
            <div
              key={pageNumber}
              data-page={pageNumber}
              className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] rounded-sm transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] mx-auto"
              style={{
                width: getZoomedSize(width),
                height: getZoomedSize(height),
                position: 'relative',
                backgroundColor: 'white',
                margin: '10px auto',
                display: 'block' // Ensures proper centering
              }}
              onClick={() => {
                // Set current page when clicked
                setSelectedPage(pageNumber);
              }}
            >
              {/* Add the Page Settings Button */}
              <PageSettingsButton pageNumber={pageNumber} />
              
              {/* Header Area */}
              <div
                ref={el => headerRefs.current[pageNumber] = el}
                contentEditable
                suppressContentEditableWarning
                className="absolute outline-none px-2"
                style={{
                  top: getZoomedSize(margins.top * 0.25),
                  left: getZoomedSize(margins.left),
                  right: getZoomedSize(margins.right),
                  height: getZoomedSize(margins.top * 0.5),
                  minHeight: '1em',
                  backgroundColor: 'white',
                  zIndex: 2,
                  direction: 'ltr',
                  unicodeBidi: 'plaintext'
                }}
                onInput={(e) => handleHeaderChange(e, pageNumber)}
                dir="ltr"
              >
                {headers[pageNumber]}
              </div>

              {/* Content Area - with enhanced Tab handling */}
              <div
                ref={el => contentRefs.current[pageNumber] = el}
                contentEditable
                suppressContentEditableWarning
                className="absolute outline-none px-2"
                data-content-area="true"
                data-page={pageNumber}
                data-tab-handler="true"
                style={{
                  top: getZoomedSize(margins.top * 0.75),
                  left: getZoomedSize(margins.left),
                  right: getZoomedSize(margins.right),
                  bottom: getZoomedSize(margins.bottom * 0.75),
                  overflowY: 'hidden',
                  wordWrap: 'break-word',
                  backgroundColor: 'white',
                  zIndex: 1,
                  direction: 'ltr',
                  unicodeBidi: 'plaintext',
                  textAlign: 'left'
                }}
                onInput={(e) => handleContentChange(e, pageNumber)}
                onKeyDown={(e) => {
                  // Special handling for Tab key to prevent focus switching
                  if (e.key === 'Tab') {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();
                    handleTabKey(e, pageNumber);
                    return;
                  }
                  // Handle all other keys normally
                  handleKeyDown(e, pageNumber);
                }}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                dir="ltr"
              >
                {pageContents[pageNumber]}
              </div>

              {/* Footer Area */}
              <div
                ref={el => footerRefs.current[pageNumber] = el}
                contentEditable
                suppressContentEditableWarning
                className="absolute outline-none px-2"
                style={{
                  bottom: getZoomedSize(margins.bottom * 0.25),
                  left: getZoomedSize(margins.left),
                  right: getZoomedSize(margins.right),
                  height: getZoomedSize(margins.bottom * 0.5),
                  minHeight: '1em',
                  backgroundColor: 'white',
                  zIndex: 2,
                  direction: 'ltr',
                  unicodeBidi: 'plaintext'
                }}
                onInput={(e) => handleFooterChange(e, pageNumber)}
                dir="ltr"
              >
                <div className="flex justify-between items-center h-full">
                  <div>{footers[pageNumber]}</div>
                  <div className="text-gray-500 text-sm">
                    Page {pageNumber} of {pages.length}
                  </div>
                </div>
              </div>
              
              {/* Margin Guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute border border-dashed border-gray-200"
                  style={{
                    top: getZoomedSize(margins.top),
                    left: getZoomedSize(margins.left),
                    right: getZoomedSize(margins.right),
                    bottom: getZoomedSize(margins.bottom),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <ZoomControl zoom={zoom} onZoomChange={setZoom} />
      <PageSettingsMenu />
    </div>
  );
};

export default EditorContent; 

