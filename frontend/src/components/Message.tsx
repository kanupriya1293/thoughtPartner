import React, { useRef } from 'react';
import { Message as MessageType } from '../types/message';
import BranchIndicator from './BranchIndicator';
import HighlightedText from './HighlightedText';

interface MessageProps {
  message: MessageType;
  onBranchClick: (threadId: string) => void;
  onCreateBranch: (messageId: string, contextText?: string) => void;
  onTextSelection?: (messageId: string, selectedText: string, startOffset: number, endOffset: number, position: { x: number; y: number }) => void;
  onDeleteBranch?: (threadId: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onBranchClick, onCreateBranch, onTextSelection, onDeleteBranch }) => {
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;
  const contentRef = useRef<HTMLDivElement>(null);
  
  const handleMouseUp = () => {
    if (isUser || !onTextSelection) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText && selectedText.length > 0 && contentRef.current && selection && contentRef.current.contains(selection.anchorNode)) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect && contentRef.current) {
        // Calculate character offsets
        // Create a range from start of message content to selection start
        const preSelectionRange = document.createRange();
        preSelectionRange.setStart(contentRef.current.firstChild || contentRef.current, 0);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        
        const startOffset = preSelectionRange.toString().length;
        const endOffset = startOffset + selectedText.length;
        
        // Menu dimensions
        const menuWidth = 192; // w-48 = 192px
        const menuHeight = 60;
        
        // Position menu horizontally to the right and vertically below the end of selection
        // Start at the right edge of the selection, offset slightly to the right
        let x = rect.right + 10;
        
        // Check if menu would overflow right edge
        if (x + menuWidth > window.innerWidth - 8) {
          // Position to the left of the selection instead
          x = rect.left - menuWidth - 10;
        }
        
        // Ensure menu doesn't overflow left edge either
        if (x < 8) {
          x = 8;
        }
        
        // Position vertically below the selection
        let y = rect.bottom + 8;
        
        // If there's not enough space below, position above
        if (y + menuHeight > window.innerHeight - 20) {
          y = rect.top - menuHeight - 8;
          // If there's not enough space above either, position at top
          if (y < 20) {
            y = 20;
          }
        }
        
        const position = {
          x: x,
          y: y
        };
        
        onTextSelection(message.id, selectedText, startOffset, endOffset, position);
      }
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
        {/* Message Bubble */}
        <div
          ref={contentRef}
          className={`rounded-lg px-4 py-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}
          onMouseUp={handleMouseUp}
        >
          {isLoading ? (
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce-delayed" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce-delayed" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce-delayed" style={{ animationDelay: '400ms' }}></div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {isUser || !message.branches || message.branches.length === 0 ? (
                message.content
              ) : (
                <HighlightedText
                  content={message.content}
                  branches={message.branches.map(branch => ({
                    threadId: branch.thread_id,
                    title: branch.title || 'Branch',
                    startOffset: branch.branch_text_start_offset || 0,
                    endOffset: branch.branch_text_end_offset || 0,
                    contextText: branch.branch_context_text || ''
                  }))}
                  onBranchClick={onBranchClick}
                />
              )}
            </p>
          )}
        </div>
        
        {/* Footer with actions */}
        {(!isUser && (message.has_branches || true) && !isLoading) && (
          <div className={`flex items-center gap-2 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Actions */}
            {!isUser && (
              <button 
                className="text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded transition-colors"
                onClick={() => onCreateBranch(message.id)}
                title="Create a new branch from this response"
              >
                Branch
              </button>
            )}
            {message.has_branches && (
              <BranchIndicator 
                branches={message.branches || []} 
                onBranchClick={onBranchClick}
                onDeleteBranch={onDeleteBranch}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;

