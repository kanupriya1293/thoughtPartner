import React, { useState, useEffect, useRef } from 'react';
import { Thread } from '../types/thread';
import { Message as MessageType } from '../types/message';
import { messagesApi, threadsApi } from '../services/api';
import MessageList from './MessageList';
import SelectionMenu from './SelectionMenu';
import ChatInputBox from './ChatInputBox';

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
    if (!threadId) return;
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

  const handleMessageSubmit = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

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
    
    setSelection(null);
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

  const handleCloseClick = async () => {
    // Check if thread is empty before closing
    if (threadId) {
      const hasUserMessages = messages.some(msg => msg.role === 'user');
      if (!hasUserMessages && onDeleteEmptyThread) {
        await onDeleteEmptyThread(threadId);
      }
    }
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-white shadow-2xl flex flex-col h-full z-50" ref={overlayRef}>
        {/* Header */}
        <div className="px-6 py-4 bg-white flex items-center">
          <button 
            className="text-gray-500 hover:text-gray-700 transition-colors mr-4"
            onClick={canGoBack ? onBack : handleCloseClick}
            title={canGoBack ? "Go back" : "Close"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-base font-medium text-gray-700">
            {thread?.title || 'Branch Conversation'}
          </h3>
        </div>

        {error && (
          <div className="bg-red-500 text-white px-6 py-3">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-white">
          <MessageList
            messages={messages}
            onBranchClick={handleBranchClick}
            onCreateBranch={handleCreateBranch}
            onTextSelection={handleTextSelection}
          />
          <div ref={messagesEndRef} />
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

        {/* Footer with ChatInputBox */}
        <div className="px-6 py-4 bg-white">
          <ChatInputBox
            onSubmit={handleMessageSubmit}
            placeholder="Type your message here..."
            disabled={isLoading}
            initialValue={pendingBranch?.contextText ? `"${pendingBranch.contextText}"\n\n` : ''}
          />
        </div>
    </div>
  );
};

export default BranchOverlay;

