import React, { useState, useRef, useEffect } from 'react';
import ZoomControl from '../ZoomControl/ZoomControl';
import DebugSelection from "../DebugSelection";
import { useComments } from '../../context/CommentContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import { IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, FormControl, InputLabel, Typography, Box, Grid, Divider, Tooltip } from '@mui/material';
import { ScreenRotation, FormatSize, ArrowDropDown, Settings } from '@mui/icons-material';

// A4 dimensions in pixels (96 DPI)
const INCH_TO_PX = 96;
const CM_TO_PX = 37.8;
const MM_TO_PX = 3.78;

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

  // Updated Tab handling function to match Google Docs behavior
  const handleTabKey = (e, pageNumber) => {
    e.preventDefault(); // Prevent default tab behavior
    
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    // If we're in a text node, get its parent element
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Find the content area for this editing operation
    const contentArea = findContentArea(container);
    if (!contentArea) return;
    
    // Check if any text is selected - not just a cursor position
    if (!range.collapsed) {
      // Text is selected - indent the entire selection
      const paragraphs = getSelectedParagraphs(range);
      if (paragraphs.length > 0) {
        // Apply indentation to all selected paragraphs
        paragraphs.forEach(para => {
          applyIndentation(para, e.shiftKey ? 'decrease' : 'increase');
        });
        
        // Maintain the selection
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      // No text selected, just cursor placement
      const listItem = getListItem(container);
      
      if (listItem) {
        // Handle list item indentation
        handleListIndentation(listItem, e.shiftKey ? 'decrease' : 'increase');
      } else {
        // In regular text - move just the cursor by inserting a tab space
        // Google Docs uses ~0.5 inch (40px) tab stops
        const tabNode = document.createElement('span');
        tabNode.style.display = 'inline-block';
        tabNode.style.width = '40px'; // 0.5 inch at 96 DPI
        tabNode.style.minWidth = '40px';
        tabNode.className = 'tab-space';
        tabNode.innerHTML = '&nbsp;'; // Prevent tab from collapsing
        
        // Insert the tab at cursor position
        range.insertNode(tabNode);
        
        // Move cursor after the tab
        range.setStartAfter(tabNode);
        range.setEndAfter(tabNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // Update content to ensure changes are saved
    if (contentArea) {
      handleContentChange({ target: contentArea }, pageNumber);
    }
    
    // Save history after making changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
  };

  // Helper function to apply indentation at exactly 0.5 inch (40px) steps
  const applyIndentation = (paragraph, direction) => {
    if (!paragraph) return;
    
    // Get current indentation level from computed style
    const computedStyle = window.getComputedStyle(paragraph);
    const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
    
    // Google Docs uses 0.5 inch (40px) indentation steps at 96 DPI
    const INDENT_STEP = 40; 
    
    if (direction === 'increase') {
      // Increase indentation by one step
      const newMargin = currentMarginLeft + INDENT_STEP;
      paragraph.style.marginLeft = `${newMargin}px`;
    } else if (direction === 'decrease' && currentMarginLeft >= INDENT_STEP) {
      // Decrease indentation, but never below 0
      const newMargin = Math.max(0, currentMarginLeft - INDENT_STEP);
      
      if (newMargin === 0) {
        paragraph.style.removeProperty('margin-left');
      } else {
        paragraph.style.marginLeft = `${newMargin}px`;
      }
    }
  };

  // Function to get all paragraphs in a selection
  const getSelectedParagraphs = (range) => {
    if (range.collapsed) {
      return [];
    }
    
    const paragraphs = [];
    
    // Create a fragment containing the selection
    const fragment = range.cloneContents();
    
    // If selection only contains text nodes, get the paragraph they belong to
    if (fragment.childNodes.length === 0 || 
        (fragment.childNodes.length === 1 && fragment.firstChild.nodeType === Node.TEXT_NODE)) {
      const paragraph = findParagraphNode(range.commonAncestorContainer);
      if (paragraph) {
        paragraphs.push(paragraph);
      }
      return paragraphs;
    }
    
    // For selections spanning multiple elements
    const container = range.commonAncestorContainer;
    
    // Create a document fragment to work with
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // Find all paragraph-like elements in the selection
    const blockElements = tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
    
    if (blockElements.length > 0) {
      // Get all actual paragraphs that contain these elements in the document
      blockElements.forEach(el => {
        // Find the actual paragraph in the document that contains this selection
        let paragraphInDoc;
        
        if (container.nodeType === Node.ELEMENT_NODE) {
          // Try to find a matching element with the same content
          const similar = container.querySelectorAll(el.nodeName);
          for (let i = 0; i < similar.length; i++) {
            if (similar[i].textContent.includes(el.textContent)) {
              paragraphInDoc = similar[i];
              break;
            }
          }
        }
        
        // If we found a match and it's not already in our list
        if (paragraphInDoc && !paragraphs.includes(paragraphInDoc)) {
          paragraphs.push(paragraphInDoc);
        }
      });
    } else {
      // Fallback - get the containing paragraph
      const paragraph = findParagraphNode(container);
      if (paragraph) {
        paragraphs.push(paragraph);
      }
    }
    
    return paragraphs;
  };

  // Helper function to find paragraph node
  const findParagraphNode = (node) => {
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      // Check if it's a block-level element
      const display = window.getComputedStyle(node).display;
      if (display === 'block' || 
          node.nodeName === 'P' || 
          node.nodeName === 'DIV' || 
          node.nodeName === 'H1' || 
          node.nodeName === 'H2' || 
          node.nodeName === 'H3' || 
          node.nodeName === 'H4' || 
          node.nodeName === 'H5' || 
          node.nodeName === 'H6') {
        return node;
      }
      node = node.parentNode;
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

  // Updated function for indentation buttons
  const handleIndent = (direction, pageNumber) => {
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const originalRange = range.cloneRange(); // Save for later restoration
    
    // Check if any text is selected
    if (!range.collapsed) {
      // Text is selected - handle multiple paragraphs
      const paragraphs = getSelectedParagraphs(range);
      paragraphs.forEach(para => {
        applyIndentation(para, direction);
      });
    } else {
      // Just cursor placement - handle current paragraph
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      const paragraph = findParagraphNode(container);
      if (paragraph) {
        applyIndentation(paragraph, direction);
      }
    }
    
    // Make sure changes are saved
    const contentArea = findContentArea(range.commonAncestorContainer);
    if (contentArea) {
      handleContentChange({ target: contentArea }, pageNumber);
    }
    
    // Restore the selection
    selection.removeAllRanges();
    selection.addRange(originalRange);
    
    // Save history after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
  };

  // Helper function to find the content area containing a node
  const findContentArea = (node) => {
    while (node) {
      if (node.hasAttribute && node.hasAttribute('data-page')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  // Helper function for list indentation
  const handleListIndentation = (listItem, direction) => {
    if (direction === 'increase') {
      // Find previous list item to nest under
      const prevItem = listItem.previousElementSibling;
      if (!prevItem) return; // Can't nest if it's the first item
      
      // Check if previous item already has a sublist
      let subList = null;
      for (const child of prevItem.children) {
        if (child.nodeName === 'UL' || child.nodeName === 'OL') {
          subList = child;
          break;
        }
      }
      
      // If no sublist exists, create one
      if (!subList) {
        // Match the list type of the parent
        const parentList = listItem.parentNode;
        subList = document.createElement(parentList.nodeName);
        prevItem.appendChild(subList);
      }
      
      // Move this item to the sublist
      subList.appendChild(listItem);
      
      // Update list style if needed
      updateListStyles(subList);
    } else if (direction === 'decrease') {
      // Check if we're in a nested list
      const parentList = listItem.parentNode;
      const grandParentListItem = parentList.parentNode;
      
      if (grandParentListItem && grandParentListItem.nodeName === 'LI') {
        // Move this item after the parent list item
        const greatGrandParentList = grandParentListItem.parentNode;
        greatGrandParentList.insertBefore(listItem, grandParentListItem.nextSibling);
        
        // If sublist is now empty, remove it
        if (parentList.children.length === 0) {
          grandParentListItem.removeChild(parentList);
        }
        
        // Update list styles
        updateListStyles(greatGrandParentList);
      }
    }
  };

  // Update list styles based on nesting level
  const updateListStyles = (list) => {
    // Get nesting level
    let level = 0;
    let parent = list.parentNode;
    while (parent) {
      if (parent.nodeName === 'UL' || parent.nodeName === 'OL') {
        level++;
      }
      parent = parent.parentNode;
    }
    
    // Set appropriate bullet or number style based on level
    const items = list.querySelectorAll('li');
    items.forEach(item => {
      if (list.nodeName === 'UL') {
        // For bullet lists
        switch (level % 3) {
          case 0:
            item.style.listStyleType = 'disc';
            break;
          case 1:
            item.style.listStyleType = 'circle';
            break;
          case 2:
            item.style.listStyleType = 'square';
            break;
        }
      } else if (list.nodeName === 'OL') {
        // For numbered lists
        switch (level % 3) {
          case 0:
            item.style.listStyleType = 'decimal';
            break;
          case 1:
            item.style.listStyleType = 'lower-alpha';
            break;
          case 2:
            item.style.listStyleType = 'lower-roman';
            break;
        }
      }
    });
  };

  // Updated backspace handler for tabs and indentation
  const handleBackspaceIndent = (e, node) => {
    // Find the paragraph containing the cursor
    const paragraph = findParagraphNode(node);
    if (!paragraph) return false;
    
    // Get the selection
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    
    // Check if selection is at the start of the paragraph
    // This is tricky - we need to check if we're at position 0 of the first text node
    const textNodes = Array.from(paragraph.childNodes).filter(n => 
      n.nodeType === Node.TEXT_NODE || 
      (n.nodeType === Node.ELEMENT_NODE && n.nodeName !== 'BR')
    );
    
    const firstTextNode = textNodes[0];
    const isAtStart = range.startContainer === firstTextNode && range.startOffset === 0;
    
    // If cursor isn't at the start of paragraph, let default backspace handle it
    if (!isAtStart && range.startContainer !== paragraph) return false;
    
    // Check for indentation
    const computedStyle = window.getComputedStyle(paragraph);
    const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
    
    // If there's indentation, remove one level first (Google Docs behavior)
    if (currentMarginLeft > 0) {
      e.preventDefault(); // Prevent default backspace
      
      // Save history before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      const INDENT_STEP = 40; // 0.5 inch at 96 DPI
      const newMargin = Math.max(0, currentMarginLeft - INDENT_STEP);
      
      if (newMargin === 0) {
        paragraph.style.removeProperty('margin-left');
      } else {
        paragraph.style.marginLeft = `${newMargin}px`;
      }
      
      // Update the content
      const contentArea = findContentArea(paragraph);
      if (contentArea) {
        const pageNumber = parseInt(contentArea.getAttribute('data-page')) || 1;
        handleContentChange({ target: contentArea }, pageNumber);
      }
      
      // Save history after changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
      
      return true; // Indicate we handled the backspace
    }
    
    // If no indentation, let default backspace behavior happen
    return false;
  };

  // Update the key handling to include our new backspace indentation behavior
  const handleKeyDown = (e, pageNumber) => {
    // First check if we're in a list
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Check for list item
    const listItem = getListItem(container);
    if (listItem) {
      if (handleListSpecialKeys(e, listItem)) {
        return;
      }
    }
    
    // Check for table cell
    const tableCell = findParentWithTag(container, 'TD');
    if (tableCell && (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey))) {
      e.preventDefault();
      if (e.key === 'Tab') {
        moveToNextTableCell(tableCell, e.shiftKey);
      }
      return;
    }
    
    // Handle Tab key for indentation and cursor movement
    if (e.key === 'Tab') {
      handleTabKey(e, pageNumber);
      return;
    }
    
    // Handle Backspace - first check if we're at the start of an indented paragraph
    if (e.key === 'Backspace' && range.collapsed) {
      if (handleBackspaceIndent(e, container)) {
        return;
      }
    }
    
    // Handle Enter key to maintain indentation
    if (e.key === 'Enter' && !e.shiftKey) {
      handleEnterKey(e, pageNumber);
      // Don't return here, let the default Enter handle basic paragraph creation
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

  const handleListSpecialKeys = (e, listItem) => {
    if (!listItem) return false;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    
    // ENTER KEY HANDLING - Exactly like Google Docs
    if (e.key === 'Enter' && !e.shiftKey) {
      // Save history before change
      saveHistory(ActionTypes.COMPLETE);
      
      // Check if list item is empty
      if (listItem.textContent.trim() === '') {
        e.preventDefault();
        
        // Get the parent list
        const parentList = listItem.parentNode;
        const parentLi = parentList.parentNode;
        const isNested = parentLi && parentLi.nodeName === 'LI';
        
        if (isNested) {
          // In nested list, move up a level (Google Docs behavior)
          const grandparentList = parentLi.parentNode;
          
          // Create a new list item
          const newLi = document.createElement('li');
          newLi.innerHTML = '\u200B'; // Zero-width space
          
          // Insert after parent list item
          if (parentLi.nextSibling) {
            grandparentList.insertBefore(newLi, parentLi.nextSibling);
          } else {
            grandparentList.appendChild(newLi);
          }
          
          // Remove the empty list item
          parentList.removeChild(listItem);
          
          // If this was the last item, remove empty list
          if (parentList.childNodes.length === 0) {
            parentLi.removeChild(parentList);
          }
          
          // Set cursor in the new list item
          const newRange = document.createRange();
          const textNode = newLi.firstChild || newLi;
          newRange.setStart(textNode, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Save history after change
          setTimeout(() => {
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
        } else {
          // Convert to paragraph (exit list) - exactly like Google Docs
          const p = document.createElement('p');
          p.innerHTML = '\u200B'; // Zero-width space
          
          // Insert after list - Google Docs behavior
          if (parentList.nextSibling) {
            parentList.parentNode.insertBefore(p, parentList.nextSibling);
          } else {
            parentList.parentNode.appendChild(p);
          }
          
          // Remove list item
          parentList.removeChild(listItem);
          
          // If list is now empty, remove it
          if (parentList.childNodes.length === 0) {
            parentList.parentNode.removeChild(parentList);
          }
          
          // Set cursor in the new paragraph
          setTimeout(() => {
            const newRange = document.createRange();
            const textNode = p.firstChild || p;
            newRange.setStart(textNode, 0);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // Save history after change
            saveHistory(ActionTypes.COMPLETE);
          }, 0);
        }
      }
    }
    
    // BACKSPACE KEY HANDLING - Exactly like Google Docs
    if (e.key === 'Backspace' && range.collapsed) {
      // Check if list item is empty (just the bullet)
      if (listItem.textContent.trim() === '') {
        e.preventDefault();
        
        // Save history before change
        saveHistory(ActionTypes.COMPLETE);
        
        const parentList = listItem.parentNode;
        
        // IMPORTANT: Get the position of the list item in the document
        // before removing it, so we can place our paragraph in the exact same spot
        const listItemRect = listItem.getBoundingClientRect();
        
        // Create a replacement paragraph at the exact position where the list item was
        const p = document.createElement('p');
        p.innerHTML = '\u200B'; // Zero-width space for cursor position
        p.style.margin = '0'; // Match Google Docs margins
        p.style.padding = '0';
        p.style.minHeight = '1.5em'; // Ensure the paragraph has height
        
        // Insert the paragraph BEFORE removing the list item
        parentList.insertBefore(p, listItem);
        parentList.removeChild(listItem);
        
        // If list is now empty, remove it but keep the paragraph
        if (parentList.childNodes.length === 0) {
          parentList.parentNode.removeChild(parentList);
        }
        
        // Force a layout recalculation to ensure the paragraph stays
        void p.offsetHeight;
        
        // Set cursor in the new paragraph
        setTimeout(() => {
          try {
            const newRange = document.createRange();
            const textNode = p.firstChild || p;
            newRange.setStart(textNode, 0);
            newRange.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // Focus the paragraph
            p.focus();
            
            // Save history after change
            saveHistory(ActionTypes.COMPLETE);
          } catch (error) {
            console.error('Error setting cursor position:', error);
          }
        }, 0);
        
        return true;
      }
      
      // Handle regular Backspace at start of non-empty list item...
      // [rest of existing backspace code]
    }
    
    return false;
  };

  // Update handleSpecialKeys to handle Enter key indentation inheritance
  const handleSpecialKeys = (e, pageNumber) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      handleTabKey(e, pageNumber);
      return;
    }
    
    // Handle Enter key with indentation inheritance
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (!range.collapsed) return; // Let default behavior handle selections
      
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      // Find the current paragraph
      const paragraph = findParagraphNode(container);
      if (!paragraph) return;
      
      // Get current indentation
      const style = window.getComputedStyle(paragraph);
      const currentIndent = style.marginLeft;
      
      if (currentIndent && currentIndent !== '0px') {
        // Let browser handle Enter key first
        setTimeout(() => {
          // Now find the new paragraph
          const newSelection = window.getSelection();
          if (!newSelection.rangeCount) return;
          
          const newRange = newSelection.getRangeAt(0);
          let newContainer = newRange.commonAncestorContainer;
          if (newContainer.nodeType === Node.TEXT_NODE) {
            newContainer = newContainer.parentNode;
          }
          
          const newParagraph = findParagraphNode(newContainer);
          
          if (newParagraph && newParagraph !== paragraph) {
            // Apply the same indentation to the new paragraph
            newParagraph.style.marginLeft = currentIndent;
            
            // Update content
            const contentArea = findContentArea(newParagraph);
            if (contentArea) {
              handleContentChange({ target: contentArea }, pageNumber);
            }
          }
        }, 0);
      }
    }
    
    // Handle backspace at start of paragraph or indentation
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (!range.collapsed) return; // Let default behavior handle selections
      
      if (range.startOffset === 0) {
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
          container = container.parentNode;
        }
        
        // Check if this is at the start of an indented paragraph
        if (handleBackspaceIndent(e, container)) {
          return; // Handled by our custom function
        }
        
        // Current page handling for joining pages
        if (pageNumber > 1) {
          // Existing code for joining pages...
        }
      }
    }
    
    // Handle Delete key to join lines
    if (e.key === 'Delete') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (!range.collapsed) return; // Let default behavior handle selections
      
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
        
        // Check if we're at the end of a text node (will join with next line)
        if (range.startOffset === container.textContent.length) {
          // Save history before changes
          saveHistory(ActionTypes.COMPLETE);
          
          // Let default behavior happen, then save history again
          setTimeout(() => {
            saveHistory(ActionTypes.COMPLETE);
          }, 10);
        }
      }
    }
    
    // Continue with other special key handling (keep existing code)
    // ...
  };

  useEffect(() => {
    // Add styles for hyperlinks
    const style = document.createElement('style');
    style.textContent = `
      .editor-hyperlink {
        color: #0563c1 !important;
        text-decoration: underline !important;
        cursor: pointer !important;
      }
      .editor-hyperlink:visited {
        color: #954f72 !important; /* Purple color for visited links */
      }
      
      /* Add some styles for the hyperlink tooltip container */
      #hyperlink-tooltip-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        z-index: 10000;
        pointer-events: none;
      }
      #hyperlink-tooltip-container > * {
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Add keyboard shortcuts for indentation
    const handleGlobalKeydown = (e) => {
      // Ctrl+] for increase indent
      if (e.ctrlKey && e.key === ']') {
        e.preventDefault();
        handleToolbarIndent('increase');
      }
      
      // Ctrl+[ for decrease indent
      if (e.ctrlKey && e.key === '[') {
        e.preventDefault();
        handleToolbarIndent('decrease');
      }
      
      // Ctrl+Z for undo is handled by the EditorHistoryContext
      // Ctrl+Y for redo is handled by the EditorHistoryContext
      
      // Rest of your keyboard shortcuts...
    };
    
    document.addEventListener('keydown', handleGlobalKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, []);

  // Add these handler functions BEFORE the PageSettingsButton and PageSettingsMenu components

  const handleOrientationChange = (newOrientation) => {
    // Save history before change
    saveHistory(ActionTypes.COMPLETE);
    
    // Update orientation state
    setPageOrientations(prev => ({
      ...prev,
      [selectedPage]: newOrientation
    }));
    
    // Immediately update the page visually
    setTimeout(() => {
      const pageElement = document.querySelector(`[data-page="${selectedPage}"]`);
      if (pageElement) {
        const currentPageSize = pageSizes[selectedPage] || DEFAULT_PAGE_SIZE.name;
        let width, height;
        
        if (currentPageSize === 'CUSTOM') {
          const customSize = customPageSizes[selectedPage] || {
            width: DEFAULT_PAGE_SIZE.width,
            height: DEFAULT_PAGE_SIZE.height
          };
          width = customSize.width;
          height = customSize.height;
        } else {
          const dimensions = PAGE_SIZES[currentPageSize] || DEFAULT_PAGE_SIZE;
          width = dimensions.width;
          height = dimensions.height;
        }
        
        // Swap width and height for landscape
        if (newOrientation === 'landscape') {
          [width, height] = [height, width];
        }
        
        // Apply dimensions to the page
        pageElement.style.width = getZoomedSize(width);
        pageElement.style.height = getZoomedSize(height);
        
        // Force layout recalculation
        void pageElement.offsetHeight;
        
        // Update content to fit new dimensions
        const contentArea = pageElement.querySelector('[data-content-area="true"]');
        if (contentArea) {
          contentArea.style.width = getZoomedSize(width - margins.left - margins.right);
          handleContentChange({ target: contentArea }, selectedPage);
        }
      }
    }, 0);
    
    // Save history after change
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 100);
  };

  // ADD THIS MISSING FUNCTION
  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    setTempPageSize(newSize);
    
    // Update custom dimensions to match the selected preset
    if (newSize !== 'CUSTOM') {
      const dimensions = PAGE_SIZES[newSize] || DEFAULT_PAGE_SIZE;
      setTempCustomWidth(dimensions.width / INCH_TO_PX);
      setTempCustomHeight(dimensions.height / INCH_TO_PX);
    }
  };

  const handleCustomSizeChange = (dimension, value) => {
    if (dimension === 'width') {
      setTempCustomWidth(value);
    } else {
      setTempCustomHeight(value);
    }
    // If changing custom dimensions, make sure we're set to CUSTOM
    setTempPageSize('CUSTOM');
  };

  const handleUnitChange = (event) => {
    const newUnit = event.target.value;
    const oldUnit = tempUnit;
    let conversionFactor = 1;
    
    // Convert dimensions based on unit change
    if (oldUnit === 'in' && newUnit === 'cm') {
      conversionFactor = 2.54;
    } else if (oldUnit === 'in' && newUnit === 'mm') {
      conversionFactor = 25.4;
    } else if (oldUnit === 'cm' && newUnit === 'in') {
      conversionFactor = 1/2.54;
    } else if (oldUnit === 'cm' && newUnit === 'mm') {
      conversionFactor = 10;
    } else if (oldUnit === 'mm' && newUnit === 'in') {
      conversionFactor = 1/25.4;
    } else if (oldUnit === 'mm' && newUnit === 'cm') {
      conversionFactor = 0.1;
    }
    
    setTempCustomWidth(prev => prev * conversionFactor);
    setTempCustomHeight(prev => prev * conversionFactor);
    setTempUnit(newUnit);
  };

  // Page settings dialog functions
  const handlePageSettingsClick = (e, pageNumber) => {
    setSelectedPage(pageNumber);
    setPageSettingsAnchorEl(e.currentTarget);
    
    // Initialize temp values based on current page settings
    const orientation = pageOrientations[pageNumber] || DEFAULT_ORIENTATION;
    const pageSize = pageSizes[pageNumber] || DEFAULT_PAGE_SIZE.name;
    setTempOrientation(orientation);
    setTempPageSize(pageSize);
    
    if (pageSize === 'CUSTOM') {
      const customSize = customPageSizes[pageNumber] || {
        width: DEFAULT_PAGE_SIZE.width,
        height: DEFAULT_PAGE_SIZE.height
      };
      setTempCustomWidth(customSize.width / INCH_TO_PX);
      setTempCustomHeight(customSize.height / INCH_TO_PX);
    } else {
      const dimensions = PAGE_SIZES[pageSize] || DEFAULT_PAGE_SIZE;
      setTempCustomWidth(dimensions.width / INCH_TO_PX);
      setTempCustomHeight(dimensions.height / INCH_TO_PX);
    }
  };

  const handlePageSettingsClose = () => {
    setPageSettingsAnchorEl(null);
  };

  const handleOpenPageSettingsDialog = () => {
    setPageSettingsDialogOpen(true);
    handlePageSettingsClose();
  };

  const handleClosePageSettingsDialog = (event) => {
    // Only close if explicitly closed via buttons, not by clicking outside
    if (event && event.target && event.target.getAttribute('role') === 'presentation') {
      // Clicked outside, but don't close if we're interacting with inputs
      const activeElement = document.activeElement;
      if (activeElement && 
          (activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'SELECT' ||
           activeElement.tagName === 'BUTTON')) {
        return;
      }
    }
    
    setPageSettingsDialogOpen(false);
  };

  const applyPageSettings = () => {
    // Save history before changes
    saveHistory(ActionTypes.COMPLETE);
    
    // Calculate dimensions in pixels
    let widthInPx = tempCustomWidth;
    let heightInPx = tempCustomHeight;
    
    if (tempUnit === 'in') {
      widthInPx *= INCH_TO_PX;
      heightInPx *= INCH_TO_PX;
    } else if (tempUnit === 'cm') {
      widthInPx *= CM_TO_PX;
      heightInPx *= CM_TO_PX;
    } else if (tempUnit === 'mm') {
      widthInPx *= MM_TO_PX;
      heightInPx *= MM_TO_PX;
    }
    
    // Update orientation
    setPageOrientations(prev => ({
      ...prev,
      [selectedPage]: tempOrientation
    }));
    
    // Update page size
    setPageSizes(prev => ({
      ...prev,
      [selectedPage]: tempPageSize
    }));
    
    // Update custom dimensions if needed
    if (tempPageSize === 'CUSTOM') {
      setCustomPageSizes(prev => ({
        ...prev,
        [selectedPage]: { width: widthInPx, height: heightInPx }
      }));
    }
    
    // Force immediate re-render of the affected page
    setTimeout(() => {
      const pageElement = document.querySelector(`[data-page="${selectedPage}"]`);
      if (pageElement) {
        // Force a layout recalculation
        void pageElement.offsetHeight;
        
        // Update the page dimensions
        let { width, height } = tempOrientation === 'landscape' && tempPageSize !== 'CUSTOM' 
          ? { width: heightInPx, height: widthInPx }
          : { width: widthInPx, height: heightInPx };
          
        pageElement.style.width = getZoomedSize(width);
        pageElement.style.height = getZoomedSize(height);
        
        // Also update content area to match new dimensions
        const contentArea = pageElement.querySelector('[data-content-area="true"]');
        if (contentArea) {
          // Adjust content area based on new dimensions
          contentArea.style.width = getZoomedSize(width - margins.left - margins.right);
          handleContentChange({ target: contentArea }, selectedPage);
        }
      }
    }, 0);
    
    // Close dialog
    setPageSettingsDialogOpen(false);
    
    // Save history after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 100); // Slight delay to make sure all DOM changes are complete
  };

  // Now define the UI components that use these handlers
  const PageSettingsButton = ({ pageNumber }) => {
    return (
      <Tooltip title="Page setup">
        <IconButton
          size="small"
          onClick={(e) => handlePageSettingsClick(e, pageNumber)}
          sx={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #e0e0e0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            zIndex: 5,
            padding: '4px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
            }
          }}
        >
          <Settings sx={{ fontSize: '16px' }} />
        </IconButton>
      </Tooltip>
    );
  };

  const PageSettingsMenu = () => (
    <>
      <Menu
        anchorEl={pageSettingsAnchorEl}
        open={Boolean(pageSettingsAnchorEl)}
        onClose={handlePageSettingsClose}
      >
        <MenuItem onClick={() => handleOrientationChange('portrait')}>
          Portrait Orientation
        </MenuItem>
        <MenuItem onClick={() => handleOrientationChange('landscape')}>
          Landscape Orientation
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleOpenPageSettingsDialog}>
          Page Setup...
        </MenuItem>
      </Menu>
      
      <Dialog
        open={pageSettingsDialogOpen}
        onClose={handleClosePageSettingsDialog}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Page Setup</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Orientation</Typography>
                <Box sx={{ display: 'flex', mt: 1 }}>
                  <Button
                    variant={tempOrientation === 'portrait' ? 'contained' : 'outlined'}
                    onClick={() => setTempOrientation('portrait')}
                    sx={{ mr: 1, minWidth: '100px' }}
                  >
                    Portrait
                  </Button>
                  <Button
                    variant={tempOrientation === 'landscape' ? 'contained' : 'outlined'}
                    onClick={() => setTempOrientation('landscape')}
                    sx={{ minWidth: '100px' }}
                  >
                    Landscape
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Page Size</Typography>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <Select
                    value={tempPageSize}
                    onChange={handlePageSizeChange}
                  >
                    <MenuItem value="LETTER">Letter (8.5" x 11")</MenuItem>
                    <MenuItem value="A4">A4 (8.27" x 11.69")</MenuItem>
                    <MenuItem value="LEGAL">Legal (8.5" x 14")</MenuItem>
                    <MenuItem value="TABLOID">Tabloid (11" x 17")</MenuItem>
                    <MenuItem value="CUSTOM">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {tempPageSize === 'CUSTOM' && (
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Custom Page Size</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TextField
                      label="Width"
                      type="number"
                      value={tempCustomWidth}
                      onChange={(e) => handleCustomSizeChange('width', parseFloat(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      inputProps={{ step: 0.1, min: 3, max: 48 }}
                      sx={{ mr: 1, width: '120px' }}
                    />
                    <Typography sx={{ mx: 1 }}>×</Typography>
                    <TextField
                      label="Height"
                      type="number"
                      value={tempCustomHeight}
                      onChange={(e) => handleCustomSizeChange('height', parseFloat(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      inputProps={{ step: 0.1, min: 3, max: 48 }}
                      sx={{ mr: 1, width: '120px' }}
                    />
                    <FormControl sx={{ width: '80px' }}>
                      <Select
                        value={tempUnit}
                        onChange={handleUnitChange}
                      >
                        <MenuItem value="in">in</MenuItem>
                        <MenuItem value="cm">cm</MenuItem>
                        <MenuItem value="mm">mm</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePageSettingsDialog}>Cancel</Button>
          <Button onClick={applyPageSettings} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // Add this function to properly expose the indentation functionality to toolbar buttons
  const handleToolbarIndent = (direction) => {
    // Save history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Find the containing page
    const contentArea = findContentArea(container);
    if (!contentArea) return;
    
    const pageNumber = parseInt(contentArea.getAttribute('data-page')) || 1;
    
    // If text is selected, indent all selected paragraphs
    if (!range.collapsed) {
      const paragraphs = getSelectedParagraphs(range);
      if (paragraphs.length > 0) {
        paragraphs.forEach(para => {
          applyIndentation(para, direction);
        });
      }
    } else {
      // Just cursor - indent current paragraph
      const paragraph = findParagraphNode(container);
      if (paragraph) {
        applyIndentation(paragraph, direction);
      }
    }
    
    // Update content
    handleContentChange({ target: contentArea }, pageNumber);
    
    // Save history after changes
    setTimeout(() => {
      saveHistory(ActionTypes.COMPLETE);
    }, 10);
  };

  useEffect(() => {
    // Expose indentation functions to the window so toolbar buttons can access them
    // This is a cleaner approach than using global variables
    
    // Create a custom event for indentation
    const triggerIndent = (direction) => {
      const event = new CustomEvent('editor-indent', { 
        detail: { direction }
      });
      document.dispatchEvent(event);
    };
    
    // Listen for indentation events from toolbar buttons
    const handleIndentEvent = (e) => {
      const { direction } = e.detail;
      handleToolbarIndent(direction);
    };
    
    document.addEventListener('editor-indent', handleIndentEvent);
    
    // Clean up event listener
    return () => {
      document.removeEventListener('editor-indent', handleIndentEvent);
    };
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .tab-space {
        display: inline-block;
        width: 40px;
        min-width: 40px;
      }
      
      [data-content-area="true"] p,
      [data-content-area="true"] div,
      [data-content-area="true"] h1,
      [data-content-area="true"] h2,
      [data-content-area="true"] h3,
      [data-content-area="true"] h4,
      [data-content-area="true"] h5,
      [data-content-area="true"] h6,
      [data-content-area="true"] li {
        transition: margin-left 0.05s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    // This function will handle indentation events from the toolbar
    const handleIndentEvent = (e) => {
      if (!e || !e.detail) return;
      
      const { direction } = e.detail;
      
      // Save history before changes
      saveHistory(ActionTypes.COMPLETE);
      
      // Get the current selection
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      
      // Find the page number
      let pageNumber = 1;
      let element = container;
      while (element) {
        if (element.hasAttribute && element.hasAttribute('data-page')) {
          pageNumber = parseInt(element.getAttribute('data-page'));
          break;
        }
        element = element.parentNode;
      }
      
      // Apply indentation
      handleIndent(direction, pageNumber);
      
      // Save history after changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
      }, 10);
    };
    
    // Add event listener
    document.addEventListener('editor-indent', handleIndentEvent);
    
    // Clean up
    return () => {
      document.removeEventListener('editor-indent', handleIndentEvent);
    };
  }, []);

  useEffect(() => {
    // Apply CSS to fix tab character display
    document.querySelectorAll('.page-content').forEach(element => {
      element.style.tabSize = '0';
      element.style.MozTabSize = '0';
    });
  }, [pages]);

  // Add this to handleSpecialKeys function where you handle Enter key
  const handleEnterKey = (e, pageNumber) => {
    if (e.key !== 'Enter' || e.shiftKey) return false; // Only handle plain Enter key
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false; // Let default handle non-collapsed selections
    
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // Find the current paragraph
    const paragraph = findParagraphNode(container);
    if (!paragraph) return false;
    
    // Get current indentation
    const style = window.getComputedStyle(paragraph);
    const currentIndent = style.marginLeft;
    
    if (currentIndent && currentIndent !== '0px') {
      // Let browser handle Enter key first
      setTimeout(() => {
        // Now find the new paragraph
        const newSelection = window.getSelection();
        if (!newSelection.rangeCount) return;
        
        const newRange = newSelection.getRangeAt(0);
        let newContainer = newRange.commonAncestorContainer;
        if (newContainer.nodeType === Node.TEXT_NODE) {
          newContainer = newContainer.parentNode;
        }
        
        const newParagraph = findParagraphNode(newContainer);
        
        if (newParagraph && newParagraph !== paragraph) {
          // Apply the same indentation to the new paragraph
          newParagraph.style.marginLeft = currentIndent;
          
          // Update content
          const contentArea = findContentArea(newParagraph);
          if (contentArea) {
            handleContentChange({ target: contentArea }, pageNumber);
          }
        }
      }, 0);
    }
    
    return false; // Allow default Enter key behavior
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] p-8">
      <div className="flex flex-col items-center gap-2">
        {pages.map(pageNumber => {
          // Get dimensions for this specific page
          const { width, height } = getPageDimensions(pageNumber);
          
          return (
            <div
              key={pageNumber}
              data-page={pageNumber}
              className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] rounded-sm transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              style={{
                width: getZoomedSize(width),
                height: getZoomedSize(height),
                position: 'relative',
                backgroundColor: 'white',
                margin: '10px',
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

              {/* Content Area */}
              <div
                ref={el => contentRefs.current[pageNumber] = el}
                contentEditable
                suppressContentEditableWarning
                className="absolute outline-none px-2"
                data-content-area="true"
                data-page={pageNumber}
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
                  // Handle all special keys, including Tab
                  handleSpecialKeys(e, pageNumber);
                  // Also handle backspace at start of page
                  handleKeyDown(e, pageNumber);
                }}
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

