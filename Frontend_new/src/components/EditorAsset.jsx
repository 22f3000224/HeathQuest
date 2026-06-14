import React, { useState, useRef, useEffect } from 'react';

const EditorAsset = ({ 
  children, 
  id, 
  defaultX = 100, 
  defaultY = 100, 
  defaultWidth = 200, 
  defaultHeight = 200 
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [config, setConfig] = useState({
    id,
    x: defaultX,
    y: defaultY,
    width: defaultWidth,
    height: defaultHeight
  });
  const elementRef = useRef(null);

  // Check for edit mode from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsEditMode(urlParams.get('edit') === '1');
  }, []);

  // Load saved position on mount
  useEffect(() => {
    if (id) {
      const allAssets = JSON.parse(localStorage.getItem('editorAssets') || '{}');
      if (allAssets[id]) {
        setConfig(prev => ({ ...prev, ...allAssets[id] }));
      }
    }
  }, [id]);

  const saveConfig = (newConfig) => {
    const allAssets = JSON.parse(localStorage.getItem('editorAssets') || '{}');
    allAssets[id] = newConfig;
    localStorage.setItem('editorAssets', JSON.stringify(allAssets));
  };

  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startConfigX = config.x;
    const startConfigY = config.y;
    let latestConfig = config;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      latestConfig = {
        ...config,
        x: startConfigX + deltaX,
        y: startConfigY + deltaY
      };
      
      setConfig(latestConfig);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      saveConfig(latestConfig);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e) => {
    if (!isEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = config.width;
    const startHeight = config.height;
    const startConfig = config;
    let latestConfig = config;
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      latestConfig = {
        ...startConfig,
        width: Math.max(50, startWidth + deltaX),
        height: Math.max(50, startHeight + deltaY)
      };
      
      setConfig(latestConfig);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      saveConfig(latestConfig);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Global save shortcut — Ctrl+S logs all positions to console
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const all = JSON.parse(localStorage.getItem('editorAssets') || '{}');
        console.log('[EditorAsset] Saved layouts:', JSON.stringify(all, null, 2));
        alert(`Layout saved! Check console for JSON.\n${id}: x=${all[id]?.x}, y=${all[id]?.y}, w=${all[id]?.width}, h=${all[id]?.height}`);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [id]);

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        left: `${config.x}px`,
        top: `${config.y}px`,
        width: `${config.width}px`,
        height: `${config.height}px`,
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
        outline: isEditMode ? '2px solid #fbbf24' : 'none',
        opacity: isDragging || isResizing ? 0.7 : 1,
        zIndex: isEditMode ? 1000 : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {isEditMode && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          left: '0',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#fbbf24',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {id} ({config.x}, {config.y}) [{config.width}×{config.height}]
        </div>
      )}
      
      {/* Resize handle */}
      {isEditMode && (
        <div 
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: '-5px',
            right: '-5px',
            width: '12px',
            height: '12px',
            backgroundColor: '#fbbf24',
            border: '2px solid #fff',
            borderRadius: '50%',
            cursor: 'se-resize',
            zIndex: 1001,
            boxShadow: '0 0 4px rgba(0,0,0,0.3)'
          }}
        />
      )}
      
      <div style={{width: '100%', height: '100%'}}>
        {React.isValidElement(children)
          ? React.cloneElement(children, {
              style: {
                ...children.props.style,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              },
            })
          : children}
      </div>
    </div>
  );
};

export default EditorAsset;