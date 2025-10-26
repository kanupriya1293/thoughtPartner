import React, { useState } from 'react';

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
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Convert branches to segments with proper offsets
  const segments: TextSegment[] = [];
  
  if (branches.length === 0) {
    // No highlights, return plain text
    return <span>{content}</span>;
  }

  // Sort branches by start offset
  const sortedBranches = [...branches].sort((a, b) => a.startOffset - b.startOffset);

  // Generate segments
  let currentOffset = 0;
  
  sortedBranches.forEach((branch) => {
    // Add text before this highlight
    if (currentOffset < branch.startOffset) {
      const textBefore = content.substring(currentOffset, branch.startOffset);
      if (textBefore) {
        segments.push({
          text: textBefore,
          startOffset: currentOffset,
          endOffset: branch.startOffset,
          branches: []
        });
      }
    }

    // Add the highlighted segment
    const highlightedText = content.substring(branch.startOffset, branch.endOffset);
    segments.push({
      text: highlightedText,
      startOffset: branch.startOffset,
      endOffset: branch.endOffset,
      branches: [branch]
    });

    currentOffset = branch.endOffset;
  });

  // Add remaining text after last highlight
  if (currentOffset < content.length) {
    const textAfter = content.substring(currentOffset);
    if (textAfter) {
      segments.push({
        text: textAfter,
        startOffset: currentOffset,
        endOffset: content.length,
        branches: []
      });
    }
  }

  const handleHighlightClick = (e: React.MouseEvent, segment: TextSegment) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (segment.branches.length === 0) {
      return;
    }

    if (segment.branches.length === 1) {
      // Single branch, open directly
      onBranchClick(segment.branches[0].threadId);
    } else {
      // Multiple branches, show menu
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowMenu(!showMenu);
    }
  };

  const handleBranchFromMenu = (threadId: string) => {
    setShowMenu(false);
    onBranchClick(threadId);
  };

  return (
    <div className="relative">
      <span>
        {segments.map((segment, idx) => (
          segment.branches.length > 0 ? (
            <span
              key={idx}
              className="bg-yellow-100 hover:bg-yellow-200 cursor-pointer rounded px-0.5 transition-colors"
              onClick={(e) => handleHighlightClick(e, segment)}
              title={segment.branches.length === 1 ? segment.branches[0].title : `${segment.branches.length} branches`}
            >
              {segment.text}
            </span>
          ) : (
            <span key={idx}>{segment.text}</span>
          )
        ))}
      </span>

      {/* Popup menu for multiple branches */}
      {showMenu && segments.filter(s => s.branches.length > 1).length > 0 && (
        <div 
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] py-1"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {segments.map(segment => 
            segment.branches.map((branch) => (
              <button
                key={branch.threadId}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                onClick={() => handleBranchFromMenu(branch.threadId)}
              >
                <div className="text-sm font-medium text-gray-900">{branch.title}</div>
                {branch.contextText && (
                  <div className="text-xs text-gray-500 truncate">{branch.contextText.substring(0, 40)}...</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HighlightedText;

