import React, { useContext, useState, useRef, useEffect } from 'react';
import { Box, IconButton, Select, MenuItem, Tooltip, Divider, Typography, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatListBulleted,
  FormatListNumbered,
  FormatIndentDecrease,
  FormatIndentIncrease,
  Link,
  Add,
  Image,
  Search,
  Undo,
  Redo,
  Print,
  ChevronLeft,
  ChevronRight,
  SpellcheckOutlined,
  FormatColorText,
  FormatColorFill,
  Remove,
  ViewHeadline as HeaderIcon,
  ViewStream as FooterIcon,
  Comment,
} from '@mui/icons-material';
import {useEditor}  from '../../context/EditorContext';
import SearchReplace from '../SearchReplace/SearchReplace';
import ColorPicker from '../ColorPicker/ColorPicker';
import FontSelector from '../FontSelector/FontSelector';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import ListControls from '../ListControls/ListControls';
import AlignmentControls from '../AlignmentControls/AlignmentControls';
import CommentButton from '../Comments/CommentButton';
import { useComments } from '../../context/CommentContext';
import HyperlinkModal from '../Hyperlink/HyperlinkModal';
import HyperlinkTooltip from '../Hyperlink/HyperlinkTooltip';
import * as ReactDOM from 'react-dom/client';
import TableButton from '../Table/TableButton';
import { LineSpacingButton } from '../LineSpacing';

// Define printDocument function at the module level (outside the component)
export const printDocument = () => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    alert("Please allow pop-ups for printing to work correctly.");
    return;
  }
  
  try {
    // Get all document pages
    const documentPages = document.querySelectorAll('[data-page]');
    
    if (!documentPages || documentPages.length === 0) {
      console.error("No document pages found for printing");
      printWindow.close();
      return;
    }
    
    // Get document title (or use a default)
    const documentTitle = document.querySelector('.document-name')?.textContent || 'Document';
    
    // Get essential editor styles for printing
    const printCSS = `
      @page {
        size: 8.5in 11in;
        margin: 0.5in;
      }
      
      body {
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #000;
        margin: 0;
        padding: 0;
        background-color: white;
      }
      
      .page {
        position: relative;
        width: 8.5in;
        height: 11in;
        margin: 0 auto 20px auto;
        padding: 0.5in;
        box-sizing: border-box;
        page-break-after: always;
        border: 1px solid #ddd;
        background-color: white;
        overflow: hidden;
      }
      
      .page:last-child {
        page-break-after: avoid;
      }
      
      .page-content {
        position: relative;
        min-height: 9in;
        overflow: visible;
        white-space: pre-wrap;  /* Preserve whitespace and line breaks */
        word-wrap: break-word;
        font-family: Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
      }
      
      /* Critical for preserving line breaks */
      .page-content p, 
      .page-content div {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        display: block !important;
        min-height: 1em !important;
        margin-bottom: 0.5em !important;
      }
      
      /* Preserve line breaks in all relevant elements */
      br {
        display: block !important;
        content: "" !important;
        margin-top: 0.5em !important;
      }
      
      .page-header {
        text-align: center;
        font-size: 10pt;
        margin-bottom: 0.5in;
        min-height: 20px;
      }
      
      .page-footer {
        text-align: center;
        font-size: 10pt;
        margin-top: 0.5in;
        min-height: 20px;
      }
      
      .page-number {
        text-align: center;
        font-size: 9pt;
        color: #666;
        margin-top: 0.2in;
      }
      
      /* Preserve indentation and formatting */
      p, div {
        margin: 0 0 8px 0;
        min-height: 1em;
      }
      
      /* Handle indentation levels */
      [data-indent-level="1"] { margin-left: 40px !important; }
      [data-indent-level="2"] { margin-left: 80px !important; }
      [data-indent-level="3"] { margin-left: 120px !important; }
      [data-indent-level="4"] { margin-left: 160px !important; }
      [data-indent-level="5"] { margin-left: 200px !important; }
      
      /* Lists */
      ul, ol {
        padding-left: 40px;
        margin: 8px 0;
      }
      
      li {
        margin-bottom: 4px;
      }
      
      /* Tables */
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 10px 0;
      }
      
      td, th {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      
      /* Hyperlinks */
      a {
        color: #0563c1;
        text-decoration: underline;
      }
      
      /* Controls */
      .controls {
        text-align: center;
        margin: 20px 0;
      }
      
      .print-btn {
        background: #4285F4;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        margin-right: 10px;
      }
      
      .close-btn {
        background: #f1f1f1;
        color: #333;
        border: 1px solid #ccc;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
      }
      
      /* Text formatting */
      .bold, b, strong { font-weight: bold; }
      .italic, i, em { font-style: italic; }
      .underline, u { text-decoration: underline; }
      
      /* Print mode specific styles */
      @media print {
        .controls { display: none; }
        .page {
          margin: 0;
          border: none;
          box-shadow: none;
        }
      }
    `;
    
    // Start the HTML document
    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documentTitle} - Print</title>
        <meta charset="UTF-8">
        <style>${printCSS}</style>
      </head>
      <body>
        <div class="controls">
          <button class="print-btn" onclick="window.print()">Print Document</button>
          <button class="close-btn" onclick="window.close()">Close</button>
        </div>
    `;
    
    // Process each page
    documentPages.forEach((page, index) => {
      const pageNumber = index + 1;
      const contentArea = page.querySelector('[data-content-area="true"]');
      
      if (!contentArea) {
        console.warn(`No content area found for page ${pageNumber}`);
        return;
      }
      
      // Function to clean HTML content and preserve formatting
      const cleanContent = (element) => {
        if (!element) return '';
        
        // Clone to avoid modifying the original
        const clone = element.cloneNode(true);
        
        try {
          // Remove problematic elements
          const problematicElements = clone.querySelectorAll('script, style, [data-mce-bogus]');
          problematicElements.forEach(el => el.remove());
          
          // Remove editor attributes but preserve formatting-related ones
          const allElements = clone.querySelectorAll('*');
          allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
              const name = attr.name;
              // Keep attributes related to formatting but remove editor-specific ones
              if (name.startsWith('data-mce-') || 
                  name === 'contenteditable' || 
                  name === 'spellcheck') {
                el.removeAttribute(name);
              }
            });
            
            // Fix any hyperlinks with localhost references
            if (el.tagName === 'A' && el.getAttribute('href')) {
              const href = el.getAttribute('href');
              if (href.includes('localhost:5173')) {
                // Try to extract the actual URL
                const linkText = el.innerText.trim();
                if (linkText && linkText.match(/^https?:\/\//)) {
                  el.setAttribute('href', linkText);
                } else {
                  // Remove problematic href but keep link text
                  el.removeAttribute('href');
                }
              }
            }
            
            // Ensure paragraphs and divs preserve line breaks
            if (el.tagName === 'P' || el.tagName === 'DIV') {
              el.style.whiteSpace = 'pre-wrap';
              
              // Ensure block display
              if (window.getComputedStyle(el).display.includes('inline')) {
                el.style.display = 'block';
              }
              
              // Preserve margins
              if (!el.style.marginBottom) {
                el.style.marginBottom = '8px';
              }
            }
          });
          
          // Process text nodes to ensure newlines are preserved
          const processTextNodes = (node) => {
            const childNodes = node.childNodes;
            
            for (let i = 0; i < childNodes.length; i++) {
              const child = childNodes[i];
              
              if (child.nodeType === Node.TEXT_NODE) {
                // If text node contains newlines and isn't wrapped properly, wrap it
                if (child.textContent.includes('\n') && 
                    (!child.parentNode || 
                     (child.parentNode.nodeName !== 'P' && 
                      child.parentNode.nodeName !== 'DIV' && 
                      child.parentNode.nodeName !== 'PRE'))) {
                  
                  // Create a proper wrapping element
                  const wrapper = document.createElement('div');
                  wrapper.style.whiteSpace = 'pre-wrap';
                  wrapper.textContent = child.textContent;
                  
                  // Replace text node with wrapper
                  child.parentNode.replaceChild(wrapper, child);
                }
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                processTextNodes(child);
              }
            }
          };
          
          // Process the entire content to preserve line breaks
          processTextNodes(clone);
          
          // Get HTML with formatting preserved
          let html = clone.innerHTML;
          
          // Clean problematic content
          html = html
            .replace(/http:\/\/localhost:5173/g, '')
            .replace(/https:\/\/localhost:5173/g, '')
            .replace(/localhost:5173/g, '')
            .replace(/srcset="[^"]*"/g, '') // Remove srcset which can cause issues
            .replace(/sdma\s*\.\s*sdma\s*\.\s*sdma/g, '') // Clean up sdma patterns carefully
            .replace(/(\s*)sdma\s*\./g, ''); // Remove more sdma patterns
          
          // If we find excessive sdna corruption, clear the content completely
          if ((html.match(/sdna/g) || []).length > 20) {
            console.warn('Detected corrupted content with sdna patterns - clearing');
            return '';
          }
          
          // Log for debugging
          console.log('Cleaned HTML content for printing:', 
                     html.length > 100 ? html.substring(0, 100) + '...' : html);
          
          // Final safety check - if the HTML is too short, empty, or just whitespace, use fallback
          if (!html || html.trim().length < 2) {
            // Try to extract the raw text content directly as a fallback
            const rawText = element.innerText || element.textContent || '';
            if (rawText && rawText.trim().length > 0) {
              // Format with preserved line breaks
              return rawText
                .split(/\r?\n/)
                .map(line => `<p style="white-space: pre-wrap;">${line || '&nbsp;'}</p>`)
                .join('');
            }
          }
          
          return html;
        } catch (e) {
          console.error('Error cleaning content:', e);
          // Fallback to pre-formatted plain text
          return `<pre>${element.innerText || ''}</pre>`;
        }
      };
      
      // Get content with formatting preserved
      const contentHTML = cleanContent(contentArea);
      
      // Get header and footer
      const headerArea = page.querySelector('div[contenteditable]:not([data-content-area="true"]):first-of-type');
      const footerArea = page.querySelector('div[contenteditable]:not([data-content-area="true"]):last-of-type');
      
      const headerHTML = headerArea ? cleanContent(headerArea) : '';
      const footerHTML = footerArea && footerArea !== headerArea ? cleanContent(footerArea) : '';
      
      // Add this page with preserved formatting
      printHTML += `
        <div class="page">
          <div class="page-header">${headerHTML}</div>
          <div class="page-content">
            <div class="content-wrapper" style="white-space: pre-wrap; word-wrap: break-word; display: block;">
              ${contentHTML || '&nbsp;'}
            </div>
          </div>
          <div class="page-footer">
            ${footerHTML}
            <div class="page-number">Page ${pageNumber} of ${documentPages.length}</div>
          </div>
        </div>
      `;
    });
    
    // Close the HTML document
    printHTML += `
        <div class="controls">
          <button class="print-btn" onclick="window.print()">Print Document</button>
          <button class="close-btn" onclick="window.close()">Close</button>
        </div>
        <script>
          // Automatically open print dialog after the page loads
          window.addEventListener('load', function() {
            // Slight delay to ensure everything is rendered properly
            setTimeout(function() {
              // Check if content looks good before printing
              if (document.querySelectorAll('.page-content').length > 0) {
                window.print();
              }
            }, 800);
          });
          
          // Add keyboard shortcuts for easier operation
          document.addEventListener('keydown', function(e) {
            // Ctrl+P or Cmd+P for printing
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
              e.preventDefault();
              window.print();
            }
            
            // Escape to close
            if (e.key === 'Escape') {
              window.close();
            }
          });
        </script>
      </body>
      </html>
    `;
    
    // Write to the print window
    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
  } catch (error) {
    console.error('Error preparing document for printing:', error);
    alert('There was an error preparing the document for printing. Please try again.');
    
    if (printWindow) {
      printWindow.close();
    }
  }
};

const EditorToolbar = () => {
  const { 
    editorState, 
    toggleFormat, 
    changeFontSize, 
    changeFontFamily,
    changeFontColor,
    changeBackgroundColor 
  } = useEditor();
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [fontColorAnchorEl, setFontColorAnchorEl] = useState(null);
  const [highlightColorAnchorEl, setHighlightColorAnchorEl] = useState(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [recentColors, setRecentColors] = useState([]);
  const toolbarRef = useRef(null);
  const { undo, redo, canUndo, canRedo, saveHistory, ActionTypes } = useEditorHistory();
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { addComment } = useComments();
  const [hyperlinkModalOpen, setHyperlinkModalOpen] = useState(false);
  const [selectedTextForLink, setSelectedTextForLink] = useState('');
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);
  const tooltipRootRef = useRef(null);
  const [pageOrientations, setPageOrientations] = useState({1: 'portrait'});
  const [pageSizes, setPageSizes] = useState({1: 'LETTER'});
  const [customPageSizes, setCustomPageSizes] = useState({1: {width: 8.5 * 96, height: 11 * 96}});
  const [currentPage, setCurrentPage] = useState(1);

  // MS Word standard font sizes in points (pt)
  const fontSizeOptions = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72, 96].map(size => ({
    value: size,
    label: size.toString()
  }));

  useEffect(() => {
    const checkScrollable = () => {
      if (toolbarRef.current) {
        const { scrollWidth, clientWidth } = toolbarRef.current;
        setIsScrollable(scrollWidth > clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, []);

  const handleSearchClick = (event) => {
    setSearchAnchorEl(event.currentTarget);
  };

  const handleScroll = (direction) => {
    if (toolbarRef.current) {
      const scrollAmount = 200;
      toolbarRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
    }
  };

  const handleFontColorSelect = (color) => {
    changeFontColor(color);
    setFontColorAnchorEl(null);
  };

  const handleHighlightColorSelect = (color) => {
    changeBackgroundColor(color);
    setHighlightColorAnchorEl(null);
  };

  const handleFontSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    if (!isNaN(newSize)) {
      changeFontSize(newSize);
    }
  };

  const handleFontChange = (event) => {
    changeFontFamily(event.target.value);
  };

  const handleHeaderClick = () => {
    // Implement header edit logic
  };

  const handleFooterClick = () => {
    // Implement footer edit logic
  };

  const handlePrint = () => {
    // Expose this function globally so the header menu can use it
    window.editorToolbarPrint = printDocument;
    
    // Execute our custom print function
    printDocument();
  };
  
  const handleCommentClick = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      // Text is selected, open dialog
      setCommentDialogOpen(true);
    } else {
      // No text selected, show error message
      alert("Please select text to comment on");
    }
  };
  
  const handleCommentSubmit = () => {
    if (commentText.trim()) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        addComment(commentText, range);
        setCommentText('');
        setCommentDialogOpen(false);
      }
    }
  };

  const handleHyperlinkClick = () => {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // No text is selected, show a warning
      // You can use a toast/snackbar or alert here
      alert("Please select some text first to create a hyperlink.");
      return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    // Store the selected text and range
    setSelectedTextForLink(selectedText);
    setSelectedRangeForLink(range.cloneRange()); // Clone the range to preserve it
    
    // Open the hyperlink modal
    setHyperlinkModalOpen(true);
  };
  
  const applyHyperlink = (url) => {
    if (!selectedRangeForLink) return;
    
    try {
      // Save history before making changes
      saveHistory(ActionTypes.COMPLETE);
      
      // Save current selection state
      const selection = window.getSelection();
      const currentRanges = [];
      for (let i = 0; i < selection.rangeCount; i++) {
        currentRanges.push(selection.getRangeAt(i).cloneRange());
      }
      
      // Create a hyperlink element
      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
      linkElement.className = 'editor-hyperlink';
      linkElement.dataset.url = url;
      
      // Apply styling (but preserve existing formatting)
      linkElement.style.color = '#0563c1'; // MS Word blue link color
      linkElement.style.textDecoration = 'underline';
      linkElement.style.cursor = 'pointer';
      
      // Add additional styles to make hyperlinks more clickable
      linkElement.style.position = 'relative';
      linkElement.style.zIndex = '1';
      linkElement.style.padding = '0 1px';
      
      // Extract the content and insert into link
      const fragment = selectedRangeForLink.extractContents();
      linkElement.appendChild(fragment);
      selectedRangeForLink.insertNode(linkElement);
      
      // Restore selection
      selection.removeAllRanges();
      currentRanges.forEach(range => selection.addRange(range));
      
      // Clean up
      setSelectedTextForLink('');
      setSelectedRangeForLink(null);
      
      // After setup, force focusing away from the link to avoid selection issues
      document.body.focus();
      
      // Call setupHyperlinkEventListeners directly after adding the link
      setTimeout(() => setupHyperlinkEventListeners(), 0);
    } catch (error) {
      console.error('Error applying hyperlink:', error);
    }
  };
  
  const setupHyperlinkEventListeners = () => {
    console.log("Setting up hyperlink listeners");
    
    // Remove existing tooltip element if any
    const existingTooltip = document.getElementById('hyperlink-tooltip-container');
    if (existingTooltip) {
      if (tooltipRootRef.current) {
        try {
          tooltipRootRef.current.unmount();
        } catch (e) {
          console.error("Error unmounting tooltip:", e);
        }
        tooltipRootRef.current = null;
      }
      document.body.removeChild(existingTooltip);
    }
    
    // Remove any existing temporary anchors
    const existingAnchor = document.getElementById('hyperlink-temp-anchor');
    if (existingAnchor) {
      document.body.removeChild(existingAnchor);
    }
    
    // Add styles to make links more interactive
    const linkStyles = document.createElement('style');
    linkStyles.setAttribute('data-hyperlink-styles', 'true');
    linkStyles.textContent = `
      .editor-hyperlink {
        color: #0563c1 !important;
        text-decoration: underline !important;
        cursor: pointer !important;
        position: relative !important;
        z-index: 1 !important;
        padding: 0 1px !important;
        border-radius: 2px !important;
        transition: background-color 0.15s ease-in-out !important;
      }
      .editor-hyperlink:hover {
        background-color: rgba(5, 99, 193, 0.1) !important;
        text-decoration: underline !important;
        box-shadow: 0 0 0 1px rgba(5, 99, 193, 0.2) !important;
      }
      .editor-hyperlink:active {
        background-color: rgba(5, 99, 193, 0.15) !important;
      }
      
      /* Fix for tooltip container */
      #hyperlink-tooltip-container {
        position: absolute;
        z-index: 9999;
      }
    `;
    
    // Remove existing style elements first
    const existingStyles = document.querySelector('style[data-hyperlink-styles="true"]');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    document.head.appendChild(linkStyles);
    
    // Add hover/click listeners to all hyperlinks
    const hyperlinks = document.querySelectorAll('.editor-hyperlink');
    console.log(`Found ${hyperlinks.length} hyperlinks`);
    
    hyperlinks.forEach(link => {
      // Remove any existing event listeners
      link.onclick = null;
      link.onmouseenter = null;
      link.onmouseleave = null;
      
      // Make sure links have the correct styling and class
      link.className = 'editor-hyperlink';
      
      // Stop event propagation and prevent default to avoid editor grabbing the click
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Link clicked directly", e);
        
        // First remove any existing tooltip
        const existingTooltip = document.getElementById('hyperlink-tooltip-container');
        if (existingTooltip && tooltipRootRef.current) {
          tooltipRootRef.current.unmount();
          tooltipRootRef.current = null;
          existingTooltip.remove();
        }
        
        // Remove any existing temporary anchors
        const existingAnchor = document.getElementById('hyperlink-temp-anchor');
        if (existingAnchor) {
          existingAnchor.remove();
        }
        
        // Show tooltip
        showTooltipForLink(link);
        return false;
      }, true);
      
      // Add a direct mouseenter handler with a small delay to prevent accidental tooltips
      let hoverTimer = null;
      link.addEventListener('mouseenter', function(e) {
        console.log("Link hovered directly", e);
        
        // First clear any existing hover timer
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        
        // Only show tooltip on hover after a small delay
        hoverTimer = setTimeout(() => {
          // Don't show if tooltip is already visible
          if (tooltipRootRef.current) return;
          
          showTooltipForLink(link);
        }, 300);
      }, true);
      
      // Clear the hover timer if the mouse leaves before the delay
      link.addEventListener('mouseleave', function(e) {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      }, true);
    });
  };
  
  // Extract the tooltip showing logic to be called directly
  const showTooltipForLink = (link) => {
    // Get link position right away
    const rect = link.getBoundingClientRect();
    const url = link.dataset.url || link.getAttribute('href');
    
    // Skip if we can't find a URL (probably not a valid link)
    if (!url) {
      console.log("No URL found for link:", link);
      return;
    }
    
    // Close any existing tooltip
    if (tooltipRootRef.current) {
      tooltipRootRef.current.unmount();
      tooltipRootRef.current = null;
    }
    
    // Calculate the optimal position for the tooltip
    const position = calculateTooltipPosition(rect);
    
    // Create document click handler to close tooltip when clicking outside
    const handleDocumentClick = (e) => {
      const tooltipContainer = document.getElementById('hyperlink-tooltip-container');
      if (tooltipRootRef.current && 
          !link.contains(e.target) && 
          (!tooltipContainer || !tooltipContainer.contains(e.target))) {
        tooltipRootRef.current.unmount();
        tooltipRootRef.current = null;
        document.removeEventListener('click', handleDocumentClick);
      }
    };
    
    // Register the document click handler
    document.addEventListener('click', handleDocumentClick);
    
    // Create a temporary physical anchor element right at the link's position
    // This ensures the tooltip appears at the correct position in the DOM
    const tempAnchor = document.createElement('div');
    tempAnchor.style.position = 'absolute';
    tempAnchor.style.left = `${position.left}px`;
    tempAnchor.style.top = `${position.top}px`;
    tempAnchor.style.width = '2px';
    tempAnchor.style.height = '2px';
    tempAnchor.style.backgroundColor = 'transparent';
    tempAnchor.style.zIndex = '-1'; // Hide it behind other content
    tempAnchor.id = 'hyperlink-temp-anchor';
    document.body.appendChild(tempAnchor);
    
    // Create a new tooltip container that will be positioned relative to our anchor
    const existingContainer = document.getElementById('hyperlink-tooltip-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'hyperlink-tooltip-container';
    tooltipContainer.style.position = 'absolute';
    tooltipContainer.style.zIndex = '9999';
    tooltipContainer.style.left = `${position.left}px`;
    tooltipContainer.style.top = `${position.top}px`;
    document.body.appendChild(tooltipContainer);
    
    try {
      tooltipRootRef.current = ReactDOM.createRoot(tooltipContainer);
      tooltipRootRef.current.render(
        <HyperlinkTooltip
          url={url}
          onClose={() => {
            document.removeEventListener('click', handleDocumentClick);
            if (tooltipRootRef.current) {
              tooltipRootRef.current.unmount();
              tooltipRootRef.current = null;
            }
            
            // Remove the temporary anchor
            const tempAnchor = document.getElementById('hyperlink-temp-anchor');
            if (tempAnchor) {
              document.body.removeChild(tempAnchor);
            }
            
            // Remove the tooltip container
            if (tooltipContainer && document.body.contains(tooltipContainer)) {
              document.body.removeChild(tooltipContainer);
            }
          }}
          onEdit={(newUrl) => {
            // Save history before updating the link
            saveHistory(ActionTypes.COMPLETE);
            
            // Update the link URL
            link.href = newUrl;
            link.setAttribute('href', newUrl);
            link.dataset.url = newUrl;
            
            // Force a refresh of the link appearance
            const originalText = link.textContent;
            const parent = link.parentNode;
            const newLink = document.createElement('a');
            newLink.href = newUrl;
            newLink.target = '_blank';
            newLink.rel = 'noopener noreferrer';
            newLink.className = 'editor-hyperlink';
            newLink.dataset.url = newUrl;
            newLink.textContent = originalText;
            
            // Apply styling
            newLink.style.color = '#0563c1';
            newLink.style.textDecoration = 'underline';
            newLink.style.cursor = 'pointer';
            newLink.style.position = 'relative';
            newLink.style.zIndex = '1';
            newLink.style.padding = '0 1px';
            
            // Replace the old link with the new one
            parent.replaceChild(newLink, link);
            
            // Close the tooltip
            if (tooltipRootRef.current) {
              tooltipRootRef.current.unmount();
              tooltipRootRef.current = null;
            }
            
            // Remove the temporary anchor
            const tempAnchor = document.getElementById('hyperlink-temp-anchor');
            if (tempAnchor) {
              document.body.removeChild(tempAnchor);
            }
            
            // Update the hyperlink event listeners
            setTimeout(() => setupHyperlinkEventListeners(), 0);
            
            // Save history after changes
            setTimeout(() => saveHistory(ActionTypes.COMPLETE), 50);
          }}
          onDelete={() => {
            // Save history before removing the link
            saveHistory(ActionTypes.COMPLETE);
            
            // Get the link text content
            const textContent = link.textContent;
            
            // Create a text node to replace the link
            const textNode = document.createTextNode(textContent);
            
            // Replace the link with the text node
            link.parentNode.replaceChild(textNode, link);
            
            // Close the tooltip
            if (tooltipRootRef.current) {
              tooltipRootRef.current.unmount();
              tooltipRootRef.current = null;
            }
            
            // Remove the temporary anchor
            const tempAnchor = document.getElementById('hyperlink-temp-anchor');
            if (tempAnchor) {
              document.body.removeChild(tempAnchor);
            }
            
            // Save history after changes
            setTimeout(() => saveHistory(ActionTypes.COMPLETE), 50);
          }}
        />
      );
    } catch (error) {
      console.error("Error rendering hyperlink tooltip:", error);
      
      // Clean up if there's an error
      const tempAnchor = document.getElementById('hyperlink-temp-anchor');
      if (tempAnchor) {
        document.body.removeChild(tempAnchor);
      }
    }
  };
  
  useEffect(() => {
    // Initial setup of hyperlinks
    console.log("Initial hyperlink setup");
    setupHyperlinkEventListeners();
    
    // Set up MutationObserver for editable content areas
    const contentAreas = document.querySelectorAll('[data-content-area="true"]');
    
    if (contentAreas.length > 0) {
      const observer = new MutationObserver((mutations) => {
        console.log("Content mutation detected");
        // Call setupHyperlinkEventListeners with a small delay to ensure DOM is updated
        setTimeout(setupHyperlinkEventListeners, 50);
      });
      
      // Start observing all content areas
      contentAreas.forEach(area => {
        observer.observe(area, { 
          childList: true, 
          subtree: true,
          characterData: true 
        });
      });
      
      return () => {
        observer.disconnect();
        
        // Clean up
        const tooltipContainer = document.getElementById('hyperlink-tooltip-container');
        if (tooltipContainer) {
          if (tooltipRootRef.current) {
            try {
              tooltipRootRef.current.unmount();
            } catch (e) {
              console.error("Error unmounting tooltip:", e);
            }
            tooltipRootRef.current = null;
          }
          document.body.removeChild(tooltipContainer);
        }
        
        const linkStylesheet = document.querySelector('style[data-hyperlink-styles]');
        if (linkStylesheet) {
          document.head.removeChild(linkStylesheet);
        }
      };
    }
    
    return () => {};
  }, []);

  const handleImageClick = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg, image/jpg, image/gif, image/webp';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        insertImage(file);
      }
      // Clean up
      document.body.removeChild(fileInput);
    });
    
    // Open file dialog
    fileInput.click();
  };

  const insertImage = (file) => {
    // Save history before inserting
    saveHistory(ActionTypes.COMPLETE);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Create an image container div
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container';
      imageContainer.contentEditable = false;
      imageContainer.style.display = 'inline-block';
      imageContainer.style.position = 'relative';
      imageContainer.style.margin = '5px';
      
      // Create the image element
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      
      // Add data attributes for image modes
      imageContainer.dataset.imageMode = 'inline'; // Default: inline mode
      imageContainer.dataset.alignment = 'none'; // Default: no specific alignment
      
      // Append image to container
      imageContainer.appendChild(img);
      
      // Insert the container at cursor position
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Find the nearest content area
        let contentArea = range.commonAncestorContainer;
        while (contentArea && (!contentArea.hasAttribute || !contentArea.hasAttribute('data-content-area'))) {
          contentArea = contentArea.parentNode;
          if (!contentArea) break;
        }
        
        try {
          // Insert the image
          range.deleteContents();
          range.insertNode(imageContainer);
          
          // Fix: Ensure proper document flow after the image
          // Create an empty paragraph with proper structure
          const paragraph = document.createElement('p');
          paragraph.innerHTML = '<br>';
          
          // Insert the paragraph after the image
          if (imageContainer.nextSibling) {
            imageContainer.parentNode.insertBefore(paragraph, imageContainer.nextSibling);
          } else {
            imageContainer.parentNode.appendChild(paragraph);
          }
          
          // Move cursor after the image to continue typing
          const newRange = document.createRange();
          newRange.setStart(paragraph, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Set up event listeners for the image
          setupImageEventListeners(imageContainer);
          
          // Add resize handles
          addResizeHandles(imageContainer);
          
          // Fix: Ensure the image container doesn't interfere with text editing
          // by adding wrapper markup if needed
          const parentElement = imageContainer.parentElement;
          if (parentElement && !parentElement.contentEditable) {
            parentElement.contentEditable = 'true';
          }
          
          // Trigger an input event to ensure content is properly updated
          if (contentArea) {
            const inputEvent = new Event('input', { bubbles: true });
            contentArea.dispatchEvent(inputEvent);
          }
          
          // Save history after inserting
          saveHistory(ActionTypes.COMPLETE);
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const setupImageEventListeners = (container) => {
    const img = container.querySelector('img');
    if (!img) return;
    
    // Create floating toolbar on image click
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Remove selection from any other image
      document.querySelectorAll('.image-container.selected').forEach(el => {
        if (el !== container) {
          el.classList.remove('selected');
        }
      });
      
      // Mark this image as selected
      container.classList.add('selected');
      
      // Show the Google-style image toolbar
      showGoogleStyleImageToolbar(container);
    });
    
    // Make sure keyboard events don't get trapped by the image container
    container.addEventListener('keydown', (e) => {
      // Let key events bubble up to the editor
      e.stopPropagation = false;
    });
    
    // Enable image dragging (if in floating mode)
    enableImageDragging(container);
  };

  const addResizeHandles = (container) => {
    // Remove any existing resize handles
    container.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
    
    const img = container.querySelector('img');
    if (!img) return;
    
    // Create resize handles for all corners and sides
    const positions = ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'];
    
    positions.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-${pos}`;
      handle.style.position = 'absolute';
      handle.style.width = '10px';
      handle.style.height = '10px';
      handle.style.backgroundColor = '#1a73e8';
      handle.style.border = '2px solid white';
      handle.style.boxShadow = '0 0 3px rgba(0,0,0,0.5)';
      handle.style.borderRadius = '50%';
      handle.style.zIndex = '101';
      handle.style.cursor = `${pos}-resize`;
      
      // Position the handle based on its type
      switch (pos) {
        case 'se': 
          handle.style.bottom = '-6px';
          handle.style.right = '-6px';
          break;
        case 'sw': 
          handle.style.bottom = '-6px';
          handle.style.left = '-6px';
          break;
        case 'ne': 
          handle.style.top = '-6px';
          handle.style.right = '-6px';
          break;
        case 'nw': 
          handle.style.top = '-6px';
          handle.style.left = '-6px';
          break;
        case 'n':
          handle.style.top = '-6px';
          handle.style.left = '50%';
          handle.style.transform = 'translateX(-50%)';
          break;
        case 's':
          handle.style.bottom = '-6px';
          handle.style.left = '50%';
          handle.style.transform = 'translateX(-50%)';
          break;
        case 'e':
          handle.style.right = '-6px';
          handle.style.top = '50%';
          handle.style.transform = 'translateY(-50%)';
          break;
        case 'w':
          handle.style.left = '-6px';
          handle.style.top = '50%';
          handle.style.transform = 'translateY(-50%)';
          break;
      }
      
      container.appendChild(handle);
      
      // Set up resize functionality
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Save history before resize
        saveHistory(ActionTypes.COMPLETE);
        
        // Get initial dimensions and position
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;
        const startX = e.clientX;
        const startY = e.clientY;
        
        // Mouse move handler for resize
        const onMouseMove = (moveEvent) => {
          moveEvent.preventDefault();
          
          // Calculate distance moved
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          
          let newWidth = startWidth;
          let newHeight = startHeight;
          
          // Calculate new dimensions based on handle position
          switch (pos) {
            case 'e':
            newWidth = Math.max(30, startWidth + dx);
            if (!moveEvent.shiftKey) newHeight = newWidth / aspectRatio;
              break;
            case 'w':
            newWidth = Math.max(30, startWidth - dx);
            if (!moveEvent.shiftKey) newHeight = newWidth / aspectRatio;
              break;
            case 's':
            newHeight = Math.max(30, startHeight + dy);
            if (!moveEvent.shiftKey) newWidth = newHeight * aspectRatio;
              break;
            case 'n':
            newHeight = Math.max(30, startHeight - dy);
            if (!moveEvent.shiftKey) newWidth = newHeight * aspectRatio;
          break;
            case 'se':
              newWidth = Math.max(30, startWidth + dx);
              newHeight = Math.max(30, startHeight + dy);
              if (!moveEvent.shiftKey) {
                // Prioritize width for SE resize
                newHeight = newWidth / aspectRatio;
              }
          break;
            case 'sw':
              newWidth = Math.max(30, startWidth - dx);
              newHeight = Math.max(30, startHeight + dy);
              if (!moveEvent.shiftKey) {
                // Prioritize width for SW resize
                newHeight = newWidth / aspectRatio;
              }
              break;
            case 'ne':
              newWidth = Math.max(30, startWidth + dx);
              newHeight = Math.max(30, startHeight - dy);
              if (!moveEvent.shiftKey) {
                // Prioritize width for NE resize
                newHeight = newWidth / aspectRatio;
              }
              break;
            case 'nw':
              newWidth = Math.max(30, startWidth - dx);
              newHeight = Math.max(30, startHeight - dy);
              if (!moveEvent.shiftKey) {
                // Prioritize width for NW resize
                newHeight = newWidth / aspectRatio;
              }
              break;
          }
          
          // Apply new dimensions
          img.style.width = `${newWidth}px`;
          img.style.height = `${newHeight}px`;
          
          // Update toolbar position
          updateToolbarPosition(container);
        };
        
        // Mouse up handler
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          // Save history after resize
          saveHistory(ActionTypes.COMPLETE);
        };
        
        // Add document-level event listeners
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
    
    // Initially hide handles
    container.querySelectorAll('.resize-handle').forEach(handle => {
      handle.style.display = 'none';
    });
    
    // Show handles on hover
    container.addEventListener('mouseenter', () => {
      container.querySelectorAll('.resize-handle').forEach(handle => {
        handle.style.display = 'block';
      });
    });
    
    // Hide handles when leaving, unless selected
    container.addEventListener('mouseleave', (e) => {
      if (!container.classList.contains('selected')) {
        container.querySelectorAll('.resize-handle').forEach(handle => {
          handle.style.display = 'none';
        });
      }
    });
  };

  const applyImageAlignment = (container, alignment) => {
    const img = container.querySelector('img');
    if (!img) return;
    
    // Save current dimensions
    const imgWidth = img.offsetWidth;
    const imgHeight = img.offsetHeight;
    
    // Save the alignment in the dataset
    container.dataset.alignment = alignment;
    
    // Remove all existing alignment classes
    container.classList.remove('align-left', 'align-center', 'align-right', 'align-none');
    container.classList.add(`align-${alignment}`);
    
    // Reset all styles that could affect alignment
    container.style.float = '';
    container.style.margin = '';
    container.style.marginLeft = '';
    container.style.marginRight = '';
    container.style.textAlign = '';
    
    // Get the current mode (inline or floating)
    const mode = container.dataset.imageMode || 'inline';
    
    if (mode === 'inline') {
      container.style.position = 'relative';
      container.style.display = 'block';
      
      switch (alignment) {
        case 'left':
          container.style.float = 'left';
          container.style.marginRight = '10px';
          container.style.marginBottom = '10px';
          break;
        case 'center':
          container.style.float = 'none';
          container.style.margin = '10px auto';
          break;
        case 'right':
          container.style.float = 'right';
          container.style.marginLeft = '10px';
          container.style.marginBottom = '10px';
          break;
        case 'none':
        default:
          container.style.float = 'none';
          container.style.margin = '5px 0';
          break;
      }
    } else if (mode === 'floating') {
      // Maintain absolute positioning for floating mode
      container.style.position = 'absolute';
      
      // Get parent element dimensions
      const parent = container.parentElement;
      const parentRect = parent.getBoundingClientRect();
      
      switch (alignment) {
        case 'left':
          container.style.left = '0px';
          break;
        case 'center':
          // Calculate center position based on parent width
          container.style.left = `${(parentRect.width - imgWidth) / 2}px`;
          break;
        case 'right':
          // Align to right edge
          container.style.left = `${parentRect.width - imgWidth}px`;
          break;
        // 'none' alignment doesn't change the position in floating mode
      }
    }
    
    // Make sure the image size is preserved
    img.style.width = `${imgWidth}px`;
    img.style.height = `${imgHeight}px`;
    
    // Update toolbar position
    updateToolbarPosition(container);
  };

  const prepareImageForDragging = (container) => {
    // Get current position and dimensions
    const rect = container.getBoundingClientRect();
    
    // Set essential styles for dragging
    container.style.position = 'absolute';
    container.style.left = `${rect.left + window.scrollX}px`;
    container.style.top = `${rect.top + window.scrollY}px`;
    container.style.zIndex = '100';
    
    // Remove any styles that might interfere with dragging
    container.style.float = '';
    container.style.margin = '';
    container.style.textAlign = '';
    
    // Ensure the image container visually indicates it's draggable
    container.style.cursor = 'move';
    
    // Add visual indicator class
    container.classList.add('draggable-image');
  };

  const showGoogleStyleImageToolbar = (container) => {
    // Remove any existing image toolbars
    document.querySelectorAll('.image-toolbar').forEach(toolbar => toolbar.remove());
    
    const img = container.querySelector('img');
    if (!img) return;
    
    // Create the toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'image-toolbar';
    toolbar.style.position = 'absolute';
    toolbar.style.backgroundColor = 'white';
    toolbar.style.border = '1px solid #dadce0';
    toolbar.style.borderRadius = '4px';
    toolbar.style.padding = '4px 8px';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    toolbar.style.alignItems = 'center';
    toolbar.style.boxShadow = '0 1px 3px rgba(60,64,67,0.3)';
    toolbar.style.zIndex = '1000';
    
    // Position the toolbar above the image with proper spacing
    updateToolbarPosition(container, toolbar);
    
    // Helper function to create toolbar buttons
    const createButton = (icon, tooltip, action, checkActive = null) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = icon;
      button.title = tooltip;
      button.style.border = 'none';
      button.style.background = 'transparent';
      button.style.cursor = 'pointer';
      button.style.padding = '6px';
      button.style.borderRadius = '4px';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      
      // Set active state if provided
      if (checkActive && checkActive()) {
        button.style.backgroundColor = '#e8f0fe';
        button.style.color = '#1a73e8';
      }
      
      button.addEventListener('mouseover', () => {
        if (!(checkActive && checkActive())) {
          button.style.backgroundColor = '#f1f3f4';
        }
      });
      
      button.addEventListener('mouseout', () => {
        if (!(checkActive && checkActive())) {
          button.style.backgroundColor = 'transparent';
        }
      });
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        action();
      });
      
      return button;
    };
    
    // Create mode section (inline vs floating)
    const inlineButton = createButton(
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M21,15H3V17H21V15M21,7H3V9H21V7M3,13H15V11H3V13Z"/></svg>',
      'In line with text',
      () => {
        saveHistory(ActionTypes.COMPLETE);
        
        container.dataset.imageMode = 'inline';
        container.style.position = 'relative';
        
        // Apply any existing alignment
        applyImageAlignment(container, container.dataset.alignment || 'none');
        
        // Update button states
        updateToolbarButtons();
        saveHistory(ActionTypes.COMPLETE);
      },
      () => container.dataset.imageMode === 'inline'
    );
    
    const wrapButton = createButton(
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3,7H9V9H3V7M3,11H7V13H3V11M3,15H9V17H3V15M11,7H21V9H11V7M11,11H19V13H11V11M11,15H21V17H11V15Z"/></svg>',
      'Wrap text',
      () => {
        saveHistory(ActionTypes.COMPLETE);
        
        container.dataset.imageMode = 'floating';
        prepareImageForDragging(container);
        
        // Apply any existing alignment
        applyImageAlignment(container, container.dataset.alignment || 'none');
        
        // Update button states
        updateToolbarButtons();
        saveHistory(ActionTypes.COMPLETE);
      },
      () => container.dataset.imageMode === 'floating'
    );
    
    // Divider element
    const createDivider = () => {
      const divider = document.createElement('div');
      divider.style.height = '24px';
      divider.style.width = '1px';
      divider.style.backgroundColor = '#dadce0';
      return divider;
    };
    
    // Create alignment buttons
    const alignLeftButton = createButton(
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"/></svg>',
      'Align left',
      () => {
        saveHistory(ActionTypes.COMPLETE);
        applyImageAlignment(container, 'left');
        updateToolbarButtons();
        saveHistory(ActionTypes.COMPLETE);
      },
      () => container.dataset.alignment === 'left'
    );
    
    const alignCenterButton = createButton(
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3,3H21V5H3V3M7,7H17V9H7V7M3,11H21V13H3V11M7,15H17V17H7V15M3,19H21V21H3V19Z"/></svg>',
      'Align center',
      () => {
        saveHistory(ActionTypes.COMPLETE);
        applyImageAlignment(container, 'center');
        updateToolbarButtons();
        saveHistory(ActionTypes.COMPLETE);
      },
      () => container.dataset.alignment === 'center'
    );
    
    const alignRightButton = createButton(
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3,3H21V5H3V3M9,7H21V9H9V7M3,11H21V13H3V11M9,15H21V17H9V15M3,19H21V21H3V19Z"/></svg>',
      'Align right',
      () => {
        saveHistory(ActionTypes.COMPLETE);
        applyImageAlignment(container, 'right');
        updateToolbarButtons();
        saveHistory(ActionTypes.COMPLETE);
      },
      () => container.dataset.alignment === 'right'
    );
    
    // Delete button
    const deleteButton = createButton(
      '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>',
      'Delete image',
      () => {
        saveHistory(ActionTypes.COMPLETE);
        container.remove();
        document.querySelectorAll('.image-toolbar').forEach(t => t.remove());
        saveHistory(ActionTypes.COMPLETE);
      }
    );
    
    // Function to update button active states
    const updateToolbarButtons = () => {
      // Mode buttons
      inlineButton.style.backgroundColor = container.dataset.imageMode === 'inline' ? '#e8f0fe' : 'transparent';
      inlineButton.style.color = container.dataset.imageMode === 'inline' ? '#1a73e8' : 'inherit';
      
      wrapButton.style.backgroundColor = container.dataset.imageMode === 'floating' ? '#e8f0fe' : 'transparent';
      wrapButton.style.color = container.dataset.imageMode === 'floating' ? '#1a73e8' : 'inherit';
      
      // Alignment buttons
      alignLeftButton.style.backgroundColor = container.dataset.alignment === 'left' ? '#e8f0fe' : 'transparent';
      alignLeftButton.style.color = container.dataset.alignment === 'left' ? '#1a73e8' : 'inherit';
      
      alignCenterButton.style.backgroundColor = container.dataset.alignment === 'center' ? '#e8f0fe' : 'transparent';
      alignCenterButton.style.color = container.dataset.alignment === 'center' ? '#1a73e8' : 'inherit';
      
      alignRightButton.style.backgroundColor = container.dataset.alignment === 'right' ? '#e8f0fe' : 'transparent';
      alignRightButton.style.color = container.dataset.alignment === 'right' ? '#1a73e8' : 'inherit';
    };
    
    // Add buttons to toolbar
    toolbar.appendChild(inlineButton);
    toolbar.appendChild(wrapButton);
    toolbar.appendChild(createDivider());
    toolbar.appendChild(alignLeftButton);
    toolbar.appendChild(alignCenterButton);
    toolbar.appendChild(alignRightButton);
    toolbar.appendChild(createDivider());
    toolbar.appendChild(deleteButton);
    
    // Add toolbar to document
    document.body.appendChild(toolbar);
    
    // Update button states initially
    updateToolbarButtons();
    
    // Close toolbar when clicking elsewhere
    setTimeout(() => {
      const documentClickHandler = (e) => {
        if (!toolbar.contains(e.target) && !container.contains(e.target)) {
          container.classList.remove('selected');
          toolbar.remove();
          document.removeEventListener('click', documentClickHandler);
        }
      };
      
      document.addEventListener('click', documentClickHandler);
    }, 100);
  };

  const updateToolbarPosition = (container, toolbar = null) => {
    const toolbarEl = toolbar || document.querySelector('.image-toolbar');
    if (!toolbarEl) return;
    
    const rect = container.getBoundingClientRect();
    
    // Position the toolbar centered above the image
    toolbarEl.style.top = `${rect.top + window.scrollY - toolbarEl.offsetHeight - 10}px`;
    toolbarEl.style.left = `${rect.left + window.scrollX + (rect.width - toolbarEl.offsetWidth) / 2}px`;
  };

  const enableImageDragging = (container) => {
    const img = container.querySelector('img');
    if (!img) return;
    
    let isDragging = false;
    let startX, startY;
    let startLeft, startTop;
    
    const handleMouseDown = (e) => {
      // Only proceed if we're not clicking on a resize handle
      if (e.target.classList.contains('resize-handle')) return;
      
      // Only allow dragging in floating mode
      if (container.dataset.imageMode !== 'floating') {
        // If in inline mode, switch to floating mode on drag attempt
        container.dataset.imageMode = 'floating';
        prepareImageForDragging(container);
        // Save history for mode change
        saveHistory(ActionTypes.COMPLETE);
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Prepare for dragging
      isDragging = true;
      
      // Get the initial mouse position
      startX = e.clientX;
      startY = e.clientY;
      
      // Get the current computed position to ensure we have absolute values
      const computedStyle = window.getComputedStyle(container);
      const rect = container.getBoundingClientRect();
      
      // Set absolute positioning for dragging if not already
      if (computedStyle.position !== 'absolute') {
        container.style.position = 'absolute';
      }
      
      // Ensure we have explicit left/top values set
      if (!container.style.left) {
        container.style.left = `${rect.left + window.scrollX}px`;
      }
      if (!container.style.top) {
        container.style.top = `${rect.top + window.scrollY}px`;
      }
      
      // Get the explicit numeric values for left/top (strip 'px')
      startLeft = parseFloat(computedStyle.left);
      startTop = parseFloat(computedStyle.top);
      
      // If these are NaN, fallback to rect values
      if (isNaN(startLeft)) startLeft = rect.left + window.scrollX;
      if (isNaN(startTop)) startTop = rect.top + window.scrollY;
      
      // Ensure high z-index during drag
      container.style.zIndex = '100';
      
      // Save history before dragging
      saveHistory(ActionTypes.COMPLETE);
      
      // Add document-level event listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Calculate how far the mouse has moved
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // Apply the movement to the container's position
      container.style.left = `${startLeft + dx}px`;
      container.style.top = `${startTop + dy}px`;
      
      // Update toolbar if it exists
      updateToolbarPosition(container);
    };
    
    const handleMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      
      // Remove document-level event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Save history after dragging
      saveHistory(ActionTypes.COMPLETE);
    };
    
    // Add mouse down listener for dragging
    container.addEventListener('mousedown', handleMouseDown);
  };

  const handleOrientationChange = (pageNumber, orientation) => {
    // Update local state
    setPageOrientations(prev => ({
      ...prev,
      [pageNumber]: orientation
    }));
    
    // Dispatch event to notify EditorContent
    document.dispatchEvent(new CustomEvent('orientationchange', {
      detail: { pageNumber, orientation }
    }));
  };

  const handlePageSizeChange = (pageNumber, pageSize) => {
    // Update local state
    setPageSizes(prev => ({
      ...prev,
      [pageNumber]: pageSize
    }));
    
    // Dispatch event to notify EditorContent
    document.dispatchEvent(new CustomEvent('pagesizechange', {
      detail: { pageNumber, pageSize }
    }));
  };

  const handleCustomSizeChange = (pageNumber, width, height) => {
    // Update local state
    setCustomPageSizes(prev => ({
      ...prev,
      [pageNumber]: { width, height }
    }));
    
    // Dispatch event to notify EditorContent
    document.dispatchEvent(new CustomEvent('customsizechange', {
      detail: { pageNumber, width, height }
    }));
  };

  const handleIndent = (direction) => {
    console.log(`Indent button clicked: ${direction}`);
    
    // Save current selection before doing anything
    const selection = window.getSelection();
    let savedRange = null;
    let selectionText = '';
    
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
      selectionText = selection.toString();
      console.log('Saved current selection range with text:', selectionText);
    }
    
    // WORKAROUND: Force direct application of the indentation
    // This is a more reliable approach that bypasses the event system
    const contentArea = document.querySelector('[data-content-area="true"]');
    if (contentArea) {
      // Focus the content area
      contentArea.focus();
      
      // Restore selection if needed
      if (savedRange && selectionText) {
        try {
          console.log('Restoring selection range with direct DOM manipulation');
          selection.removeAllRanges();
          selection.addRange(savedRange);
        } catch(e) {
          console.error('Error restoring selection:', e);
        }
      }
      
      // Give the browser a moment to process the focus and selection
      setTimeout(() => {
        // Try three different ways to ensure the indentation is applied:
        
        // 1. Direct method: Use keyboard shortcuts 
        if (direction === 'increase') {
          document.execCommand('indent', false, null);
          
          // Simulate Ctrl+] as fallback 
          const shortcutEvent = new KeyboardEvent('keydown', {
            key: ']',
            code: 'BracketRight',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(shortcutEvent);
        } else {
          document.execCommand('outdent', false, null);
          
          // Simulate Ctrl+[ as fallback
          const shortcutEvent = new KeyboardEvent('keydown', {
            key: '[',
            code: 'BracketLeft',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(shortcutEvent);
        }
        
        // 2. Custom event approach
        console.log('Dispatching editor-indent event');
        document.dispatchEvent(new CustomEvent('editor-indent', { 
          detail: { 
            direction,
            fromToolbar: true,
            selectionData: selectionText ? {
              text: selectionText,
              startOffset: savedRange?.startOffset,
              endOffset: savedRange?.endOffset
            } : null
          } 
        }));
        
        // 3. Direct style manipulation fallback (for emergencies)
        if (selection && selection.rangeCount > 0 && selectionText) {
          try {
            const range = selection.getRangeAt(0);
            let container = range.commonAncestorContainer;
            
            // Get to element node if we're in text node
            if (container.nodeType === Node.TEXT_NODE) {
              container = container.parentNode;
            }
            
            // Find closest paragraph or block element
            while (container && 
                  !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.nodeName) &&
                  container.parentNode &&
                  container.parentNode.nodeType === Node.ELEMENT_NODE) {
              container = container.parentNode;
            }
            
            if (container && container.style) {
              console.log('Direct style manipulation fallback on element:', container);
              // Apply indentation directly through styles
              const currentMargin = parseInt(window.getComputedStyle(container).marginLeft) || 0;
              
              if (direction === 'increase') {
                container.style.marginLeft = (currentMargin + 40) + 'px'; // 40px = 0.5 inch
              } else if (currentMargin >= 40) {
                container.style.marginLeft = (currentMargin - 40) + 'px';
              }
            }
          } catch(e) {
            console.error('Error in direct style manipulation fallback:', e);
          }
        }
      }, 50); // Small delay to ensure focus is established
    } else {
      console.error('No content area found in the document!');
    }
  };

  // Function to calculate the best position for the tooltip relative to the link
  const calculateTooltipPosition = (linkRect) => {
    // Get the viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Find the document pages
    const docPages = document.querySelectorAll('[data-page]');
    let activePage = null;
    
    // Try to find which page contains this link
    for (const page of docPages) {
      const pageRect = page.getBoundingClientRect();
      // Check if the link overlaps with this page
      if (linkRect.top >= pageRect.top && 
          linkRect.bottom <= pageRect.bottom &&
          linkRect.left >= pageRect.left &&
          linkRect.right <= pageRect.right) {
        activePage = page;
        break;
      }
    }
    
    // Initial position - right below the link
    let top = linkRect.bottom + window.scrollY + 5;
    let left = linkRect.left + window.scrollX;
    
    // Width of the tooltip
    const tooltipWidth = 320;
    const tooltipHeight = 170; // Approximate
    
    // If we found the active page, make sure tooltip stays within page boundaries if possible
    if (activePage) {
      const pageRect = activePage.getBoundingClientRect();
      
      // Check if tooltip would go off the right edge of the page
      if (left + tooltipWidth > pageRect.right + window.scrollX - 20) {
        // Align with right edge of the link
        left = Math.max(pageRect.left + window.scrollX + 20, linkRect.right + window.scrollX - tooltipWidth);
      }
      
      // Check if tooltip would go off the bottom edge of the page
      if (top + tooltipHeight > pageRect.bottom + window.scrollY - 20) {
        // Position above the link
        top = linkRect.top + window.scrollY - tooltipHeight - 5;
      }
    } else {
      // Fallback if we couldn't find the page - use viewport boundaries
      
      // Check if tooltip would go off right edge of viewport
      if (left + tooltipWidth > viewportWidth + window.scrollX - 20) {
        left = Math.max(window.scrollX + 20, viewportWidth + window.scrollX - tooltipWidth - 20);
      }
      
      // Check if tooltip would go off bottom of viewport
      if (top + tooltipHeight > viewportHeight + window.scrollY - 20) {
        top = linkRect.top + window.scrollY - tooltipHeight - 5;
      }
    }
    
    // Make sure tooltip is always visible in the viewport
    left = Math.max(20 + window.scrollX, Math.min(viewportWidth - tooltipWidth - 20 + window.scrollX, left));
    top = Math.max(20 + window.scrollY, top);
    
    return { top, left };
  };

  return (
    <>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 1000,
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Left Arrow */}
        {isScrollable && (
          <IconButton
            onClick={() => handleScroll('left')}
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              backgroundColor: 'white',
              boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
            }}
          >
            <ChevronLeft />
          </IconButton>
        )}

        {/* Scrollable Toolbar Content */}
        <Box
          ref={toolbarRef}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '4px 8px',
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              height: '6px'
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '10px'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '10px',
              '&:hover': {
                background: '#a8a8a8'
              }
            },
            scrollbarWidth: 'thin',
            scrollbarColor: '#c1c1c1 #f1f1f1'
          }}
        >
          {/* Search Button */}
          <Tooltip title="Search" enterDelay={300}>
            <IconButton size="small" onClick={handleSearchClick}>
              <Search sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Undo/Redo */}
          <Tooltip title="Undo (Ctrl+Z)">
            <IconButton
              size="small"
              sx={{ padding: '4px' }}
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo sx={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <IconButton
              size="small"
              sx={{ padding: '4px' }}
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo sx={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Print */}
          <Tooltip title="Print" enterDelay={300}>
            <IconButton size="small" onClick={handlePrint}>
              <Print sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Font Selector */}
          <Box sx={{ 
            width: '140px', 
            flexShrink: 0,
            flexGrow: 0,
          }}> 
            <Select
              value={editorState.fontFamily}
              onChange={handleFontChange}
              size="small"
              sx={{
                width: '130px !important',
                height: '28px',
                fontSize: '14px',
                '& .MuiSelect-select': {
                  padding: '2px 8px',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  width: '130px !important',
                }
              }}
            >
              <MenuItem value="Arial">Arial</MenuItem>
              <MenuItem value="Times New Roman">Times New Roman</MenuItem>
              <MenuItem value="Courier New">Courier New</MenuItem>
              <MenuItem value="Helvetica">Helvetica</MenuItem>
              <MenuItem value="Verdana">Verdana</MenuItem>
              <MenuItem value="Georgia">Georgia</MenuItem>
              <MenuItem value="Palatino">Palatino</MenuItem>
              <MenuItem value="Garamond">Garamond</MenuItem>
              <MenuItem value="Bookman">Bookman</MenuItem>
              <MenuItem value="Comic Sans MS">Comic Sans MS</MenuItem>
              <MenuItem value="Trebuchet MS">Trebuchet MS</MenuItem>
              <MenuItem value="Arial Black">Arial Black</MenuItem>
              <MenuItem value="Impact">Impact</MenuItem>
              <MenuItem value="Lucida Sans">Lucida Sans</MenuItem>
              <MenuItem value="Tahoma">Tahoma</MenuItem>
            </Select>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Font Size */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            marginLeft: '8px',
            width: '65px'
          }}>
            <Select
              value={editorState.fontSize}
              onChange={handleFontSizeChange}
              size="small"
              sx={{
                height: '28px',
                fontSize: '14px',
                '& .MuiSelect-select': {
                  padding: '2px 8px',
                  paddingRight: '24px !important',
                }
              }}
            >
              {fontSizeOptions.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Text Formatting */}
          <Tooltip title="Bold">
            <IconButton 
              size="small" 
              onClick={() => toggleFormat('bold')}
              color={editorState.isBold ? 'primary' : 'default'}
            >
              <FormatBold />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Italic">
            <IconButton 
              size="small" 
              onClick={() => toggleFormat('italic')}
              color={editorState.isItalic ? 'primary' : 'default'}
            >
              <FormatItalic />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Underline">
            <IconButton 
              size="small" 
              onClick={() => toggleFormat('underline')}
              color={editorState.isUnderline ? 'primary' : 'default'}
            >
              <FormatUnderlined />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Color Pickers */}
          <Tooltip title="Text color" enterDelay={300}>
            <IconButton size="small" onClick={(e) => setFontColorAnchorEl(e.currentTarget)}>
              <FormatColorText sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Highlight color" enterDelay={300}>
            <IconButton size="small" onClick={(e) => setHighlightColorAnchorEl(e.currentTarget)}>
              <FormatColorFill sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />
          <AlignmentControls />
          <Divider orientation="vertical" flexItem />
          <ListControls />

          <Divider orientation="vertical" flexItem />
          
          <Tooltip title="Edit Header">
            <IconButton
              size="small"
              onClick={handleHeaderClick}
              color={editorState.isHeaderMode ? 'primary' : 'default'}
            >
              <HeaderIcon />
            </IconButton>
          </Tooltip>

          <TableButton />

          <Tooltip title="Edit Footer">
            <IconButton
              size="small"
              onClick={handleFooterClick}
              color={editorState.isFooterMode ? 'primary' : 'default'}
            >
              <FooterIcon />
            </IconButton>
          </Tooltip>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={editorState.differentFirstPage}
                onChange={(e) => {
                  // Implement different first page logic
                }}
              />
            }
            label="Different First Page"
            sx={{ ml: 2 }}
          />

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '1px',
            padding: '0 4px',
            borderLeft: '1px solid #e0e0e0',
            marginLeft: '4px'
          }}>
            <Tooltip title="Insert Hyperlink">
              <IconButton 
                size="small" 
                sx={{ padding: '4px' }}
                onClick={handleHyperlinkClick}
              >
                <Link sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <IconButton 
              size="small" 
              sx={{ padding: '4px' }}
              onClick={handleImageClick}
            >
              <Image sx={{ fontSize: '18px' }} />
            </IconButton>
          </Box>

          <Divider orientation="vertical" flexItem />
          
          <Tooltip title="Add Comment (select text first)">
            <IconButton
              size="small"
              sx={{ padding: '4px' }}
              onClick={handleCommentClick}
            >
              <Add sx={{ fontSize: '18px', }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Comments">
            <CommentButton />
          </Tooltip>

          <LineSpacingButton />

          <Tooltip title="Decrease Indent">
            <IconButton
              size="small"
              onClick={() => handleIndent('decrease')}
              sx={{ padding: '4px' }}
            >
              <FormatIndentDecrease sx={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Increase Indent">
            <IconButton
              size="small"
              onClick={() => handleIndent('increase')}
              sx={{ padding: '4px' }}
            >
              <FormatIndentIncrease sx={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Right Arrow */}
        {isScrollable && (
          <IconButton
            onClick={() => handleScroll('right')}
            sx={{
              position: 'sticky',
              right: 0,
              zIndex: 1,
              backgroundColor: 'white',
              boxShadow: '-2px 0 4px rgba(0,0,0,0.1)'
            }}
          >
            <ChevronRight />
          </IconButton>
        )}

        {/* Search/Replace Popover */}
        <SearchReplace
          anchorEl={searchAnchorEl}
          onClose={() => setSearchAnchorEl(null)}
        />
        <ColorPicker
          anchorEl={fontColorAnchorEl}
          onClose={() => setFontColorAnchorEl(null)}
          onColorSelect={handleFontColorSelect}
          recentColors={recentColors}
          type="text"
        />
        <ColorPicker
          anchorEl={highlightColorAnchorEl}
          onClose={() => setHighlightColorAnchorEl(null)}
          onColorSelect={handleHighlightColorSelect}
          recentColors={recentColors}
          type="highlight"
        />
      </Box>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)}>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="comment"
            label="Your comment"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCommentSubmit}
            variant="contained" 
            disabled={!commentText.trim()}
          >
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hyperlink Modal */}
      <HyperlinkModal
        open={hyperlinkModalOpen}
        onClose={() => setHyperlinkModalOpen(false)}
        onSave={applyHyperlink}
        selectedText={selectedTextForLink}
      />
    </>
  );
};

export default EditorToolbar; 