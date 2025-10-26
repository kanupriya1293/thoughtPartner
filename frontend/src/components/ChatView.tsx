import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Thread } from '../types/thread';
import { Message as MessageType } from '../types/message';
import { messagesApi, threadsApi } from '../services/api';
import MessageList from './MessageList';
import SelectionMenu from './SelectionMenu';
import ChatInputBox from './ChatInputBox';

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
}

const ChatView: React.FC<ChatViewProps> = ({ onOpenOverlay, onCloseOverlay }) => {
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
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message || 'Failed to load thread');
      console.error('Error loading thread:', err);
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

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
  }, [threadId, location, loadThread]);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      inputRef.current?.setSelectionRange(quotedText.length, quotedText.length);
    }, 0);
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

    try {
      await messagesApi.sendMessage(threadId, { content: messageContent }, true);
      await loadThread();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      setInputValue(messageContent);
    } finally {
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

      <div className="flex-1 overflow-y-auto px-8 py-6 bg-white">
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

      <div className="px-8 py-4 bg-white">
        <ChatInputBox 
          onSubmit={handleMessageSubmit}
          placeholder="Type your message here..."
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatView;

