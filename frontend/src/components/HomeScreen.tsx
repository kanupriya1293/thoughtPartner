import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thread } from '../types/thread';
import { threadsApi } from '../services/api';

const HomeScreen: React.FC = () => {
  const [rootThreads, setRootThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRootThreads();
  }, []);

  const loadRootThreads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const threads = await threadsApi.getRootThreads();
      setRootThreads(threads);
    } catch (err: any) {
      setError(err.message || 'Failed to load threads');
      console.error('Error loading root threads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewThread = async () => {
    try {
      const newThread = await threadsApi.createThread({});
      navigate(`/chat/${newThread.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create thread');
      console.error('Error creating thread:', err);
    }
  };

  const handleThreadClick = (threadId: string) => {
    navigate(`/chat/${threadId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="home-screen">
        <div className="loading">Loading threads...</div>
      </div>
    );
  }

  return (
    <div className="home-screen">
      <div className="home-header">
        <h1>Your Conversations</h1>
        <button className="btn-new-thread" onClick={handleCreateNewThread}>
          + New Thread
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {rootThreads.length === 0 ? (
        <div className="empty-state">
          <p>No conversations yet. Start a new one!</p>
          <button className="btn-new-thread-large" onClick={handleCreateNewThread}>
            Create Your First Thread
          </button>
        </div>
      ) : (
        <div className="threads-grid">
          {rootThreads.map((thread) => (
            <div
              key={thread.id}
              className="thread-card"
              onClick={() => handleThreadClick(thread.id)}
            >
              <h3 className="thread-title">{thread.title || 'Untitled Thread'}</h3>
              <p className="thread-date">{formatDate(thread.created_at)}</p>
              {thread.summary && (
                <p className="thread-summary">{thread.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeScreen;

