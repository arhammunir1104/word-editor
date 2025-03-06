import React, { useRef, useEffect, useState } from 'react';
import { useRuler } from './RulerContext';
import './rulerStyles.css';

const RULER_HEIGHT = 20;

const Ruler = () => {
  const rulerRef = useRef(null);
  const containerRef = useRef(null);
  const [rulerWidth, setRulerWidth] = useState(0);
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
    endDrag,
    measureExactTextPosition
  } = useRuler();
  
  // Setup ruler dimensions and alignment with page
  useEffect(() => {
    const updateRulerDimensions = () => {
      // Find the page element
      const pageElement = document.querySelector('[data-page="1"]');
      if (!pageElement) return;
      
      // Get actual page width
      const actualPageWidth = pageElement.offsetWidth;
      setRulerWidth(actualPageWidth);
      
      // Update container width to match page exactly
      if (containerRef.current) {
        containerRef.current.style.width = `${actualPageWidth}px`;
        
        // Critical: Ensure perfect horizontal alignment
        const contentArea = document.querySelector('[data-content-area="true"]');
        if (contentArea) {
          const contentRect = contentArea.getBoundingClientRect();
          const rulerRect = containerRef.current.getBoundingClientRect();
          
          // Check if horizontal alignment needs adjustment
          const misalignment = contentRect.left - rulerRect.left;
          if (Math.abs(misalignment) > 1) {
            console.log(`Fixing ruler alignment. Offset: ${misalignment}px`);
            containerRef.current.style.transform = `translateX(${misalignment}px)`;
          }
        }
      }
    };
    
    // Initial update
    updateRulerDimensions();
    
    // Update on window resize
    window.addEventListener('resize', updateRulerDimensions);
    
    // Setup observer for page changes
    const resizeObserver = new ResizeObserver(() => {
      updateRulerDimensions();
      
      // Re-check text position whenever the page size changes
      const exactTextPos = measureExactTextPosition();
      if (exactTextPos !== null && Math.abs(exactTextPos - pageMargins.left) > 2) {
        // If text position doesn't match ruler, update the ruler
        console.log("Ruler-Text misalignment detected. Adjusting...");
        updatePageMargins({ left: exactTextPos });
      }
    });
    
    const pageElement = document.querySelector('[data-page="1"]');
    if (pageElement) {
      resizeObserver.observe(pageElement);
    }
    
    // Verify alignment after a moment
    setTimeout(() => {
      updateRulerDimensions();
      
      // Verify text position matches ruler position
      const textPos = measureExactTextPosition();
      if (textPos !== null && Math.abs(textPos - pageMargins.left) > 2) {
        console.log("Initial text-ruler mismatch detected:", { 
          textStart: textPos, 
          rulerMargin: pageMargins.left 
        });
        updatePageMargins({ left: textPos });
      }
    }, 500);
    
    return () => {
      window.removeEventListener('resize', updateRulerDimensions);
      resizeObserver.disconnect();
    };
  }, [pageMargins.left, measureExactTextPosition, updatePageMargins]);
  
  // Draw ruler
  useEffect(() => {
    if (!rulerRef.current || rulerWidth === 0) return;
    
    const canvas = rulerRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas dimensions for high-DPI displays
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
    
    // Draw margin areas (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageMargins.left, RULER_HEIGHT);
    ctx.fillRect(rulerWidth - pageMargins.right, 0, pageMargins.right, RULER_HEIGHT);
    
    // Calculate scale for inch markers
    const scaleFactor = rulerWidth / PAGE_WIDTH;
    const scaledInch = INCH_TO_PX * scaleFactor;
    
    // Draw tick marks
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Major inch marks
    for (let i = 0; i <= rulerWidth; i += scaledInch) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, RULER_HEIGHT);
      
      // Add inch numbers
      ctx.fillStyle = '#757575';
      ctx.font = '10px Arial';
      ctx.fillText(`${Math.round(i / scaledInch)}`, i + 2, 10);
    }
    
    // Half-inch marks
    for (let i = scaledInch / 2; i <= rulerWidth; i += scaledInch) {
      if (i % scaledInch !== 0) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, RULER_HEIGHT * 0.75);
      }
    }
    
    // Quarter-inch marks
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
  }, [rulerWidth, pageMargins, indents, isHoveringMarkers, hoverPosition, INCH_TO_PX, PAGE_WIDTH]);
  
  // Handle mouse interactions
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    setHoverPosition(mouseX);
    
    // Detect hovering near markers
    const nearLeftMargin = Math.abs(mouseX - pageMargins.left) < 10;
    const nearRightMargin = Math.abs(mouseX - (rulerWidth - pageMargins.right)) < 10;
    
    // Detect hovering near indent markers
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
      // Bound the margin to reasonable values
      const newMargin = Math.max(0, Math.min(mouseX, rulerWidth / 2));
      updatePageMargins({ left: newMargin });
    } else if (isDragging === 'rightMargin') {
      const newMargin = Math.max(0, Math.min(rulerWidth - mouseX, rulerWidth / 2));
      updatePageMargins({ right: newMargin });
    } else if (isDragging === 'leftIndent') {
      // Left indent is relative to margin
      const newIndent = Math.max(0, mouseX - pageMargins.left);
      updateIndents({ left: newIndent });
    } else if (isDragging === 'firstLineIndent') {
      // First line indent is relative to left indent
      const newIndent = Math.max(-indents.left, mouseX - pageMargins.left - indents.left);
      updateIndents({ firstLine: newIndent });
    } else if (isDragging === 'rightIndent') {
      // Right indent is relative to right margin
      const newIndent = Math.max(0, rulerWidth - mouseX - pageMargins.right);
      updateIndents({ right: newIndent });
    }
  };
  
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Check what was clicked
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
      // Add tab stop when clicking elsewhere on ruler
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
      
      // Verify alignment after drag ends
      setTimeout(() => {
        const textPos = measureExactTextPosition();
        if (textPos !== null && isDragging === 'leftMargin' && 
            Math.abs(textPos - pageMargins.left) > 2) {
          console.log("Post-drag misalignment detected:", {
            textStart: textPos,
            rulerMargin: pageMargins.left
          });
          updatePageMargins({ left: textPos });
        }
      }, 50);
    }
  };
  
  // Handle global mouse up
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
  
  // Double-click to reset to default
  const handleDoubleClick = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // If double-clicking near margins, reset to 1 inch
    if (Math.abs(mouseX - pageMargins.left) < 15) {
      updatePageMargins({ left: INCH_TO_PX });
    } else if (Math.abs(mouseX - (rulerWidth - pageMargins.right)) < 15) {
      updatePageMargins({ right: INCH_TO_PX });
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className="ruler-container"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
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