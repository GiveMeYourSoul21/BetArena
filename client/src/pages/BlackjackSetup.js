import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

function BlackjackSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState(1);
  const [initialBet, setInitialBet] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startGame = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post(`${API_URL}/api/game/create`, {
        type: 'blackjack',
        userId: user._id,
        settings: {
          decks,
          initialBet
        }
      });
      if (response.data && response.data._id) {
        navigate(`/game/${response.data._id}`);
      } else {
        setError('Ошибка: не удалось получить ID созданной игры.');
        console.error('Ответ сервера:', response.data);
      }
    } catch (error) {
      console.error('Ошибка при создании игры:', error);
      setError(error.response?.data?.message || 'Не удалось создать игру. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-white">Налаштування гри в Блекджек</h1>

      <div className="bg-gray-800 bg-opacity-80 rounded-lg p-6 space-y-6 shadow-xl border border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Кількість колод
          </label>
          <select
            value={decks}
            onChange={(e) => setDecks(Number(e.target.value))}
            className="w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 4, 6, 8].map(num => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'колода' : num <= 4 ? 'колоди' : 'колод'}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-400">
            Чим більше колод, тим складніше рахувати карти
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Початкова ставка
          </label>
          <select
            value={initialBet}
            onChange={(e) => setInitialBet(Number(e.target.value))}
            className="w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[5, 10, 25, 50, 100].map(amount => (
              <option key={amount} value={amount}>
                {amount} фішок
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button
            onClick={startGame}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-md text-white font-semibold ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 transition-colors'
            }`}
          >
            {loading ? 'Створення гри...' : 'Почати гру'}
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-300">
          <h3 className="font-semibold mb-2 text-white">Базові правила:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Блекджек (21 очко) оплачується 3 до 2</li>
            <li>Дилер зобов'язаний брати карти до 17 очок</li>
            <li>Дилер зобов'язаний зупинитися на 17 і вище</li>
            <li>Дозволено подвоювати ставку після отримання перших двох карт</li>
            <li>Дозволено розділяти пари</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BlackjackSetup; 