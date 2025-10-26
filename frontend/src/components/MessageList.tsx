import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Message as MessageType } from '../types/message';
import { Thread } from '../types/thread';
import Message from './Message';

interface MessageListProps {
  messages: MessageType[];
  thread: Thread | null;
  parentThread: Thread | null;
  parentMessages: MessageType[];
  onBranchClick: (threadId: string) => void;
  onCreateBranch: (messageId: string, contextText?: string) => void;
  onTextSelection?: (messageId: string, selectedText: string, startOffset: number, endOffset: number, position: { x: number; y: number }) => void;
  onDeleteBranch?: (threadId: string) => void;
  onForkThread?: (messageId: string) => void;
  onNavigateToFork?: (threadId: string, messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, thread, parentThread, parentMessages, onBranchClick, onCreateBranch, onTextSelection, onDeleteBranch, onForkThread, onNavigateToFork }) => {
  const navigate = useNavigate();
  
  // For forked threads: find the fork point (last message with same sequence)
  const findForkPoint = () => {
    if (!thread || thread.thread_type !== 'fork' || !thread.branch_from_message_id) {
      return null;
    }
    
    // Find the sequence from parent messages
    const parentMessage = parentMessages.find(m => m.id === thread.branch_from_message_id);
    if (!parentMessage) return null;
    
    // Find matching sequence in current thread
    return messages.findIndex(m => m.sequence === parentMessage.sequence);
  };
  
  const forkPointIndex = findForkPoint();
  
  // Handler for navigating to a fork
  const handleForkClick = (forkThreadId: string, forkIndicatorMessageId: string) => {
    if (onNavigateToFork) {
      // Navigate to the fork thread and scroll to the fork indicator
      onNavigateToFork(forkThreadId, forkIndicatorMessageId);
    } else {
      // Fallback: just navigate to the thread
      navigate(`/chat/${forkThreadId}`);
    }
  };
  
  // Handler for navigating back to parent thread from a fork
  const handleParentClick = () => {
    if (thread && thread.parent_thread_id && thread.branch_from_message_id) {
      if (onNavigateToFork) {
        // Navigate to parent thread and scroll to the fork point message
        onNavigateToFork(thread.parent_thread_id, thread.branch_from_message_id);
      } else {
        // Fallback: just navigate to the parent thread
        navigate(`/chat/${thread.parent_thread_id}`);
      }
    }
  };

  return (
    <div className="flex flex-col">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-sm">Start a conversation by sending a message below.</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <React.Fragment key={message.id}>
            <Message
              message={message}
              onBranchClick={onBranchClick}
              onCreateBranch={onCreateBranch}
              onTextSelection={onTextSelection}
              onDeleteBranch={onDeleteBranch}
              onForkThread={onForkThread}
              allowFork={thread?.thread_type === 'root' || thread?.thread_type === 'fork'}
            />
            {/* Show "Forked from" indicator after the last duplicated message in a fork */}
            {thread && thread.thread_type === 'fork' && forkPointIndex === index && parentThread && (
              <div 
                className="my-2 flex items-center"
                data-fork-indicator={thread.branch_from_message_id}
                data-message-id={thread.branch_from_message_id}
              >
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-3 text-xs text-gray-500">
                  Forked from{' '}
                  <button
                    onClick={handleParentClick}
                    className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {parentThread.title || 'original thread'}
                  </button>
                </span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
            )}
            {/* Show "Forked to" indicators in parent thread */}
            {message.has_forks && message.forks && (
              <div 
                className="my-2 flex items-center"
                data-fork-indicator={message.id}
                data-message-id={message.id}
              >
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-3 text-xs text-gray-500">
                  Forked to{' '}
                  {message.forks.map((f, i) => {
                    const forkCount = message.forks?.length || 0;
                    return (
                      <React.Fragment key={f.thread_id}>
                        <button
                          onClick={() => handleForkClick(f.thread_id, message.id)}
                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          {f.title}
                        </button>
                        {i < forkCount - 1 && ', '}
                      </React.Fragment>
                    );
                  })}
                </span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
            )}
          </React.Fragment>
        ))
      )}
    </div>
  );
};

export default MessageList;

