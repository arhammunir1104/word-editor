import { renderTableContextMenu } from './TableContextMenu';

/**
 * Sets up keyboard navigation within the table
 */
export const setupTableKeyboardNavigation = (table) => {
  // Ensure the table doesn't have contenteditable, only the cells
  table.removeAttribute('contenteditable');
  
  // Make all cells editable with proper event handling
  const cells = table.querySelectorAll('td, th');
  cells.forEach(cell => {
    // Ensure cell is editable
    cell.setAttribute('contenteditable', 'true');
    
    // Fix for content disappearing - monitor content changes
    cell.addEventListener('input', (e) => {
      // Ensure cell has at least a <br> if empty
      if (cell.innerHTML.trim() === '') {
        cell.innerHTML = '<br>';
      }
      
      // Propagate change to parent document for history tracking
      const event = new CustomEvent('table-cell-changed', {
        bubbles: true,
        detail: { cell, table }
      });
      document.dispatchEvent(event);
      
      // Stop event from propagating to prevent duplicate handling
      e.stopPropagation();
    });
    
    // Prevent default behavior on paste to maintain table structure
    cell.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, text);
    });
  });
  
  table.addEventListener('keydown', (e) => {
    const cell = e.target.closest('td, th');
    if (!cell) return;
    
    const row = cell.parentElement;
    const cellIndex = Array.from(row.cells).indexOf(cell);
    const rowIndex = Array.from(table.rows).indexOf(row);
    
    switch (e.key) {
      case 'Tab':
        if (!e.shiftKey) {
          if (cell === row.cells[row.cells.length - 1] && row === table.rows[table.rows.length - 1]) {
            e.preventDefault();
            
            // Create a new row
            const newRow = table.insertRow();
            for (let i = 0; i < row.cells.length; i++) {
              const newCell = newRow.insertCell();
              newCell.setAttribute('contenteditable', 'true');
              newCell.style.cssText = `
                border: 1px solid #d0d0d0;
                padding: 8px;
                min-width: 30px;
                position: relative;
                text-align: left;
                color: #000;
              `;
              newCell.innerHTML = '<br>';
              
              // Add the same event listeners
              newCell.addEventListener('input', (e) => {
                if (newCell.innerHTML.trim() === '') {
                  newCell.innerHTML = '<br>';
                }
                const event = new CustomEvent('table-cell-changed', {
                  bubbles: true,
                  detail: { cell: newCell, table }
                });
                document.dispatchEvent(event);
                e.stopPropagation();
              });
              
              newCell.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                document.execCommand('insertText', false, text);
              });
            }
            
            // Focus the first cell of the new row
            if (newRow.cells[0]) {
              e.preventDefault();
              const range = document.createRange();
              range.selectNodeContents(newRow.cells[0]);
              range.collapse(true);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
        break;
        
      case 'ArrowUp':
        if (rowIndex > 0) {
          e.preventDefault();
          const targetCell = table.rows[rowIndex - 1].cells[Math.min(cellIndex, table.rows[rowIndex - 1].cells.length - 1)];
          placeCursorInCell(targetCell);
        }
        break;
        
      case 'ArrowDown':
        if (rowIndex < table.rows.length - 1) {
          e.preventDefault();
          const targetCell = table.rows[rowIndex + 1].cells[Math.min(cellIndex, table.rows[rowIndex + 1].cells.length - 1)];
          placeCursorInCell(targetCell);
        }
        break;
        
      case 'ArrowLeft':
        if (isCaretAtStartOfCell(cell) && cellIndex > 0) {
          e.preventDefault();
          const prevCell = row.cells[cellIndex - 1];
          moveCursorToEndOfCell(prevCell);
        }
        break;
        
      case 'ArrowRight':
        if (isCaretAtEndOfCell(cell) && cellIndex < row.cells.length - 1) {
          e.preventDefault();
          const nextCell = row.cells[cellIndex + 1];
          moveCursorToStartOfCell(nextCell);
        }
        break;
    }
  });
};

// Helper function to place cursor in a cell
const placeCursorInCell = (cell) => {
  // Focus the cell first
  cell.focus();
  
  // Then place the cursor
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * Adds resize handles to table cells
 */
export const addResizeHandles = (table) => {
  // Remove any existing resize handles first
  table.querySelectorAll('.col-resize-handle, .row-resize-handle').forEach(handle => {
    handle.remove();
  });
  
  // Add column resize handles
  const cells = table.querySelectorAll('td, th');
  cells.forEach(cell => {
    // Create column resize handle
    const colResizer = document.createElement('div');
    colResizer.className = 'col-resize-handle';
    colResizer.style.cssText = `
      position: absolute;
      top: 0;
      right: -2px;
      width: 4px;
      height: 100%;
      cursor: col-resize;
      z-index: 1;
      background-color: transparent;
    `;
    
    // Add event listeners for column resizing
    colResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent focus change
      
      const initialX = e.clientX;
      const initialWidth = cell.offsetWidth;
      
      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - initialX;
        const newWidth = Math.max(30, initialWidth + deltaX); // Min width 30px
        cell.style.width = `${newWidth}px`;
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // Trigger table-changed event for history
        const event = new CustomEvent('table-structure-changed', {
          bubbles: true,
          detail: { table }
        });
        document.dispatchEvent(event);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    cell.appendChild(colResizer);
    
    // Create row resize handle for last cell in each row
    if (cell === cell.parentElement.lastElementChild) {
      const rowResizer = document.createElement('div');
      rowResizer.className = 'row-resize-handle';
      rowResizer.style.cssText = `
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 4px;
        cursor: row-resize;
        z-index: 1;
        background-color: transparent;
      `;
      
      // Add event listeners for row resizing
      rowResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent focus change
        
        const row = cell.parentElement;
        const initialY = e.clientY;
        const initialHeight = row.offsetHeight;
        
        const onMouseMove = (moveEvent) => {
          const deltaY = moveEvent.clientY - initialY;
          const newHeight = Math.max(30, initialHeight + deltaY); // Min height 30px
          row.style.height = `${newHeight}px`;
        };
        
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          // Trigger table-changed event for history
          const event = new CustomEvent('table-structure-changed', {
            bubbles: true,
            detail: { table }
          });
          document.dispatchEvent(event);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
      
      cell.appendChild(rowResizer);
    }
  });
};

/**
 * Sets up the context menu for tables
 */
export const setupTableContextMenu = (table) => {
  table.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Get the cell, row, and table references
    const cell = e.target.closest('td, th');
    if (!cell) return;
    
    const row = cell.parentElement;
    const tableElement = cell.closest('table');
    
    // Get the position for the context menu
    const x = e.clientX;
    const y = e.clientY;
    
    // Create and show the context menu
    renderTableContextMenu({ x, y, cell, row, table: tableElement });
  });
};

// Helper functions for cursor position
const isCaretAtStartOfCell = (cell) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  
  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;
  
  return range.startContainer === cell || 
         (range.startContainer.nodeType === Node.TEXT_NODE && 
          range.startContainer.parentNode === cell && 
          range.startOffset === 0);
};

const isCaretAtEndOfCell = (cell) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  
  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;
  
  if (range.startContainer === cell) {
    return range.startOffset === cell.childNodes.length;
  } else if (range.startContainer.nodeType === Node.TEXT_NODE && 
            range.startContainer.parentNode === cell) {
    return range.startOffset === range.startContainer.length;
  }
  
  return false;
};

const moveCursorToStartOfCell = (cell) => {
  // Focus the cell first
  cell.focus();
  
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true); // Collapse to start
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

const moveCursorToEndOfCell = (cell) => {
  // Focus the cell first
  cell.focus();
  
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(false); // Collapse to end
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

// Table operation functions
export const insertRow = (row, before = true) => {
  const table = row.closest('table');
  const rowIndex = before ? row.rowIndex : row.rowIndex + 1;
  const cellCount = row.cells.length;
  
  // Insert row at specified index
  const newRow = table.insertRow(rowIndex);
  
  // Create cells in the new row
  for (let i = 0; i < cellCount; i++) {
    const newCell = newRow.insertCell(i);
    newCell.setAttribute('contenteditable', 'true');
    newCell.style.cssText = `
      border: 1px solid #d0d0d0;
      padding: 8px;
      min-width: 30px;
      position: relative;
      text-align: left;
      color: #000;
    `;
    newCell.innerHTML = '<br>';
    
    // Add event listeners
    newCell.addEventListener('input', (e) => {
      if (newCell.innerHTML.trim() === '') {
        newCell.innerHTML = '<br>';
      }
      const event = new CustomEvent('table-cell-changed', {
        bubbles: true,
        detail: { cell: newCell, table }
      });
      document.dispatchEvent(event);
      e.stopPropagation();
    });
    
    newCell.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, text);
    });
  }
  
  // Update resize handles
  addResizeHandles(table);
  
  return newRow;
};

export const insertColumn = (cell, before = true) => {
  const table = cell.closest('table');
  const colIndex = before ? cell.cellIndex : cell.cellIndex + 1;
  
  // Insert a cell in each row at the specified index
  Array.from(table.rows).forEach(row => {
    const newCell = row.insertCell(colIndex);
    newCell.setAttribute('contenteditable', 'true');
    newCell.style.cssText = `
      border: 1px solid #d0d0d0;
      padding: 8px;
      min-width: 30px;
      position: relative;
      text-align: left;
      color: #000;
      ${row.parentElement.tagName === 'THEAD' ? 'background-color: #f3f3f3; font-weight: bold;' : ''}
    `;
    newCell.innerHTML = '<br>';
    
    // Add event listeners
    newCell.addEventListener('input', (e) => {
      if (newCell.innerHTML.trim() === '') {
        newCell.innerHTML = '<br>';
      }
      const event = new CustomEvent('table-cell-changed', {
        bubbles: true,
        detail: { cell: newCell, table }
      });
      document.dispatchEvent(event);
      e.stopPropagation();
    });
    
    newCell.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, text);
    });
  });
  
  // Update resize handles
  addResizeHandles(table);
};

export const deleteRow = (row) => {
  const table = row.closest('table');
  table.deleteRow(row.rowIndex);
  
  // If no rows left, delete the table
  if (table.rows.length === 0) {
    table.remove();
  } else {
    // Update resize handles
    addResizeHandles(table);
  }
};

export const deleteColumn = (cell) => {
  const table = cell.closest('table');
  const columnIndex = cell.cellIndex;
  
  // Delete cell at this index from each row
  Array.from(table.rows).forEach(row => {
    if (row.cells.length > columnIndex) {
      row.deleteCell(columnIndex);
    }
  });
  
  // If no columns left, delete the table
  if (table.rows[0] && table.rows[0].cells.length === 0) {
    table.remove();
  } else {
    // Update resize handles
    addResizeHandles(table);
  }
};

export const deleteTable = (table) => {
  table.remove();
};

export const mergeCells = (table) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  // Find all selected cells
  const selectedCells = [];
  const range = selection.getRangeAt(0);
  
  // Get all cells within the selection range
  const cells = table.querySelectorAll('td, th');
  cells.forEach(cell => {
    if (range.intersectsNode(cell)) {
      selectedCells.push(cell);
    }
  });
  
  if (selectedCells.length <= 1) return;
  
  // Determine the top-left and bottom-right cells
  let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
  
  selectedCells.forEach(cell => {
    const row = cell.parentElement.rowIndex;
    const col = cell.cellIndex;
    
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  });
  
  // Check if selection forms a rectangle
  const expectedCellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  if (expectedCellCount !== selectedCells.length) {
    alert('Cannot merge cells: Selection must form a rectangle');
    return;
  }
  
  // Get the target cell (top-left)
  const targetCell = table.rows[minRow].cells[minCol];
  
  // Collect all content from selected cells
  let combinedContent = '';
  selectedCells.forEach(cell => {
    if (cell !== targetCell && cell.textContent.trim() !== '') {
      combinedContent += cell.innerHTML + ' ';
    }
  });
  
  // Set rowspan and colspan
  targetCell.rowSpan = maxRow - minRow + 1;
  targetCell.colSpan = maxCol - minCol + 1;
  
  // Add the collected content to the target cell
  if (combinedContent) {
    targetCell.innerHTML += ' ' + combinedContent;
  }
  
  // Remove other cells (except the target)
  selectedCells.forEach(cell => {
    if (cell !== targetCell) {
      cell.remove();
    }
  });
  
  // Update resize handles
  addResizeHandles(table);
};

export const splitCells = (cell) => {
  if (cell.rowSpan <= 1 && cell.colSpan <= 1) {
    alert('Cannot split: Cell is not merged');
    return;
  }
  
  const table = cell.closest('table');
  const rowIndex = cell.parentElement.rowIndex;
  const colIndex = cell.cellIndex;
  const rowSpan = cell.rowSpan;
  const colSpan = cell.colSpan;
  const content = cell.innerHTML;
  
  // Reset the rowspan and colspan
  cell.rowSpan = 1;
  cell.colSpan = 1;
  
  // Add cells in current row
  for (let j = 1; j < colSpan; j++) {
    const newCell = cell.parentElement.insertCell(colIndex + j);
    newCell.setAttribute('contenteditable', 'true');
    newCell.style.cssText = `
      border: 1px solid #d0d0d0;
      padding: 8px;
      min-width: 30px;
      position: relative;
      text-align: left;
      color: #000;
    `;
    newCell.innerHTML = '<br>';
    
    // Add event listeners
    newCell.addEventListener('input', (e) => {
      if (newCell.innerHTML.trim() === '') {
        newCell.innerHTML = '<br>';
      }
      const event = new CustomEvent('table-cell-changed', {
        bubbles: true,
        detail: { cell: newCell, table }
      });
      document.dispatchEvent(event);
      e.stopPropagation();
    });
  }
  
  // Add cells in other rows
  for (let i = 1; i < rowSpan; i++) {
    const row = table.rows[rowIndex + i];
    if (!row) continue;
    
    for (let j = 0; j < colSpan; j++) {
      const insertIndex = Math.min(colIndex + j, row.cells.length);
      const newCell = row.insertCell(insertIndex);
      newCell.setAttribute('contenteditable', 'true');
      newCell.style.cssText = `
        border: 1px solid #d0d0d0;
        padding: 8px;
        min-width: 30px;
        position: relative;
        text-align: left;
        color: #000;
      `;
      newCell.innerHTML = '<br>';
      
      // Add event listeners
      newCell.addEventListener('input', (e) => {
        if (newCell.innerHTML.trim() === '') {
          newCell.innerHTML = '<br>';
        }
        const event = new CustomEvent('table-cell-changed', {
          bubbles: true,
          detail: { cell: newCell, table }
        });
        document.dispatchEvent(event);
        e.stopPropagation();
      });
    }
  }
  
  // Update resize handles
  addResizeHandles(table);
};

export const distributeColumnsEvenly = (table) => {
  const width = table.offsetWidth;
  const firstRow = table.rows[0];
  if (!firstRow) return;
  
  const colCount = firstRow.cells.length;
  const colWidth = width / colCount;
  
  // Set equal width for all cells in the first row
  Array.from(firstRow.cells).forEach(cell => {
    cell.style.width = `${colWidth}px`;
  });
  
  // Update resize handles
  addResizeHandles(table);
}; 