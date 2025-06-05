import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BlackjackSettings from '../components/BlackjackSettings';
import axios from 'axios';
import '../styles/Home.css';
import { API_URL } from '../config/api';

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sectionsRef = useRef([]);
  const [showBlackjackSettings, setShowBlackjackSettings] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      sectionsRef.current.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  const createGame = async (type, settings = {}) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/game/create`, {
        type,
        userId: user.id,
        settings: {
          decks: type === 'blackjack' ? (settings.decks || 6) : 1,
          initialBet: settings.initialBet || 10
        }
      });
      navigate(`/game/${response.data._id}`);
    } catch (error) {
      console.error('Ошибка при создании игры:', error);
    }
  };

  const createPokerGame = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/poker/create`, {
        userId: user.id,
        username: user.username,
        settings: {
          numBots: 3 // Фиксированное количество ботов
        }
      });
      console.log('Ответ сервера:', response.data);
      console.log('ID игры:', response.data.gameId || response.data._id);
      
      // Используем gameId если есть, иначе _id
      const gameId = response.data.gameId || response.data._id;
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Ошибка при создании покерной игры:', error);
    }
  };

  const handleBlackjackStart = (settings) => {
    setShowBlackjackSettings(false);
    createGame('blackjack', settings);
  };

  // Функция для создания игры в блэкджек напрямую
  const createBlackjackGame = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/game/create`, {
        type: 'blackjack',
        userId: user.id,
        settings: {
          decks: 6,
          initialBet: 10
        }
      });
      // Перенаправляем на страницу блэкджека, а не общую страницу игры
      navigate(`/blackjack/${response.data._id}`);
    } catch (error) {
      console.error('Ошибка при создании игры в блэкджек:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Hero Section */}
      <div 
        className="relative flex items-center justify-center w-full"
        style={{
          backgroundImage: 'url(/bg/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: '70vh',
          margin: '-1px',
          marginTop: '-1px',
          marginBottom: '-1px'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative z-10 text-center hero-content">
          <h1 className="text-6xl font-bold text-white mb-8">
            Welcome to BetArena
          </h1>
          {!user && (
            <div className="space-x-4">
              <Link
                to="/register"
                className="button-hover bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
              >
                Register
              </Link>
              <Link
                to="/login"
                className="button-hover bg-transparent border-2 border-white hover:bg-white hover:text-red-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Games Section */}
      <div 
        ref={el => sectionsRef.current[0] = el} 
        className="section bg-gradient-dark py-20"
      >
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Виберіть гру
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Poker Card */}
            <div className="game-card card-flip">
              <div className="card-inner relative overflow-hidden rounded-lg">
                <img 
                  src="/bg/poker-bg.png" 
                  alt="Poker" 
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-30 transition-all"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <h3 className="text-3xl font-bold text-white mb-4">Poker</h3>
                  <button
                    onClick={createPokerGame}
                    className="button-hover bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                  >
                    Грати
                  </button>
                </div>
              </div>
            </div>

            {/* Blackjack Card */}
            <div className="game-card card-flip">
              <div className="card-inner relative overflow-hidden rounded-lg">
                <img 
                  src="/bg/blackjack-bg.png" 
                  alt="Blackjack" 
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-30 transition-all"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <h3 className="text-3xl font-bold text-white mb-4">Blackjack</h3>
                  <button
                    onClick={createBlackjackGame}
                    className="button-hover bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                  >
                    Грати
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How to Play Section */}
      <div 
        ref={el => sectionsRef.current[1] = el}
        className="section relative py-20"
        style={{
          backgroundImage: 'url(/bg/how-to-play-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Як грати
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            BetArena — це онлайн-платформа для гри в покер і блекджек проти ботів
          </p>
          <Link
            to="/rules"
            className="button-hover inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Дізнатися більше
          </Link>
        </div>
      </div>

      {/* Blackjack Settings Modal */}
      {showBlackjackSettings && (
        <BlackjackSettings
          onStart={handleBlackjackStart}
          onClose={() => setShowBlackjackSettings(false)}
        />
      )}
    </div>
  );
}

export default Home; 