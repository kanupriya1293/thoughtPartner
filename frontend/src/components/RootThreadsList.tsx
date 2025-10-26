import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { Thread } from '../types/thread';
import { threadsApi } from '../services/api';
import FloatingMenu from './FloatingMenu';

interface RootThreadsListProps {
  currentThreadId: string;
  currentRootId: string;
  currentThread?: Thread | null;
}

const RootThreadsList: React.FC<RootThreadsListProps> = ({ currentRootId, currentThread }) => {
  const [rootThreads, setRootThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const lastCurrentRootIdRef = useRef<string>('');
  const rootThreadsRef = useRef<Thread[]>([]);
  const menuButtonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const navigate = useNavigate();

  // Keep ref in sync with state
  useEffect(() => {
    rootThreadsRef.current = rootThreads;
  }, [rootThreads]);

  useEffect(() => {
    loadRootThreads();
  }, []);

  // Reload threads when currentThreadId changes to a thread that doesn't exist in the list
  useEffect(() => {
    if (!currentRootId || currentRootId === lastCurrentRootIdRef.current) {
      return;
    }
    
    lastCurrentRootIdRef.current = currentRootId;
    
    // Check if this thread exists in the current list using ref
    const threadExists = rootThreadsRef.current.some(t => t.id === currentRootId);
    if (!threadExists) {
      // Reload threads list to get the new thread
      loadRootThreads();
    }
  }, [currentRootId]);



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

  const handleRename = async (threadId: string) => {
    const thread = rootThreads.find(t => t.id === threadId);
    const currentTitle = thread?.title || 'Untitled Thread';
    const newTitle = prompt('Enter new title:', currentTitle);
    if (newTitle && newTitle.trim() !== currentTitle) {
      try {
        // Note: Assuming there's an update API endpoint
        await threadsApi.updateThread(threadId, { title: newTitle.trim() });
        setRootThreads(prev => prev.map(t => 
          t.id === threadId ? { ...t, title: newTitle.trim() } : t
        ));
      } catch (error) {
        console.error('Error renaming thread:', error);
        alert('Failed to rename thread');
      }
    }
    setShowMenu(null);
  };

  const handleDelete = async (threadId: string) => {
    if (window.confirm('Are you sure you want to delete this thread?')) {
      try {
        await threadsApi.deleteThread(threadId);
        setRootThreads(prev => prev.filter(t => t.id !== threadId));
        // If deleted thread is current thread, navigate to home
        if (threadId === currentRootId) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error deleting thread:', error);
        alert('Failed to delete thread');
      }
    }
    setShowMenu(null);
  };

  const getMenuPosition = (threadId: string) => {
    const buttonRef = menuButtonRefs.current[threadId];
    if (!buttonRef) return undefined;
    const rect = buttonRef.getBoundingClientRect();
    // Position below the three dots button, aligned with the right edge
    return { x: rect.right, y: rect.bottom + 8 };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center text-gray-500 p-4 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Header */}
      <div className="px-4 py-3 border-b border-gray-200 h-12 flex items-center">
        <button
          onClick={handleCreateNewThread}
          className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Thread</span>
        </button>
      </div>

      {/* Proposals Section */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Threads
          </h3>
          
          <div className="space-y-1">
            {rootThreads.map((thread) => {
              const isSelected = thread.id === currentRootId;
              const isHovered = hoveredThread === thread.id;
              const isMenuOpen = showMenu === thread.id;

              return (
                <div
                  key={thread.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredThread(thread.id)}
                  onMouseLeave={() => setHoveredThread(null)}
                >
                  <button
                    onClick={() => {
                      if (!isMenuOpen) {
                        handleThreadClick(thread.id);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between h-[32px] ${
                      isSelected
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : isHovered
                        ? 'bg-gray-100'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{thread.title || 'Untitled Thread'}</span>
                    
                    {/* Three dots menu button - always reserve space */}
                    <div 
                      className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                      ref={(el) => {
                        if (el) {
                          menuButtonRefs.current[thread.id] = el;
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(isMenuOpen ? null : thread.id);
                      }}
                    >
                      {isHovered || isSelected ? (
                        <MoreHorizontal className="w-4 h-4 text-gray-600 pointer-events-none" />
                      ) : null}
                    </div>
                  </button>

                  {/* Floating Menu */}
                  {isMenuOpen && (
                    <FloatingMenu
                      items={[
                        {
                          id: 'rename',
                          label: 'Rename',
                          icon: <Edit2 className="w-3 h-3" />,
                          onClick: () => handleRename(thread.id),
                        },
                        {
                          id: 'delete',
                          label: 'Delete',
                          icon: <Trash2 className="w-3 h-3" />,
                          onClick: () => handleDelete(thread.id),
                        },
                      ]}
                      isOpen={isMenuOpen}
                      onClose={() => setShowMenu(null)}
                      position={getMenuPosition(thread.id)}
                      anchor="right"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RootThreadsList;
