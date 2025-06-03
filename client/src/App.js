import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Game from './pages/Game';
import Profile from './pages/Profile';
import Rules from './pages/Rules';
import BlackjackSetup from './pages/BlackjackSetup';
import BlackjackGame from './components/BlackjackGame';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
          <Navbar />
          <main className="container mx-auto px-4 py-8 flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/rules" element={<Rules />} />
              <Route
                path="/blackjack"
                element={
                  <PrivateRoute>
                    <BlackjackSetup />
                  </PrivateRoute>
                }
              />
              <Route
                path="/blackjack/:gameId"
                element={
                  <PrivateRoute>
                    <BlackjackGame />
                  </PrivateRoute>
                }
              />
              <Route
                path="/game/:gameId"
                element={
                  <PrivateRoute>
                    <Game />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 