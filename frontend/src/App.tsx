import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useLocation } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import ChatView from './components/ChatView';
import BranchOverlay from './components/BranchOverlay';
import FloatingMenu, { FloatingMenuIcons } from './components/FloatingMenu';
import RootThreadsList from './components/RootThreadsList';
import './App.css';

function AppHeader() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileButtonRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleLogoClick = () => {
    window.location.href = '/';
  };

  const menuItems = [
    {
      id: 'help',
      label: 'Help',
      icon: <FloatingMenuIcons.Help />,
      onClick: () => console.log('Help clicked'),
    },
    {
      id: 'about',
      label: 'About',
      icon: <FloatingMenuIcons.Info />,
      onClick: () => console.log('About clicked'),
    },
  ];

  const getMenuPosition = () => {
    if (!profileButtonRef.current) return undefined;
    const rect = profileButtonRef.current.getBoundingClientRect();
    // Right align with icon and add vertical spacing
    return { x: rect.right, y: rect.bottom + 12 };
  };

  return (
    <header className="sticky top-0 z-50 py-1 sm:py-2 lg:py-4 px-2 sm:px-3 lg:px-6 transition-all duration-300 ease-in-out backdrop-blur-xl border-b border-gray-200 bg-white/80 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleLogoClick}>
          <div className="relative">
            <div className="h-7 w-7 transition-all p-1 hover:bg-gray-900 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
              <span className="text-white font-bold text-md">T</span>
            </div>
          </div>
          <span className="text-lg font-semibold text-gray-900">Thought Partner</span>
        </div>

        {/* Right: User Profile */}
        <div className="flex items-center">
          <div className="relative" ref={profileButtonRef}>
            <button
              onClick={handleProfileClick}
              className="relative flex shrink-0 overflow-hidden rounded-full h-6 w-6 text-xs font-thin text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="aspect-square h-full w-full object-cover bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </button>

            <FloatingMenu
              items={menuItems}
              isOpen={isProfileMenuOpen}
              onClose={() => setIsProfileMenuOpen(false)}
              position={getMenuPosition()}
              anchor="right"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col">
        <AppHeader />
        <AppLayout />
      </div>
    </Router>
  );
}

interface OverlayThread {
  threadId?: string;
  title: string;
  initialText?: string;
  pendingBranch?: {
    parentThreadId: string;
    messageId: string;
    contextText?: string;
  };
}

function AppLayout() {
  const location = useLocation();
  // Extract threadId from URL path
  const threadId = location.pathname.startsWith('/chat/') 
    ? location.pathname.split('/chat/')[1]?.split('/')[0]
    : undefined;
  const [overlayStack, setOverlayStack] = useState<OverlayThread[]>([]);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);


  const handleOpenOverlay = (
    branchThreadId: string | undefined,
    title: string,
    initialText?: string,
    pendingBranch?: {
      parentThreadId: string;
      messageId: string;
      contextText?: string;
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
  };

  const currentOverlayThread = overlayStack[overlayStack.length - 1];
  const canGoBackInOverlay = overlayStack.length > 1;

  return (
    <div className="flex-1 overflow-hidden flex relative">
      {/* Shared Sidebar */}
      <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        <RootThreadsList 
          currentThreadId={threadId || ''}
          currentRootId={threadId || ''}
          currentThread={null}
        />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
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

export default App;

