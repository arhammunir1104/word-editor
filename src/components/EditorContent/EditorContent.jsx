import React, { useState, useRef, useEffect } from 'react';
import ZoomControl from '../ZoomControl/ZoomControl';
import DebugSelection from "../DebugSelection";
import { useComments } from '../../context/CommentContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';

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
  const { saveHistory, ActionTypes } = useEditorHistory();

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

  return (
    <div className="min-h-screen bg-[#E5E5E5] p-8">
      <div className="flex flex-col items-center gap-2">
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
  );
};

export default EditorContent;

