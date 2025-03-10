//  * Comprehensive utilities for list handling in the editor
//  */

/**
 * Utility functions for Google Docs-style list handling
 */

/**
 * Get the appropriate bullet style for a specific nesting level
 * BULLETS ONLY - no numbered styles will be used
 */
export const getBulletStyleForLevel = (level) => {
  // Create a cycle of bullet styles based on nesting level
  // This ensures we never run out of styles regardless of how deep nesting gets
  const bulletStyles = [
    'disc',      // Level 1: • (solid circle)
    'circle',    // Level 2: ○ (hollow circle)
    'square',    // Level 3: ■ (solid square)
    '\'➤\'',     // Level 4: ➤ (arrow)
    '\'-\'',     // Level 5: - (dash)
    '\'✦\'',     // Level 6: ✦ (star)
  ];
  
  // Use modulo to cycle through styles if nesting goes beyond available styles
  return bulletStyles[(level - 1) % bulletStyles.length];
};

/**
 * Get the appropriate number style for a specific nesting level
 * Now supports unlimited nesting by cycling through styles
 */
export const getNumberStyleForLevel = (level) => {
  // Use modulo to cycle through styles for unlimited nesting
  const styleIndex = ((level - 1) % 5);
  
  switch (styleIndex) {
    case 0: return 'decimal'; // Level 1: 1, 2, 3
    case 1: return 'lower-alpha'; // Level 2: a, b, c
    case 2: return 'lower-roman'; // Level 3: i, ii, iii
    case 3: return 'upper-alpha'; // Level 4: A, B, C
    case 4: return 'upper-roman'; // Level 5: I, II, III
    default: return 'decimal'; // Fallback
  }
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
  while (node && !node.hasAttribute('data-content-area')) {
    node = node.parentNode;
    if (!node) break;
  }
  return node;
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
  let level = 1;
  let parent = listItem.parentNode;
  
  while (parent) {
    if (parent.nodeName === 'UL' || parent.nodeName === 'OL') {
      // Move to the parent of the list
      parent = parent.parentNode;
      
      // If the parent is a list item, increment level
      if (parent && parent.nodeName === 'LI') {
        level++;
        parent = parent.parentNode; // Move to the parent list
      }
    } else {
      parent = parent.parentNode;
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
// export const isAtStartOfNode = (range, node) => {
//   const selection = window.getSelection();
//   if (!selection.isCollapsed) return false;
  
//   // Check if we're at position 0 of a text node
//   if (range.startContainer.nodeType === Node.TEXT_NODE && 
//       range.startOffset === 0 &&
//       range.startContainer.parentNode === node) {
//     return true;
//   }
  
//   // Check if we're at the first child
//   if (range.startContainer === node && range.startOffset === 0) {
//     return true;
//   }
  
//   return false;
// };

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
  
  // Save history
  if (saveHistory) saveHistory();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  const parentList = listItem.parentNode;
  
  // Check if list item is empty
  const isEmpty = listItem.textContent.trim() === '';
  
  if (isEmpty) {
    // Empty list item - outdent or convert to paragraph
    const level = getListLevel(listItem);
    
    if (level > 1) {
      // Nested list - outdent it
      const parentLI = findListItemParent(parentList);
      if (parentLI) {
        const grandparentList = parentLI.parentNode;
        
        // Create a new list item in the parent list
        const newItem = document.createElement('li');
        newItem.innerHTML = '<br>';
        
        // Set proper style based on level
        if (grandparentList.nodeName === 'UL') {
          newItem.style.listStyleType = getBulletStyleForLevel(level - 1);
        } else {
          newItem.style.listStyleType = getNumberStyleForLevel(level - 1);
        }
        
        // Insert after the parent list item
        if (parentLI.nextSibling) {
          grandparentList.insertBefore(newItem, parentLI.nextSibling);
        } else {
          grandparentList.appendChild(newItem);
        }
        
        // Remove the empty list item
        listItem.remove();
        
        // If the sublist is now empty, remove it
        if (parentList.children.length === 0) {
          parentLI.removeChild(parentList);
        }
        
        // Set selection to the new list item
        const newRange = document.createRange();
        newRange.selectNodeContents(newItem);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        return true;
      }
    } else {
      // Top-level list item - convert to paragraph
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      
      // If this is the last item, insert after the list
      // Otherwise, split the list
      if (listItem === parentList.lastChild) {
        parentList.parentNode.insertBefore(p, parentList.nextSibling);
      } else {
        // Split the list and insert paragraph between
        const newList = document.createElement(parentList.nodeName);
        let nextItem = listItem.nextSibling;
        
        while (nextItem) {
          const tempNext = nextItem.nextSibling;
          newList.appendChild(nextItem);
          nextItem = tempNext;
        }
        
        // Insert paragraph and new list
        parentList.parentNode.insertBefore(p, parentList.nextSibling);
        if (newList.childNodes.length > 0) {
          parentList.parentNode.insertBefore(newList, p.nextSibling);
        }
      }
      
      // Remove the empty list item
      listItem.remove();
      
      // If the list is now empty, remove it
      if (parentList.childNodes.length === 0) {
        parentList.remove();
      }
      
      // Set selection to the new paragraph
      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      return true;
    }
  } else {
    // Non-empty list item - check cursor position
    const isAtEnd = isAtEndOfNode(range);
    
    if (isAtEnd) {
      // Cursor at end - create new list item after this one
      const newItem = document.createElement('li');
      newItem.innerHTML = '<br>';
      
      // Copy style from current item
      newItem.style.listStyleType = listItem.style.listStyleType || 'inherit';
      
      // Insert after the current item
      if (listItem.nextSibling) {
        parentList.insertBefore(newItem, listItem.nextSibling);
      } else {
        parentList.appendChild(newItem);
      }
      
      // Set selection to the new list item
      const newRange = document.createRange();
      newRange.selectNodeContents(newItem);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      return true;
    } else {
      // Cursor in middle - split the list item
      const newItem = document.createElement('li');
      newItem.style.listStyleType = listItem.style.listStyleType || 'inherit';
      
      // Extract content after cursor
      const endRange = document.createRange();
      endRange.setStart(range.startContainer, range.startOffset);
      endRange.setEndAfter(listItem.lastChild);
      
      const fragment = endRange.extractContents();
      newItem.appendChild(fragment);
      
      // Insert the new item
      if (listItem.nextSibling) {
        parentList.insertBefore(newItem, listItem.nextSibling);
      } else {
        parentList.appendChild(newItem);
      }
      
      // Set selection to start of new item
      const newRange = document.createRange();
      newRange.selectNodeContents(newItem);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      return true;
    }
  }
  
  return false;
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
    parentItem.removeChild(parentList);
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
 * ENHANCED to fix bullet/number style confusion
 */
export const updateAllListStyles = (contentArea) => {
  if (!contentArea) return;
  
  // Find all lists in the content area
  const lists = contentArea.querySelectorAll('ul, ol');
  
  lists.forEach(list => {
    // Start with root lists
    if (!list.parentElement.closest('ul') && !list.parentElement.closest('ol')) {
      processListStyles(list, 1);
    }
  });
  
  function processListStyles(list, level) {
    const items = list.querySelectorAll(':scope > li');
    
    items.forEach(item => {
      // Apply style based on list type
      if (list.tagName.toLowerCase() === 'ul') {
        const bulletStyle = getBulletStyleForLevel(level);
        item.style.listStyleType = bulletStyle;
      } else {
        const numberStyle = getNumberStyleForLevel(level);
        item.style.listStyleType = numberStyle;
      }
      
      // Process nested lists with increased level
      const nestedLists = item.querySelectorAll(':scope > ul, :scope > ol');
      nestedLists.forEach(nestedList => {
        processListStyles(nestedList, level + 1);
      });
    });
  }
};

/**
 * Get the list item containing a node
 * @param {Node} node - The starting node
 * @returns {HTMLElement|null} - The list item containing the node
 */
export const getListItem = (node) => {
  while (node && node.nodeName !== 'LI') {
    node = node.parentNode;
    if (!node || node.nodeName === 'BODY') return null;
  }
  return node;
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

/**
 * Get the first text node in an element
 * @param {Node} node - The starting node
 * @returns {Node|null} - The first text node in the element
 */
export const getFirstTextNode = (node) => {
  if (node.nodeType === Node.TEXT_NODE) return node;
  
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
      return child;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const textNode = getFirstTextNode(child);
      if (textNode) return textNode;
    }
  }
  
  return null;
};

/**
 * Handle Tab key for proper list nesting with unlimited depth
 */
export const handleTabInList = (event, listItem, saveHistory, ActionTypes) => {
  if (!listItem) return false;
  
  // Save current state for undo history
  saveHistory(ActionTypes.FORMAT);
  
  // Prevent default tab behavior
  event.preventDefault();
  
  // Handle Shift+Tab (outdent) vs regular Tab (indent)
  if (event.shiftKey) {
    return handleListOutdent(listItem);
  } else {
    return handleListIndent(listItem);
  }
};

/**
 * Helper function to handle list indentation (nesting)
 * @param {HTMLElement} listItem - The list item to indent
 * @returns {boolean} - Whether the indentation was successful
 */
const handleListIndent = (listItem) => {
  const parentList = listItem.parentNode;
  const prevListItem = listItem.previousElementSibling;
  
  // Cannot indent if this is the first item in the list
  if (!prevListItem) return false;
  
  // Check if previous item already has a nested list
  let nestedList = null;
  for (let i = 0; i < prevListItem.childNodes.length; i++) {
    const child = prevListItem.childNodes[i];
    if (child.nodeName === 'UL' || child.nodeName === 'OL') {
      nestedList = child;
      break;
    }
  }
  
  // If no nested list exists in the previous item, create one
  if (!nestedList) {
    nestedList = document.createElement('ul');
    prevListItem.appendChild(nestedList);
  }
  
  // Move this item to the nested list
  nestedList.appendChild(listItem);
  
  // Update bullet styles for the entire list structure
  const rootList = findRootList(nestedList);
  updateAllListStyles(rootList.parentNode);
  
  // Place cursor at the beginning of the list item
  const textNode = getFirstTextNode(listItem);
  if (textNode) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(textNode, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  return true;
};

/**
 * Helper function to handle list outdenting
 * @param {HTMLElement} listItem - The list item to outdent
 * @returns {boolean} - Whether the outdent was successful
 */
const handleListOutdent = (listItem) => {
  const parentList = listItem.parentNode;
  const grandparentListItem = parentList.parentNode;
  
  // Can't outdent if we're already at the top level
  if (parentList.parentNode.nodeName !== 'LI') return false;
  
  // Move this item after the parent
  const greatGrandparentList = grandparentListItem.parentNode;
  const nextSibling = grandparentListItem.nextSibling;
  
  if (nextSibling) {
    greatGrandparentList.insertBefore(listItem, nextSibling);
  } else {
    greatGrandparentList.appendChild(listItem);
  }
  
  // Update bullet styles
  const rootList = findRootList(parentList);
  updateAllListStyles(rootList.parentNode);
  
  // If the nested list is now empty, remove it
  if (parentList.childNodes.length === 0) {
    grandparentListItem.removeChild(parentList);
  }
  
  return true;
};

/**
 * Helper function to get all list items within a selection
 */
export const getSelectedListItems = (range) => {
  if (!range) return [];
  
  const fragment = range.cloneContents();
  const items = [];
  
  // Check for LI elements within the selection
  const listItems = fragment.querySelectorAll('li');
  if (listItems.length > 0) {
    return Array.from(listItems);
  }
  
  // If no LI elements found directly, check if the selection is within a list item
  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }
  
  const listItem = getListItem(node);
  if (listItem) {
    items.push(listItem);
  }
  
  return items;
};

/**
 * Handle backspace key in a list item following Google Docs behavior exactly
 */
export const handleBackspaceInList = (event, listItem, saveHistory, ActionTypes) => {
  if (!listItem) return false;
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  
  // Only handle backspace at beginning of list item
  if (!range.collapsed || !isAtStartOfNode(range, listItem)) {
    return false; // Let default browser behavior handle text deletion
  }
  
  // Save history for undo
  saveHistory(ActionTypes.COMPLETE);
  
  // Prevent default browser behavior
  event.preventDefault();
  
  const isEmpty = isListItemEmpty(listItem);
  const parentList = listItem.parentNode;
  const isNested = parentList.parentNode.nodeName === 'LI';
  
  // CASE: Nested bullet - outdent it
  if (isNested) {
    const parentListItem = parentList.parentNode;
    const grandparentList = parentListItem.parentNode;
    
    // Move the list item to the parent list level
    if (parentListItem.nextSibling) {
      grandparentList.insertBefore(listItem, parentListItem.nextSibling);
    } else {
      grandparentList.appendChild(listItem);
    }
    
    // Clean up empty nested list if needed
    if (parentList.children.length === 0) {
      parentListItem.removeChild(parentList);
    }
    
    // Update bullet styles 
    updateAllListStyles(getMainContentArea(listItem));
    
    // Position cursor at start of list item
    setCaretAtStart(listItem);
    
    return true;
  }
  
  // CASE: Empty top-level bullet - convert to paragraph
  if (isEmpty) {
    // Create paragraph to replace the bullet
    const p = document.createElement('p');
    p.innerHTML = '<br>'; // Ensure paragraph has height
    p.style.marginLeft = '20px'; // Add left margin to visually preserve position
    
    // Insert paragraph BEFORE the list in the document
    // This is critical for maintaining position
    const parent = parentList.parentNode;
    parent.insertBefore(p, parentList);
    
    // Now MOVE the paragraph to the correct position based on the list item's position
    const isFirstItem = !listItem.previousElementSibling;
    const isLastItem = !listItem.nextElementSibling;
    
    if (isFirstItem && isLastItem) {
      // Only item in list - put paragraph where list was and remove list
      parent.replaceChild(p, parentList);
    } else if (isFirstItem) {
      // First item in list - paragraph stays before list
      // Already handled by the initial insertion
    } else if (isLastItem) {
      // Last item in list - move paragraph after list
      if (parentList.nextSibling) {
        parent.insertBefore(p, parentList.nextSibling);
      } else {
        parent.appendChild(p);
      }
    } else {
      // Middle item - split the list
      const newList = document.createElement(parentList.nodeName);
      
      // Move items after the current one to new list
      let nextSibling = listItem.nextSibling;
      while (nextSibling) {
        const temp = nextSibling.nextSibling;
        newList.appendChild(nextSibling);
        nextSibling = temp;
      }
      
      // Place paragraph between lists
      if (parentList.nextSibling) {
        parent.insertBefore(p, parentList.nextSibling);
      } else {
        parent.appendChild(p);
      }
      
      // Add the new list after the paragraph
      parent.insertBefore(newList, p.nextSibling);
    }
    
    // Remove the list item
    listItem.remove();
    
    // Remove the list if it's now empty
    if (parentList.children.length === 0) {
      parentList.remove();
    }
    
    // CRITICAL: Force layout calculation to ensure the browser processes the changes
    document.body.getBoundingClientRect();
    
    // Use setTimeout to ensure reliable cursor positioning after DOM changes
    setTimeout(() => {
      try {
        // Create and position a new selection range at the start of paragraph
        const newRange = document.createRange();
        if (p.firstChild && p.firstChild.nodeType === Node.TEXT_NODE) {
          newRange.setStart(p.firstChild, 0);
        } else if (p.firstChild) {
          newRange.setStart(p.firstChild, 0);
        } else {
          newRange.setStart(p, 0);
        }
        newRange.collapse(true);
        
        // Apply the new selection
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Focus on the paragraph explicitly
        p.focus();
      } catch (e) {
        console.error('Error setting cursor position:', e);
      }
    }, 0);
    
    return true;
  }
  
  // Not empty or nested - let default behavior handle it
  return false;
};

/**
 * Handle backspace in a paragraph (specifically handling indentation)
 * Used after a bullet has been removed
 */
export const handleBackspaceInParagraph = (event, paragraph, saveHistory, ActionTypes) => {
  if (!paragraph) return false;
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  
  // Only handle if at start of paragraph
  if (!isAtStartOfNode(range, paragraph)) {
    return false;
  }
  
  // Save for undo
  saveHistory(ActionTypes.COMPLETE);
  
  // Get current margin (indentation)
  const computedStyle = window.getComputedStyle(paragraph);
  const marginLeft = parseInt(computedStyle.marginLeft) || 0;
  
  // CASE 3: If paragraph has indentation, decrease it
  if (marginLeft > 0) {
    event.preventDefault();
    
    // Decrease margin by 20px (or to 0)
    const newMargin = Math.max(0, marginLeft - 20);
    paragraph.style.marginLeft = `${newMargin}px`;
    
    // Update class to track changes
    if (paragraph.classList.contains('ex-list-item')) {
      paragraph.classList.remove('ex-list-item');
      paragraph.classList.add('indented-paragraph');
    }
    
    return true;
  }
  
  // CASE 4: No more indentation left and paragraph is empty
  // Now we can move to previous line
  if (isParagraphEmpty(paragraph)) {
    const prevElement = paragraph.previousElementSibling;
    
    if (prevElement) {
      event.preventDefault();
      
      // Handle previous element (list or paragraph)
      if (prevElement.tagName === 'UL' || prevElement.tagName === 'OL') {
        // Previous element is a list - move cursor to last item
        const lastListItem = prevElement.lastElementChild;
        if (lastListItem) {
          // Move cursor to end of the last list item
          const lastTextNode = findLastTextNodeOrElement(lastListItem);
          
          // Remove the empty paragraph
          paragraph.parentNode.removeChild(paragraph);
          
          // Position cursor at end of last text node
          if (lastTextNode) {
            const newRange = document.createRange();
            if (lastTextNode.nodeType === Node.TEXT_NODE) {
              newRange.setStart(lastTextNode, lastTextNode.textContent.length);
            } else {
              newRange.selectNodeContents(lastTextNode);
              newRange.collapse(false);
            }
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      } else {
        // Previous element is not a list
        const lastTextNode = findLastTextNodeOrElement(prevElement);
        
        // Remove the paragraph
        paragraph.parentNode.removeChild(paragraph);
        
        // Position cursor at end of previous element
        if (lastTextNode) {
          const newRange = document.createRange();
          if (lastTextNode.nodeType === Node.TEXT_NODE) {
            newRange.setStart(lastTextNode, lastTextNode.textContent.length);
          } else {
            newRange.selectNodeContents(lastTextNode);
            newRange.collapse(false);
          }
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      
      return true;
    }
  }
  
  // Let default behavior handle any other cases
  return false;
};

// Helper to set cursor at start of element
function setCaretAtStart(element) {
  const range = document.createRange();
  const selection = window.getSelection();
  
  if (element.firstChild) {
    if (element.firstChild.nodeType === Node.TEXT_NODE) {
      range.setStart(element.firstChild, 0);
    } else {
      range.setStart(element.firstChild, 0);
    }
  } else {
    range.setStart(element, 0);
  }
  
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Find the last text node or element in a node
 */
export const findLastTextNodeOrElement = (node) => {
  if (!node) return null;
  
  // If node is a text node with content, return it
  if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
    return node;
  }
  
  // If node has children, check them from last to first
  if (node.hasChildNodes()) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      const lastNode = findLastTextNodeOrElement(child);
      if (lastNode) return lastNode;
    }
  }
  
  // If no text nodes with content found, return the node itself if it's an element
  if (node.nodeType === Node.ELEMENT_NODE && 
      node.nodeName !== 'UL' && 
      node.nodeName !== 'OL') {
    return node;
  }
  
  return null;
};

/**
 * Find the last text node in an element, but stop before any nested lists
 */
export const findLastTextNodeBeforeList = (element) => {
  // Check if there are any nested lists
  const nestedLists = Array.from(element.children).filter(child => 
    child.nodeName === 'UL' || child.nodeName === 'OL'
  );
  
  if (nestedLists.length === 0) {
    // No nested lists, find the last text node normally
    return findLastTextNodeOrElement(element);
  }
  
  // Function to find the last text node before a given node
  const findLastTextNodeBefore = (parent, beforeNode) => {
    let lastTextNode = null;
    let current = parent.firstChild;
    
    while (current && current !== beforeNode) {
      if (current.nodeType === Node.TEXT_NODE) {
        if (current.textContent.trim() !== '') {
          lastTextNode = current;
        }
      } else if (current.nodeType === Node.ELEMENT_NODE && 
                 current.nodeName !== 'UL' && 
                 current.nodeName !== 'OL') {
        const foundNode = findLastTextNodeBefore(current, null);
        if (foundNode) {
          lastTextNode = foundNode;
        }
      }
      current = current.nextSibling;
    }
    
    return lastTextNode;
  };
  
  // Find the first nested list
  const firstNestedList = nestedLists[0];
  
  // Find the last text node before this list
  return findLastTextNodeBefore(element, firstNestedList);
};

/**
 * Check if a range is at the start of a node
 */
export const isAtStartOfNode = (range, node) => {
  if (!range.collapsed) return false;
  
  // Simple case: directly at start of node
  if (range.startContainer === node && range.startOffset === 0) return true;
  
  // Check if we're in a text node at the beginning
  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    // If offset > 0, not at start
    if (range.startOffset > 0) return false;
    
    // Walk up through parents to find if this is the first text node in the list item
    let currentNode = range.startContainer;
    while (currentNode && currentNode !== node) {
      const previousSibling = currentNode.previousSibling;
      
      // If there's content before this node, not at start
      if (previousSibling) {
        // If text node with content or non-text element that's not BR
        if ((previousSibling.nodeType === Node.TEXT_NODE && previousSibling.textContent.trim() !== '') ||
            (previousSibling.nodeType === Node.ELEMENT_NODE && previousSibling.nodeName !== 'BR')) {
          return false;
        }
      }
      
      currentNode = currentNode.parentNode;
    }
    
    return true;
  }
  
  return false;
};

/**
 * Get the proper content area for insertion, avoiding headers and footers
 * @param {Node} node - Starting node
 * @returns {HTMLElement|null} - The main content area element
 */
export const getMainContentArea = (node) => {
  // First check if we're in a header or footer
  let current = node;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    if (current.hasAttribute('data-header') || current.hasAttribute('data-footer')) {
      return null; // We're in a header/footer, don't proceed
    }
    if (current.hasAttribute('data-content-area')) {
      return current; // Found the content area
    }
    current = current.parentNode;
  }
  
  // If we didn't find in the node hierarchy, look for the main content
  const mainContent = document.querySelector('[data-content-area="true"]');
  return mainContent;
};

/**
 * Handles decreasing indentation of a paragraph
 * @param {HTMLElement} paragraph - The paragraph to decrease indentation for
 * @returns {boolean} - Whether indentation was decreased
 */
export const decreaseIndentation = (paragraph) => {
  if (!paragraph) return false;
  
  // Check if paragraph has margin or padding
  const computedStyle = window.getComputedStyle(paragraph);
  const marginLeft = parseInt(computedStyle.marginLeft) || 0;
  const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
  
  // If there's margin or padding, decrease it
  if (marginLeft > 0) {
    const newMargin = Math.max(0, marginLeft - 40); // Decrease by 40px or to 0
    paragraph.style.marginLeft = `${newMargin}px`;
    return true;
  } else if (paddingLeft > 0) {
    const newPadding = Math.max(0, paddingLeft - 40); // Decrease by 40px or to 0
    paragraph.style.paddingLeft = `${newPadding}px`;
    return true;
  }
  
  return false;
}

// Helper function to check if a paragraph is empty
export const isParagraphEmpty = (paragraph) => {
  // Check if it only contains a <br> or is completely empty
  return paragraph.innerHTML === '' || 
         paragraph.innerHTML === '<br>' || 
         paragraph.textContent.trim() === '';
}; 
