import React, { useState, useRef, useEffect } from 'react';

const EditMode = ({ children, elementId, initialConfig, onSave }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [config, setConfig] = useState(
    initialConfig || { id: elementId || 'element', x: 50, y: 50, type: 'element' }
  );
  const elementRef = useRef(null);

  // Load saved position on mount
  useEffect(() => {
    if (elementId) {
      const saved = localStorage.getItem(`edit-${elementId}`);
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    }
  }, [elementId]);

  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    
    setIsDragging(true);
    
    const handleMouseMove = (e) => {
      if (!elementRef.current) return;
      
      const rect = elementRef.current.parentElement?.getBoundingClientRect();
      if (!rect) return;
      
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setConfig(prev => ({ 
        ...prev, 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)) 
      }));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSave = () => {
    if (elementId) {
      localStorage.setItem(`edit-${elementId}`, JSON.stringify(config));
    }
    onSave?.(config);
    setIsEditMode(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setIsEditMode(!isEditMode);
      }
      if (e.key === 'Escape' && isEditMode) {
        setIsEditMode(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode]);

  return (
    <>
      {/* Edit Mode Toggle */}
      <button
        onClick={() => setIsEditMode(!isEditMode)}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #666',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        title="Toggle Edit Mode (Ctrl+E)"
      >
        ✏️ Edit
      </button>

      {/* Edit Mode Controls */}
      {isEditMode && (
        <div style={{
          position: 'fixed',
          top: '60px',
          right: '16px',
          zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #666',
          minWidth: '200px'
        }}>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '8px' }}>
            Edit Mode Active
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              X: {config.x.toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={config.x}
              onChange={(e) => setConfig(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              Y: {config.y.toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={config.y}
              onChange={(e) => setConfig(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              💾 Save
            </button>
            <button
              onClick={() => setIsEditMode(false)}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editable Element */}
      <div
        ref={elementRef}
        style={{
          position: 'absolute',
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: 'translate(-50%, -50%)',
          cursor: isEditMode ? 'move' : 'default',
          outline: isEditMode ? '2px solid #fbbf24' : 'none',
          opacity: isDragging ? 0.7 : 1,
        }}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </>
  );
};

// Hook to use saved positions
const useEditablePosition = (elementId, defaultX = 50, defaultY = 50) => {
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });

  useEffect(() => {
    const saved = localStorage.getItem(`edit-${elementId}`);
    if (saved) {
      const config = JSON.parse(saved);
      setPosition({ x: config.x, y: config.y });
    }
  }, [elementId]);

  return position;
};

export { EditMode, useEditablePosition };