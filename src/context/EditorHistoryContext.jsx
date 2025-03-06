import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

// Action types for history
export const ActionTypes = {
  TEXT: 'text',
  FORMAT: 'format',
  STRUCTURE: 'structure',
  COMPLETE: 'complete',
  COMMENT: 'COMMENT',
};

const EditorHistoryContext = createContext();

export const useEditorHistory = () => useContext(EditorHistoryContext);

export const EditorHistoryProvider = ({ children }) => {
  // Stacks for undo and redo operations
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const maxHistorySize = 50; // Limit stack size to prevent memory issues
  
  // Track whether we're currently performing an undo/redo to avoid re-capturing state
  const isUndoRedoInProgress = useRef(false);
  
  // Timer for debouncing history captures
  const debounceTimerRef = useRef(null);
  const debounceDelay = 500; // ms

  // Get all content from editor (all pages, headers, footers)
  const captureEditorState = () => {
    if (isUndoRedoInProgress.current) return null;
    
    const state = {
      timestamp: Date.now(),
      pages: {},
      comments: []
    };
    
    // Capture all page content areas
    const contentAreas = document.querySelectorAll('[data-content-area="true"]');
    contentAreas.forEach(area => {
      const pageNumber = area.dataset.page || '1';
      if (!state.pages[pageNumber]) {
        state.pages[pageNumber] = {};
      }
      state.pages[pageNumber].content = area.innerHTML;
    });
    
    // Capture headers
    const headerAreas = document.querySelectorAll('[data-header-area="true"]');
    headerAreas.forEach(area => {
      const pageNumber = area.dataset.page || '1';
      if (!state.pages[pageNumber]) {
        state.pages[pageNumber] = {};
      }
      state.pages[pageNumber].header = area.innerHTML;
    });
    
    // Capture footers
    const footerAreas = document.querySelectorAll('[data-footer-area="true"]');
    footerAreas.forEach(area => {
      const pageNumber = area.dataset.page || '1';
      if (!state.pages[pageNumber]) {
        state.pages[pageNumber] = {};
      }
      state.pages[pageNumber].footer = area.innerHTML;
    });
    
    // Capture selection state if applicable
    try {
    const selection = window.getSelection();
      if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
        // Store basic information about selection
        state.selection = {
          startContainer: getNodePath(range.startContainer),
          startOffset: range.startOffset,
          endContainer: getNodePath(range.endContainer),
          endOffset: range.endOffset
        };
      }
    } catch (error) {
      console.log('Could not save selection state:', error);
    }
    
    // Capture comment data
    const commentElements = document.querySelectorAll('.comment-highlight');
    commentElements.forEach(element => {
      const commentId = element.getAttribute('data-comment-id');
      const isResolved = element.getAttribute('data-resolved') === 'true';
      
      state.comments.push({
        id: commentId,
        highlightId: element.id,
        isResolved,
        text: element.textContent
      });
    });
    
    return state;
  };
  
  // Helper function to get the DOM path to a node
  const getNodePath = (node) => {
    const path = [];
    let current = node;
    
    // If it's a text node, start with its parent
    if (current.nodeType === 3) {
      path.push(Array.from(current.parentNode.childNodes).indexOf(current));
      current = current.parentNode;
    }
    
    // Traverse up the DOM tree
    while (current && current.nodeType === 1) {
      const parent = current.parentNode;
      
      // If we've reached a content/header/footer area, stop and record its ID
      if (
        current.hasAttribute('data-content-area') || 
        current.hasAttribute('data-header-area') || 
        current.hasAttribute('data-footer-area')
      ) {
        path.push({
          type: current.getAttribute('data-content-area') ? 'content' : 
                current.getAttribute('data-header-area') ? 'header' : 'footer',
          page: current.dataset.page || '1'
        });
        break;
      }
      
      // Otherwise, record the index of this node among its siblings
      if (parent) {
        path.push(Array.from(parent.childNodes).indexOf(current));
      }
      
      current = parent;
    }
    
    return path.reverse();
  };
  
  // Apply a saved state to the editor
  const applyEditorState = (state) => {
    if (!state) return;

    isUndoRedoInProgress.current = true;
    
    // Apply content to all pages
    Object.entries(state.pages).forEach(([pageNumber, pageState]) => {
      // Apply page content
      if (pageState.content !== undefined) {
        const contentArea = document.querySelector(`[data-content-area="true"][data-page="${pageNumber}"]`);
        if (contentArea) {
          contentArea.innerHTML = pageState.content;
          
          // Trigger input event to ensure any listeners update
          const event = new Event('input', { bubbles: true });
          contentArea.dispatchEvent(event);
        }
      }
      
      // Apply header content
      if (pageState.header !== undefined) {
        const headerArea = document.querySelector(`[data-header-area="true"][data-page="${pageNumber}"]`);
        if (headerArea) {
          headerArea.innerHTML = pageState.header;
          
          // Trigger input event
          const event = new Event('input', { bubbles: true });
          headerArea.dispatchEvent(event);
        }
      }
      
      // Apply footer content
      if (pageState.footer !== undefined) {
        const footerArea = document.querySelector(`[data-footer-area="true"][data-page="${pageNumber}"]`);
        if (footerArea) {
          footerArea.innerHTML = pageState.footer;
          
          // Trigger input event
          const event = new Event('input', { bubbles: true });
          footerArea.dispatchEvent(event);
        }
      }
    });

    // Restore selection if available
    if (state.selection) {
      try {
        const startNode = getNodeFromPath(state.selection.startContainer);
        const endNode = getNodeFromPath(state.selection.endContainer);
        
        if (startNode && endNode) {
          const range = document.createRange();
          range.setStart(startNode, state.selection.startOffset);
          range.setEnd(endNode, state.selection.endOffset);
          
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.log('Could not restore selection:', error);
      }
    }
    
    // Restore comment highlights if they were captured
    if (state.comments) {
      // This will be handled by the CommentContext since it watches the DOM
      // Just ensure the comment elements exist in the content
    }
    
    // Small delay to ensure all changes are processed
    setTimeout(() => {
      isUndoRedoInProgress.current = false;
    }, 50);
  };
  
  // Helper function to get a node from a saved path
  const getNodeFromPath = (path) => {
    if (!path || !path.length) return null;
    
    // The last item tells us which area to look in
    const areaInfo = path[0];
    if (typeof areaInfo === 'object') {
      // Find the specific content/header/footer area
      const selector = `[data-${areaInfo.type}-area="true"][data-page="${areaInfo.page}"]`;
      let node = document.querySelector(selector);
      
      // Navigate down the path
      for (let i = 1; i < path.length; i++) {
        if (!node || !node.childNodes) return null;
        
        const index = path[i];
        if (index >= 0 && index < node.childNodes.length) {
          node = node.childNodes[index];
        } else {
          return null;
        }
      }
      
      return node;
    }
    
    return null;
  };
  
  // Save the current state to history with debouncing
  const saveHistory = (actionType = ActionTypes.COMPLETE) => {
    if (isUndoRedoInProgress.current) return;
    
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer to capture state after debounce delay
    debounceTimerRef.current = setTimeout(() => {
      const currentState = captureEditorState();
      if (currentState) {
        setUndoStack(prev => {
          // If the stack is getting too large, remove the oldest states
          const newStack = [...prev, currentState];
          if (newStack.length > maxHistorySize) {
            return newStack.slice(newStack.length - maxHistorySize);
          }
          return newStack;
        });
        
        // Clear redo stack when new changes happen
      setRedoStack([]);
    }
    }, debounceDelay);
  };
  
  // Perform undo operation
  const undo = () => {
    if (undoStack.length === 0) return;
    
    const currentState = captureEditorState();
    
    // Get the last state from undo stack
    const lastState = undoStack[undoStack.length - 1];
    
    // Update stacks
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    
    if (currentState) {
    setRedoStack(prev => [...prev, currentState]);
    }
    
    // Apply the previous state
    applyEditorState(lastState);
  };
  
  // Perform redo operation
  const redo = () => {
    if (redoStack.length === 0) return;

    const currentState = captureEditorState();
    
    // Get the last state from redo stack
    const nextState = redoStack[redoStack.length - 1];
    
    // Update stacks
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    
    if (currentState) {
      setUndoStack(prev => [...prev, currentState]);
    }
    
    // Apply the next state
    applyEditorState(nextState);
  };
  
  // Initialize with the current state
  useEffect(() => {
    // Capture initial state after component mounts
    const initialState = captureEditorState();
    if (initialState) {
      setUndoStack([initialState]);
    }
  }, []);
  
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Handle Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack]);

  // Watch for contenteditable changes
  useEffect(() => {
    if (isUndoRedoInProgress.current) return;
    
    const observeChanges = () => {
      const editorAreas = document.querySelectorAll('[contenteditable="true"]');
      
      const observer = new MutationObserver((mutations) => {
        if (isUndoRedoInProgress.current) return;
        
        // Group mutations and only save once
        const hasTextChanges = mutations.some(
          mutation => mutation.type === 'characterData' || mutation.type === 'childList'
        );
        
        if (hasTextChanges) {
          saveHistory(ActionTypes.COMPLETE);
        }
      });
      
      editorAreas.forEach(area => {
        observer.observe(area, {
          characterData: true,
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      });
      
      return observer;
    };
    
    const observer = observeChanges();
    
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);
  
  // Expose can undo/redo state for UI
  const canUndo = undoStack.length > 1; // Keep at least one state in history
  const canRedo = redoStack.length > 0;
  
  return (
    <EditorHistoryContext.Provider
      value={{
    saveHistory,
    undo,
    redo,
        canUndo,
        canRedo,
        ActionTypes
      }}
    >
      {children}
    </EditorHistoryContext.Provider>
  );
};

export default EditorHistoryContext; 