import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Thread } from '../types/thread';
import { Message as MessageType } from '../types/message';
import { messagesApi, threadsApi } from '../services/api';
import MessageList from './MessageList';
import SelectionMenu from './SelectionMenu';
import ChatInputBox, { ChatInputBoxRef } from './ChatInputBox';

interface ChatViewProps {
  onOpenOverlay: (
    branchThreadId: string | undefined,
    title: string,
    initialText?: string,
    pendingBranch?: {
      parentThreadId: string;
      messageId: string;
      contextText?: string;
      startOffset?: number;
      endOffset?: number;
    }
  ) => void;
  onCloseOverlay: () => void;
  onNavigateToThread?: (threadId: string, messageId?: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onOpenOverlay, onCloseOverlay }) => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [thread, setThread] = useState<Thread | null>(null);
  const [parentThread, setParentThread] = useState<Thread | null>(null);
  const [parentMessages, setParentMessages] = useState<MessageType[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputBoxRef>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  
  // Text selection state
  const [selection, setSelection] = useState<{
    messageId: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    position: { x: number; y: number };
  } | null>(null);

  const loadThread = useCallback(async () => {
    if (!threadId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await messagesApi.getMessages(threadId);
      setThread(data.thread_info);
      
      // Check if we need to keep current optimistic messages
      const hasTemporaryMessages = messages.some(m => m.id.startsWith('temp-'));
      
      if (hasTemporaryMessages) {
        // We have optimistic messages, check if assistant message is in DB
        const assistantMessage = data.messages.find(msg => msg.role === 'assistant');
        if (assistantMessage) {
          // Assistant message arrived, replace with real messages
          setMessages(data.messages);
        }
        // Otherwise keep the optimistic messages
      } else {
        // No optimistic messages, just load normally
        setMessages(data.messages);
      }
      
      // If this is a fork, fetch parent thread info for the "Forked from" indicator
      if (data.thread_info.parent_thread_id) {
        try {
          const parentData = await messagesApi.getMessages(data.thread_info.parent_thread_id);
          setParentThread(parentData.thread_info);
          // Only update parentMessages if it's empty (to preserve real-time fork creation)
          setParentMessages(prev => prev.length > 0 ? prev : parentData.messages);
        } catch {
          // Parent thread may not exist or be accessible
          setParentThread(null);
          // Only clear parentMessages if we don't have any
          setParentMessages(prev => prev.length > 0 ? prev : []);
        }
      } else {
        setParentThread(null);
        // Only clear parentMessages if we don't have any
        setParentMessages(prev => prev.length > 0 ? prev : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load thread');
      console.error('Error loading thread:', err);
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (threadId) {
      // Check for optimistic messages from navigation (HomeScreen)
      const state = location.state as any;
      if (state?.optimisticMessages) {
        // Show optimistic messages immediately
        setMessages(state.optimisticMessages);
        isInitialLoad.current = true;
        
        // Clear the state to prevent it from showing again
        window.history.replaceState({}, '');
        
        // Start polling for assistant message
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const data = await messagesApi.getMessages(threadId);
            const assistantMessage = data.messages.find(msg => msg.role === 'assistant');
            
            if (assistantMessage && pollingIntervalRef.current) {
              // Assistant message has arrived
              setMessages(data.messages);
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } catch (err) {
            console.error('Error polling for assistant message:', err);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }, 1000);
        
        // Stop polling after 30 seconds
        setTimeout(() => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }, 30000);
      } else {
        // Normal load
        isInitialLoad.current = true;
        loadThread();
      }
    }
    
    // Cleanup polling interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [threadId, loadThread]);
  
  useEffect(() => {
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

  // Handle scrolling to a specific message or fork indicator (for fork navigation)
  useEffect(() => {
    if (messages.length > 0) {
      const messageIdToScroll = sessionStorage.getItem('scrollToMessage');
      if (messageIdToScroll) {
        sessionStorage.removeItem('scrollToMessage');
        
        // Use requestAnimationFrame to wait for DOM to be ready
        let attempts = 0;
        const maxAttempts = 20; // Try for up to ~1 second at 60fps
        
        const tryScroll = () => {
          attempts++;
          
          // Try to find the fork indicator first (it's what we want to highlight)
          const forkIndicator = document.querySelector(`[data-fork-indicator="${messageIdToScroll}"]`);
          
          if (forkIndicator) {
            forkIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });
            forkIndicator.classList.add('highlight-message');
            setTimeout(() => {
              forkIndicator.classList.remove('highlight-message');
            }, 2000);
            return;
          }
          
          // Fallback: try to find the message element itself
          const messageElement = document.querySelector(`[data-message-id="${messageIdToScroll}"]`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlight-message');
            setTimeout(() => {
              messageElement.classList.remove('highlight-message');
            }, 2000);
            return;
          }
          
          // If neither found and we haven't exceeded max attempts, try again on next frame
          if (attempts < maxAttempts) {
            requestAnimationFrame(tryScroll);
          }
        };
        
        // Start trying after giving React a chance to render
        requestAnimationFrame(() => {
          requestAnimationFrame(tryScroll);
        });
      }
    }
  }, [messages]);

  // Listen for branch created event to reload thread
  useEffect(() => {
    const handleBranchCreated = () => {
      if (threadId) {
        loadThread();
      }
    };

    window.addEventListener('branchCreated', handleBranchCreated);
    return () => {
      window.removeEventListener('branchCreated', handleBranchCreated);
    };
  }, [threadId, loadThread]);

  // Track if this is the initial load
  const isInitialLoad = useRef(true);
  
  useEffect(() => {
    // On initial load, scroll to bottom instantly
    // On subsequent updates, only scroll if user is near the bottom
    if (isInitialLoad.current) {
      scrollToBottom();
      isInitialLoad.current = false;
    } else if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  const scrollToBottom = (smooth: boolean = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
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
    onOpenOverlay(undefined, 'New Branch', quotedText, {
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
    
    onOpenOverlay(branchThreadId, branch?.title || 'Branch');
  };

  const handleTextSelection = (messageId: string, selectedText: string, startOffset: number, endOffset: number, position: { x: number; y: number }) => {
    setSelection({ messageId, selectedText, startOffset, endOffset, position });
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
      setTimeout(() => {
        inputRef.current?.setSelectionRange(quotedText.length, quotedText.length);
      }, 10);
    }, 100);
  };

  const handleBranchFromSelection = async () => {
    if (!selection || !threadId) return;
    
    // Prepare quoted text for the overlay
    const quotedText = `"${selection.selectedText}"\n\n`;
    
    setSelection(null);
    
    // Open overlay with pending branch context (thread created on first send)
    onOpenOverlay(undefined, 'New Branch', quotedText, {
      parentThreadId: threadId,
      messageId: selection.messageId,
      contextText: selection.selectedText,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset
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

  const handleForkThread = async (messageId: string) => {
    if (!threadId) return;
    
    try {
      // Create new forked thread
      const newThread = await threadsApi.createThread({
        parent_thread_id: threadId,
        branch_from_message_id: messageId,
        is_fork: true
      });
      
      // IMPORTANT: Set parent messages to current thread's messages
      // This allows the fork indicator to show immediately in the new fork
      setParentMessages(messages); // Current messages become parent messages
      
      // Navigate to the new forked thread
      navigate(`/chat/${newThread.id}`);
      // Reload threads list so new fork appears in sidebar
      window.dispatchEvent(new Event('threadsUpdated'));
    } catch (error) {
      console.error('Error forking thread:', error);
      alert('Failed to fork thread');
    }
  };

  const handleNavigateToFork = (targetThreadId: string, messageId: string) => {
    // Store the message ID to scroll to in session storage
    sessionStorage.setItem('scrollToMessage', messageId);
    
    // Navigate to the target thread
    navigate(`/chat/${targetThreadId}`);
  };

  if (!threadId) {
    return (
      <div className="chat-view">
        <div className="error-message">No thread ID provided</div>
      </div>
    );
  }

  const handleMessageSubmit = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading || !threadId) return;
    
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Generate temporary IDs for optimistic messages
    const userMessageId = `temp-user-${Date.now()}`;
    const loadingMessageId = `temp-loading-${Date.now()}`;

    // Optimistically add user message
    const userMessage: MessageType = {
      id: userMessageId,
      thread_id: threadId!,
      role: 'user',
      content: messageContent,
      sequence: messages.length + 1,
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
      thread_id: threadId!,
      role: 'assistant',
      content: '',
      sequence: messages.length + 2,
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
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    
    // Scroll to bottom to show new messages
    setTimeout(() => scrollToBottom(true), 50);

    try {
      // Send message with background processing
      await messagesApi.sendMessage(threadId, { content: messageContent }, true);
      
      // Poll for assistant response to replace optimistic loading message
      let pollCount = 0;
      const maxPolls = 30; // Poll for up to 30 seconds
      
      const pollForResponse = setInterval(async () => {
        pollCount++;
        try {
          const data = await messagesApi.getMessages(threadId);
          const assistantMessage = data.messages.find(msg => msg.role === 'assistant');
          
          if (assistantMessage) {
            // Assistant message has arrived, update messages
            setMessages(data.messages);
            clearInterval(pollForResponse);
            
            // Notify parent to refresh currentThread for sidebar
            if (threadId) {
              window.dispatchEvent(new CustomEvent('threadUpdated', { detail: { threadId } }));
            }
            setIsLoading(false);
          } else if (pollCount >= maxPolls) {
            // Timeout - just load what we have
            clearInterval(pollForResponse);
            await loadThread();
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Error polling for assistant response:', err);
          clearInterval(pollForResponse);
          await loadThread();
          setIsLoading(false);
        }
      }, 1000); // Poll every second
      
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      setInputValue(messageContent);
      // Only remove loading message on error, keep user message
      setMessages(prev => prev.filter(m => m.id !== loadingMessageId));
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col bg-white h-full">
      {error && (
        <div className="bg-red-500 text-white px-8 py-3">
          {error}
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-8 py-6 bg-white">
        <MessageList
          messages={messages}
          thread={thread}
          parentThread={parentThread}
          parentMessages={parentMessages}
          onBranchClick={handleBranchClick}
          onCreateBranch={handleCreateBranch}
          onTextSelection={handleTextSelection}
          onDeleteBranch={handleDeleteBranch}
          onForkThread={handleForkThread}
          onNavigateToFork={handleNavigateToFork}
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

      <div className="px-8 py-4 bg-white">
        <ChatInputBox 
          ref={inputRef}
          onSubmit={handleMessageSubmit}
          placeholder="Type your message here..."
          disabled={isLoading}
          initialValue={inputValue}
          onChange={setInputValue}
        />
      </div>
    </div>
  );
};

export default ChatView;

