import React, { useRef } from 'react';
import { Message as MessageType } from '../types/message';
import BranchIndicator from './BranchIndicator';

interface MessageProps {
  message: MessageType;
  onBranchClick: (threadId: string) => void;
  onCreateBranch: (messageId: string, contextText?: string) => void;
  onTextSelection?: (messageId: string, selectedText: string, position: { x: number; y: number }) => void;
  onDeleteBranch?: (threadId: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onBranchClick, onCreateBranch, onTextSelection, onDeleteBranch }) => {
  const isUser = message.role === 'user';
  const contentRef = useRef<HTMLDivElement>(null);
  
  const handleMouseUp = () => {
    if (isUser || !onTextSelection) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText && selectedText.length > 0 && contentRef.current && selection && contentRef.current.contains(selection.anchorNode)) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect) {
        // Menu dimensions for boundary checking
        const menuWidth = 200;
        const menuHeight = 50;
        
        // Position menu at the end of the selection (right side)
        let x = rect.right - (menuWidth / 2);
        
        // Ensure menu doesn't go off-screen horizontally
        if (x < 10) x = 10;
        if (x + menuWidth > window.innerWidth - 10) {
          x = window.innerWidth - menuWidth - 10;
        }
        
        // Position vertically above the selection
        let y = rect.top - menuHeight - 5;
        
        // If there's not enough space above, position below the selection
        if (y < 10) {
          y = rect.bottom + 5;
        }
        
        const position = {
          x: x,
          y: y
        };
        
        onTextSelection(message.id, selectedText, position);
      }
    }
  };
  
  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-header">
        <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
      </div>
      <div 
        ref={contentRef}
        className="message-content"
        onMouseUp={handleMouseUp}
      >
        {message.content}
      </div>
      <div className="message-footer">
        <div className="message-meta">
          {isUser && (
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
        <div className="message-actions">
          {!isUser && (
            <button 
              className="btn-branch-create"
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
      </div>
    </div>
  );
};

export default Message;

