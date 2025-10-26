import React from 'react';
import { Message as MessageType } from '../types/message';
import Message from './Message';

interface MessageListProps {
  messages: MessageType[];
  onBranchClick: (threadId: string) => void;
  onCreateBranch: (messageId: string, contextText?: string) => void;
  onTextSelection?: (messageId: string, selectedText: string, position: { x: number; y: number }) => void;
  onDeleteBranch?: (threadId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onBranchClick, onCreateBranch, onTextSelection, onDeleteBranch }) => {
  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <p>Start a conversation by sending a message below.</p>
        </div>
      ) : (
        messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            onBranchClick={onBranchClick}
            onCreateBranch={onCreateBranch}
            onTextSelection={onTextSelection}
            onDeleteBranch={onDeleteBranch}
          />
        ))
      )}
    </div>
  );
};

export default MessageList;

