import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useEditorHistory } from '../../context/EditorHistoryContext';
import {
  insertRow,
  insertColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
  mergeCells,
  splitCells,
  distributeColumnsEvenly
} from './TableUtils';

// This function will be called from TableUtils.js
export const renderTableContextMenu = ({ x, y, cell, row, table }) => {
  // Create a temporary container for the React component
  const container = document.createElement('div');
  container.className = 'table-context-menu-container';
  document.body.appendChild(container);
  
  // Render the React component in the container
  const handleClose = () => {
    // Unmount the component when closed
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };
  
  ReactDOM.render(
    <TableContextMenuComponent 
      position={{ x, y }}
      cell={cell}
      row={row}
      table={table}
      onClose={handleClose}
    />,
    container
  );
};

// The React component for the context menu
const TableContextMenuComponent = ({ position, cell, row, table, onClose }) => {
  const { saveHistory, ActionTypes } = useEditorHistory();
  const menuRef = useRef(null);
  
  // Menu items definition with their actions
  const menuItems = [
    { 
      text: 'Insert row above', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        insertRow(row, true);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Insert row below', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        insertRow(row, false);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Insert column left', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        insertColumn(cell, true);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Insert column right', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        insertColumn(cell, false);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Delete row', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        deleteRow(row);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Delete column', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        deleteColumn(cell);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Delete table', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        deleteTable(table);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Merge cells', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        mergeCells(table);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
    { 
      text: 'Split cells', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        splitCells(cell);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      },
      disabled: cell.rowSpan <= 1 && cell.colSpan <= 1
    },
    { 
      text: 'Distribute columns evenly', 
      action: () => {
        saveHistory(ActionTypes.COMPLETE);
        distributeColumnsEvenly(table);
        saveHistory(ActionTypes.COMPLETE);
        onClose();
      }
    },
  ];

  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  return (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 1500,
        padding: '8px 0',
        minWidth: '200px'
      }}
    >
      {menuItems.map((item, index) => (
        <div
          key={index}
          onClick={item.disabled ? undefined : item.action}
          style={{
            padding: '8px 16px',
            cursor: item.disabled ? 'default' : 'pointer',
            opacity: item.disabled ? 0.5 : 1,
            backgroundColor: 'transparent'
          }}
          onMouseOver={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
};

export default TableContextMenuComponent; 