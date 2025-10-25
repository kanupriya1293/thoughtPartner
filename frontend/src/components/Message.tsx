import React from 'react';
import { Message as MessageType } from '../types/message';
import BranchIndicator from './BranchIndicator';

interface MessageProps {
  message: MessageType;
  onBranchClick: (threadId: string) => void;
  onCreateBranch: (messageId: string, contextText?: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onBranchClick, onCreateBranch }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-header">
        <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
        {message.model && <span className="message-model">({message.model})</span>}
      </div>
      <div className="message-content">{message.content}</div>
      <div className="message-footer">
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        {message.tokens_used && (
          <span className="message-tokens">{message.tokens_used} tokens</span>
        )}
        <button 
          className="btn-branch-create"
          onClick={() => onCreateBranch(message.id)}
        >
          Branch from here
        </button>
        {message.has_branches && (
          <BranchIndicator 
            branches={message.branches || []} 
            onBranchClick={onBranchClick}
          />
        )}
      </div>
    </div>
  );
};

export default Message;

