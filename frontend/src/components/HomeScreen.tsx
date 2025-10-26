import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { threadsApi, messagesApi } from '../services/api';
import RootThreadsList from './RootThreadsList';

const HomeScreen: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue;
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Create a new thread first
      const newThread = await threadsApi.createThread({});
      
      // Send the first message
      await messagesApi.sendMessage(newThread.id, { content: messageContent }, true);
      
      // Navigate to the chat view
      navigate(`/chat/${newThread.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create thread and send message');
      console.error('Error creating thread and sending message:', err);
      // Restore input on error
      setInputValue(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home-screen-with-sidebar">
      <div className="home-sidebar">
        <RootThreadsList 
          currentThreadId=""
          currentRootId=""
          currentThread={null}
        />
      </div>
      
      <div className="home-screen">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="home-content">
          <div className="home-input-container">
            <h1 className="home-title">Start a conversation</h1>
            <p className="home-subtitle">Type your message below to begin</p>
            
            <form className="home-input-form" onSubmit={handleSendMessage}>
              <textarea
                ref={inputRef}
                className="home-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                rows={6}
                disabled={isLoading}
                autoFocus
              />
              <button 
                type="submit" 
                className="btn-send-home"
                disabled={isLoading || !inputValue.trim()}
              >
                {isLoading ? 'Starting conversation...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;

