import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import SimplyQuriousHome from './SimplyQuriousHome';
import ChatView from './ChatView';
import BranchOverlay from './BranchOverlay';
import RootThreadsList from './RootThreadsList';

interface OverlayThread {
  threadId?: string;
  title: string;
  initialText?: string;
  pendingBranch?: {
    parentThreadId: string;
    messageId: string;
    contextText?: string;
    startOffset?: number;
    endOffset?: number;
  };
}

function SimplyQuriousPage() {
  const location = useLocation();
  // Extract threadId from URL path - now nested under /simply-qurious
  const threadId = location.pathname.includes('/chat/') 
    ? location.pathname.split('/chat/')[1]?.split('/')[0]
    : undefined;
  const [overlayStack, setOverlayStack] = useState<OverlayThread[]>([]);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<any>(null);
  
  // Fetch current thread when threadId changes
  useEffect(() => {
    if (threadId) {
      import('../services/api').then(({ threadsApi }) => {
        threadsApi.getThread(threadId).then(setCurrentThread).catch(() => setCurrentThread(null));
      });
    } else {
      setCurrentThread(null);
    }
  }, [threadId]);
  
  // Listen for thread updates to refresh sidebar
  useEffect(() => {
    const handleThreadUpdate = (event: any) => {
      const updatedThreadId = event.detail.threadId;
      if (updatedThreadId === threadId) {
        import('../services/api').then(({ threadsApi }) => {
          threadsApi.getThread(updatedThreadId).then(setCurrentThread).catch(() => setCurrentThread(null));
        });
      }
    };
    
    window.addEventListener('threadUpdated', handleThreadUpdate);
    
    return () => {
      window.removeEventListener('threadUpdated', handleThreadUpdate);
    };
  }, [threadId]);


  const handleOpenOverlay = (
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
  ) => {
    setOverlayStack([...overlayStack, { threadId: branchThreadId, title, initialText, pendingBranch }]);
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = () => {
    setOverlayStack([]);
    setIsOverlayOpen(false);
  };

  const handleBackInOverlay = async () => {
    if (overlayStack.length > 1) {
      setOverlayStack(overlayStack.slice(0, -1));
    } else {
      handleCloseOverlay();
    }
  };

  const handleDeleteEmptyThread = async (_threadId: string) => {
    // No-op at this level
  };

  const handleThreadCreated = (newThreadId: string, title: string) => {
    setOverlayStack(prevStack => {
      const newStack = [...prevStack];
      if (newStack.length > 0) {
        newStack[newStack.length - 1].threadId = newThreadId;
        newStack[newStack.length - 1].title = title;
      }
      return newStack;
    });
    
    // Trigger reload of parent thread to show new highlight
    // This will be handled by ChatView's onBranchCreated callback
    window.dispatchEvent(new CustomEvent('branchCreated'));
  };

  const currentOverlayThread = overlayStack[overlayStack.length - 1];
  const canGoBackInOverlay = overlayStack.length > 1;

  return (
    <div className="flex-1 overflow-hidden flex relative">
      {/* Sidebar - Only in Simply Qurious */}
      <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        <RootThreadsList 
          currentThreadId={threadId || ''}
          currentRootId={threadId || ''}
          currentThread={currentThread}
        />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<SimplyQuriousHome />} />
          <Route path="/chat/:threadId" element={
            <ChatView 
              onOpenOverlay={handleOpenOverlay}
              onCloseOverlay={handleCloseOverlay}
            />
          } />
        </Routes>
      </main>

      {/* Backdrop */}
      {isOverlayOpen && (
        <div 
          className="absolute inset-0 bg-black/40 z-40"
          onClick={handleCloseOverlay}
        />
      )}

      {/* Overlay */}
      {isOverlayOpen && currentOverlayThread && (
        <BranchOverlay
          threadId={currentOverlayThread.threadId}
          parentThreadId={threadId || ''}
          onClose={handleCloseOverlay}
          onBack={handleBackInOverlay}
          canGoBack={canGoBackInOverlay}
          initialText={currentOverlayThread.initialText}
          onNavigateToBranch={handleOpenOverlay}
          onDeleteEmptyThread={handleDeleteEmptyThread}
          onThreadCreated={handleThreadCreated}
          pendingBranch={currentOverlayThread.pendingBranch}
        />
      )}
    </div>
  );
}

export default SimplyQuriousPage;

