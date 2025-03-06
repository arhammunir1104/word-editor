import React, { createContext, useContext, useState } from 'react';
import { useEditorHistory } from './EditorHistoryContext';

const EditorContext = createContext(null);

// MS Word uses points (pt) for font sizes, we need to convert px to pt
const PX_TO_PT_RATIO = 0.75;  // 1px = 0.75pt
const PT_TO_PX_RATIO = 1.33;  // 1pt = 1.33px

export const EditorProvider = ({ children }) => {
  const [editorState, setEditorState] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    fontSize: 11,
    fontFamily: 'Arial',
    fontColor: '#000000',
    backgroundColor: 'transparent'
  });

  const { saveHistory, ActionTypes } = useEditorHistory();

  // Update formatting state based on current selection
  const updateFormattingState = () => {
    try {
      setEditorState(prev => ({
        ...prev,
        isBold: document.queryCommandState('bold'),
        isItalic: document.queryCommandState('italic'),
        isUnderline: document.queryCommandState('underline')
      }));
    } catch (error) {
      console.error('Error updating formatting state:', error);
    }
  };

  const toggleFormat = (format) => {
    const content = document.querySelector('[contenteditable="true"]');
    if (!content) return;

    // Save current state before making changes
    const currentContent = content.innerHTML;
    const currentState = { ...editorState };
    
    try {
      document.execCommand(format, false, null);
      
      // Update state after the change
      updateFormattingState();

      // Save both the content and formatting state to history
      saveHistory(ActionTypes.FORMAT, {
        content: currentContent,
        state: currentState,
        newContent: content.innerHTML,
        newState: {
          ...currentState,
          [`is${format.charAt(0).toUpperCase() + format.slice(1)}`]: 
            !currentState[`is${format.charAt(0).toUpperCase() + format.slice(1)}`]
        }
      });
    } catch (error) {
      console.error(`Error toggling ${format}:`, error);
    }
  };

  const changeFontSize = (newSize) => {
    const content = document.querySelector('[contenteditable="true"]');
    if (!content) return;

    // Save the current state before making changes
    const currentContent = content.innerHTML;
    const currentState = { ...editorState };
    
    try {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        // Convert point size to pixels for consistent display
        const pixelSize = Math.round(newSize * PT_TO_PX_RATIO);
        
        document.execCommand('fontSize', false, '7');
        const fontElements = document.getElementsByTagName('font');
        for (let i = 0; i < fontElements.length; i++) {
          if (fontElements[i].size === '7') {
            fontElements[i].removeAttribute('size');
            fontElements[i].style.fontSize = `${pixelSize}px`;
          }
        }
      }

      // Update state after the change
      setEditorState(prev => ({
        ...prev,
        fontSize: newSize
      }));

      // Save both the content and formatting state to history
      saveHistory(ActionTypes.FORMAT, {
        content: currentContent,
        state: currentState,
        newContent: content.innerHTML,
        newState: { ...currentState, fontSize: newSize }
      });
    } catch (error) {
      console.error('Font size change failed:', error);
    }
  };

  const changeFontFamily = (newFont) => {
    const content = document.querySelector('[contenteditable="true"]');
    if (!content) return;

    // Save the current state before making changes
    const currentContent = content.innerHTML;
    const currentState = { ...editorState };
    
    try {
      document.execCommand('fontName', false, newFont);
      
      // Update state after the change
      setEditorState(prev => ({
        ...prev,
        fontFamily: newFont
      }));

      // Save both the content and formatting state to history
      saveHistory(ActionTypes.FORMAT, {
        content: currentContent,
        state: currentState,
        newContent: content.innerHTML,
        newState: { ...currentState, fontFamily: newFont }
      });
    } catch (error) {
      console.error('Font family change failed:', error);
    }
  };

  const changeFontColor = (color) => {
    const content = document.querySelector('[contenteditable="true"]');
    if (!content) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Store the range for later restoration
    const range = selection.getRangeAt(0);
    const rangeStart = range.startOffset;
    const rangeEnd = range.endOffset;
    const rangeContainer = range.startContainer;

    // Save current state and content
    const currentContent = content.innerHTML;
    const currentState = { ...editorState };
    const currentRange = {
      start: rangeStart,
      end: rangeEnd,
      container: rangeContainer
    };

    try {
      // Apply color change
      document.execCommand('foreColor', false, color);

      // Get new content after change
      const newContent = content.innerHTML;

      // Update state
      const newState = {
        ...currentState,
        fontColor: color
      };
      setEditorState(newState);

      // Save to history with all necessary information
      saveHistory(ActionTypes.TEXT, {
        content: currentContent,
        state: currentState,
        newContent: newContent,
        newState: newState,
        range: currentRange,
        type: 'fontColor',
        color: color,
        previousColor: currentState.fontColor
      });

    } catch (error) {
      console.error('Font color change failed:', error);
      content.innerHTML = currentContent;
      setEditorState(currentState);
    }
  };

  const changeBackgroundColor = (color) => {
    const content = document.querySelector('[contenteditable="true"]');
    if (!content) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Store the range for later restoration
    const range = selection.getRangeAt(0);
    const rangeStart = range.startOffset;
    const rangeEnd = range.endOffset;
    const rangeContainer = range.startContainer;

    // Save current state and content
    const currentContent = content.innerHTML;
    const currentState = { ...editorState };
    const currentRange = {
      start: rangeStart,
      end: rangeEnd,
      container: rangeContainer
    };

    try {
      // Apply background color change
      document.execCommand('backColor', false, color);

      // Get new content after change
      const newContent = content.innerHTML;

      // Update state
      const newState = {
        ...currentState,
        backgroundColor: color
      };
      setEditorState(newState);

      // Save to history with all necessary information
      saveHistory(ActionTypes.TEXT, {
        content: currentContent,
        state: currentState,
        newContent: newContent,
        newState: newState,
        range: currentRange,
        type: 'backgroundColor',
        color: color,
        previousColor: currentState.backgroundColor
      });

    } catch (error) {
      console.error('Background color change failed:', error);
      content.innerHTML = currentContent;
      setEditorState(currentState);
    }
  };

  // Helper function to restore selection
  const restoreSelection = (range) => {
    if (!range || !range.container) return;
    
    const selection = window.getSelection();
    const newRange = document.createRange();
    
    try {
      newRange.setStart(range.container, range.start);
      newRange.setEnd(range.container, range.end);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } catch (error) {
      console.error('Failed to restore selection:', error);
    }
  };

  // Add event listener for selection changes
  React.useEffect(() => {
    const handleSelectionChange = () => {
      updateFormattingState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const value = {
    editorState,
    setEditorState,
    toggleFormat,
    changeFontSize,
    changeFontFamily,
    changeFontColor,
    changeBackgroundColor,
    restoreSelection,
    updateFormattingState
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === null) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}; 