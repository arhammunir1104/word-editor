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

  // Handle content changes and pagination
  const handleContentChange = (e, pageNumber) => {
    const currentRef = contentRefs.current[pageNumber];
    if (!currentRef) return;

    // Get dimensions for this specific page
    const { width, height } = getPageDimensions(pageNumber);
    const maxHeight = (height - margins.top - margins.bottom) * (zoom / 100);
    
    // Create temp div for accurate measurement
    const temp = document.createElement('div');
    temp.style.cssText = window.getComputedStyle(currentRef).cssText;
    temp.style.width = `${(width - margins.left - margins.right) * (zoom / 100)}px`;
    temp.style.height = 'auto';
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.wordWrap = 'break-word';
    temp.innerHTML = e.target.innerHTML;
    document.body.appendChild(temp);

    const contentHeight = temp.scrollHeight;

    if (contentHeight > maxHeight) {
      const content = e.target.innerHTML;
      const words = content.split(/(<[^>]*>|\s+)/);
      let firstPart = '';
      let currentHeight = 0;
      
      // Find split point
      for (let i = 0; i < words.length; i++) {
        temp.innerHTML = firstPart + words[i];
        currentHeight = temp.scrollHeight;
        
        if (currentHeight > maxHeight) {
          break;
        }
        firstPart += words[i];
      }

      const secondPart = content.slice(firstPart.length);
      document.body.removeChild(temp);

      // Update current page
      setPageContents(prev => ({
        ...prev,
        [pageNumber]: firstPart
      }));

      // Handle next page
      if (secondPart.trim()) {
        // Add new page - make sure to inherit page settings
        if (!pages.includes(pageNumber + 1)) {
          setPages(prev => [...prev, pageNumber + 1]);
          
          // Copy current page's orientation and size to the new page
          setPageOrientations(prev => ({
            ...prev,
            [pageNumber + 1]: pageOrientations[pageNumber] || DEFAULT_ORIENTATION
          }));
          
          setPageSizes(prev => ({
            ...prev,
            [pageNumber + 1]: pageSizes[pageNumber] || DEFAULT_PAGE_SIZE.name
          }));
          
          if (pageSizes[pageNumber] === 'CUSTOM') {
            setCustomPageSizes(prev => ({
              ...prev,
              [pageNumber + 1]: customPageSizes[pageNumber] || {
                width: DEFAULT_PAGE_SIZE.width, 
                height: DEFAULT_PAGE_SIZE.height
              }
            }));
          }
        }

        // Update next page content
        setTimeout(() => {
          setPageContents(prev => ({
            ...prev,
            [pageNumber + 1]: secondPart
          }));

          // Check if next page needs pagination
          const nextRef = contentRefs.current[pageNumber + 1];
          if (nextRef && nextRef.scrollHeight > maxHeight) {
            handleContentChange({ target: { innerHTML: secondPart } }, pageNumber + 1);
          }
        }, 0);
      }
    } else {
      document.body.removeChild(temp);
      setPageContents(prev => ({
        ...prev,
        [pageNumber]: e.target.innerHTML,
      }));
    }
  };

  // Handle backspace at start of page
  const handleKeyDown = (e, pageNumber) => {
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      // Check if cursor is at start of content
      if (range.startOffset === 0 && pageNumber > 1) {
        e.preventDefault();
        
        // Save history before merging pages
        saveHistory(ActionTypes.COMPLETE);
        
        const currentContent = pageContents[pageNumber] || '';
        const prevContent = pageContents[pageNumber - 1] || '';
        
        // Merge with previous page
        setPageContents(prev => ({
          ...prev,
          [pageNumber - 1]: prevContent + currentContent,
          [pageNumber]: ''
        }));
        
        // Remove empty page and its settings
        setPages(prev => prev.filter(p => p !== pageNumber));
        
        // Remove this page's settings
        setPageOrientations(prev => {
          const newOrientations = {...prev};
          delete newOrientations[pageNumber];
          return newOrientations;
        });
        
        setPageSizes(prev => {
          const newSizes = {...prev};
          delete newSizes[pageNumber];
          return newSizes;
        });
        
        setCustomPageSizes(prev => {
          const newCustomSizes = {...prev};
          delete newCustomSizes[pageNumber];
          return newCustomSizes;
        });
        
        // Focus previous page
        setTimeout(() => {
          const prevPage = contentRefs.current[pageNumber - 1];
          if (prevPage) {
            prevPage.focus();
            const range = document.createRange();
            range.setStart(prevPage, prevContent.length);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Save history after merge complete
            saveHistory(ActionTypes.COMPLETE);
          }
        }, 0);
      }
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
    const { saveHistory, ActionTypes } = useEditorHistory();
    
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

  const handleSpecialKeys = (e, pageNumber) => {
    // Find if we're in a list item
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    // Find if we're in a list
    let listItem = null;
    let current = container;
    while (current) {
      if (current.nodeName === 'LI') {
        listItem = current;
        break;
      }
      if (current.nodeName === 'BODY' || current.hasAttribute && current.hasAttribute('data-content-area')) {
        break;
      }
      current = current.parentNode;
    }
    
    // Handle list-specific key events
    if (listItem && handleListSpecialKeys(e, listItem)) {
      return;
    }
    
    // Rest of your existing code for handleSpecialKeys...
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
    // ... existing event listeners
    
    const handleListShortcuts = (e) => {
      // Ctrl+Shift+8 for bullet list
      if (e.ctrlKey && e.shiftKey && e.key === '8') {
        e.preventDefault();
        // Find the ListControls component and trigger bullet list
        const bulletButtons = document.querySelectorAll('[data-list-control="bullet"]');
        if (bulletButtons.length > 0) {
          bulletButtons[0].click();
        } else {
          // Fallback if button not found
          document.execCommand('insertUnorderedList');
        }
      }
      
      // Ctrl+Shift+7 for numbered list
      if (e.ctrlKey && e.shiftKey && e.key === '7') {
        e.preventDefault();
        // Find the ListControls component and trigger numbered list
        const numberButtons = document.querySelectorAll('[data-list-control="number"]');
        if (numberButtons.length > 0) {
          numberButtons[0].click();
        } else {
          // Fallback if button not found
          document.execCommand('insertOrderedList');
        }
      }
    };
    
    document.addEventListener('keydown', handleListShortcuts);
    
    return () => {
      // ... existing cleanup
      document.removeEventListener('keydown', handleListShortcuts);
    };
  }, []);

  // Add this useEffect to ensure lists are styled correctly after changes
  useEffect(() => {
    // Create a MutationObserver to watch for list changes
    const contentObserver = new MutationObserver((mutations) => {
      // Find lists that might need styling updates
      let listsToUpdate = new Set();
      
      mutations.forEach(mutation => {
        // If nodes were added or removed
        if (mutation.type === 'childList') {
          // Check if the mutation affects a list
          const targetList = mutation.target.closest('ul, ol');
          if (targetList) {
            listsToUpdate.add(targetList);
            
            // Also add any parent lists to ensure proper nesting
            let parent = targetList.parentNode;
            while (parent) {
              const parentList = parent.closest('ul, ol');
              if (parentList) {
                listsToUpdate.add(parentList);
                parent = parentList.parentNode;
              } else {
                break;
              }
            }
          }
          
          // Also check added nodes
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.nodeName === 'UL' || node.nodeName === 'OL') {
                listsToUpdate.add(node);
              } else {
                const lists = node.querySelectorAll('ul, ol');
                lists.forEach(list => listsToUpdate.add(list));
              }
            }
          });
        }
      });
      
      // Find all lists in the document to ensure all are updated
      if (listsToUpdate.size > 0) {
        document.querySelectorAll('ul, ol').forEach(list => {
          listsToUpdate.add(list);
        });
      }
      
      // Update all affected lists
      listsToUpdate.forEach(list => {
        // First find the root list for this list hierarchy
        let rootList = list;
        let parent = list.parentNode;
        while (parent) {
          if (parent.nodeName === 'LI') {
            const parentList = parent.closest('ul, ol');
            if (parentList) {
              rootList = parentList;
              parent = parentList.parentNode;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        
        // Now process the entire list hierarchy from root
        const processListRecursively = (listElement, level = 1) => {
          if (!listElement) return;
          
          // Set data attribute on the list
          listElement.setAttribute('data-list-level', level);
          console.log(`Setting list level ${level} for ${listElement.nodeName}`);
          
          // Process all list items
          Array.from(listElement.children).forEach(item => {
            if (item.nodeName === 'LI') {
              // Set level attribute on the list item
              item.setAttribute('data-list-level', level);
              
              // Find nested lists and process with incremented level
              Array.from(item.children).forEach(child => {
                if (child.nodeName === 'UL' || child.nodeName === 'OL') {
                  processListRecursively(child, level + 1);
                }
              });
            }
          });
        };
        
        // Process from the root list
        processListRecursively(rootList, 1);
      });
    });
    
    // Connect the observer to all editable areas
    Object.values(contentRefs.current).forEach(ref => {
      if (ref) {
        contentObserver.observe(ref, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    });
    
    return () => {
      contentObserver.disconnect();
    };
  }, [contentRefs.current]);

  // Add this to the useEffect that sets up styles
  useEffect(() => {
    // Add styles for lists with different nesting levels
    const style = document.createElement('style');
    style.textContent = `
      /* Google Docs-style bullets at different list levels */
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
        list-style-type: circle !important;
        font-size: 0.9em !important;
      }
      
      ul[data-list-level="5"] > li {
        list-style-type: square !important;
        font-size: 0.9em !important;
      }
      
      /* Number styles for different levels - exactly like Google Docs */
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
      
      /* Proper indentation matching Google Docs */
      ul, ol {
        padding-left: 24px !important;
        margin: 0 !important;
      }
      
      /* Empty list items should still show bullets */
      li:empty::before {
        content: "\\200B"; /* Zero-width space */
        display: inline;
      }
      
      /* Make sure list bullets align properly */
      li {
        position: relative;
        padding: 0;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update the custom bullet styles useEffect to work with the level-based styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Custom bullet styles - these override level-based styles */
      ul[data-bullet-style="disc"] > li {
        list-style-type: disc !important;
      }
      ul[data-bullet-style="circle"] > li {
        list-style-type: circle !important;
      }
      ul[data-bullet-style="square"] > li {
        list-style-type: square !important;
      }
      
      /* Number styles */
      ol[data-number-style="decimal"] > li {
        list-style-type: decimal !important;
      }
      ol[data-number-style="lower-alpha"] > li {
        list-style-type: lower-alpha !important;
      }
      ol[data-number-style="lower-roman"] > li {
        list-style-type: lower-roman !important;
      }
      ol[data-number-style="upper-alpha"] > li {
        list-style-type: upper-alpha !important;
      }
      ol[data-number-style="upper-roman"] > li {
        list-style-type: upper-roman !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handlers for page settings
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

  // Add page settings button to the page component
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

  // Add these components to the JSX returned by EditorContent
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

  // Inside the EditorContent component, listen for page settings changes
  useEffect(() => {
    const handleOrientationChange = (e) => {
      if (e.detail) {
        const { pageNumber, orientation } = e.detail;
        setPageOrientations(prev => ({
          ...prev,
          [pageNumber]: orientation
        }));
        
        // Force content repagination
        const contentRef = contentRefs.current[pageNumber];
        if (contentRef) {
          handleContentChange({ target: contentRef }, pageNumber);
        }
      }
    };
    
    const handlePageSizeChange = (e) => {
      if (e.detail) {
        const { pageNumber, pageSize } = e.detail;
        setPageSizes(prev => ({
          ...prev,
          [pageNumber]: pageSize
        }));
        
        // Force content repagination
        const contentRef = contentRefs.current[pageNumber];
        if (contentRef) {
          handleContentChange({ target: contentRef }, pageNumber);
        }
      }
    };
    
    const handleCustomSizeChange = (e) => {
      if (e.detail) {
        const { pageNumber, width, height } = e.detail;
        setCustomPageSizes(prev => ({
          ...prev,
          [pageNumber]: { width, height }
        }));
        
        // Force content repagination
        const contentRef = contentRefs.current[pageNumber];
        if (contentRef) {
          handleContentChange({ target: contentRef }, pageNumber);
        }
      }
    };
    
    document.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('pagesizechange', handlePageSizeChange);
    document.addEventListener('customsizechange', handleCustomSizeChange);
    
    return () => {
      document.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('pagesizechange', handlePageSizeChange);
      document.removeEventListener('customsizechange', handleCustomSizeChange);
    };
  }, []);

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
                onKeyDown={(e) => handleSpecialKeys(e, pageNumber)}
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

