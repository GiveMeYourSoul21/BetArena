import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import BetArenaIcon from '../assets/BetArena_mini.png';
import { API_URL } from '../config/api';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Функция для создания игры в блэкджек напрямую
  const createBlackjackGame = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/game/create`, {
        type: 'blackjack',
        userId: user.id || user._id,
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

  const createPokerGame = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/poker/create`, {
        userId: user.id || user._id,
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-black bg-opacity-90 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-xl font-bold flex items-center">
            <img src={BetArenaIcon} alt="BetArena" className="h-8 w-8 mr-2" />
            BetArena
          </Link>
          {user && (
            <>
              <button
                onClick={createBlackjackGame}
                className="text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer px-0"
                style={{ background: 'none', border: 'none' }}
              >
                Blackjack
              </button>
              <button
                onClick={createPokerGame}
                className="text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer px-0"
                style={{ background: 'none', border: 'none' }}
              >
                Poker
              </button>
              <Link
                to="/rules"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Game Rules
              </Link>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-gray-300">
                Chips: {user.chips || 1000}
              </span>
              <Link
                to="/profile"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 