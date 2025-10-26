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
  initialText?: string; // Legacy prop, kept for compatibility
  onNavigateToBranch?: (threadId: string, title: string) => void;
  onDeleteEmptyThread?: (threadId: string) => void;
  onThreadCreated?: (threadId: string, title: string) => void;
  pendingBranch?: {
    parentThreadId: string;
    messageId: string;
    contextText?: string;
    startOffset?: number;
    endOffset?: number;
  };
}

const BranchOverlay: React.FC<BranchOverlayProps> = ({
  threadId,
  onClose,
  onBack,
  canGoBack,
  initialText: _initialText, // Destructured but not used, kept for compatibility
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
  const inputRef = useRef<React.ElementRef<typeof ChatInputBox>>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Text selection state
  const [selection, setSelection] = useState<{
    messageId: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (threadId) {
      loadThread();
    }
  }, [threadId]);

  // Handle initial value being set in the textarea
  const handleInitialValueSet = (_length: number) => {
    if (inputRef.current && pendingBranch?.contextText) {
      // Focus the input
      inputRef.current.focus();
      
      // Position cursor after the formatted text (which includes quotes and newlines)
      const formattedText = `"${pendingBranch.contextText}"\n\n`;
      inputRef.current.setSelectionRange(formattedText.length, formattedText.length);
    } else if (inputRef.current) {
      // No context text, just focus
      inputRef.current.focus();
    }
  };

  // Focus when overlay opens
  useEffect(() => {
    // If no initial text, just focus the input
    if (!pendingBranch?.contextText) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingBranch]);

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

    // Generate temporary IDs for optimistic messages
    const userMessageId = `temp-user-${Date.now()}`;
    const loadingMessageId = `temp-loading-${Date.now()}`;
    
    let currentThreadId = threadId;

    try {
      // If this is a pending branch, create the thread first
      if (!threadId && pendingBranch) {
        const newThread = await threadsApi.createThread({
          parent_thread_id: pendingBranch.parentThreadId,
          branch_from_message_id: pendingBranch.messageId,
          branch_context_text: pendingBranch.contextText,
          branch_text_start_offset: pendingBranch.startOffset,
          branch_text_end_offset: pendingBranch.endOffset,
        });
        currentThreadId = newThread.id;
        setThread(newThread);
        // Don't reset messages yet - we'll do that when adding optimistic messages
      }
      
      if (!currentThreadId) {
        throw new Error('No thread ID available');
      }

      // Determine if this is the first message in the thread
      const isFirstMessage = messages.length === 0;
      
      // Calculate sequence numbers based on whether this is a new or existing thread
      const sequenceStart = isFirstMessage ? 1 : messages.length + 1;

      // Optimistically add user message
      const userMessage: MessageType = {
        id: userMessageId,
        thread_id: currentThreadId,
        role: 'user',
        content: messageContent,
        sequence: sequenceStart,
        timestamp: new Date().toISOString(),
        model: null,
        provider: null,
        tokens_used: null,
        response_metadata: null,
        has_branches: false,
        branch_count: 0,
        branches: [],
      };

      // Optimistically add loading assistant message
      const loadingMessage: MessageType = {
        id: loadingMessageId,
        thread_id: currentThreadId,
        role: 'assistant',
        content: '',
        sequence: sequenceStart + 1,
        timestamp: new Date().toISOString(),
        model: null,
        provider: null,
        tokens_used: null,
        response_metadata: null,
        has_branches: false,
        branch_count: 0,
        branches: [],
        isLoading: true,
      };

      // Update UI immediately with optimistic messages
      if (isFirstMessage) {
        // For new threads, replace the empty array
        setMessages([userMessage, loadingMessage]);
      } else {
        // For existing threads, append to current messages
        setMessages(prev => [...prev, userMessage, loadingMessage]);
      }
      
      // Scroll to bottom to show new messages
      setTimeout(() => scrollToBottom(), 50);
      
      // Send message with background=true for parallel processing
      await messagesApi.sendMessage(currentThreadId, { content: messageContent }, true);
      
      // Reload messages to get both user message and assistant response
      if (currentThreadId !== threadId) {
        // First message in newly created thread, reload it
        const data = await messagesApi.getMessages(currentThreadId);
        setMessages(data.messages);
        setThread(data.thread_info);
        
        // Notify parent about the created thread with updated title
        if (onThreadCreated) {
          onThreadCreated(currentThreadId, data.thread_info.title || 'New Branch');
        }
      } else {
        await loadThread();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      // Only remove loading message on error, keep user message
      setMessages(prev => prev.filter(m => m.id !== loadingMessageId));
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

  const handleTextSelection = (messageId: string, selectedText: string, startOffset: number, endOffset: number, position: { x: number; y: number }) => {
    setSelection({ messageId, selectedText, startOffset, endOffset, position });
  };

  const handleCloseSelection = () => {
    setSelection(null);
  };

  const handleAskHere = () => {
    if (!selection) return;
    
    setSelection(null);
  };

  const handleBranchFromSelection = async () => {
    if (!selection || !threadId) return;
    
    try {
      // Create new branch
      const newThread = await threadsApi.createThread({
        parent_thread_id: threadId,
        branch_from_message_id: selection.messageId,
        branch_context_text: selection.selectedText,
        branch_text_start_offset: selection.startOffset,
        branch_text_end_offset: selection.endOffset,
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
            thread={thread}
            parentThread={null}
            parentMessages={[]}
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
            ref={inputRef}
            onSubmit={handleMessageSubmit}
            placeholder="Type your message here..."
            disabled={isLoading}
            initialValue={pendingBranch?.contextText ? `"${pendingBranch.contextText}"\n\n` : ''}
            onInitialValueSet={handleInitialValueSet}
          />
        </div>
    </div>
  );
};

export default BranchOverlay;

