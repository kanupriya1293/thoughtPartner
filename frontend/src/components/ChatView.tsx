import React, { useState, useEffect, useRef } from 'react';
import { Thread } from '../types/thread';
import { Message as MessageType } from '../types/message';
import { messagesApi, threadsApi } from '../services/api';
import MessageList from './MessageList';
import ThreadNavigator from './ThreadNavigator';

interface ChatViewProps {
  threadId: string;
  onThreadChange: (threadId: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ threadId, onThreadChange }) => {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThread();
  }, [threadId]);

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
      // Send message and get response
      await messagesApi.sendMessage(threadId, { content: messageContent });
      
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
    try {
      const newThread = await threadsApi.createThread({
        parent_thread_id: threadId,
        branch_from_message_id: messageId,
        branch_context_text: contextText,
      });
      
      // Switch to the new branch
      onThreadChange(newThread.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
      console.error('Error creating branch:', err);
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-sidebar">
        <ThreadNavigator 
          currentThread={thread} 
          onThreadChange={onThreadChange}
        />
      </div>
      
      <div className="chat-main">
        <div className="chat-header">
          <h2>{thread?.title || 'Loading...'}</h2>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="chat-messages">
          <MessageList
            messages={messages}
            onBranchClick={onThreadChange}
            onCreateBranch={handleCreateBranch}
          />
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <textarea
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
  );
};

export default ChatView;

