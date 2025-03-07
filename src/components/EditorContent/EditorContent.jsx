import React, { useState, useRef, useEffect } from 'react';
import ZoomControl from '../ZoomControl/ZoomControl';
import DebugSelection from "../DebugSelection";
import { useComments } from '../../context/CommentContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Select, 
  FormControl, 
  InputLabel, 
  Typography, 
  Box, 
  Grid, 
  Divider, 
  Tooltip, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
import { 
  Settings, 
  CropPortrait, 
  ViewArray, 
  ScreenRotation, 
  FormatSize, 
  ArrowDropDown 
} from '@mui/icons-material';

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
        handleListIndentation(listItem, e.shiftKey ? 'outdent' : 'indent');
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
    if (!listItem) return false;
    
    // Save before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    if (direction === 'indent') {
      // Can't indent first item
      const prevLi = listItem.previousElementSibling;
      if (!prevLi) return false;
      
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
      
      // Update styles based on new nesting level
      updateListStyles(sublist);
      
      // Save after changes
      saveHistory(ActionTypes.COMPLETE);
      return true;
    } else if (direction === 'outdent') {
      // Can't outdent if not nested
      const parentList = listItem.parentNode;
      if (!parentList) return false;
      
      const grandparent = parentList.parentNode;
      if (!grandparent || grandparent.nodeName !== 'LI') return false;
      
      const greatGrandparentList = grandparent.parentNode;
      if (!greatGrandparentList) return false;
      
      // Move this item after its grandparent
      if (grandparent.nextSibling) {
        greatGrandparentList.insertBefore(listItem, grandparent.nextSibling);
      } else {
        greatGrandparentList.appendChild(listItem);
      }
      
      // If parent list is now empty, remove it
      if (parentList.children.length === 0) {
        grandparent.removeChild(parentList);
      }
      
      // Update styles for all affected lists
      updateListStyles(greatGrandparentList);
      
      // Save after changes
      saveHistory(ActionTypes.COMPLETE);
      return true;
    }
    
    return false;
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
      // This is handled elsewhere, so no specific code needed here
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
    if (!list || (list.nodeName !== 'UL' && list.nodeName !== 'OL')) return;
    
    // Recursively process the list and all nested lists
    const processListRecursively = (listElement, level = 1) => {
      if (!listElement) return;
      
      // Set data-list-level attribute on the list
      listElement.setAttribute('data-list-level', level);
      
      // Process each list item
      Array.from(listElement.children).forEach(li => {
        if (li.nodeName !== 'LI') return;
        
        // Set data-list-level attribute on the list item
        li.setAttribute('data-list-level', level);
        
        // Set appropriate bullet style based on level
        if (listElement.nodeName === 'UL') {
          // Check if this list has a manually chosen style
          const customStyle = listElement.getAttribute('data-bullet-style');
          
          if (customStyle) {
            // Use the manually selected style (keeps user selection)
            if (customStyle === 'triangle') {
              listElement.style.listStyleType = 'disclosure-closed';
              listElement.classList.add('triangle-bullets');
            } else {
              listElement.style.listStyleType = customStyle;
              listElement.classList.remove('triangle-bullets');
            }
          } else {
            // No manual selection - apply default Google Docs style for this level
            listElement.classList.remove('triangle-bullets');
            
            switch (level % 4) {
              case 1: // Level 1
                listElement.style.listStyleType = 'disc';
                break;
              case 2: // Level 2
                listElement.style.listStyleType = 'circle';
                break;
              case 3: // Level 3
                listElement.style.listStyleType = 'square';
                break;
              case 0: // Level 4
                listElement.style.listStyleType = 'disclosure-closed';
                listElement.classList.add('triangle-bullets');
                break;
            }
          }
        } else if (listElement.nodeName === 'OL') {
          // Handle numbered list styles at different levels
          const customStyle = listElement.getAttribute('data-number-style');
          
          if (customStyle) {
            listElement.style.listStyleType = customStyle;
          } else {
            switch (level % 5) {
              case 1:
                listElement.style.listStyleType = 'decimal';
                break;
              case 2:
                listElement.style.listStyleType = 'lower-alpha';
                break;
              case 3:
                listElement.style.listStyleType = 'lower-roman';
                break;
              case 4:
                listElement.style.listStyleType = 'upper-alpha';
                break;
              case 0:
                listElement.style.listStyleType = 'upper-roman';
                break;
            }
          }
        }
        
        // Find nested lists within this li and process them
        const nestedLists = li.querySelectorAll(':scope > ul, :scope > ol');
        nestedLists.forEach(nestedList => {
          processListRecursively(nestedList, level + 1);
        });
      });
    };
    
    processListRecursively(list);
    
    // Also find the root list to update all levels in hierarchy
    const rootList = findRootList(list);
    if (rootList && rootList !== list) {
      processListRecursively(rootList, 1);
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

