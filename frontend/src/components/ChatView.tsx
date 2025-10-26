import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Thread } from '../types/thread';
import { Message as MessageType } from '../types/message';
import { messagesApi, threadsApi } from '../services/api';
import MessageList from './MessageList';
import RootThreadsList from './RootThreadsList';
import SelectionMenu from './SelectionMenu';
import BranchOverlay from './BranchOverlay';

interface OverlayThread {
  threadId?: string; // Optional if pending (not created yet)
  title: string;
  initialText?: string;
  // Store branch creation context if thread not created yet
  pendingBranch?: {
    parentThreadId: string;
    messageId: string;
    contextText?: string;
  };
}

const ChatView: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Text selection state
  const [selection, setSelection] = useState<{
    messageId: string;
    selectedText: string;
    position: { x: number; y: number };
  } | null>(null);

  // Overlay state
  const [overlayStack, setOverlayStack] = useState<OverlayThread[]>([]);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  useEffect(() => {
    if (threadId) {
      loadThread();
    }
    
    // Check if there's quoted text in navigation state
    if (location.state && (location.state as any).quotedText) {
      const quotedText = (location.state as any).quotedText;
      setInputValue(quotedText);
      
      // Clear the state to prevent it from showing again
      window.history.replaceState({}, '');
      
      // Focus the input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(quotedText.length, quotedText.length);
      }, 100);
    }
  }, [threadId, location]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || !threadId) return;

    const messageContent = inputValue;
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Send message with background=true for responsive parallel processing
      await messagesApi.sendMessage(threadId, { content: messageContent }, true);
      
      // Reload messages to get both user message and assistant response
      await loadThread();
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
    if (!threadId) return;
    
    // Open overlay with pending branch context (thread created on first send)
    const quotedText = contextText ? `"${contextText}"\n\n` : undefined;
    handleOpenOverlay(undefined, 'New Branch', quotedText, {
      parentThreadId: threadId,
      messageId: messageId,
      contextText: contextText
    });
  };

  const handleBranchClick = (branchThreadId: string) => {
    // Open branch in overlay instead of navigating
    // Get the branch info to show the title
    const branch = messages
      .flatMap(msg => msg.branches || [])
      .find(b => b.thread_id === branchThreadId);
    
    handleOpenOverlay(branchThreadId, branch?.title || 'Branch');
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
    if (!selection || !threadId) return;
    
    // Prepare quoted text for the overlay
    const quotedText = `"${selection.selectedText}"\n\n`;
    
    setSelection(null);
    
    // Open overlay with pending branch context (thread created on first send)
    handleOpenOverlay(undefined, 'New Branch', quotedText, {
      parentThreadId: threadId,
      messageId: selection.messageId,
      contextText: selection.selectedText
    });
  };

  const handleOpenOverlay = (threadId: string | undefined, title: string, initialText?: string, pendingBranch?: {
    parentThreadId: string;
    messageId: string;
    contextText?: string;
  }) => {
    setOverlayStack([...overlayStack, { threadId, title, initialText, pendingBranch }]);
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = async () => {
    // No cleanup needed if threadId is undefined (pending branch)
    // Only check if overlay had an actual thread created
    let wasEmptyThreadDeleted = false;
    if (overlayStack.length > 0) {
      const topThread = overlayStack[overlayStack.length - 1];
      if (topThread.threadId) {
        // There was an actual thread, check if empty
        try {
          const data = await messagesApi.getMessages(topThread.threadId);
          const hasUserMessages = data.messages.some(msg => msg.role === 'user');
          if (!hasUserMessages) {
            await threadsApi.deleteThread(topThread.threadId);
            wasEmptyThreadDeleted = true;
          }
        } catch (err) {
          console.error('Error checking/deleting empty overlay thread:', err);
        }
      }
    }
    
    setOverlayStack([]);
    setIsOverlayOpen(false);
    
    // Reload the main thread to refresh branch counts if we deleted an empty branch
    if (wasEmptyThreadDeleted) {
      await loadThread();
    }
  };

  const handleBackInOverlay = async () => {
    if (overlayStack.length > 1) {
      // Check if the current overlay thread is empty before going back
      let wasEmptyThreadDeleted = false;
      const currentThread = overlayStack[overlayStack.length - 1];
      if (currentThread.threadId) {
        // There was an actual thread, check if empty
        try {
          const data = await messagesApi.getMessages(currentThread.threadId);
          const hasUserMessages = data.messages.some(msg => msg.role === 'user');
          if (!hasUserMessages) {
            await threadsApi.deleteThread(currentThread.threadId);
            wasEmptyThreadDeleted = true;
          }
        } catch (err) {
          console.error('Error checking/deleting empty overlay thread on back:', err);
        }
      }
      setOverlayStack(overlayStack.slice(0, -1));
      
      // Reload the main thread to refresh branch counts if we deleted an empty branch
      if (wasEmptyThreadDeleted) {
        await loadThread();
      }
    } else {
      handleCloseOverlay();
    }
  };

  const handleDeleteEmptyThread = async (threadId: string) => {
    try {
      await threadsApi.deleteThread(threadId);
    } catch (err) {
      console.error('Error deleting empty thread:', err);
    }
  };

  const handleThreadCreated = (threadId: string, title: string) => {
    // Update the overlay stack with the actual threadId
    setOverlayStack(prevStack => {
      const newStack = [...prevStack];
      const lastItem = newStack[newStack.length - 1];
      if (lastItem) {
        lastItem.threadId = threadId;
        lastItem.title = title;
      }
      return newStack;
    });
  };

  const handleDeleteCurrentThread = async () => {
    if (!threadId) return;
    
    if (!window.confirm('Are you sure you want to delete this thread? All branches will also be deleted. This cannot be undone.')) {
      return;
    }

    try {
      await threadsApi.deleteThread(threadId);
      navigate('/');
    } catch (error) {
      console.error('Error deleting thread:', error);
      alert('Failed to delete thread');
    }
  };

  const handleDeleteBranch = async (branchThreadId: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) {
      return;
    }

    try {
      await threadsApi.deleteThread(branchThreadId);
      // Reload the thread to refresh branch list
      await loadThread();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Failed to delete branch');
    }
  };

  const currentOverlayThread = overlayStack[overlayStack.length - 1];
  const canGoBackInOverlay = overlayStack.length > 1;

  if (!threadId) {
    return (
      <div className="chat-view">
        <div className="error-message">No thread ID provided</div>
      </div>
    );
  }

  return (
    <>
    <div className={`chat-view ${isOverlayOpen ? 'chat-view-dimmed' : ''}`}>
      <div className="chat-sidebar">
        <RootThreadsList 
          currentThreadId={threadId}
          currentRootId={thread?.root_id || threadId}
          currentThread={thread}
        />
      </div>
      
      <div className="chat-main">
        <div className="chat-header">
          <h2>{thread?.title || 'Loading...'}</h2>
          <button 
            className="btn-header-delete"
            onClick={handleDeleteCurrentThread}
            title="Delete this thread"
          >
            🗑️
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="chat-messages">
          <MessageList
            messages={messages}
            onBranchClick={handleBranchClick}
            onCreateBranch={handleCreateBranch}
            onTextSelection={handleTextSelection}
            onDeleteBranch={handleDeleteBranch}
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

    {isOverlayOpen && currentOverlayThread && (
      <BranchOverlay
        threadId={currentOverlayThread.threadId}
        parentThreadId={threadId}
        onClose={handleCloseOverlay}
        onBack={handleBackInOverlay}
        canGoBack={canGoBackInOverlay}
        initialText={currentOverlayThread.initialText}
        onNavigateToBranch={handleOpenOverlay}
        onDeleteEmptyThread={handleDeleteEmptyThread}
        onThreadCreated={handleThreadCreated}
        pendingBranch={currentOverlayThread.pendingBranch}
      />
    )}
    </>
  );
};

export default ChatView;

