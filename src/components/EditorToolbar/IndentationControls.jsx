import { Box, IconButton, Tooltip } from '@mui/material';
import { FormatIndentIncrease, FormatIndentDecrease } from '@mui/icons-material';
import { useEditorHistory } from '../../context/EditorHistoryContext';

// Enhanced IndentationControls component that works directly on paragraphs
const IndentationControls = () => {
  const { saveHistory, ActionTypes } = useEditorHistory();

  // Helper function to find content area
  const findContentArea = (node) => {
    while (node) {
      if (node.hasAttribute && node.hasAttribute('data-content-area')) {
        return node;
      }
      node = node.parentNode;
    }
    return document.querySelector('[data-content-area="true"]');
  };
  
  // Helper function to find paragraph node
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
  
  // Apply indentation to a paragraph
  const applyIndentation = (paragraph, direction) => {
    if (!paragraph) return;
    
    // Get current indentation level from computed style
    const computedStyle = window.getComputedStyle(paragraph);
    const currentMarginLeft = parseInt(computedStyle.marginLeft) || 0;
    
    // Google Docs uses 0.5 inch (40px) indentation steps at 96 DPI
    const INDENT_STEP = 40; 
    const MAX_INDENT_LEVEL = 10; // Prevent excessive indentation
    
    // Handle increase indentation
    if (direction === 'increase') {
      // Check if we're at max indent level
      const currentLevel = parseInt(paragraph.getAttribute('data-indent-level') || '0');
      if (currentLevel >= MAX_INDENT_LEVEL) return;
      
      // Increase indentation by one step
      const newMargin = currentMarginLeft + INDENT_STEP;
      
      // Apply indentation directly to the paragraph with smooth transition
      paragraph.style.transition = 'margin-left 0.15s ease-in-out';
      paragraph.style.marginLeft = `${newMargin}px`;
      
      // Store indentation level as data attribute for future reference
      paragraph.setAttribute('data-indent-level', (currentLevel + 1).toString());
      
      // Remove transition after animation completes
      setTimeout(() => {
        paragraph.style.removeProperty('transition');
      }, 200);
    } 
    // Handle decrease indentation
    else if (direction === 'decrease') {
      // Only decrease if there's actual margin to decrease
      if (currentMarginLeft >= INDENT_STEP) {
        // Decrease indentation, but never below 0
        const newMargin = Math.max(0, currentMarginLeft - INDENT_STEP);
        
        // Add smooth transition
        paragraph.style.transition = 'margin-left 0.15s ease-in-out';
        
        if (newMargin === 0) {
          paragraph.style.removeProperty('margin-left');
          paragraph.removeAttribute('data-indent-level');
        } else {
          paragraph.style.marginLeft = `${newMargin}px`;
          const currentLevel = parseInt(paragraph.getAttribute('data-indent-level') || '0');
          paragraph.setAttribute('data-indent-level', Math.max(0, currentLevel - 1).toString());
        }
        
        // Remove transition after animation completes
        setTimeout(() => {
          paragraph.style.removeProperty('transition');
        }, 200);
      }
    }
    
    // Dispatch an input event to ensure content is saved
    const contentArea = findContentArea(paragraph);
    if (contentArea) {
      // Add a subtle highlight effect to show which paragraph was indented
      const originalBackground = paragraph.style.backgroundColor;
      paragraph.style.backgroundColor = 'rgba(232, 240, 254, 0.4)'; // Light blue highlight
      
      setTimeout(() => {
        // Remove highlight effect after 300ms
        paragraph.style.transition = 'background-color 0.3s ease-out';
        paragraph.style.backgroundColor = originalBackground || '';
        
        setTimeout(() => {
          paragraph.style.removeProperty('transition');
        }, 350);
      }, 150);
      
      const inputEvent = new Event('input', { bubbles: true });
      contentArea.dispatchEvent(inputEvent);
    }
  };
  
  // Find all paragraphs in a selection range
  const findAllParagraphsInSelection = (range, contentArea) => {
    if (!range || !contentArea) return [];
    
    const result = [];
    
    // Method 1: Check all paragraphs in content area for intersection
    const allParagraphs = Array.from(
      contentArea.querySelectorAll('p, div:not([data-content-area]), h1, h2, h3, h4, h5, h6')
    );
    
    // Filter to paragraphs that intersect with the selection
    const intersectingParagraphs = allParagraphs.filter(node => {
      try {
        return range.intersectsNode(node);
      } catch {
        // Silently handle any errors that might occur during intersection check
        return false;
      }
    });
    
    if (intersectingParagraphs.length > 0) {
      return intersectingParagraphs;
    }
    
    // Method 2: Direct traversal from start to end nodes
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentNode;
    if (endNode.nodeType === Node.TEXT_NODE) endNode = endNode.parentNode;
    
    const startPara = findParagraphNode(startNode);
    const endPara = findParagraphNode(endNode);
    
    if (startPara === endPara && startPara) {
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
      
      return result;
    }
    
    // Method 3: Fallback to common ancestor paragraph
    const commonPara = findParagraphNode(range.commonAncestorContainer);
    return commonPara ? [commonPara] : [];
  };
  
  // Ultra-robust handle indent function
  const handleIndentDirect = (direction) => {
    // Save history before making any changes
    saveHistory(ActionTypes.COMPLETE);
    
    try {
      // Get the current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // If no selection, try to find the main editor content area
        const contentArea = document.querySelector('[data-content-area="true"]');
        if (contentArea) {
          // Find the first paragraph in the content area to indent
          const firstPara = contentArea.querySelector('p') || 
                           contentArea.querySelector('div:not([data-content-area])');
          if (firstPara) {
            applyIndentation(firstPara, direction);
            
            // Trigger content change event
            const inputEvent = new Event('input', { bubbles: true });
            contentArea.dispatchEvent(inputEvent);
          }
        }
        return;
      }
      
      // Store the range and clone it for restoration later
      const range = selection.getRangeAt(0);
      const originalRange = range.cloneRange();
      
      // Find the content area
      const contentArea = findContentArea(range.commonAncestorContainer);
      if (!contentArea) return;
      
      // Find all paragraphs in the selection
      const paragraphs = findAllParagraphsInSelection(range, contentArea);
      
      // Apply indentation to all found paragraphs
      if (paragraphs.length > 0) {
        paragraphs.forEach(para => {
          if (para) {
            applyIndentation(para, direction);
          }
        });
        
        // Try to restore the original selection
        try {
          selection.removeAllRanges();
          selection.addRange(originalRange);
        } catch (error) {
          console.error('Error restoring selection:', error);
        }
      } else {
        // Fallback - if no paragraphs found, use the paragraph at cursor
        const node = range.commonAncestorContainer;
        const paragraph = findParagraphNode(node);
        if (paragraph) {
          applyIndentation(paragraph, direction);
        }
      }
      
      // Also try event dispatch as backup
      try {
        const event = new CustomEvent('editor-indent', { 
          detail: { direction } 
        });
        document.dispatchEvent(event);
      } catch (error) {
        console.log('Fallback event dispatch error:', error);
      }
    } catch (error) {
      console.error('Error in handleIndentDirect:', error);
    }
    
    // Save history after all changes are applied
    setTimeout(() => saveHistory(ActionTypes.COMPLETE), 100);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <Tooltip title="Decrease indent (Shift+Tab or Ctrl+[)">
        <IconButton
          size="small"
          onClick={() => handleIndentDirect('decrease')}
          sx={{ padding: '4px' }}
        >
          <FormatIndentDecrease sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Increase indent (Tab or Ctrl+])">
        <IconButton
          size="small"
          onClick={() => handleIndentDirect('increase')}
          sx={{ padding: '4px' }}
        >
          <FormatIndentIncrease sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default IndentationControls; 