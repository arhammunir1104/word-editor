import React, { useState } from 'react';
import { Box, TextField, Button, Popover } from '@mui/material';
import { useEditor } from '../../context/EditorContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const SearchReplace = ({ anchorEl, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState([]);
  const [matchRanges, setMatchRanges] = useState([]);
  
  const { pageContents, pages } = useEditor();
  const { saveHistory, ActionTypes } = useEditorHistory();

  // Remove any existing highlights
  const clearHighlights = () => {
    // First clear any existing selection
    window.getSelection().removeAllRanges();
    
    // Then remove any highlight spans that might exist
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const text = highlight.textContent;
      highlight.parentNode.replaceChild(document.createTextNode(text), highlight);
    });
  };

  const handleSearch = () => {
    if (!searchText) return;
    
    clearHighlights();
    
    // Get all content areas
    const contentAreas = document.querySelectorAll('[data-content-area="true"]');
    const newMatches = [];
    const ranges = [];
    
    contentAreas.forEach(contentArea => {
      // Use TreeWalker to find only text nodes (this preserves formatting)
      const walker = document.createTreeWalker(
        contentArea,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        // Skip text nodes in system elements like comment markers
        if (textNode.parentNode.classList && 
            (textNode.parentNode.classList.contains('comment-highlight') || 
             textNode.parentNode.classList.contains('search-highlight'))) {
          continue;
        }
        
        const text = textNode.nodeValue;
        const searchLower = searchText.toLowerCase();
        let startPos = text.toLowerCase().indexOf(searchLower);
        
        while (startPos !== -1) {
          // Create a DOM Range for this match
          const range = document.createRange();
          range.setStart(textNode, startPos);
          range.setEnd(textNode, startPos + searchText.length);
          
          // Store the range for later
          ranges.push(range);
          
          // Store match info
          newMatches.push({
            range: range.cloneRange(), // Clone to ensure we have unique ranges
            pageNumber: parseInt(contentArea.getAttribute('data-page') || '1'),
            element: contentArea
          });
          
          // Look for next occurrence in this same text node
          startPos = text.toLowerCase().indexOf(searchLower, startPos + 1);
        }
      }
    });

    setMatches(newMatches);
    setMatchRanges(ranges);
    
    if (newMatches.length > 0) {
      setCurrentMatch(0);
      highlightAllMatches(newMatches); // Changed to highlight all matches
      // Also scroll to first match
      scrollToMatch(newMatches[0]);
    }
  };

  // Add new function to highlight all matches
  const highlightAllMatches = (matchesToHighlight) => {
    // Clear any previous selection first
    window.getSelection().removeAllRanges();
    
    // Clear existing highlights
    clearHighlights();
    
    // Create highlight spans for all matches
    matchesToHighlight.forEach(match => {
      const range = match.range;
      
      // Create a highlight span
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'search-highlight';
      highlightSpan.style.backgroundColor = 'yellow';
      highlightSpan.style.color = 'black';
      
      try {
        // Extract the content and wrap it in our highlight span
        const content = range.extractContents();
        highlightSpan.appendChild(content);
        range.insertNode(highlightSpan);
      } catch (error) {
        console.error('Error highlighting match:', error);
      }
    });
  };

  // Scroll to a specific match
  const scrollToMatch = (match) => {
    if (!match) return;
    
    // Find the highlight element from this match
    let highlightElem;
    try {
      // Try to find by range position
      const container = match.range.startContainer.parentNode;
      highlightElem = container.querySelector('.search-highlight') || container;
    } catch (e) {
      // Fallback
      highlightElem = document.querySelector('.search-highlight');
    }
    
    // Scroll to the highlight
    if (highlightElem && highlightElem.scrollIntoView) {
      highlightElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleReplace = () => {
    if (matches.length === 0 || currentMatch < 0 || currentMatch >= matches.length) return;
    
    // Save history before modifying content
    saveHistory(ActionTypes.COMPLETE);
    
    // Get all highlights
    const highlights = document.querySelectorAll('.search-highlight');
    
    // Check if we have a valid current highlight
    if (highlights[currentMatch]) {
      const currentHighlight = highlights[currentMatch];
      
      // Replace the text in the highlight
      currentHighlight.textContent = replaceText;
      
      // Trigger input event to update state
      const inputEvent = new Event('input', { bubbles: true });
      currentHighlight.closest('[data-content-area="true"]').dispatchEvent(inputEvent);
      
      // Save history after modification
      saveHistory(ActionTypes.COMPLETE);
      
      // Refresh the search to update matches
      handleSearch();
    }
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    
    // Save history before batch modifications
    saveHistory(ActionTypes.COMPLETE);
    
    // Clone the matches array since we'll be modifying the DOM
    const matchesToReplace = [...matches];
    
    // Replace all matches in reverse order (to avoid position shifts)
    for (let i = matchesToReplace.length - 1; i >= 0; i--) {
      const match = matchesToReplace[i];
      
      // Replace the content in the range
      match.range.deleteContents();
      match.range.insertNode(document.createTextNode(replaceText));
      
      // Trigger input event to update state for this element
      const inputEvent = new Event('input', { bubbles: true });
      match.element.dispatchEvent(inputEvent);
    }
    
    // Save history after all modifications
    saveHistory(ActionTypes.COMPLETE);
    
    // Clear matches and reset
    setMatches([]);
    setMatchRanges([]);
    setCurrentMatch(0);
    clearHighlights();
  };

  const handleNext = () => {
    if (currentMatch < matches.length - 1) {
      const nextMatch = currentMatch + 1;
      setCurrentMatch(nextMatch);
      
      // Get all highlights
      const highlights = document.querySelectorAll('.search-highlight');
      
      // Remove current highlight indicator
      highlights.forEach(h => {
        h.style.backgroundColor = 'yellow';
        h.style.outline = 'none';
      });
      
      // Add current highlight indicator to the selected match
      if (highlights[nextMatch]) {
        highlights[nextMatch].style.backgroundColor = '#FFA500'; // Orange for current match
        highlights[nextMatch].style.outline = '2px solid #FF4500'; // Red outline
        highlights[nextMatch].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handlePrevious = () => {
    if (currentMatch > 0) {
      const prevMatch = currentMatch - 1;
      setCurrentMatch(prevMatch);
      
      // Get all highlights
      const highlights = document.querySelectorAll('.search-highlight');
      
      // Remove current highlight indicator
      highlights.forEach(h => {
        h.style.backgroundColor = 'yellow';
        h.style.outline = 'none';
      });
      
      // Add current highlight indicator to the selected match
      if (highlights[prevMatch]) {
        highlights[prevMatch].style.backgroundColor = '#FFA500'; // Orange for current match
        highlights[prevMatch].style.outline = '2px solid #FF4500'; // Red outline
        highlights[prevMatch].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Cleanup when closing
  React.useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, []);

  // Update the CSS style in useEffect
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .search-highlight {
        background-color: yellow !important;
        color: black !important;
        padding: 2px 0;
        margin: 0;
        display: inline;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={() => {
        clearHighlights();
        onClose();
      }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          size="small"
          label="Find"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <TextField
          size="small"
          label="Replace with"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={handleSearch}>
            Find
          </Button>
          <Button size="small" onClick={handlePrevious} disabled={currentMatch <= 0}>
            Previous
          </Button>
          <Button size="small" onClick={handleNext} disabled={currentMatch >= matches.length - 1}>
            Next
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={handleReplace} disabled={matches.length === 0}>
            Replace
          </Button>
          <Button size="small" onClick={handleReplaceAll} disabled={matches.length === 0}>
            Replace All
          </Button>
        </Box>
        {matches.length > 0 && (
          <Box sx={{ textAlign: 'center', fontSize: '0.875rem' }}>
            {currentMatch + 1} of {matches.length} matches
          </Box>
        )}
      </Box>
    </Popover>
  );
};

export default SearchReplace; 