import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const RulerContext = createContext();

export const useRuler = () => useContext(RulerContext);

export const RulerProvider = ({ children }) => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  
  // A4 dimensions in pixels (96 DPI)
  const INCH_TO_PX = 96;
  const PAGE_WIDTH = 8.27 * INCH_TO_PX;  // 793.92px
  
  // Start with default 1 inch margins
  const [pageMargins, setPageMargins] = useState({
    left: INCH_TO_PX,
    right: INCH_TO_PX,
  });
  
  // Indents are relative to margins
  const [indents, setIndents] = useState({
    left: 0,
    right: 0,
    firstLine: 0,
  });
  
  // Tab stops
  const [tabStops, setTabStops] = useState([]);
  
  // Track dragging operations
  const isDraggingRef = useRef(false);
  const originalStateRef = useRef(null);
  const selectedParagraphsRef = useRef([]);
  
  // Refs to track if initialization has occurred
  const initializedRef = useRef(false);
  const resizeObserverRef = useRef(null);
  
  // Detect and match actual page margins on mount
  useEffect(() => {
    const initializeRulerMargins = () => {
      if (initializedRef.current) return;
      
      // Find content area - crucial for measuring actual margins
      const contentArea = document.querySelector('[data-content-area="true"]');
      if (!contentArea) {
        // Not ready yet, try again in a moment
        setTimeout(initializeRulerMargins, 100);
        return;
      }
      
      // Get computed style to extract actual padding/margins
      const computedStyle = window.getComputedStyle(contentArea);
      
      // Parse actual content area padding (which acts as the page margin)
      const actualLeftPadding = parseFloat(computedStyle.paddingLeft) || INCH_TO_PX;
      const actualRightPadding = parseFloat(computedStyle.paddingRight) || INCH_TO_PX;
      
      // Also check for any left margin on the content area
      const actualLeftMargin = parseFloat(computedStyle.marginLeft) || 0;
      const actualRightMargin = parseFloat(computedStyle.marginRight) || 0;
      
      // Set margins to match what's actually on the page
      console.log("Detected page margins:", { 
        left: actualLeftPadding + actualLeftMargin, 
        right: actualRightPadding + actualRightMargin 
      });
      
      setPageMargins({
        left: actualLeftPadding + actualLeftMargin,
        right: actualRightPadding + actualRightMargin
      });
      
      // Mark as initialized to prevent redundant checks
      initializedRef.current = true;
    };
    
    // Kick off initialization
    initializeRulerMargins();
    
    // Set up resize observer to stay in sync with page dimensions
    const resizeObserver = new ResizeObserver(() => {
      // Reset initialization flag to re-measure if needed
      initializedRef.current = false;
      initializeRulerMargins();
    });
    
    const pageElement = document.querySelector('[data-page="1"]');
    if (pageElement) {
      resizeObserver.observe(pageElement);
    }
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);
  
  // Function to start dragging and save original state
  const startDrag = (markerType) => {
    isDraggingRef.current = true;
    
    // Save current state for undo
    originalStateRef.current = {
      markerType,
      indents: { ...indents },
      margins: { ...pageMargins },
      tabs: [...tabStops]
    };
    
    // Save to history before making changes
    saveHistory(ActionTypes.COMPLETE);
    
    // Find and store selected paragraphs if modifying indents
    if (['leftIndent', 'firstLineIndent', 'rightIndent'].includes(markerType)) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const contentAreas = document.querySelectorAll('[data-content-area="true"]');
        selectedParagraphsRef.current = findParagraphsInSelection(selection, contentAreas);
      }
    }
  };
  
  // Function to end dragging
  const endDrag = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      
      // Save to history after changes
      setTimeout(() => {
        saveHistory(ActionTypes.COMPLETE);
        originalStateRef.current = null;
        selectedParagraphsRef.current = [];
      }, 10);
    }
  };
  
  // Function to update page margins
  const updatePageMargins = (newMargins) => {
    // Only trigger history if not already dragging
    if (!isDraggingRef.current) {
      saveHistory(ActionTypes.COMPLETE);
    }
    
    setPageMargins(prev => {
      const updated = { ...prev, ...newMargins };
      
      // Apply margins to all pages
      applyMarginsToPages(updated);
      
      return updated;
    });
    
    // Save history if not part of a drag
    if (!isDraggingRef.current) {
      setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
    }
  };
  
  // Function to update indents
  const updateIndents = (newIndents) => {
    // Only trigger history if not already dragging
    if (!isDraggingRef.current) {
      saveHistory(ActionTypes.COMPLETE);
    }
    
    setIndents(prev => {
      const updated = { ...prev, ...newIndents };
      
      // Apply indents to selected paragraphs
      applyIndentsToSelection(updated);
      
      return updated;
    });
    
    // Save history if not part of a drag
    if (!isDraggingRef.current) {
      setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
    }
  };
  
  // Function to add a tab stop
  const addTabStop = (position) => {
    // Round to nearest 8px for clean alignment
    const roundedPosition = Math.round(position / 8) * 8;
    
    saveHistory(ActionTypes.COMPLETE);
    
    setTabStops(prev => {
      // Don't add duplicate tab stops
      if (prev.includes(roundedPosition)) return prev;
      
      const newTabs = [...prev, roundedPosition].sort((a, b) => a - b);
      
      // Apply tab stops to all content areas
      applyTabStopsToDocument(newTabs);
      
      return newTabs;
    });
    
    setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
  };
  
  // Function to remove a tab stop
  const removeTabStop = (position) => {
    saveHistory(ActionTypes.COMPLETE);
    
    setTabStops(prev => {
      const newTabs = prev.filter(tab => tab !== position);
      
      // Apply updated tab stops to all content areas
      applyTabStopsToDocument(newTabs);
      
      return newTabs;
    });
    
    setTimeout(() => saveHistory(ActionTypes.COMPLETE), 10);
  };
  
  // Apply margins to all pages
  const applyMarginsToPages = (margins) => {
    const contentAreas = document.querySelectorAll('[data-content-area="true"]');
    const headerAreas = document.querySelectorAll('[data-header-area="true"]');
    const footerAreas = document.querySelectorAll('[data-footer-area="true"]');
    
    // Apply to content areas
    contentAreas.forEach(area => {
      area.style.paddingLeft = `${margins.left}px`;
      area.style.paddingRight = `${margins.right}px`;
      area.style.paddingTop = `${margins.top}px`;
      area.style.paddingBottom = `${margins.bottom}px`;
    });
    
    // Apply to headers
    headerAreas.forEach(area => {
      area.style.left = `${margins.left}px`;
      area.style.right = `${margins.right}px`;
    });
    
    // Apply to footers
    footerAreas.forEach(area => {
      area.style.left = `${margins.left}px`;
      area.style.right = `${margins.right}px`;
    });
    
    // Trigger input events for change detection
    contentAreas.forEach(area => {
      const event = new Event('input', { bubbles: true, cancelable: true });
      area.dispatchEvent(event);
    });
  };
  
  // Apply indents to selected paragraphs
  const applyIndentsToSelection = (indents) => {
    // Use stored paragraphs if we're in a drag operation
    const paragraphsToUpdate = isDraggingRef.current 
      ? selectedParagraphsRef.current 
      : findSelectedParagraphs();
    
    paragraphsToUpdate.forEach(para => {
      // Set the indentation styles
      para.style.marginLeft = `${indents.left}px`;
      para.style.textIndent = `${indents.firstLine}px`;
      para.style.marginRight = `${indents.right}px`;
      
      // Set data attributes for history tracking
      para.setAttribute('data-left-indent', indents.left);
      para.setAttribute('data-first-line-indent', indents.firstLine);
      para.setAttribute('data-right-indent', indents.right);
    });
    
    // Trigger input events for change detection
    if (paragraphsToUpdate.length > 0) {
      const area = findContentArea(paragraphsToUpdate[0]);
      if (area) {
        const event = new Event('input', { bubbles: true, cancelable: true });
        area.dispatchEvent(event);
      }
    }
  };
  
  // Apply tab stops to all content areas
  const applyTabStopsToDocument = (tabs) => {
    // Create a CSS string with all tab stops
    const tabString = tabs.map(pos => `${pos}px`).join(' ');
    
    // Set as CSS custom property on main editor
    const editor = document.querySelector('.editor-content-container');
    if (editor) {
      editor.style.setProperty('--tab-stops', tabString);
    }
    
    // Apply tab stops to each content area
    document.querySelectorAll('[data-content-area="true"]').forEach(area => {
      area.style.tabSize = tabString || "8";
    });
  };
  
  // Find paragraphs in the current selection
  const findSelectedParagraphs = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return [];
    
    const contentAreas = document.querySelectorAll('[data-content-area="true"]');
    return findParagraphsInSelection(selection, contentAreas);
  };
  
  // Helper to find paragraphs in a selection
  const findParagraphsInSelection = (selection, contentAreas) => {
    const paragraphs = [];
    const range = selection.getRangeAt(0);
    
    // If collapsed selection, just get current paragraph
    if (range.collapsed) {
      let node = range.startContainer;
      
      // If text node, get parent
      if (node.nodeType === 3) {
        node = node.parentNode;
      }
      
      // Find paragraph parent
      while (node && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(node.nodeName)) {
        node = node.parentNode;
        if (!node) break;
      }
      
      if (node) {
        paragraphs.push(node);
      }
      
      return paragraphs;
    }
    
    // For expanded selection, find all paragraphs in range
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    // Get to element nodes if text nodes
    if (startNode.nodeType === 3) startNode = startNode.parentNode;
    if (endNode.nodeType === 3) endNode = endNode.parentNode;
    
    // Find the containing paragraphs
    let startPara = startNode;
    while (startPara && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(startPara.nodeName)) {
      startPara = startPara.parentNode;
      if (!startPara) break;
    }
    
    let endPara = endNode;
    while (endPara && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(endPara.nodeName)) {
      endPara = endPara.parentNode;
      if (!endPara) break;
    }
    
    // If we found paragraphs
    if (startPara && endPara) {
      // If same paragraph
      if (startPara === endPara) {
        paragraphs.push(startPara);
      } else {
        // Find content area
        const contentArea = findContentArea(startPara);
        if (contentArea) {
          // Get all paragraphs in the content area
          const allParas = contentArea.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
          let inRange = false;
          
          // Collect paragraphs between start and end
          allParas.forEach(para => {
            if (para === startPara) {
              inRange = true;
            }
            
            if (inRange) {
              paragraphs.push(para);
            }
            
            if (para === endPara) {
              inRange = false;
            }
          });
        }
      }
    }
    
    return paragraphs;
  };
  
  // Find the content area containing an element
  const findContentArea = (element) => {
    let current = element;
    while (current && !current.hasAttribute('data-content-area')) {
      current = current.parentNode;
      if (!current) break;
    }
    return current;
  };
  
  // Save ruler settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('editorPageMargins', JSON.stringify(pageMargins));
    } catch (error) {
      console.error('Error saving page margins:', error);
    }
  }, [pageMargins]);
  
  useEffect(() => {
    try {
      localStorage.setItem('editorTabStops', JSON.stringify(tabStops));
    } catch (error) {
      console.error('Error saving tab stops:', error);
    }
  }, [tabStops]);
  
  // Load saved settings on initialization
  useEffect(() => {
    try {
      // Load margins
      const savedMargins = localStorage.getItem('editorPageMargins');
      if (savedMargins) {
        const parsedMargins = JSON.parse(savedMargins);
        setPageMargins(parsedMargins);
        applyMarginsToPages(parsedMargins);
      }
      
      // Load tab stops
      const savedTabStops = localStorage.getItem('editorTabStops');
      if (savedTabStops) {
        const parsedTabs = JSON.parse(savedTabStops);
        setTabStops(parsedTabs);
        applyTabStopsToDocument(parsedTabs);
      }
    } catch (error) {
      console.error('Error loading ruler settings:', error);
    }
  }, []);
  
  const value = {
    PAGE_WIDTH,
    INCH_TO_PX,
    pageMargins,
    indents,
    tabStops,
    updatePageMargins,
    updateIndents,
    addTabStop,
    removeTabStop,
    startDrag,
    endDrag,
  };
  
  return (
    <RulerContext.Provider value={value}>
      {children}
    </RulerContext.Provider>
  );
};

export default RulerContext; 