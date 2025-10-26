import React, { useEffect, useRef } from 'react';

interface SelectionMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  onAsk: () => void;
  onBranch: () => void;
  onClose: () => void;
}

const SelectionMenu: React.FC<SelectionMenuProps> = ({ selectedText, position, onAsk, onBranch, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="selection-menu"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px` 
      }}
    >
      <button className="selection-menu-btn" onClick={onAsk}>
        Ask here
      </button>
      <button className="selection-menu-btn" onClick={onBranch}>
        Branch
      </button>
    </div>
  );
};

export default SelectionMenu;

