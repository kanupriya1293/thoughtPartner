import React, { useState, useEffect, useRef } from 'react';
import { Thread } from '../types/thread';
import { Message as MessageType } from '../types/message';
import { messagesApi, threadsApi } from '../services/api';
import MessageList from './MessageList';
import SelectionMenu from './SelectionMenu';

interface BranchOverlayProps {
  threadId?: string;
  parentThreadId: string;
  onClose: () => void;
  onBack: () => void;
  canGoBack: boolean;
  initialText?: string;
  onNavigateToBranch?: (threadId: string, title: string) => void;
  onDeleteEmptyThread?: (threadId: string) => void;
  onThreadCreated?: (threadId: string, title: string) => void;
  pendingBranch?: {
    parentThreadId: string;
    messageId: string;
    contextText?: string;
  };
}

const BranchOverlay: React.FC<BranchOverlayProps> = ({
  threadId,
  parentThreadId,
  onClose,
  onBack,
  canGoBack,
  initialText,
  onNavigateToBranch,
  onDeleteEmptyThread,
  onThreadCreated,
  pendingBranch,
}) => {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Text selection state
  const [selection, setSelection] = useState<{
    messageId: string;
    selectedText: string;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (threadId) {
      loadThread();
    }
    
    // Set initial text if provided
    if (initialText) {
      setInputValue(initialText);
    }
    
    // Focus input when overlay opens
    setTimeout(() => {
      inputRef.current?.focus();
      if (initialText) {
        inputRef.current?.setSelectionRange(initialText.length, initialText.length);
      }
    }, 100);
  }, [threadId, initialText]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThread = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await messagesApi.getMessages(threadId);
      setThread(data.thread_info);
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message || 'Failed to load thread');
      console.error('Error loading thread:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue;
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      let targetThreadId = threadId;
      
      // If this is a pending branch, create the thread first
      if (!threadId && pendingBranch) {
        const newThread = await threadsApi.createThread({
          parent_thread_id: pendingBranch.parentThreadId,
          branch_from_message_id: pendingBranch.messageId,
          branch_context_text: pendingBranch.contextText,
        });
        targetThreadId = newThread.id;
        setThread(newThread);
        setMessages([]); // Start fresh for new thread
        
        // Notify parent about the created thread
        if (onThreadCreated) {
          onThreadCreated(newThread.id, newThread.title || 'New Branch');
        }
      }
      
      if (!targetThreadId) {
        throw new Error('No thread ID available');
      }
      
      // Send message with background=true for parallel processing
      await messagesApi.sendMessage(targetThreadId, { content: messageContent }, true);
      
      // Reload messages to get both user message and assistant response
      if (targetThreadId !== threadId) {
        // First message in newly created thread, reload it
        const data = await messagesApi.getMessages(targetThreadId);
        setMessages(data.messages);
      } else {
        await loadThread();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      // Restore input on error
      setInputValue(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async (messageId: string, contextText?: string) => {
    try {
      const newThread = await threadsApi.createThread({
        parent_thread_id: threadId,
        branch_from_message_id: messageId,
        branch_context_text: contextText,
      });
      
      // Close current overlay and notify parent to open new overlay
      // This will be handled by the parent ChatView
      return newThread;
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
      console.error('Error creating branch:', err);
      throw err;
    }
  };

  const handleBranchClick = (branchThreadId: string) => {
    // Get the branch info to show the title
    const branch = messages
      .flatMap(msg => msg.branches || [])
      .find(b => b.thread_id === branchThreadId);
    
    // Notify parent to open new overlay
    if (onNavigateToBranch) {
      onNavigateToBranch(branchThreadId, branch?.title || 'Branch');
    } else {
      // Fallback: navigate normally
      window.location.href = `/chat/${branchThreadId}`;
    }
  };

  const handleTextSelection = (messageId: string, selectedText: string, position: { x: number; y: number }) => {
    setSelection({ messageId, selectedText, position });
  };

  const handleCloseSelection = () => {
    setSelection(null);
  };

  const handleAskHere = () => {
    if (!selection) return;
    
    // Add quoted text to input
    const quotedText = `"${selection.selectedText}"\n\n`;
    setInputValue(quotedText);
    setSelection(null);
    
    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(quotedText.length, quotedText.length);
    }, 0);
  };

  const handleBranchFromSelection = async () => {
    if (!selection) return;
    
    try {
      // Create new branch
      const newThread = await threadsApi.createThread({
        parent_thread_id: threadId,
        branch_from_message_id: selection.messageId,
        branch_context_text: selection.selectedText,
      });
      
      setSelection(null);
      
      // If parent provides onNavigateToBranch, use it (for nested overlays)
      if (onNavigateToBranch) {
        onNavigateToBranch(newThread.id, newThread.title || 'New Branch');
      } else {
        // Otherwise navigate directly
        window.location.href = `/chat/${newThread.id}`;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
      console.error('Error creating branch:', err);
    }
  };

  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      // Check if thread is empty before closing
      const hasUserMessages = messages.some(msg => msg.role === 'user');
      if (!hasUserMessages && onDeleteEmptyThread) {
        await onDeleteEmptyThread(threadId);
      }
      onClose();
    }
  };

  const handleCloseClick = async () => {
    // Check if thread is empty before closing
    const hasUserMessages = messages.some(msg => msg.role === 'user');
    if (!hasUserMessages && onDeleteEmptyThread) {
      await onDeleteEmptyThread(threadId);
    }
    onClose();
  };

  return (
    <div className="branch-overlay-backdrop" onClick={handleBackdropClick}>
      <div className="branch-overlay" ref={overlayRef} onClick={(e) => e.stopPropagation()}>
        <div className="branch-overlay-header">
          <div className="branch-overlay-header-left">
            {canGoBack && (
              <button className="btn-back" onClick={onBack} title="Go back">
                ← Back
              </button>
            )}
            <h3 className="branch-overlay-title">{thread?.title || 'Branch Conversation'}</h3>
          </div>
          <button className="btn-close" onClick={handleCloseClick} title="Close overlay">
            ×
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="branch-overlay-content">
          <div className="chat-messages">
            <MessageList
              messages={messages}
              onBranchClick={handleBranchClick}
              onCreateBranch={handleCreateBranch}
              onTextSelection={handleTextSelection}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>

        {selection && (
          <SelectionMenu
            selectedText={selection.selectedText}
            position={selection.position}
            onAsk={handleAskHere}
            onBranch={handleBranchFromSelection}
            onClose={handleCloseSelection}
          />
        )}

        <div className="branch-overlay-footer">
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={3}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="btn-send"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BranchOverlay;

