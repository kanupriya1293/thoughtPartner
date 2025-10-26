import React, { useState, useRef } from 'react';

interface BranchHighlight {
  threadId: string;
  title: string;
  startOffset: number;
  endOffset: number;
  contextText: string;
}

interface HighlightedTextProps {
  content: string;
  branches: BranchHighlight[];
  onBranchClick: (threadId: string) => void;
}

interface TextSegment {
  text: string;
  startOffset: number;
  endOffset: number;
  branches: BranchHighlight[];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ content, branches, onBranchClick }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 0 });
  const [menuBranches, setMenuBranches] = useState<BranchHighlight[]>([]);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert branches to segments with proper offsets
  const segments: TextSegment[] = [];
  
  if (branches.length === 0) {
    return <span>{content}</span>;
  }

  // Sort branches by start offset
  const sortedBranches = [...branches].sort((a, b) => a.startOffset - b.startOffset);

  // Collect ALL unique boundaries (start and end positions)
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(content.length);
  sortedBranches.forEach(branch => {
    boundaries.add(branch.startOffset);
    boundaries.add(branch.endOffset);
  });

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  // Create a segment for each gap between boundaries
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];
    
    // Find all branches that contain this segment (overlapping branches)
    const containingBranches = sortedBranches.filter(branch => 
      branch.startOffset <= start && branch.endOffset >= end
    );

    segments.push({
      text: content.substring(start, end),
      startOffset: start,
      endOffset: end,
      branches: containingBranches
    });
  }

  const handleHighlightHover = (e: React.MouseEvent, segment: TextSegment) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (segment.branches.length === 0) {
      return;
    }

    if (segment.branches.length === 1) {
      // Single branch, don't show menu (or show a simple tooltip)
      return;
    }

    // Multiple branches, show menu with only this segment's branches
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom + 4, width: rect.width }); // Position below the text
    setMenuBranches(segment.branches);
    setShowMenu(true);
  };

  const handleHighlightLeave = () => {
    // Delay hiding the menu to allow for mouse to move to it
    hideTimeoutRef.current = setTimeout(() => {
      setShowMenu(false);
      hideTimeoutRef.current = null;
    }, 100);
  };

  const handleHighlightClick = (e: React.MouseEvent, segment: TextSegment) => {
    if (segment.branches.length === 1) {
      // Single branch, open directly
      onBranchClick(segment.branches[0].threadId);
    }
  };

  const handleBranchFromMenu = (threadId: string) => {
    setShowMenu(false);
    onBranchClick(threadId);
  };

  return (
    <div className="relative inline-block w-full">
      <span>
        {segments.map((segment, idx) => (
          segment.branches.length > 0 ? (
            <span
              key={idx}
              className="bg-yellow-100 hover:bg-yellow-200 cursor-pointer rounded px-0.5 transition-colors relative"
              onClick={(e) => handleHighlightClick(e, segment)}
              onMouseEnter={(e) => handleHighlightHover(e, segment)}
              onMouseLeave={handleHighlightLeave}
            >
              {segment.text}
            </span>
          ) : (
            <span key={idx}>{segment.text}</span>
          )
        ))}
      </span>

      {/* Popup menu for multiple branches */}
      {showMenu && menuBranches.length > 0 && (
        <div 
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-[300px] py-1 mt-1"
          style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
          onMouseEnter={() => {
            // Clear any pending hide timeout when entering menu
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
            setShowMenu(true);
          }}
          onMouseLeave={() => setShowMenu(false)}
          onClick={(e) => e.stopPropagation()}
        >
          {menuBranches.map((branch) => (
            <button
              key={branch.threadId}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
              onClick={() => handleBranchFromMenu(branch.threadId)}
            >
              <div className="text-sm font-medium text-gray-900 truncate">{branch.title}</div>
              {branch.contextText && (
                <div className="text-xs text-gray-500 truncate">{branch.contextText}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightedText;

