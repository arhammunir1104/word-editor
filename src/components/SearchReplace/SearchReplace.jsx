import React, { useState } from 'react';
import { Box, TextField, Button, Popover } from '@mui/material';
import { useEditor } from '../../context/EditorContext';
import { useEditorHistory } from '../../context/EditorHistoryContext';

const SearchReplace = ({ anchorEl, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState([]);
  
  const { pageContents, pages } = useEditor();
  const { saveHistory, ActionTypes } = useEditorHistory();

  // Remove any existing highlights
  const clearHighlights = () => {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const text = highlight.textContent;
      highlight.parentNode.replaceChild(document.createTextNode(text), highlight);
    });
  };

  const handleSearch = () => {
    if (!searchText) return;
    
    clearHighlights();
    const newMatches = [];
    
    // Get all content areas
    const pages = document.querySelectorAll('[data-content-area="true"]');
    
    pages.forEach(page => {
      const pageNumber = parseInt(page.getAttribute('data-page'));
      const content = page.textContent;  // Changed from innerHTML to textContent
      let startIndex = 0;
      
      while (true) {
        const index = content.toLowerCase().indexOf(searchText.toLowerCase(), startIndex);
        if (index === -1) break;
        
        newMatches.push({ 
          pageNumber,
          element: page,
          index: index,
          originalContent: content
        });
        startIndex = index + searchText.length;
      }
    });

    setMatches(newMatches);
    
    if (newMatches.length > 0) {
      setCurrentMatch(0);
      highlightAllMatches(newMatches);  // Changed to highlight all matches
    }
  };

  // New function to highlight all matches
  const highlightAllMatches = (matches) => {
    clearHighlights();
    
    matches.forEach(match => {
      const content = match.originalContent;
      let html = match.element.innerHTML;
      
      // Create a temporary div to handle HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const textContent = tempDiv.textContent;
      
      // Find the correct position in HTML
      let currentIndex = 0;
      let htmlIndex = 0;
      
      while (currentIndex < match.index) {
        if (textContent[currentIndex] === html[htmlIndex]) {
          currentIndex++;
        }
        htmlIndex++;
      }
      
      const before = html.slice(0, htmlIndex);
      const after = html.slice(htmlIndex + searchText.length);
      
      match.element.innerHTML = `${before}<span class="search-highlight" style="background-color: yellow !important; color: black !important;">${searchText}</span>${after}`;
    });

    // Scroll to current match
    const currentHighlight = matches[currentMatch]?.element.querySelector('.search-highlight');
    if (currentHighlight) {
      currentHighlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const handleReplace = () => {
    if (currentMatch === -1 || !matches.length) return;
    
    const match = matches[currentMatch];
    if (!match || !match.element) return;

    // Capture state before replacement
    saveHistory(ActionTypes.TEXT, match.element.getAttribute('data-area-type') || 'content');

    const content = match.originalContent;
    const newContent = 
      content.slice(0, match.index) + 
      replaceText + 
      content.slice(match.index + searchText.length);

    // Update the content in the editor
    match.element.innerHTML = newContent;

    // Trigger the onInput event to update the state
    const inputEvent = new Event('input', { bubbles: true });
    match.element.dispatchEvent(inputEvent);

    // Update matches after replacement
    handleSearch();
  };

  const handleReplaceAll = () => {
    if (!matches.length) return;

    // Capture state before replacement
    saveHistory(ActionTypes.TEXT, 'content');

    // Get all content areas
    const pages = document.querySelectorAll('[data-content-area="true"]');
    let changesApplied = false;
    
    pages.forEach(page => {
      let content = page.textContent;
      const searchRegex = new RegExp(searchText, 'gi');
      const newContent = content.replace(searchRegex, replaceText);
      
      if (content !== newContent) {
        changesApplied = true;
        page.textContent = newContent;
        
        // Trigger input event to update state
        const inputEvent = new Event('input', { bubbles: true });
        page.dispatchEvent(inputEvent);
      }
    });

    // If any changes were made, save to history
    if (changesApplied) {
      saveHistory(ActionTypes.TEXT, 'content');
    }

    // Clear matches and highlights
    setMatches([]);
    setCurrentMatch(-1);
    clearHighlights();
  };

  const handleNext = () => {
    if (currentMatch < matches.length - 1) {
      setCurrentMatch(currentMatch + 1);
      highlightAllMatches(matches.slice(currentMatch + 1));
    }
  };

  const handlePrevious = () => {
    if (currentMatch > 0) {
      setCurrentMatch(currentMatch - 1);
      highlightAllMatches(matches.slice(0, currentMatch));
    }
  };

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
      onClose={onClose}
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