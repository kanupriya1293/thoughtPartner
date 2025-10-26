import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thread } from '../types/thread';
import { threadsApi } from '../services/api';

interface RootThreadsListProps {
  currentThreadId: string;
  currentRootId: string;
  currentThread?: Thread | null;
}

const RootThreadsList: React.FC<RootThreadsListProps> = ({ currentThreadId, currentRootId, currentThread }) => {
  const [rootThreads, setRootThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRootThreads();
  }, []);

  // Update the specific thread in the list when its title changes
  useEffect(() => {
    if (currentThread && currentThread.title && currentThread.depth === 0) {
      setRootThreads(prevThreads => {
        const existingIndex = prevThreads.findIndex(t => t.id === currentThread.id);
        if (existingIndex >= 0) {
          // Thread exists, update only if title changed
          if (prevThreads[existingIndex].title !== currentThread.title) {
            const newThreads = [...prevThreads];
            newThreads[existingIndex] = currentThread;
            return newThreads;
          }
        } else {
          // New thread, add it to the list
          return [currentThread, ...prevThreads];
        }
        return prevThreads;
      });
    }
  }, [currentThread?.title]);

  const loadRootThreads = async () => {
    setIsLoading(true);
    try {
      const threads = await threadsApi.getRootThreads();
      setRootThreads(threads);
    } catch (error) {
      console.error('Error loading root threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewThread = async () => {
    try {
      const newThread = await threadsApi.createThread({});
      navigate(`/chat/${newThread.id}`);
      await loadRootThreads(); // Refresh the list
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const handleThreadClick = (threadId: string) => {
    navigate(`/chat/${threadId}`);
  };

  if (isLoading) {
    return (
      <div className="root-threads-list">
        <div className="loading-small">Loading...</div>
      </div>
    );
  }

  return (
    <div className="root-threads-list">
      <button className="btn-new-thread-sidebar" onClick={handleCreateNewThread}>
        + New Thread
      </button>

      <div className="threads-list">
        {rootThreads.map((thread) => (
          <button
            key={thread.id}
            className={`thread-item ${thread.id === currentRootId ? 'active' : ''}`}
            onClick={() => handleThreadClick(thread.id)}
            title={thread.title || 'Untitled Thread'}
          >
            <span className="thread-item-title">
              {thread.title || 'Untitled Thread'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RootThreadsList;

