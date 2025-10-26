import React from 'react';
import { HelpCircle, Info, User } from 'lucide-react';

interface FloatingMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
  suffix?: React.ReactNode;
}

interface FloatingMenuProps {
  items: FloatingMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  anchor?: 'left' | 'right' | 'center';
}

export default function FloatingMenu({ items, isOpen, onClose, position, anchor = 'right' }: FloatingMenuProps) {
  if (!isOpen) return null;

  // Calculate positioning with boundary checks
  const getPositionStyle = (): React.CSSProperties => {
    if (!position) return {};
    
    const { x, y } = position;
    const menuWidth = 144; // w-36 = 144px
    
    let left: number;
    
    if (anchor === 'right') {
      // For right anchor, align right edge of menu with the x position
      left = x - menuWidth;
      // Check if menu would overflow left edge
      if (left < 8) {
        left = 8;
      }
    } else if (anchor === 'center') {
      // For center anchor, center the menu on x position
      left = x - menuWidth / 2;
      // Check if menu would overflow left edge
      if (left < 8) {
        left = 8;
      }
      // Check if menu would overflow right edge
      if (x + menuWidth / 2 > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
    } else {
      // For left anchor, menu extends to the left
      left = x - menuWidth;
      if (left < 8) {
        left = x;
      }
    }
    
    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${y}px`,
      transform: 'none',
    };
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className="absolute z-50 w-36 bg-white rounded-lg shadow-lg border border-gray-200/50 py-2"
        style={getPositionStyle()}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors ${item.className || ''}`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="truncate text-left">{item.label}</span>
            </div>
            {item.suffix}
          </button>
        ))}
      </div>
    </>
  );
}

// Helper function to create icon elements
export const FloatingMenuIcons = {
  Help: () => <HelpCircle className="w-3 h-3" />,
  Info: () => <Info className="w-3 h-3" />,
  User: () => <User className="w-3 h-3" />,
};

