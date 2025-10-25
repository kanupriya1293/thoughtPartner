import React, { useState, useEffect } from 'react';
import { Thread } from '../types/thread';
import { threadsApi } from '../services/api';

interface ThreadNavigatorProps {
  currentThread: Thread | null;
  onThreadChange: (threadId: string) => void;
}

const ThreadNavigator: React.FC<ThreadNavigatorProps> = ({ currentThread, onThreadChange }) => {
  const [children, setChildren] = useState<Thread[]>([]);
  const [parent, setParent] = useState<Thread | null>(null);

  useEffect(() => {
    if (currentThread) {
      loadThreadInfo();
    }
  }, [currentThread?.id]);

  const loadThreadInfo = async () => {
    if (!currentThread) return;

    // Load children
    try {
      const childThreads = await threadsApi.getChildren(currentThread.id);
      setChildren(childThreads);
    } catch (error) {
      console.error('Error loading children:', error);
    }

    // Load parent
    if (currentThread.parent_thread_id) {
      try {
        const parentThread = await threadsApi.getThread(currentThread.parent_thread_id);
        setParent(parentThread);
      } catch (error) {
        console.error('Error loading parent:', error);
      }
    } else {
      setParent(null);
    }
  };

  if (!currentThread) {
    return null;
  }

  return (
    <div className="thread-navigator">
      <div className="thread-info">
        <h3>{currentThread.title || 'Untitled Thread'}</h3>
        <div className="thread-metadata">
          <span>Depth: {currentThread.depth}</span>
          {currentThread.depth === 0 && <span className="badge-root">Root Thread</span>}
        </div>
      </div>

      {parent && (
        <div className="nav-section">
          <h4>Parent Thread</h4>
          <button 
            className="nav-item"
            onClick={() => onThreadChange(parent.id)}
          >
            ⬆️ {parent.title || 'Untitled Thread'}
          </button>
        </div>
      )}

      {children.length > 0 && (
        <div className="nav-section">
          <h4>Child Threads ({children.length})</h4>
          <div className="nav-list">
            {children.map((child) => (
              <button
                key={child.id}
                className="nav-item"
                onClick={() => onThreadChange(child.id)}
              >
                ⬇️ {child.title || 'Untitled Thread'}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentThread.root_id !== currentThread.id && (
        <div className="nav-section">
          <button 
            className="btn-go-root"
            onClick={() => onThreadChange(currentThread.root_id)}
          >
            🏠 Go to Origin Thread
          </button>
        </div>
      )}
    </div>
  );
};

export default ThreadNavigator;

