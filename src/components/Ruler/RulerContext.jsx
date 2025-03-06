import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const RulerContext = createContext();

export const useRuler = () => useContext(RulerContext);

export const RulerProvider = ({ children }) => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  
  // A4 dimensions in pixels (96 DPI)
  const INCH_TO_PX = 96;
  const PAGE_WIDTH = 8.27 * INCH_TO_PX;  // 793.92px
  
  // Define margins with a single source of truth
  const [pageMargins, setPageMargins] = useState({
    left: INCH_TO_PX,
    right: INCH_TO_PX,
  });
  
  // Indents are always relative to the margins
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
  
  // Crucial function to measure the EXACT text start position
  const measureExactTextPosition = () => {
    if (initializedRef.current) return;
    
    // Find content area with text
    const contentArea = document.querySelector('[data-content-area="true"]');
    if (!contentArea) {
      setTimeout(measureExactTextPosition, 100);
      return;
    }
    
    // Store reference for later updates
    resizeObserverRef.current = new ResizeObserver(() => {
      // Reset initialization to re-measure on resize
      if (initializedRef.current) {
        initializedRef.current = false;
        measureExactTextPosition();
      }
    });
    
    resizeObserverRef.current.observe(contentArea);
    
    initializedRef.current = true;
  };
  
  // Initialize on mount and monitor for changes
  useEffect(() => {
    // Wait a moment for the DOM to fully render
    setTimeout(measureExactTextPosition, 200);
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
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
    // Update state first
    setPageMargins(prev => ({
      ...prev,
      ...newMargins
    }));
    
    // Apply to all content areas - this is our single source of truth
    const contentAreas = document.querySelectorAll('[data-content-area="true"]');
    contentAreas.forEach(area => {
      if (newMargins.left !== undefined) {
        area.style.paddingLeft = `${newMargins.left}px`;
      }
      
      if (newMargins.right !== undefined) {
        area.style.paddingRight = `${newMargins.right}px`;
      }
    });
  };
  
  // Function to update indents
  const updateIndents = (newIndents) => {
    setIndents(prev => ({
      ...prev,
      ...newIndents
    }));
    
    // Find affected paragraphs in selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let startNode = range.startContainer;
    
    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentNode;
    }
    
    // Find content area
    let contentArea = null;
    let current = startNode;
    while (current) {
      if (current.hasAttribute && current.hasAttribute('data-content-area')) {
        contentArea = current;
        break;
      }
      current = current.parentNode;
    }
    
    if (!contentArea) return;
    
    // Find paragraphs to update
    const paragraphs = [];
    
    // If cursor only, apply to current paragraph
    if (range.collapsed) {
      let paragraph = startNode;
      
      // Find closest paragraph
      while (paragraph && paragraph !== contentArea) {
        if (paragraph.nodeName === 'P' || 
            (paragraph.nodeName === 'DIV' && !paragraph.hasAttribute('data-content-area'))) {
          paragraphs.push(paragraph);
          break;
        }
        paragraph = paragraph.parentNode;
      }
      
      // If no paragraph, target content area or create one
      if (paragraphs.length === 0) {
        // Look for any block element
        const blockElements = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'];
        let blockElement = startNode;
        
        while (blockElement && !blockElements.includes(blockElement.nodeName) && blockElement !== contentArea) {
          blockElement = blockElement.parentNode;
        }
        
        if (blockElement && blockElement !== contentArea) {
          paragraphs.push(blockElement);
        } else {
          // Use content area as fallback
          paragraphs.push(contentArea);
        }
      }
    } else {
      // For selection spanning multiple nodes, get all paragraphs
      const walker = document.createTreeWalker(
        contentArea,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            if (node.nodeName === 'P' || 
                (node.nodeName === 'DIV' && !node.hasAttribute('data-content-area'))) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        paragraphs.push(node);
      }
    }
    
    // Apply indent changes to each paragraph
    paragraphs.forEach(para => {
      if (newIndents.left !== undefined) {
        para.style.marginLeft = `${newIndents.left}px`;
        para.dataset.leftIndent = newIndents.left;
      }
      
      if (newIndents.right !== undefined) {
        para.style.marginRight = `${newIndents.right}px`;
        para.dataset.rightIndent = newIndents.right;
      }
      
      if (newIndents.firstLine !== undefined) {
        para.style.textIndent = `${newIndents.firstLine}px`;
        para.dataset.firstLineIndent = newIndents.firstLine;
      }
    });
  };
  
  // Function to add a tab stop
  const addTabStop = (position) => {
    if (!tabStops.includes(position)) {
      setTabStops(prev => [...prev, position].sort((a, b) => a - b));
      saveHistory(ActionTypes.COMPLETE);
    }
  };
  
  // Function to remove a tab stop
  const removeTabStop = (position) => {
    setTabStops(prev => prev.filter(pos => pos !== position));
    saveHistory(ActionTypes.COMPLETE);
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
    measureExactTextPosition
  };
  
  return (
    <RulerContext.Provider value={value}>
      {children}
    </RulerContext.Provider>
  );
};

export default RulerContext; 