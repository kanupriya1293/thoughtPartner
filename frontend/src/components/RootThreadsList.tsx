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

  const handleCreateNewThread = () => {
    // Simply navigate to home page where user can type a message to create a thread
    navigate('/');
  };

  const handleThreadClick = (threadId: string) => {
    navigate(`/chat/${threadId}`);
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation(); // Prevent thread click
    
    if (!window.confirm('Are you sure you want to delete this thread? All branches will also be deleted. This cannot be undone.')) {
      return;
    }

    try {
      await threadsApi.deleteThread(threadId);
      await loadRootThreads(); // Refresh the list
      
      // If we deleted the current thread, navigate away
      if (threadId === currentThreadId) {
        const remainingThreads = rootThreads.filter(t => t.id !== threadId);
        if (remainingThreads.length > 0) {
          navigate(`/chat/${remainingThreads[0].id}`);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      alert('Failed to delete thread');
    }
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
          <div key={thread.id} className={`thread-item ${thread.id === currentRootId ? 'active' : ''}`}>
            <button
              onClick={() => handleThreadClick(thread.id)}
              title={thread.title || 'Untitled Thread'}
              className="thread-item-button"
            >
              <span className="thread-item-title">
                {thread.title || 'Untitled Thread'}
              </span>
            </button>
            <button
              onClick={(e) => handleDeleteThread(e, thread.id)}
              className="thread-item-delete"
              title="Delete thread"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RootThreadsList;

