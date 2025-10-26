import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import ChatView from './components/ChatView';
import './App.css';

function AppHeader() {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="app-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <h1>🧠 Thought Partner</h1>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <AppHeader />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/chat/:threadId" element={<ChatView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

