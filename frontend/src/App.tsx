import { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import FloatingMenu, { FloatingMenuIcons } from './components/FloatingMenu';
import SimplyQuriousPage from './components/SimplyQuriousPage';
import LetterGeniePage from './components/LetterGeniePage';
import './App.css';

function AppHeader() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleLogoClick = () => {
    navigate('/simply-qurious');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
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
        </div>

        {/* Center: Navigation */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-8">
          <button
            onClick={() => handleNavClick('/simply-qurious')}
            className={`text-sm font-normal transition-colors ${
              isActive('/simply-qurious')
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Simply Qurious
          </button>
          <button
            onClick={() => handleNavClick('/letter-genie')}
            className={`text-sm font-normal transition-colors ${
              isActive('/letter-genie')
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Letter Genie
          </button>
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

function AppLayoutContent() {
  return (
    <div className="h-screen flex flex-col">
      <AppHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/simply-qurious" replace />} />
        <Route path="/simply-qurious/*" element={<SimplyQuriousPage />} />
        <Route path="/letter-genie" element={<LetterGeniePage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayoutContent />
    </Router>
  );
}

export default App;

