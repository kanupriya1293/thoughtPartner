import React, { useState, useRef } from 'react';
import FloatingMenu from './FloatingMenu';

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
      // No branches, hide menu if it's showing
      setShowMenu(false);
      return;
    }

    if (segment.branches.length === 1) {
      // Single branch, don't show menu (hide it if it's showing)
      setShowMenu(false);
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

  const handleCloseMenu = () => {
    setShowMenu(false);
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

      {/* Floating menu for multiple branches */}
      <FloatingMenu
        items={menuBranches.map((branch) => ({
          id: branch.threadId,
          label: branch.title,
          onClick: () => onBranchClick(branch.threadId),
        }))}
        isOpen={showMenu}
        onClose={handleCloseMenu}
        position={{ x: menuPosition.x + menuPosition.width / 2, y: menuPosition.y }}
        anchor="center"
        closeOnBackdrop={false}
      />
    </div>
  );
};

export default HighlightedText;

