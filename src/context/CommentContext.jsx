import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorHistory } from './EditorHistoryContext';

const CommentContext = createContext();

export const useComments = () => useContext(CommentContext);

let lastSavedRange = null; // Global variable to preserve selection

export const CommentProvider = ({ children }) => {
  const [comments, setComments] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [selectedTextRange, setSelectedTextRange] = useState(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  // Use a ref to track if initial setup has been done
  const setupDoneRef = useRef(false);
  
  const { saveHistory, ActionTypes } = useEditorHistory();
  
  // Apply comment highlights to document
  useEffect(() => {
    // First remove all existing highlights to prevent duplicates
    const removeHighlights = () => {
      const highlights = document.querySelectorAll('.comment-highlight');
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
          // Replace the highlight with its text content
          const text = document.createTextNode(highlight.textContent || '');
          parent.replaceChild(text, highlight);
          // Normalize to combine adjacent text nodes
          parent.normalize();
        }
      });
    };
    
    // Apply all comment highlights
    const applyHighlights = () => {
      comments.forEach(comment => {
        // Skip if no text to highlight or if no highlightId
        if (!comment.highlightedText || !comment.highlightId) return;
        
        const contentAreas = document.querySelectorAll('[data-content-area="true"]');
        
        // Try to find the text in the content areas
        contentAreas.forEach(contentArea => {
          const pageNumber = parseInt(contentArea.getAttribute('data-page') || '1');
          if (pageNumber !== comment.pageNumber) return;
          
          // Search for the exact text within the content area
          const walkDOM = (node, func) => {
            if (node.nodeType === 3) { // Text node
              func(node);
            } else if (node.nodeType === 1) { // Element node
              // Skip if already processed or if it's a comment highlight
              if (node.classList && node.classList.contains('comment-highlight')) return;
              for (let i = 0; i < node.childNodes.length; i++) {
                walkDOM(node.childNodes[i], func);
              }
            }
          };
          
          // Track if we've found and highlighted the text
          let found = false;
          
          walkDOM(contentArea, (textNode) => {
            if (found) return; // Skip if already found
            
            const nodeText = textNode.nodeValue;
            const index = nodeText.indexOf(comment.highlightedText);
              
              if (index >= 0) {
                // Split the text node and insert highlight
              const range = document.createRange();
              range.setStart(textNode, index);
              range.setEnd(textNode, index + comment.highlightedText.length);
              
              // Create highlight span
                const highlightSpan = document.createElement('span');
                highlightSpan.id = comment.highlightId;
                highlightSpan.className = 'comment-highlight';
                highlightSpan.dataset.commentId = comment.id;
                if (comment.resolved) {
                  highlightSpan.classList.add('comment-resolved');
                }
                
              // Replace selection with highlight span
              range.surroundContents(highlightSpan);
              
              // Add click event listener
              highlightSpan.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveComment(comment.id);
                  setShowCommentsSidebar(true);
                });
              
              found = true;
          }
          });
        });
      });
    };
    
    // Apply highlighting
    removeHighlights();
    applyHighlights();
    
    // Add global CSS for comment highlights
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
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [comments]);
  
  // Modified version of saveSelectionRange
  const saveSelectionRange = (range) => {
    if (range) {
      const clonedRange = range.cloneRange();
      setSelectedTextRange(clonedRange);
      lastSavedRange = clonedRange;
    }
  };
  
  // New function to get the current selection and save it
  const captureCurrentSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range && !range.collapsed) {
        lastSavedRange = range.cloneRange();
        setSelectedTextRange(range);
        return range;
      }
    }
    
    // Return last saved range if no current selection
    return lastSavedRange;
  }, []);

  // Monitor for text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0 && selection.rangeCount > 0) {
        setSelectedTextRange(selection.getRangeAt(0));
      } else {
        setSelectedTextRange(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Modified version of addComment
  const addComment = useCallback((text) => {
    console.log("Adding comment with text:", text);
    
    // Use lastSavedRange instead of selectedTextRange
    const range = lastSavedRange || selectedTextRange;
    
    if (!range) {
      console.error("Cannot add comment: No selection or empty text");
      return false;
    }
    
    try {
      const highlightedText = range.toString();
      if (!highlightedText.trim()) {
        console.error("Cannot add comment: Empty text");
        return false;
      }
      
      // Generate unique IDs
      const commentId = uuidv4();
      const highlightId = `highlight-${commentId}`;
      
      // Create a span element for highlighting with strong inline styles
      const span = document.createElement('span');
      span.id = highlightId;
      span.className = 'comment-highlight';
      span.dataset.commentId = commentId;
      
      // Apply styles directly to ensure they take effect
      span.style.backgroundColor = '#FFEB3B80'; // Yellow with transparency
      span.style.borderBottom = '2px solid #FFC107'; // Gold border bottom
      span.style.cursor = 'pointer';
      span.style.display = 'inline !important';
      
      // Extract contents and wrap in span
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      
      // Create the comment object
      const newComment = {
        id: commentId,
        highlightId,
        text,
        highlightedText,
        resolved: false,
        user: {
          name: 'You',
          avatar: '',
        },
        replies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Add to comments array
      setComments(prev => [...prev, newComment]);
      setActiveComment(commentId);
      setShowCommentsSidebar(true);
      
      // Clear the selection
      window.getSelection().removeAllRanges();
      
      return true;
    } catch (error) {
      console.error("Error adding comment:", error);
      return false;
    }
  }, [selectedTextRange, setSelectedTextRange, setComments]);

  // Edit an existing comment
  const editComment = useCallback((commentId, newText) => {
    console.log("Editing comment:", commentId, newText);
    saveHistory(ActionTypes.COMPLETE);
    
    setComments(prev => prev.map(comment => 
      comment.id === commentId
        ? { ...comment, text: newText, updatedAt: new Date().toISOString() }
        : comment
    ));
    
    saveHistory(ActionTypes.COMPLETE);
  }, [saveHistory, ActionTypes]);

  // Delete a comment
  const deleteComment = useCallback((commentId) => {
    console.log("Deleting comment:", commentId);
    saveHistory(ActionTypes.COMPLETE);
    
    // Get the comment to find the highlight
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      // Remove the highlight
      const highlight = document.getElementById(comment.highlightId);
      if (highlight) {
        const parent = highlight.parentNode;
        if (parent) {
          while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
          }
          parent.removeChild(highlight);
        }
      }
      
      // Remove the comment
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // If this was the active comment, clear it
      if (activeComment === commentId) {
        setActiveComment(null);
      }
    }
    
    saveHistory(ActionTypes.COMPLETE);
  }, [comments, activeComment, saveHistory, ActionTypes]);

  // Delete all comments
  const deleteAllComments = useCallback(() => {
    console.log("Deleting all comments");
    saveHistory(ActionTypes.COMPLETE);
    
    // Remove all highlights
    const highlights = document.querySelectorAll('.comment-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        while (highlight.firstChild) {
          parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
      }
    });
    
    // Clear all comments
    setComments([]);
    setActiveComment(null);
    
    saveHistory(ActionTypes.COMPLETE);
  }, [saveHistory, ActionTypes]);

  // Toggle the resolved status of a comment
  const toggleResolveComment = useCallback((commentId) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        // Find the highlight element and update its class
        const highlightEl = document.getElementById(comment.highlightId);
        if (highlightEl) {
          if (comment.resolved) {
            // Changing from resolved to active
            highlightEl.classList.remove('resolved');
            highlightEl.classList.add('active');
          } else {
            // Changing from active to resolved
            highlightEl.classList.remove('active');
            highlightEl.classList.add('resolved');
          }
        }
        
        // Return the updated comment
        return { 
          ...comment, 
          resolved: !comment.resolved,
          updatedAt: new Date().toISOString()
        };
      }
      return comment;
    }));
  }, [setComments]);

  // Add a reply to a comment
  const addReply = useCallback((commentId, replyText) => {
    console.log("Adding reply to comment:", commentId, replyText);
    if (!replyText.trim()) return;
    
    saveHistory(ActionTypes.COMPLETE);
    
    const replyId = uuidv4();
    setComments(prev => prev.map(comment => 
      comment.id === commentId
        ? { 
            ...comment, 
            replies: [
              ...comment.replies,
              {
                id: replyId,
                text: replyText,
                createdAt: new Date().toISOString(),
                user: {
                  name: 'You',
                  avatar: ''
                }
              }
            ],
            updatedAt: new Date().toISOString()
          }
        : comment
    ));
    
    saveHistory(ActionTypes.COMPLETE);
  }, [saveHistory, ActionTypes]);

  // Navigate to the next comment
  const goToNextComment = useCallback(() => {
    if (comments.length === 0) return;
    
    let index = -1;
    if (activeComment) {
      index = comments.findIndex(c => c.id === activeComment);
    }
    
    const nextIndex = (index + 1) % comments.length;
    const nextComment = comments[nextIndex];
    
    setActiveComment(nextComment.id);
    scrollToComment(nextComment.highlightId);
  }, [comments, activeComment]);

  // Navigate to the previous comment
  const goToPrevComment = useCallback(() => {
    if (comments.length === 0) return;
    
    let index = comments.length;
    if (activeComment) {
      index = comments.findIndex(c => c.id === activeComment);
    }
    
    const prevIndex = (index - 1 + comments.length) % comments.length;
    const prevComment = comments[prevIndex];
    
    setActiveComment(prevComment.id);
    scrollToComment(prevComment.highlightId);
  }, [comments, activeComment]);

  // Scroll to a specific comment's highlight
  const scrollToComment = useCallback((highlightId) => {
    const highlight = document.getElementById(highlightId);
    if (highlight) {
      highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Flash the highlight to make it more visible
      highlight.classList.add('flash-highlight');
      setTimeout(() => {
        highlight.classList.remove('flash-highlight');
      }, 1500);
    }
  }, []);

  // Apply global CSS for highlights
  useEffect(() => {
    if (!setupDoneRef.current) {
      // Create and append the style element for comment highlights
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        /* Base highlight style */
        .comment-highlight {
          display: inline !important;
          padding: 1px 0;
          position: relative;
          border-radius: 2px;
        }
        
        /* Active comment highlight */
        .comment-highlight.active {
          background-color: #FFEF99 !important;
          border-bottom: 1px solid #FFD700 !important;
        }
        
        /* Resolved comment highlight */
        .comment-highlight.resolved {
          background-color: #E0E0E0 !important;
          border-bottom: 1px solid #BDBDBD !important;
        }
        
        /* Highlighted on hover/focus */
        .comment-highlight:hover, .comment-highlight.focused {
          background-color: #FFE082 !important;
          outline: 1px solid #FFC107 !important;
        }
      `;
      document.head.appendChild(styleEl);
      
      setupDoneRef.current = true;
      return () => {
        if (styleEl.parentNode) {
          document.head.removeChild(styleEl);
        }
      };
    }
  }, []);

  // Apply highlight click handlers
  useEffect(() => {
    // Log the current comments for debugging
    console.log("Current comments:", comments);
    
    // Add click handlers to highlights
    const highlights = document.querySelectorAll('.comment-highlight');
    highlights.forEach(highlight => {
      // Remove existing handlers to prevent duplicates
      const newHighlight = highlight.cloneNode(true);
      highlight.parentNode.replaceChild(newHighlight, highlight);
      
      newHighlight.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentId = newHighlight.dataset.commentId;
        if (commentId) {
          console.log("Highlight clicked, activating comment:", commentId);
          setActiveComment(commentId);
          setShowCommentsSidebar(true);
        }
      });
    });
  }, [comments]);

  // Add this useEffect to handle clicking on comment highlights:
  useEffect(() => {
    // Handler for clicking on highlighted comments
    const handleHighlightClick = (event) => {
      const highlightSpan = event.target.closest('.comment-highlight');
      if (highlightSpan) {
        const commentId = highlightSpan.dataset.commentId;
        if (commentId) {
          console.log("Comment highlight clicked:", commentId);
          
          // Find the comment and activate it
          const comment = comments.find(c => c.id === commentId);
          if (comment) {
            // Set as active and show the sidebar
            setActiveComment(commentId);
            setShowCommentsSidebar(true);
          }
        }
      }
    };
    
    // Add the event listener
    document.addEventListener('click', handleHighlightClick);
    
    // Clean up when component unmounts
    return () => {
      document.removeEventListener('click', handleHighlightClick);
    };
  }, [comments, setActiveComment, setShowCommentsSidebar]);

  // The context value to provide
  const value = {
    comments,
    activeComment,
    showCommentsSidebar,
    selectedTextRange,
    setShowCommentsSidebar,
    setActiveComment,
    saveSelectionRange,
    captureCurrentSelection,
    addComment,
    editComment,
    deleteComment,
    deleteAllComments,
    toggleResolveComment,
    addReply,
    goToNextComment,
    goToPrevComment,
    scrollToComment,
    isAddingComment,
    setIsAddingComment
  };

  return (
    <CommentContext.Provider value={value}>
      {children}
    </CommentContext.Provider>
  );
};

export default CommentContext; 