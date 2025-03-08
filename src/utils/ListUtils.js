/**
 * Comprehensive utilities for list handling in the editor
 */

/**
 * Utility functions for Google Docs-style list handling
 */

/**
 * Get the appropriate bullet style for a specific nesting level
 * @param {number} level - Nesting level (1-based)
 * @returns {string} CSS list-style-type
 */
export const getBulletStyleForLevel = (level) => {
  const bulletStyles = ['disc', 'circle', 'square', '➤', '-', '✦'];
  return bulletStyles[(level - 1) % bulletStyles.length];
};

/**
 * Get the appropriate number style for a specific nesting level
 * @param {number} level - Nesting level (1-based)
 * @returns {string} CSS list-style-type
 */
export const getNumberStyleForLevel = (level) => {
  const numberStyles = ['decimal', 'lower-alpha', 'lower-roman', 'decimal', 'lower-alpha', 'lower-roman'];
  return numberStyles[(level - 1) % numberStyles.length];
};

/**
 * Find the root list containing a list item
 * @param {HTMLElement} listItem - The list item
 * @returns {HTMLElement|null} - The root list
 */
export const findRootList = (listItem) => {
  if (!listItem || listItem.nodeName !== 'LI') return null;
  
  let list = listItem.parentNode;
  if (!list || (list.nodeName !== 'UL' && list.nodeName !== 'OL')) return null;
  
  // Find the topmost list
  while (list.parentNode && list.parentNode.nodeName === 'LI') {
    list = list.parentNode.parentNode;
  }
  
  return list;
};

/**
 * Find the editable content area
 * @param {Node} node - Starting node
 * @returns {HTMLElement|null} - Content area element
 */
export const findContentArea = (node) => {
  if (!node) return null;
  
  let current = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      if (current.hasAttribute && current.hasAttribute('data-content-area')) {
        return current;
      }
      
      // Also check for page class with contenteditable
      if (current.classList && 
          current.classList.contains('page') && 
          current.getAttribute('contenteditable') === 'true') {
        return current;
      }
    }
    
    current = current.parentNode;
    if (!current || current.nodeName === 'BODY') break;
  }
  
  return null;
};

/**
 * Check if a list item is empty
 * @param {HTMLElement} listItem - The list item
 * @returns {boolean} - True if empty
 */
export const isListItemEmpty = (listItem) => {
  if (!listItem || listItem.nodeName !== 'LI') return true;
  
  const content = listItem.textContent.trim();
  return content === '' || listItem.innerHTML === '<br>' || listItem.innerHTML === '';
};

/**
 * Create a new empty list item
 * @param {string} listType - 'ul' or 'ol'
 * @param {string} bulletStyle - CSS list-style-type
 * @returns {Object} - The new list, list item and paragraph
 */
export const createEmptyListItem = (listType = 'ul', bulletStyle = 'disc') => {
  const listItem = document.createElement('li');
  listItem.style.listStyleType = bulletStyle || 'inherit';
  listItem.innerHTML = '<br>';
  return listItem;
};

/**
 * Find the list item parent of a node
 * @param {Node} node - Starting node
 * @returns {HTMLElement|null} - List item parent or null
 */
export const findListItemParent = (list) => {
  if (!list || (list.nodeName !== 'UL' && list.nodeName !== 'OL')) return null;
  
  const parent = list.parentNode;
  if (parent && parent.nodeName === 'LI') {
    return parent;
  }
  
  return null;
};

/**
 * Get the nesting level of a list item
 * @param {HTMLElement} listItem - List item element
 * @returns {number} - Nesting level (1-based)
 */
export const getListLevel = (listItem) => {
  if (!listItem || listItem.nodeName !== 'LI') return 0;
  
  let level = 1;
  let current = listItem.parentNode;
  
  while (current) {
    if (current.parentNode && current.parentNode.nodeName === 'LI') {
      level++;
      current = current.parentNode.parentNode;
    } else {
      break;
    }
  }
  
  return level;
};

/**
 * Update list styles based on nesting level
 * @param {HTMLElement} rootList - The root list element (UL/OL)
 */
export const updateListStyles = (rootList) => {
  if (!rootList || (rootList.nodeName !== 'UL' && rootList.nodeName !== 'OL')) return;
  
  const isNumbered = rootList.nodeName === 'OL';
  
  // Process list items recursively
  const processListRecursively = (list, level = 1) => {
    Array.from(list.children).forEach(item => {
      if (item.nodeName !== 'LI') return;
      
      // Update style based on level and list type
      if (isNumbered) {
        item.style.listStyleType = getNumberStyleForLevel(level);
      } else {
        item.style.listStyleType = getBulletStyleForLevel(level);
      }
      
      // Process nested lists
      Array.from(item.children).forEach(child => {
        if (child.nodeName === 'UL' || child.nodeName === 'OL') {
          processListRecursively(child, level + 1);
        }
      });
    });
  };
  
  processListRecursively(rootList, 1);
};

/**
 * Check if cursor is at start of node
 * @param {Range} range - Selection range
 * @param {Node} node - Node to check
 * @returns {boolean} - True if at start
 */
export const isAtStartOfNode = (range) => {
  if (!range || !range.collapsed) return false;
  
  const container = range.startContainer;
  const offset = range.startOffset;
  
  if (container.nodeType === Node.TEXT_NODE) {
    return offset === 0;
  } else {
    return offset === 0;
  }
};

/**
 * Check if node is at the end of a container
 * @param {Range} range - The current selection range
 * @param {HTMLElement} container - The container to check against
 * @returns {boolean} - True if at the end
 */
export const isAtEndOfNode = (range) => {
  if (!range || !range.collapsed) return false;
  
  const container = range.startContainer;
  const offset = range.startOffset;
  
  if (container.nodeType === Node.TEXT_NODE) {
    return offset === container.length;
  } else {
    return offset === container.childNodes.length;
  }
};

/**
 * Find the paragraph node containing a node
 * @param {Node} node - Starting node
 * @returns {HTMLElement|null} - Paragraph element
 */
export const findParagraphNode = (node) => {
  if (!node) return null;
  
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.nodeName === 'P' || 
        node.nodeName === 'DIV' || 
        node.nodeName === 'H1' || 
        node.nodeName === 'H2' || 
        node.nodeName === 'H3' || 
        node.nodeName === 'H4' || 
        node.nodeName === 'H5' || 
        node.nodeName === 'H6') {
      return node;
    }
    }
    
    node = node.parentNode;
    if (!node || node.nodeName === 'BODY' || node.nodeName === 'LI') break;
  }
  
  return null;
};

/**
 * Handle Enter key in a list item
 * @param {Event} e - Keyboard event
 * @param {HTMLElement} listItem - The list item
 * @param {Function} saveHistory - Function to save history
 * @returns {boolean} - True if handled
 */
export const handleListEnterKey = (e, listItem, saveHistory) => {
  e.preventDefault();
  
  // Save history before changes
  if (saveHistory) saveHistory();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const parentList = listItem.parentNode;
  
  // Check if list item is empty
  if (isListItemEmpty(listItem)) {
    // Empty list item - should outdent or remove
    const level = getListLevel(listItem);
    
    if (level > 1) {
      // Outdent the list item
      const parentListItem = findListItemParent(parentList);
      if (parentListItem) {
        const grandparentList = parentListItem.parentNode;
        
        // Create a new list item at parent level
        const newListItem = createEmptyListItem(
          grandparentList.nodeName.toLowerCase(),
          level > 1 ? getBulletStyleForLevel(level - 1) : 'disc'
        );
        
        // Insert after parent list item
        if (parentListItem.nextSibling) {
          grandparentList.insertBefore(newListItem, parentListItem.nextSibling);
        } else {
          grandparentList.appendChild(newListItem);
        }
        
        // Remove the empty list item
        listItem.remove();
        
        // If list is now empty, remove it
        if (parentList.childNodes.length === 0) {
          parentList.remove();
        }
        
        // Set selection to the new list item
        const newRange = document.createRange();
        newRange.selectNodeContents(newListItem);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Convert to paragraph
      const newPara = document.createElement('p');
      newPara.innerHTML = '<br>';
      
      // Insert the paragraph after the list
      if (listItem === parentList.lastChild) {
        parentList.parentNode.insertBefore(newPara, parentList.nextSibling);
      } else {
        // Split the list
        const newList = document.createElement(parentList.nodeName);
        
        // Move subsequent items to the new list
        let nextSibling = listItem.nextSibling;
        while (nextSibling) {
          const temp = nextSibling.nextSibling;
          newList.appendChild(nextSibling);
          nextSibling = temp;
        }
        
        // Insert paragraph and new list (if it has children)
        parentList.parentNode.insertBefore(newPara, parentList.nextSibling);
        if (newList.childNodes.length > 0) {
          parentList.parentNode.insertBefore(newList, newPara.nextSibling);
        }
      }
      
      // Remove the empty list item
      listItem.remove();
      
      // If list is now empty, remove it
      if (parentList.childNodes.length === 0) {
        parentList.remove();
      }
      
      // Set selection to the new paragraph
      const newRange = document.createRange();
      newRange.selectNodeContents(newPara);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    return true;
  }
  
  // List item has content - check if we need to split it
  const isAtEnd = isAtEndOfNode(range);
  const isInMiddle = !isAtStartOfNode(range) && !isAtEnd;
  
  if (isInMiddle) {
    // Split the content
    const newListItem = document.createElement('li');
    newListItem.style.listStyleType = listItem.style.listStyleType || 'inherit';
    
    // Extract content after the cursor position
    const endRange = document.createRange();
    endRange.setStart(range.startContainer, range.startOffset);
    endRange.setEndAfter(listItem.lastChild);
    
    const fragment = endRange.extractContents();
    newListItem.appendChild(fragment);
    
    // Insert after the current item
    if (listItem.nextSibling) {
      parentList.insertBefore(newListItem, listItem.nextSibling);
    } else {
      parentList.appendChild(newListItem);
    }
    
    // Set selection to the new list item
    const newRange = document.createRange();
    newRange.selectNodeContents(newListItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  } else if (isAtEnd) {
    // Create a new list item at the same level
    const newListItem = document.createElement('li');
    newListItem.style.listStyleType = listItem.style.listStyleType || 'inherit';
    newListItem.innerHTML = '<br>';
    
    // Insert after the current item
    if (listItem.nextSibling) {
      parentList.insertBefore(newListItem, listItem.nextSibling);
    } else {
      parentList.appendChild(newListItem);
    }
    
    // Set selection to the new list item
    const newRange = document.createRange();
    newRange.selectNodeContents(newListItem);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  } else {
    // At start - create a new list item before
    const newListItem = document.createElement('li');
    newListItem.style.listStyleType = listItem.style.listStyleType || 'inherit';
    newListItem.innerHTML = '<br>';
    
    // Insert before the current item
    parentList.insertBefore(newListItem, listItem);
    
    // Keep selection in the original item
    // No need to move selection
  }
  
  return true;
};

/**
 * Handle Tab key in a list item (indent)
 * @param {Event} e - Keyboard event
 * @param {HTMLElement} listItem - The list item
 * @param {Function} saveHistory - Function to save history
 * @returns {boolean} - True if handled
 */
export const handleListTabKey = (e, listItem, saveHistory) => {
  e.preventDefault();
  
  // Save history before changes
  if (saveHistory) saveHistory();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const parentList = listItem.parentNode;
  
  // Need previous sibling to become parent
  const prevItem = listItem.previousElementSibling;
  if (!prevItem) return false; // Can't indent without a previous item
  
  // Check if the previous item already has a nested list
  let nestedList = null;
  for (let i = 0; i < prevItem.children.length; i++) {
    const child = prevItem.children[i];
    if (child.nodeName === 'UL' || child.nodeName === 'OL') {
      nestedList = child;
      break;
    }
  }
  
  // If no nested list exists, create one with same type as parent
  if (!nestedList) {
    nestedList = document.createElement(parentList.nodeName);
    prevItem.appendChild(nestedList);
  }
  
  // Move the list item to the nested list
  nestedList.appendChild(listItem);
  
  // Calculate new level
  const level = getListLevel(listItem);
  
  // Apply appropriate style based on level
  if (parentList.nodeName === 'OL') {
    listItem.style.listStyleType = getNumberStyleForLevel(level);
  } else {
    listItem.style.listStyleType = getBulletStyleForLevel(level);
  }
  
  // Set selection to the list item (keep cursor position)
  const range = selection.getRangeAt(0);
  
  return true;
};

/**
 * Handle Shift+Tab in a list item (outdent)
 * @param {Event} e - Keyboard event
 * @param {HTMLElement} listItem - The list item
 * @param {Function} saveHistory - Function to save history
 * @returns {boolean} - True if handled
 */
export const handleListShiftTabKey = (e, listItem, saveHistory) => {
  e.preventDefault();
  
  // Save history before changes
  if (saveHistory) saveHistory();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const parentList = listItem.parentNode;
  
  // Check if we're in a nested list
  const parentItem = findListItemParent(parentList);
  if (!parentItem) return false; // Already at top level
  
  const grandparentList = parentItem.parentNode;
  
  // Move this item after the parent
  if (parentItem.nextSibling) {
    grandparentList.insertBefore(listItem, parentItem.nextSibling);
  } else {
    grandparentList.appendChild(listItem);
  }
  
  // If original list is now empty, remove it
  if (parentList.children.length === 0) {
    parentList.remove();
  }
  
  // Calculate new level
  const level = getListLevel(listItem);
  
  // Apply appropriate style based on level
  if (grandparentList.nodeName === 'OL') {
    listItem.style.listStyleType = getNumberStyleForLevel(level);
  } else {
    listItem.style.listStyleType = getBulletStyleForLevel(level);
  }
  
  // Set selection to the list item (keep cursor position)
  const range = selection.getRangeAt(0);
  
  return true;
};

/**
 * Handle Backspace at start of list item
 * @param {Event} e - Keyboard event
 * @param {HTMLElement} listItem - The list item
 * @param {Function} saveHistory - Function to save history
 * @returns {boolean} - True if handled
 */
export const handleListBackspaceKey = (e, listItem, saveHistory) => {
  // Only handle backspace at the start of the list item
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  
  if (!isAtStartOfNode(range)) return false;
  
  e.preventDefault();
  
  // Save history before changes
  if (saveHistory) saveHistory();
  
  const parentList = listItem.parentNode;
  
  // Check if we're in a nested list
  const parentItem = findListItemParent(parentList);
  
  if (parentItem) {
    // Move out of nested list
    const grandparentList = parentItem.parentNode;
    
    // Move this item after the parent
    if (parentItem.nextSibling) {
      grandparentList.insertBefore(listItem, parentItem.nextSibling);
    } else {
      grandparentList.appendChild(listItem);
    }
    
    // If original list is now empty, remove it
    if (parentList.children.length === 0) {
      parentList.remove();
    }
    
    // Calculate new level
    const level = getListLevel(listItem);
    
    // Apply appropriate style based on level
    if (grandparentList.nodeName === 'OL') {
      listItem.style.listStyleType = getNumberStyleForLevel(level);
    } else {
      listItem.style.listStyleType = getBulletStyleForLevel(level);
    }
  } else {
    // Check if there's a previous list item
    const prevItem = listItem.previousElementSibling;
    
    if (prevItem) {
      // Merge with previous list item
      const getLastTextNode = (element) => {
        if (element.nodeType === Node.TEXT_NODE) return element;
        
        if (element.childNodes.length === 0) return null;
        
        for (let i = element.childNodes.length - 1; i >= 0; i--) {
          const textNode = getLastTextNode(element.childNodes[i]);
          if (textNode) return textNode;
        }
        
  return null;
      };
      
      // Append current item's content to previous item
      const content = listItem.innerHTML;
      const lastTextNode = getLastTextNode(prevItem);
      
      if (content !== '<br>' && content.trim() !== '') {
        if (lastTextNode) {
          // Calculate position in previous item
          const position = lastTextNode.length;
          
          // Merge content
          prevItem.innerHTML += content;
          
          // Set selection to the merge point
          setTimeout(() => {
            const newTextNode = getLastTextNode(prevItem);
            if (newTextNode) {
              const newRange = document.createRange();
              newRange.setStart(newTextNode, position);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }, 0);
        } else {
          prevItem.innerHTML += content;
        }
      }
      
      // Remove current list item
      listItem.remove();
    } else {
      // First item in list - convert to paragraph
      const newPara = document.createElement('p');
      newPara.innerHTML = listItem.innerHTML;
      
      // Replace the list with the paragraph
      parentList.parentNode.insertBefore(newPara, parentList);
      
      // Remove the list item
      listItem.remove();
      
      // If list is now empty, remove it
      if (parentList.children.length === 0) {
        parentList.remove();
      }
      
      // Set selection to the paragraph
      const newRange = document.createRange();
      newRange.selectNodeContents(newPara);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
  
  return true;
};

/**
 * Auto-format list based on typed text
 * @param {Event} e - Keyboard event
 * @param {HTMLElement} container - The container to check against
 * @param {Function} saveHistory - Function to save history
 * @returns {boolean} - True if handled
 */
export const handleAutoListFormat = (e, container, saveHistory) => {
  if (e.inputType !== 'insertText') return false;
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  
  if (node.nodeType !== Node.TEXT_NODE) return false;
  
  const text = node.textContent;
  const paragraph = findParagraphNode(node);
  
  if (!paragraph) return false;
  
  // Check for bullet patterns
  if (text === '* ' || text === '- ' || text === '• ') {
    // Save history
    if (saveHistory) saveHistory();
    
    // Create bullet list
    const list = document.createElement('ul');
    const item = document.createElement('li');
    item.style.listStyleType = 'disc';
    item.innerHTML = '<br>';
    list.appendChild(item);
    
    // Replace paragraph with list
    paragraph.parentNode.replaceChild(list, paragraph);
    
    // Set selection
    const newRange = document.createRange();
    newRange.selectNodeContents(item);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    return true;
  }
  
  // Check for numbered list patterns
  const numberMatch = text.match(/^(\d+)[\.\)] $/);
  if (numberMatch) {
    // Save history
    if (saveHistory) saveHistory();
    
    // Create numbered list
    const list = document.createElement('ol');
    const item = document.createElement('li');
    item.style.listStyleType = 'decimal';
    item.innerHTML = '<br>';
    list.appendChild(item);
    
    // Replace paragraph with list
    paragraph.parentNode.replaceChild(list, paragraph);
    
    // Set selection
    const newRange = document.createRange();
    newRange.selectNodeContents(item);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    return true;
  }
  
  return false;
};

/**
 * Update all list styles in a content area
 * @param {HTMLElement} contentArea - The content area to update
 */
export const updateAllListStyles = (contentArea) => {
  if (!contentArea) return;
  
  // Process all UL and OL lists
  const lists = contentArea.querySelectorAll('ul, ol');
  lists.forEach(list => {
    // Process only top-level lists
    if (!findListItemParent(list)) {
      updateListStyles(list);
    }
  });
};

/**
 * Get the list item containing a node
 * @param {Node} node - The starting node
 * @returns {HTMLElement|null} - The list item containing the node
 */
export const getListItem = (node) => {
  if (!node) return null;
  
  let current = node;
  while (current && current.nodeName !== 'LI') {
    current = current.parentNode;
    if (!current || current.nodeName === 'BODY') {
      current = null;
      break;
    }
  }
  
  return current;
};

/**
 * Find paragraph or list item containing a node
 * @param {Node} node - The starting node
 * @returns {HTMLElement|null} - The paragraph or list item containing the node
 */
export const findParagraphOrListItem = (node) => {
  if (!node) return null;
  
  let current = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      if (current.nodeName === 'P' || 
          current.nodeName === 'LI' ||
          current.nodeName === 'DIV' || 
          current.nodeName === 'H1' || 
          current.nodeName === 'H2' || 
          current.nodeName === 'H3' || 
          current.nodeName === 'H4' || 
          current.nodeName === 'H5' || 
          current.nodeName === 'H6') {
        return current;
      }
    }
    
    current = current.parentNode;
    if (!current || current.nodeName === 'BODY') break;
  }
  
  return null;
}; 