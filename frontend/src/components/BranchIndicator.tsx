import React, { useState } from 'react';
import { BranchInfo } from '../types/message';

interface BranchIndicatorProps {
  branches: BranchInfo[];
  onBranchClick: (threadId: string) => void;
  onDeleteBranch?: (threadId: string) => void;
}

const BranchIndicator: React.FC<BranchIndicatorProps> = ({ branches, onBranchClick, onDeleteBranch }) => {
  const [showBranches, setShowBranches] = useState(false);

  return (
    <div className="branch-indicator">
      <button 
        className="btn-show-branches"
        onClick={() => setShowBranches(!showBranches)}
      >
        🌿 {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
      </button>
      {showBranches && (
        <div className="branches-list">
          {branches.map((branch) => (
            <div 
              key={branch.thread_id}
              className="branch-item"
            >
              <div className="branch-item-content" onClick={() => onBranchClick(branch.thread_id)}>
                <span className="branch-title">
                  {branch.title || 'Untitled Branch'}
                </span>
                {branch.branch_context_text && (
                  <span className="branch-context">
                    "{branch.branch_context_text.substring(0, 30)}..."
                  </span>
                )}
              </div>
              {onDeleteBranch && (
                <button 
                  className="branch-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this branch?')) {
                      onDeleteBranch(branch.thread_id);
                    }
                  }}
                  title="Delete branch"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchIndicator;

