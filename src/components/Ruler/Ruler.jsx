import React, { useRef, useEffect, useState } from 'react';
import { useRuler } from './RulerContext';
import './rulerStyles.css';

const RULER_HEIGHT = 20;

const Ruler = () => {
  const rulerRef = useRef(null);
  const containerRef = useRef(null);
  const [rulerWidth, setRulerWidth] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [isHoveringMarkers, setIsHoveringMarkers] = useState({
    leftMargin: false,
    rightMargin: false,
    leftIndent: false,
    rightIndent: false,
    firstLineIndent: false
  });
  const [isDragging, setIsDragging] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  
  const { 
    PAGE_WIDTH,
    INCH_TO_PX,
    pageMargins, 
    indents, 
    tabStops, 
    updatePageMargins, 
    updateIndents,
    addTabStop,
    removeTabStop,
    startDrag,
    endDrag
  } = useRuler();
  
  // Synchronize ruler with page dimensions
  useEffect(() => {
    const updateRulerDimensions = () => {
      // Find the page element
      const pageElement = document.querySelector('[data-page="1"]');
      if (!pageElement) return;
      
      // Get actual page width
      const actualPageWidth = pageElement.offsetWidth;
      setPageWidth(actualPageWidth);
      setRulerWidth(actualPageWidth);
      
      // Update container width to match
      if (containerRef.current) {
        containerRef.current.style.width = `${actualPageWidth}px`;
      }
    };
    
    // Initial update
    updateRulerDimensions();
    
    // Update on window resize
    window.addEventListener('resize', updateRulerDimensions);
    
    // Monitor page element changes with ResizeObserver
    const resizeObserver = new ResizeObserver(updateRulerDimensions);
    const pageElement = document.querySelector('[data-page="1"]');
    if (pageElement) {
      resizeObserver.observe(pageElement);
    }
    
    return () => {
      window.removeEventListener('resize', updateRulerDimensions);
      resizeObserver.disconnect();
    };
  }, []);
  
  // Draw ruler
  useEffect(() => {
    if (!rulerRef.current || rulerWidth === 0) return;
    
    const canvas = rulerRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas dimensions with high-DPI support
    canvas.width = rulerWidth * dpr;
    canvas.height = RULER_HEIGHT * dpr;
    canvas.style.width = `${rulerWidth}px`;
    canvas.style.height = `${RULER_HEIGHT}px`;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rulerWidth, RULER_HEIGHT);
    
    // Draw ruler background
    ctx.fillStyle = '#f1f3f4';
    ctx.fillRect(0, 0, rulerWidth, RULER_HEIGHT);
    
    // Draw margin areas (white background)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageMargins.left, RULER_HEIGHT);
    ctx.fillRect(rulerWidth - pageMargins.right, 0, pageMargins.right, RULER_HEIGHT);
    
    // Calculate the scale factor (how many pixels per inch)
    const scaleFactor = rulerWidth / PAGE_WIDTH;
    const scaledInch = INCH_TO_PX * scaleFactor;
    
    // Draw tick marks
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Draw inch marks
    for (let i = 0; i <= rulerWidth; i += scaledInch) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, RULER_HEIGHT);
      
      // Draw inch numbers
      ctx.fillStyle = '#757575';
      ctx.font = '10px Arial';
      ctx.fillText(`${Math.round(i / scaledInch)}`, i + 2, 10);
    }
    
    // Draw half-inch marks
    for (let i = scaledInch / 2; i <= rulerWidth; i += scaledInch) {
      if (i % scaledInch !== 0) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, RULER_HEIGHT * 0.75);
      }
    }
    
    // Draw quarter-inch marks
    for (let i = scaledInch / 4; i <= rulerWidth; i += scaledInch / 2) {
      if (i % (scaledInch / 2) !== 0) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, RULER_HEIGHT * 0.5);
      }
    }
    
    ctx.stroke();
    
    // Draw hover indicator
    if (Object.values(isHoveringMarkers).some(val => val)) {
      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hoverPosition, 0);
      ctx.lineTo(hoverPosition, RULER_HEIGHT);
      ctx.stroke();
    }
    
    // Shade active text area
    const leftIndentPos = pageMargins.left + indents.left;
    const rightIndentPos = rulerWidth - pageMargins.right - indents.right;
    
    ctx.fillStyle = 'rgba(24, 90, 188, 0.1)';
    ctx.fillRect(leftIndentPos, 0, rightIndentPos - leftIndentPos, RULER_HEIGHT);
    
    // Draw margin boundary lines
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Left margin line
    ctx.moveTo(pageMargins.left, 0);
    ctx.lineTo(pageMargins.left, RULER_HEIGHT);
    
    // Right margin line
    ctx.moveTo(rulerWidth - pageMargins.right, 0);
    ctx.lineTo(rulerWidth - pageMargins.right, RULER_HEIGHT);
    
    ctx.stroke();
  }, [rulerWidth, pageMargins, indents, isHoveringMarkers, hoverPosition, INCH_TO_PX, PAGE_WIDTH, pageWidth]);
  
  // Handle mouse events for marker interactions
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    setHoverPosition(mouseX);
    
    // Detect hover near margin markers
    const nearLeftMargin = Math.abs(mouseX - pageMargins.left) < 10;
    const nearRightMargin = Math.abs(mouseX - (rulerWidth - pageMargins.right)) < 10;
    
    // Detect hover near indent markers
    const leftIndentPos = pageMargins.left + indents.left;
    const firstLineIndentPos = leftIndentPos + indents.firstLine;
    const rightIndentPos = rulerWidth - pageMargins.right - indents.right;
    
    const nearLeftIndent = Math.abs(mouseX - leftIndentPos) < 10;
    const nearFirstLineIndent = Math.abs(mouseX - firstLineIndentPos) < 10;
    const nearRightIndent = Math.abs(mouseX - rightIndentPos) < 10;
    
    setIsHoveringMarkers({
      leftMargin: nearLeftMargin && !isDragging,
      rightMargin: nearRightMargin && !isDragging,
      leftIndent: nearLeftIndent && !isDragging,
      firstLineIndent: nearFirstLineIndent && !isDragging,
      rightIndent: nearRightIndent && !isDragging
    });
    
    // Handle dragging operations
    if (isDragging === 'leftMargin') {
      // Keep margins in reasonable bounds
      const newLeftMargin = Math.max(0, Math.min(mouseX, rulerWidth / 2.5));
      updatePageMargins({ left: newLeftMargin });
    } else if (isDragging === 'rightMargin') {
      const newRightMargin = Math.max(0, Math.min(rulerWidth - mouseX, rulerWidth / 2.5));
      updatePageMargins({ right: newRightMargin });
    } else if (isDragging === 'leftIndent') {
      // Left indent is relative to left margin
      const newLeftIndent = Math.max(0, mouseX - pageMargins.left);
      updateIndents({ left: newLeftIndent });
    } else if (isDragging === 'firstLineIndent') {
      // First line indent is relative to left indent
      const newFirstLineIndent = Math.max(-indents.left, mouseX - pageMargins.left - indents.left);
      updateIndents({ firstLine: newFirstLineIndent });
    } else if (isDragging === 'rightIndent') {
      // Right indent is relative to right margin
      const newRightIndent = Math.max(0, rulerWidth - mouseX - pageMargins.right);
      updateIndents({ right: newRightIndent });
    }
  };
  
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Check if clicking on a marker
    if (isHoveringMarkers.leftMargin) {
      setIsDragging('leftMargin');
      startDrag('leftMargin');
    } else if (isHoveringMarkers.rightMargin) {
      setIsDragging('rightMargin');
      startDrag('rightMargin');
    } else if (isHoveringMarkers.leftIndent) {
      setIsDragging('leftIndent');
      startDrag('leftIndent');
    } else if (isHoveringMarkers.firstLineIndent) {
      setIsDragging('firstLineIndent');
      startDrag('firstLineIndent');
    } else if (isHoveringMarkers.rightIndent) {
      setIsDragging('rightIndent');
      startDrag('rightIndent');
    } else {
      // Add tab stop when clicking on ruler (not on any markers)
      const relativePos = mouseX - pageMargins.left;
      if (relativePos > 0 && relativePos < rulerWidth - pageMargins.left - pageMargins.right) {
        addTabStop(relativePos);
      }
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(null);
      endDrag();
    }
  };
  
  // Handle global mouse up to end drag operations
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(null);
        endDrag();
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, endDrag]);
  
  return (
    <div 
      ref={containerRef}
      className="ruler-container"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ 
        cursor: isDragging || Object.values(isHoveringMarkers).some(v => v) ? 'col-resize' : 'pointer',
        width: rulerWidth > 0 ? `${rulerWidth}px` : '100%'
      }}
    >
      <canvas 
        ref={rulerRef}
        height={RULER_HEIGHT}
        width={rulerWidth}
        className="ruler-canvas"
      />
      
      {/* Left margin marker */}
      <div 
        className="ruler-marker margin-marker"
        style={{ 
          left: `${pageMargins.left}px`,
          height: RULER_HEIGHT,
          backgroundColor: '#1a73e8' 
        }}
      />
      
      {/* Right margin marker */}
      <div 
        className="ruler-marker margin-marker"
        style={{ 
          right: `${pageMargins.right}px`,
          height: RULER_HEIGHT,
          backgroundColor: '#1a73e8' 
        }}
      />
      
      {/* Left indent marker (bottom triangle) */}
      <div 
        className="ruler-marker left-indent"
        style={{ 
          left: `${pageMargins.left + indents.left}px`,
          bottom: '0'
        }}
      />
      
      {/* First line indent marker (top triangle) */}
      <div 
        className="ruler-marker first-line-indent"
        style={{ 
          left: `${pageMargins.left + indents.left + indents.firstLine}px`,
          top: '0'
        }}
      />
      
      {/* Right indent marker */}
      <div 
        className="ruler-marker right-indent"
        style={{ 
          right: `${pageMargins.right + indents.right}px`,
          bottom: '0'
        }}
      />
      
      {/* Tab stop markers */}
      {tabStops.map((position, index) => (
        <div 
          key={`tab-${index}`}
          className="ruler-tab-marker"
          style={{ left: `${pageMargins.left + position}px` }}
          onClick={(e) => {
            e.stopPropagation();
            removeTabStop(position);
          }}
        />
      ))}
    </div>
  );
};

export default Ruler; 