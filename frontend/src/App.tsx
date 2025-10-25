import React, { useState, useEffect } from 'react';
import ChatView from './components/ChatView';
import { threadsApi } from './services/api';
import './App.css';

function App() {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Check if we have a thread ID in localStorage
    const savedThreadId = localStorage.getItem('currentThreadId');
    
    if (savedThreadId) {
      try {
        // Verify thread exists
        await threadsApi.getThread(savedThreadId);
        setCurrentThreadId(savedThreadId);
      } catch {
        // Thread doesn't exist, create new one
        await createNewRootThread();
      }
    } else {
      await createNewRootThread();
    }
    
    setIsInitializing(false);
  };

  const createNewRootThread = async () => {
    try {
      const thread = await threadsApi.createThread({});
      setCurrentThreadId(thread.id);
      localStorage.setItem('currentThreadId', thread.id);
    } catch (error) {
      console.error('Error creating root thread:', error);
    }
  };

  const handleThreadChange = (threadId: string) => {
    setCurrentThreadId(threadId);
    localStorage.setItem('currentThreadId', threadId);
  };

  const handleNewRootThread = async () => {
    await createNewRootThread();
  };

  if (isInitializing || !currentThreadId) {
    return (
      <div className="app-loading">
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 Thought Partner</h1>
        <button className="btn-new-thread" onClick={handleNewRootThread}>
          + New Root Thread
        </button>
      </header>
      
      <main className="app-main">
        <ChatView 
          threadId={currentThreadId} 
          onThreadChange={handleThreadChange}
        />
      </main>
    </div>
  );
}

export default App;

