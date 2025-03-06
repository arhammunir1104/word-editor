import React, { useState, useRef, useEffect } from 'react';
import ZoomControl from '../ZoomControl/ZoomControl';
import DebugSelection from "../DebugSelection";
import { useComments } from '../../context/CommentContext';
import { Ruler, RulerProvider } from '../Ruler';

// A4 dimensions in pixels (96 DPI)
const INCH_TO_PX = 96;
const PAGE_WIDTH = 8.27 * INCH_TO_PX;  // 793.92px
const PAGE_HEIGHT = 11.69 * INCH_TO_PX; // 1122.24px

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
  
  const contentRefs = useRef({});
  const headerRefs = useRef({});
  const footerRefs = useRef({});
  const measureRef = useRef(null);
  
  const { saveSelectionRange } = useComments();

  const getZoomedSize = (size) => `${size * (zoom / 100)}px`;

  // Handle content changes and pagination
  const handleContentChange = (e, pageNumber) => {
    const currentRef = contentRefs.current[pageNumber];
    if (!currentRef) return;

    const maxHeight = (PAGE_HEIGHT - margins.top - margins.bottom) * (zoom / 100);
    
    // Create temp div for accurate measurement
    const temp = document.createElement('div');
    temp.style.cssText = window.getComputedStyle(currentRef).cssText;
    temp.style.width = `${currentRef.offsetWidth}px`;
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
        // Add new page
        if (!pages.includes(pageNumber + 1)) {
          setPages(prev => [...prev, pageNumber + 1]);
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
        [pageNumber]: e.target.innerHTML,
        ...prev,
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
        
        const currentContent = pageContents[pageNumber] || '';
        const prevContent = pageContents[pageNumber - 1] || '';
        
        // Merge with previous page
        setPageContents(prev => ({
          ...prev,
          [pageNumber - 1]: prevContent + currentContent,
          [pageNumber]: ''
        }));
        
        // Remove empty page
        setPages(prev => prev.filter(p => p !== pageNumber));
        
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

  const handleSpecialKeys = (e, pageNumber) => {
    // Handle Backspace at start of page
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Check if cursor is at start of content
      if (range.startOffset === 0 && pageNumber > 1) {
        e.preventDefault();
        
        const currentContent = pageContents[pageNumber] || '';
        const prevContent = pageContents[pageNumber - 1] || '';
        
        // Merge with previous page
        setPageContents(prev => ({
          ...prev,
          [pageNumber - 1]: prevContent + currentContent,
          [pageNumber]: ''
        }));
        
        // Remove empty page
        setPages(prev => prev.filter(p => p !== pageNumber));
        
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
          }
        }, 0);
      }
    }
    
    // Handle Enter key properly
    if (e.key === 'Enter') {
      e.preventDefault(); // Always prevent default to control what happens
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Create proper paragraph break instead of just a line break
      const br = document.createElement('br');
      
      // Insert the BR element
      range.deleteContents();
      range.insertNode(br);
      
      // Create a text node after the BR to place cursor after it
      const textNode = document.createTextNode('\u200B'); // Zero-width space
      range.setStartAfter(br);
      range.insertNode(textNode);
      
      // Place cursor after the BR
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Handle Tab key for proper indentation
    if (e.key === 'Tab') {
      e.preventDefault(); // Prevent default tab behavior
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      
      // Insert a tab space (typically 4 spaces or an actual tab character)
      const tabNode = document.createTextNode('\u00A0\u00A0\u00A0\u00A0'); // 4 non-breaking spaces
      range.deleteContents();
      range.insertNode(tabNode);
      
      // Move cursor after the inserted tab
      range.setStartAfter(tabNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Handle Space key specially if needed
    if (e.key === ' ' || e.key === 'Spacebar') {
      // For space, we generally don't need special handling unless 
      // you're seeing issues with it inserting garbage
      if (e.target.isContentEditable) {
        // Force direction to be LTR even for spaces
        setTimeout(() => {
          e.target.style.direction = 'ltr';
          e.target.style.unicodeBidi = 'plaintext';
        }, 0);
      }
    }
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

  return (
    <RulerProvider>
      <div className="min-h-screen bg-[#E5E5E5] p-8">
        <div className="flex flex-col items-center gap-2">
          <Ruler />
          {pages.map(pageNumber => (
            <div
              key={pageNumber}
              data-page={pageNumber}
              className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] rounded-sm transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              style={{
                width: getZoomedSize(PAGE_WIDTH),
                height: getZoomedSize(PAGE_HEIGHT),
                position: 'relative',
                backgroundColor: 'white',
                margin: '10px',
              }}
            >
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
          ))}
        </div>
        <ZoomControl zoom={zoom} onZoomChange={setZoom} />
      </div>
    </RulerProvider>
  );
};

export default EditorContent; 

