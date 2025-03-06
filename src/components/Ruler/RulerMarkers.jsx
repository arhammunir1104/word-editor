import React from 'react';

export const LeftIndentMarker = ({ position, onDragStart, onDragEnd }) => {
  return (
    <div 
      className="indent-marker left-indent-marker"
      style={{ left: position }}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
    >
      <div className="marker-triangle bottom" />
      <div className="marker-line" />
    </div>
  );
};

export const FirstLineIndentMarker = ({ position, onDragStart, onDragEnd }) => {
  return (
    <div 
      className="indent-marker first-line-indent-marker"
      style={{ left: position }}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
    >
      <div className="marker-triangle top" />
      <div className="marker-line" />
    </div>
  );
};

export const RightIndentMarker = ({ position, onDragStart, onDragEnd }) => {
  return (
    <div 
      className="indent-marker right-indent-marker"
      style={{ right: position }}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
    >
      <div className="marker-triangle bottom" />
      <div className="marker-line" />
    </div>
  );
};

export const TabStopMarker = ({ position, onRemove }) => {
  return (
    <div 
      className="tab-marker"
      style={{ left: position }}
      onClick={onRemove}
    >
      <div className="tab-triangle" />
    </div>
  );
}; 