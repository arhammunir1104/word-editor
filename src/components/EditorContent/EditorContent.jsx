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

  // Fully enhanced Google Docs-like Tab/Shift+Tab handling
  const handleTabKey = (e, pageNumber) => {
    // CRITICAL: Stop all default and propagation to prevent focus switching
    e.preventDefault(); 
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log(`Tab key handler: ${e.shiftKey ? 'Shift+Tab' : 'Tab'} on page ${pageNumber}`);
    
    // Save history state before changes (for undo/redo)
    saveHistory(ActionTypes.COMPLETE);
    
    // Determine indent direction: Tab = increase, Shift+Tab = decrease
    const direction = e.shiftKey ? 'decrease' : 'increase';
    
    // Get selection and preserve it
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const originalRange = range.cloneRange(); // Essential for restoring selection
    
    // Store the original start and end points for reliable restoration
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;
    
    // Get container and content area
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    const contentArea = findContentArea(container);
    if (!contentArea) return;
    
    // Track if any changes were made to decide whether to save history
    let anyChangesApplied = false;
    
    // Special handling for Shift+Tab (decrease indentation)
    if (e.shiftKey) {
      console.log('Processing Shift+Tab - special decrease indent handling');
      
      // Find the paragraph containing the selection
      const paragraph = findParagraphNode(container);
      if (paragraph) {
        console.log('Found paragraph for Shift+Tab:', paragraph);
        
        // Get computed style to check current indentation
        const computedStyle = window.getComputedStyle(paragraph);
        const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
        const indentLevel = Math.round(currentMarginLeft / 40); // 40px = 0.5 inch
        
        console.log(`Current indent level: ${indentLevel}, margin-left: ${currentMarginLeft}px`);
        
        if (indentLevel > 0) {
          // Calculate new indentation one level back
          const newLevel = indentLevel - 1;
          const newMargin = newLevel * 40;
          
          console.log(`Decreasing indent to level ${newLevel} (${newMargin}px)`);
          
          // Apply the new margin directly
          paragraph.style.marginLeft = `${newMargin}px`;
          
          // Also update indent level attribute
          if (newLevel === 0) {
            paragraph.removeAttribute('data-indent-level');
          } else {
            paragraph.setAttribute('data-indent-level', newLevel.toString());
          }
          
          // Visual feedback
          paragraph.style.backgroundColor = 'rgba(232, 240, 254, 0.3)';
          
          setTimeout(() => {
            paragraph.style.transition = 'background-color 0.3s ease-out';
            paragraph.style.backgroundColor = '';
            
            setTimeout(() => {
              paragraph.style.transition = '';
            }, 300);
          }, 150);
          
          anyChangesApplied = true;
          
          // Update content
          handleContentChange({ target: contentArea }, pageNumber);
          
          // Restore selection
          try {
            selection.removeAllRanges();
            selection.addRange(originalRange);
          } catch (error) {
            console.error('Error restoring selection after Shift+Tab:', error);
          }
          
          // Save history
          setTimeout(() => {
            saveHistory(ActionTypes.COMPLETE);
          }, 10);
          
          return; // Handled Shift+Tab successfully
        } else {
          console.log('No indentation to decrease with Shift+Tab');
        }
      }
    }
    
    // Special case: Table cell navigation
    const tableCell = findParentWithTag(container, 'TD');
    if (tableCell) {
      moveToNextTableCell(tableCell, e.shiftKey);
      return;
    }
    
    // Special case: List indentation
    const listItem = getListItem(container);
    if (listItem) {
      const success = handleListIndentation(listItem, e.shiftKey ? 'outdent' : 'indent');
      if (success) anyChangesApplied = true;
      
      // Always try to restore selection
      try {
        selection.removeAllRanges();
        selection.addRange(originalRange);
      } catch (error) {
        console.error('Error restoring selection after list indentation:', error);
      }
      
      // If we successfully processed a list item, stop here
      if (success) {
        // Save history after changes
        if (anyChangesApplied) {
          window._pendingHistorySave = requestAnimationFrame(() => {
            saveHistory(ActionTypes.COMPLETE);
          });
        }
        return;
      }
    }
    
    console.log(`Tab key (${direction}) processing paragraph indentation...`);
    
    // For normal Tab and other fallback cases, use the enhanced indentation system
    const result = handleIndent(direction, pageNumber);
    
    // If handleIndent was successful, it handled restoring the selection
    // and saving history, so we can stop here
    if (result) return;
    
    // Fallback for when no paragraph is found but there's a text selection
    if (!range.collapsed && !e.shiftKey) {
      // For Tab with text selection but no identified paragraph,
      // try to wrap the selection in a paragraph and indent it
      try {
        // Create a temporary paragraph to hold the selection content
        const span = document.createElement('span');
        span.appendChild(range.extractContents());
        
        // Insert the temporary span
        range.insertNode(span);
        
        // Apply indentation to the span
        applyIndentation(span, direction);
        anyChangesApplied = true;
        
        // Restore selection as best we can
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
      } catch (error) {
        console.error('Error handling tab with text selection:', error);
        
        // Last resort: try to restore original selection
        try {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        } catch (restoreError) {
          console.error('Failed to restore selection after tab error:', restoreError);
        }
      }
    } 
    // Fallback when no paragraph found: just insert tab spacing
    else if (!e.shiftKey) { // Only for Tab, not Shift+Tab
      document.execCommand('insertHTML', false, '&emsp;');
      anyChangesApplied = true;
    }
    
    // Update content to reflect changes
    if (anyChangesApplied) {
      handleContentChange({ target: contentArea }, pageNumber);
      
      // Save history after changes for undo/redo
      // Use requestAnimationFrame for better performance and to allow cancellation
      window._pendingHistorySave = requestAnimationFrame(() => {
        saveHistory(ActionTypes.COMPLETE);
      });
    }
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

  // Enhanced paragraph indentation with perfect Google Docs behavior
  const applyIndentation = (paragraph, direction) => {
    if (!paragraph) return false;
    
    try {
      console.log(`Applying ${direction} indentation to:`, paragraph);
      
      // Get content area and page number for content updates
      const contentArea = findContentArea(paragraph);
      const pageNumber = contentArea ? parseInt(contentArea.getAttribute('data-page') || '1') : 1;
      
      // Get current indentation from computed style
      const computedStyle = window.getComputedStyle(paragraph);
      const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
      
      console.log(`Current margin-left: ${currentMarginLeft}px`);
      
      // Google Docs indentation step (0.5 inch = 40px at 96 DPI)
      const INDENT_STEP = 40; 
      const MAX_INDENT_LEVEL = 10; // Prevent excessive indentation
      
      // For tracking what indent level we're at
      let currentIndentLevel = Math.round(currentMarginLeft / INDENT_STEP);
      if (currentIndentLevel < 0) currentIndentLevel = 0;
      if (currentIndentLevel > MAX_INDENT_LEVEL) currentIndentLevel = MAX_INDENT_LEVEL;
      
      console.log(`Current indent level: ${currentIndentLevel}`);
      
      // Track if any changes were made
      let indentationChanged = false;
      
      // Special handling for span elements (often used for selections)
      // If it's a span, we might need to convert to a div for proper indentation
      if (paragraph.tagName === 'SPAN' && !paragraph.getAttribute('data-indent-level')) {
        console.log('Processing span element for indentation');
        
        // If this is a span inside a paragraph, apply to the parent paragraph instead
        const parentParagraph = findParagraphNode(paragraph.parentNode);
        if (parentParagraph && parentParagraph !== paragraph) {
          console.log('Found parent paragraph, applying indentation to parent instead');
          return applyIndentation(parentParagraph, direction);
        }
        
        // If this is a standalone span, convert to a div if needed
        if (!paragraph.style.display || paragraph.style.display === 'inline') {
          console.log('Converting inline span to block element for indentation');
          paragraph.style.display = 'block';
        }
      }
      
      // DIRECT DOM MANIPULATION - This is more reliable than using style properties
      // especially for cases where previous style manipulation might have issues
      
      // Increase indentation
      if (direction === 'increase') {
        // Check if we're at max indent level
        if (currentIndentLevel >= MAX_INDENT_LEVEL) {
          console.log('Already at maximum indent level');
          return false;
        }
        
        // Calculate new indentation - always one step at a time
        const newLevel = currentIndentLevel + 1;
        const newMargin = newLevel * INDENT_STEP;
        
        console.log(`Increasing indent from level ${currentIndentLevel} to ${newLevel} (${newMargin}px)`);
        
        // Better handling of existing styles by directly setting cssText
        const existingStyles = paragraph.style.cssText || '';
        
        // Create a clean version without any margin-left or transition properties
        const cleanedStyles = existingStyles
          .replace(/margin-left\s*:[^;]+;?/gi, '')
          .replace(/transition\s*:[^;]+;?/gi, '');
        
        // Apply indentation with animation
        paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}margin-left: ${newMargin}px; transition: margin-left 0.15s ease-out;`;
        
        // Also set the marginLeft property directly for better browser support
        paragraph.style.marginLeft = `${newMargin}px`;
        
        // Store indentation level for future reference
        paragraph.setAttribute('data-indent-level', newLevel.toString());
        indentationChanged = true;
        
        // Clean up transition after animation completes
        setTimeout(() => {
          const currentStyles = paragraph.style.cssText || '';
          paragraph.style.cssText = currentStyles.replace(/transition\s*:[^;]+;?/gi, '');
          
          // Ensure marginLeft is still applied
          paragraph.style.marginLeft = `${newMargin}px`;
        }, 200);
        
        return true;
      } 
      // Decrease indentation
      else if (direction === 'decrease') {
        // Only apply decrease if we have a positive indent level
        if (currentIndentLevel <= 0) {
          console.log('Already at minimum indent level');
          return false;
        }
        
        // Calculate new indentation - always one step at a time
        const newLevel = currentIndentLevel - 1;
        const newMargin = newLevel * INDENT_STEP;
        
        console.log(`Decreasing indent from level ${currentIndentLevel} to ${newLevel} (${newMargin}px)`);
        
        // Better handling of existing styles
        const existingStyles = paragraph.style.cssText || '';
        
        // Create a clean version without any margin-left or transition properties
        const cleanedStyles = existingStyles
          .replace(/margin-left\s*:[^;]+;?/gi, '')
          .replace(/transition\s*:[^;]+;?/gi, '');
        
        // Apply with smooth animation
        if (newMargin === 0) {
          console.log('Removing all indentation');
          // Remove indentation completely but preserve other styles
          paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}margin-left: 0px; transition: margin-left 0.15s ease-out;`;
          paragraph.style.marginLeft = '0px'; // Explicitly set to 0
          paragraph.removeAttribute('data-indent-level');
        } else {
          console.log(`Decreasing indent to: ${newMargin}px`);
          // Apply reduced indentation
          paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}margin-left: ${newMargin}px; transition: margin-left 0.15s ease-out;`;
          paragraph.style.marginLeft = `${newMargin}px`; // Explicitly set
          
          // Set the data-indent-level attribute to the new level
          paragraph.setAttribute('data-indent-level', newLevel.toString());
        }
        
        indentationChanged = true;
        
        // Clean up transition
        setTimeout(() => {
          const currentStyles = paragraph.style.cssText || '';
          paragraph.style.cssText = currentStyles.replace(/transition\s*:[^;]+;?/gi, '');
          
          // Ensure marginLeft is still properly applied
          paragraph.style.marginLeft = `${newMargin}px`;
        }, 200);
        
        return true;
      }
      
      // If indentation changed, update content and provide visual feedback
      if (indentationChanged && contentArea) {
        // Add subtle highlight effect for visual feedback (like Google Docs)
        // Store original style properties before adding highlight
        const currentStyles = paragraph.style.cssText || '';
        
        // Add highlighting via direct style manipulation for reliability
        paragraph.style.cssText = `${currentStyles}${currentStyles ? '; ' : ''}background-color: rgba(232, 240, 254, 0.3);`;
        
        setTimeout(() => {
          // Fade out highlight
          const styles = paragraph.style.cssText || '';
          // Clean background color specifically without affecting other styles
          const cleanedStyles = styles.replace(/background-color\s*:[^;]+;?/gi, '');
          paragraph.style.cssText = `${cleanedStyles}${cleanedStyles ? '; ' : ''}transition: background-color 0.3s ease-out;`;
          
          setTimeout(() => {
            const finalStyles = paragraph.style.cssText || '';
            paragraph.style.cssText = finalStyles.replace(/transition\s*:[^;]+;?/gi, '');
          }, 350);
        }, 150);
        
        // Dispatch event to ensure content is saved
        const inputEvent = new Event('input', { bubbles: true });
        contentArea.dispatchEvent(inputEvent);
        handleContentChange({ target: contentArea }, pageNumber);
        
        return true;
      }
      
      return indentationChanged;
    } catch (error) {
      console.error('Error applying indentation:', error);
      return false;
    }
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

  // Helper function to find the content area containing a node
  const findContentArea = (node) => {
    while (node) {
      if (node.hasAttribute && node.hasAttribute('data-page')) {
        return node;
      }
      node = node.parentNode;
    }
    return document.querySelector('[data-content-area="true"]');
  };

  // Helper function to get the current page number based on selection or active element
  const getCurrentPageNumber = () => {
    // First try to get page from current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const contentArea = findContentArea(range.commonAncestorContainer);
      if (contentArea) {
        return parseInt(contentArea.getAttribute('data-page')) || 1;
      }
    }
    
    // If no selection, try to get from active element
    if (document.activeElement) {
      const contentArea = findContentArea(document.activeElement);
      if (contentArea) {
        return parseInt(contentArea.getAttribute('data-page')) || 1;
      }
    }
    
    // Default to first page if nothing else works
    const firstContentArea = document.querySelector('[data-content-area="true"]');
    if (firstContentArea) {
      return parseInt(firstContentArea.getAttribute('data-page')) || 1;
    }
    
    return 1; // Default to page 1
  };

  // Enhanced list indentation with proper hierarchy and style changes
  const handleListIndentation = (listItem, direction) => {
    if (!listItem) return false;
    
    // Save before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const parentList = listItem.parentNode;
    if (!parentList) return false;
    
    if (direction === 'indent') {
      // Can't indent first item in a list (Google Docs behavior)
      const prevLi = listItem.previousElementSibling;
      if (!prevLi) return false;
      
      // Find or create a sublist in the previous item
      let sublist = Array.from(prevLi.children).find(child => 
        child.nodeName === parentList.nodeName // Keep same list type (UL or OL)
      );
      
      if (!sublist) {
        // Create same type of list as parent
        sublist = document.createElement(parentList.nodeName);
        prevLi.appendChild(sublist);
      }
      
      // Determine current nesting level
      let level = 1;
      let currentParent = parentList;
      while (currentParent.parentNode && currentParent.parentNode.nodeName === 'LI') {
        level++;
        currentParent = currentParent.parentNode.parentNode;
      }
      
      // Move this item to the sublist
      sublist.appendChild(listItem);
      
      // Apply appropriate styles based on nesting level
      if (sublist.nodeName === 'UL') {
        // Bullet styles cycle: disc → circle → square → disc
        const bulletStyles = ['disc', 'circle', 'square'];
        const styleIndex = level % bulletStyles.length;
        sublist.style.listStyleType = bulletStyles[styleIndex];
      } else if (sublist.nodeName === 'OL') {
        // Number styles cycle: decimal → lower-alpha → lower-roman → decimal
        const numberStyles = ['decimal', 'lower-alpha', 'lower-roman'];
        const styleIndex = level % numberStyles.length;
        sublist.style.listStyleType = numberStyles[styleIndex];
      }
      
      // Update all numbering for ordered lists
      if (parentList.nodeName === 'OL') {
        // Force browser to recalculate numbering by toggling display
        const originalDisplay = parentList.style.display;
        parentList.style.display = 'none';
        setTimeout(() => {
          parentList.style.display = originalDisplay;
        }, 10);
      }
      
      // Google Docs-like animation and visual feedback
      listItem.style.transition = 'margin-left 0.15s ease-out, background-color 0.2s ease-out';
      listItem.style.backgroundColor = 'rgba(232, 240, 254, 0.3)';
      
      setTimeout(() => {
        listItem.style.backgroundColor = '';
        setTimeout(() => {
          listItem.style.transition = '';
        }, 200);
      }, 150);
      
      // Update styles for the entire list hierarchy
      updateListStyles(findRootList(sublist));
      
      // Save after changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
      
      return true;
    } else if (direction === 'outdent') {
      // Can't outdent if not nested
      const grandparent = parentList.parentNode;
      if (!grandparent || grandparent.nodeName !== 'LI') return false;
      
      const greatGrandparentList = grandparent.parentNode;
      if (!greatGrandparentList) return false;
      
      // Apply visual feedback before moving
      listItem.style.transition = 'margin-left 0.15s ease-out, background-color 0.2s ease-out';
      listItem.style.backgroundColor = 'rgba(232, 240, 254, 0.3)';
      
      // Move this item after its grandparent (Google Docs behavior)
      if (grandparent.nextSibling) {
        greatGrandparentList.insertBefore(listItem, grandparent.nextSibling);
      } else {
        greatGrandparentList.appendChild(listItem);
      }
      
      // If parent list is now empty, remove it
      if (parentList.children.length === 0) {
        grandparent.removeChild(parentList);
      }
      
      // Update styles based on new nesting level
      let level = 0;
      let currentParent = greatGrandparentList;
      while (currentParent.parentNode && currentParent.parentNode.nodeName === 'LI') {
        level++;
        currentParent = currentParent.parentNode.parentNode;
      }
      
      // Apply appropriate list style based on level
      if (greatGrandparentList.nodeName === 'UL') {
        // Bullet styles: disc → circle → square → disc
        const bulletStyles = ['disc', 'circle', 'square'];
        const styleIndex = level % bulletStyles.length;
        // Apply to the list item's marker
        listItem.style.listStyleType = bulletStyles[styleIndex];
      } else if (greatGrandparentList.nodeName === 'OL') {
        // Number styles: decimal → lower-alpha → lower-roman → decimal
        const numberStyles = ['decimal', 'lower-alpha', 'lower-roman'];
        const styleIndex = level % numberStyles.length;
        // Apply to the list item's marker
        listItem.style.listStyleType = numberStyles[styleIndex];
      }
      
      // Update numbering for ordered lists
      if (greatGrandparentList.nodeName === 'OL') {
        // Force browser to recalculate numbering by toggling display
        const originalDisplay = greatGrandparentList.style.display;
        greatGrandparentList.style.display = 'none';
        setTimeout(() => {
          greatGrandparentList.style.display = originalDisplay;
        }, 10);
      }
      
      // Fade out highlight
      setTimeout(() => {
        listItem.style.backgroundColor = '';
        setTimeout(() => {
          listItem.style.transition = '';
        }, 200);
      }, 150);
      
      // Update styles for all affected lists
      updateListStyles(greatGrandparentList);
      
      // Save after changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
      
      return true;
    }
    
    return false;
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
    
    // Check if we're in a list
    const listItemNode = findParentWithTag(range.startContainer, 'LI');
    if (!listItemNode) return false;
    
    return handleListSpecialKeys(e, listItemNode);
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
          
          // Use our enhanced Tab handler as fallback
          handleTabKey(e, focusedPageNumber);
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

