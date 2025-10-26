import React, { useState, useRef } from 'react';
import { GitBranch, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { BranchInfo } from '../types/message';
import FloatingMenu from './FloatingMenu';

interface BranchIndicatorProps {
  branches: BranchInfo[];
  onBranchClick: (threadId: string) => void;
  onDeleteBranch?: (threadId: string) => void;
  onRenameBranch?: (branchId: string, newTitle: string) => void;
}

const BranchIndicator: React.FC<BranchIndicatorProps> = ({ branches, onBranchClick, onDeleteBranch, onRenameBranch }) => {
  const [showBranches, setShowBranches] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState<string | null>(null);
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const branchMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const getMenuPosition = () => {
    if (!buttonRef.current) return undefined;
    const rect = buttonRef.current.getBoundingClientRect();
    // Position below the button, aligned with the right edge
    return { x: rect.right, y: rect.bottom + 8 };
  };

  const getBranchMenuPosition = (branchId: string) => {
    const menuRef = branchMenuRefs.current[branchId];
    if (!menuRef) return undefined;
    const rect = menuRef.getBoundingClientRect();
    return { x: rect.right, y: rect.bottom + 8 };
  };

  const handleRename = (branchId: string, currentTitle: string) => {
    const newTitle = prompt('Enter new title:', currentTitle);
    if (newTitle && newTitle.trim() && onRenameBranch) {
      onRenameBranch(branchId, newTitle.trim());
    }
    setShowBranchMenu(null);
  };

  const handleDelete = (branchId: string) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      if (onDeleteBranch) {
        onDeleteBranch(branchId);
      }
    }
    setShowBranchMenu(null);
  };

  return (
    <>
      <div className="relative">
        <button 
          ref={buttonRef}
          className="text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded transition-colors"
          onClick={() => setShowBranches(!showBranches)}
        >
          🌿 {branches.length}
        </button>
        
        {/* Main branches floating menu */}
        <FloatingMenu
          items={branches.map(branch => {
            const isMenuOpen = showBranchMenu === branch.thread_id;
            const isHovered = hoveredBranch === branch.thread_id;
            return {
              id: branch.thread_id,
              label: branch.title || 'Untitled Branch',
              icon: <GitBranch className="w-3 h-3" />,
              onClick: () => {
                onBranchClick(branch.thread_id);
                setShowBranches(false);
              },
              // Add three dots button for each branch (show only on hover)
              suffix: (
                <div 
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                  ref={(el) => {
                    if (el) {
                      branchMenuRefs.current[branch.thread_id] = el;
                    }
                  }}
                  onMouseEnter={() => setHoveredBranch(branch.thread_id)}
                  onMouseLeave={() => setHoveredBranch(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBranchMenu(isMenuOpen ? null : branch.thread_id);
                  }}
                >
                  {isHovered && !isMenuOpen && (
                    <MoreHorizontal className="w-3 h-3 text-gray-600 pointer-events-none" />
                  )}
                </div>
              ),
            };
          })}
          isOpen={showBranches}
          onClose={() => setShowBranches(false)}
          position={getMenuPosition()}
          anchor="right"
        />
      </div>

      {/* Branch actions floating menu (for each branch's three dots) */}
      {showBranchMenu && (
        <FloatingMenu
          items={[
            {
              id: 'rename',
              label: 'Rename',
              icon: <Edit2 className="w-3 h-3" />,
              onClick: () => {
                const branch = branches.find(b => b.thread_id === showBranchMenu);
                if (branch) {
                  handleRename(showBranchMenu, branch.title || 'Untitled Branch');
                }
              },
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <Trash2 className="w-3 h-3" />,
              onClick: () => handleDelete(showBranchMenu),
            },
          ]}
          isOpen={!!showBranchMenu}
          onClose={() => setShowBranchMenu(null)}
          position={getBranchMenuPosition(showBranchMenu!)}
          anchor="right"
        />
      )}
    </>
  );
};

export default BranchIndicator;

