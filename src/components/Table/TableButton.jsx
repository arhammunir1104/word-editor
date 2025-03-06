import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip, Popover, Box, Typography } from '@mui/material';
import { TableChart } from '@mui/icons-material';
import TableSelectionGrid from './TableSelectionGrid';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import { setupTableKeyboardNavigation, addResizeHandles, setupTableContextMenu } from './TableUtils';

const TableButton = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [hoveredSize, setHoveredSize] = useState({ rows: 0, cols: 0 });
  const { saveHistory, ActionTypes } = useEditorHistory();

  // Set up listeners for table events
  useEffect(() => {
    const handleTableCellChanged = (e) => {
      // Save history when table cell content changes
      saveHistory(ActionTypes.COMPLETE);
    };
    
    const handleTableStructureChanged = (e) => {
      // Save history when table structure changes (resize, etc)
      saveHistory(ActionTypes.COMPLETE);
    };
    
    document.addEventListener('table-cell-changed', handleTableCellChanged);
    document.addEventListener('table-structure-changed', handleTableStructureChanged);
    
    return () => {
      document.removeEventListener('table-cell-changed', handleTableCellChanged);
      document.removeEventListener('table-structure-changed', handleTableStructureChanged);
    };
  }, [saveHistory, ActionTypes]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setHoveredSize({ rows: 0, cols: 0 });
  };

  const handleTableCreate = (rows, cols) => {
    // Save state before creating table for undo functionality
    saveHistory(ActionTypes.COMPLETE);
    
    // Create and insert the table at current selection
    insertTableAtCursor(rows, cols);
    
    handleClose();
  };

  const insertTableAtCursor = (rows, cols) => {
    // First, find all editable areas
    const editableAreas = document.querySelectorAll('[contenteditable="true"][data-content-area="true"]');
    if (editableAreas.length === 0) {
      console.error('No content areas found');
      return;
    }
    
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.error('No selection found');
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Find the editable area that contains the selection
    let editableArea = null;
    for (const area of editableAreas) {
      if (area.contains(range.commonAncestorContainer)) {
        editableArea = area;
        break;
      }
    }
    
    // If no editable area contains the selection, use the first editable area
    if (!editableArea) {
      console.warn('Selection not in content area, using first available area');
      editableArea = editableAreas[0];
      
      // Create a new range at the beginning of the editable area
      range.selectNodeContents(editableArea);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Create the div container for the table
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    tableContainer.style.cssText = `
      width: 100%;
      margin: 1em 0;
      min-height: 50px;
    `;
    
    // Create table element with explicit styling
    const table = document.createElement('table');
    table.className = 'editor-table';
    
    // Don't make the table itself contenteditable
    table.removeAttribute('contenteditable');
    
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      table-layout: fixed;
      display: table;
      visibility: visible;
      opacity: 1;
    `;
    
    // Create table header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    for (let j = 0; j < cols; j++) {
      const th = document.createElement('th');
      th.setAttribute('contenteditable', 'true');
      th.style.cssText = `
        border: 1px solid #d0d0d0;
        padding: 8px;
        min-width: 30px;
        min-height: 20px;
        position: relative;
        background-color: #f3f3f3;
        font-weight: bold;
        text-align: left;
        color: #000;
        visibility: visible;
        display: table-cell;
      `;
      
      // Add a <br> to ensure cell is editable even when empty
      th.innerHTML = '<br>';
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    for (let i = 0; i < rows - 1; i++) {
      const row = document.createElement('tr');
      
      for (let j = 0; j < cols; j++) {
        const cell = document.createElement('td');
        cell.setAttribute('contenteditable', 'true');
        cell.style.cssText = `
          border: 1px solid #d0d0d0;
          padding: 8px;
          min-width: 30px;
          min-height: 20px;
          position: relative;
          text-align: left;
          color: #000;
          visibility: visible;
          display: table-cell;
        `;
        
        // Add a <br> to ensure cell is editable even when empty
        cell.innerHTML = '<br>';
        row.appendChild(cell);
      }
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // Insert the table at cursor position
    range.deleteContents();
    range.insertNode(tableContainer);
    
    // Add a paragraph after the table for easier editing
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';
    
    if (tableContainer.nextSibling) {
      editableArea.insertBefore(paragraph, tableContainer.nextSibling);
    } else {
      editableArea.appendChild(paragraph);
    }
    
    // Set up event handlers
    setupTableKeyboardNavigation(table);
    addResizeHandles(table);
    setupTableContextMenu(table);
    
    // Focus the first cell automatically
    if (table.rows[0] && table.rows[0].cells[0]) {
      const firstCell = table.rows[0].cells[0];
      firstCell.focus(); // Direct focus first
      
      // Then place cursor
      const newRange = document.createRange();
      newRange.selectNodeContents(firstCell);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // Trigger an input event to ensure content is saved
    const inputEvent = new Event('input', { bubbles: true });
    editableArea.dispatchEvent(inputEvent);
    
    // Save state after creating table for redo functionality
    saveHistory(ActionTypes.COMPLETE);
  };

  return (
    <>
      <Tooltip title="Insert table">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ padding: '4px' }}
        >
          <TableChart sx={{ fontSize: '18px' }} />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" sx={{ p: 1 }}>
            {hoveredSize.rows > 0 && hoveredSize.cols > 0
              ? `${hoveredSize.rows}×${hoveredSize.cols} Table`
              : 'Insert table'}
          </Typography>
          
          <TableSelectionGrid 
            onSizeHover={setHoveredSize}
            onSizeSelect={handleTableCreate}
          />
        </Box>
      </Popover>
    </>
  );
};

export default TableButton;
