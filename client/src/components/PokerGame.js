import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import defaultAvatar from '../assets/default_avatar.png';
import smallChips from '../assets/small_ships.png';
import '../styles/poker.css';
import { API_URL } from '../config/api';

function PokerGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [betAmount, setBetAmount] = useState(100);
  const [positions, setPositions] = useState({
    dealer: 0,
    sb: 1,
    bb: 2,
    utg: 3
  });

  // Новые состояния для логики ходов
  const [turnTimer, setTurnTimer] = useState(7); // Таймер на ход (7 секунд)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);

  // Отслеживание размера окна
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Вычисление размеров стола
  const getTableDimensions = () => {
    const minWidth = 800;
    const maxWidth = 1400;
    const aspectRatio = 1.75; // соотношение сторон стола

    let tableWidth = Math.min(windowSize.width * 0.8, maxWidth);
    tableWidth = Math.max(tableWidth, minWidth);
    const tableHeight = tableWidth / aspectRatio;

    return { width: tableWidth, height: tableHeight };
  };

  // Получение данных игры
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/poker/${gameId}`);
        setGameData(response.data);
        
        // Определяем позиции на основе данных с сервера
        const dealerIndex = response.data.players.findIndex(p => p.isDealer);
        if (dealerIndex !== -1) {
          setPositions({
            dealer: dealerIndex,
            sb: (dealerIndex + 1) % 4,
            bb: (dealerIndex + 2) % 4,
            utg: (dealerIndex + 3) % 4
          });
        }
        
        // Обновляем текущего игрока и проверяем чей ход
        if (response.data.currentTurn !== undefined) {
          setCurrentPlayerIndex(response.data.currentTurn);
          const currentPlayer = response.data.players[response.data.currentTurn];
          setIsPlayerTurn(currentPlayer && currentPlayer.user && currentPlayer.user.toString() === user?._id);
          
          // Сбрасываем таймер при смене хода
          setTurnTimer(7);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при получении данных игры:', error);
        setError('Не удалось загрузить данные игры');
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGameData();
    }
  }, [gameId, user]);

  // Таймер хода
  useEffect(() => {
    let interval;
    
    if (gameData && gameData.status === 'playing' && currentPlayerIndex !== null) {
      interval = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            // Время вышло - автоматический fold для текущего игрока
            if (isPlayerTurn) {
              handlePlayerAction('fold');
            } else {
              // Для ботов тоже делаем fold
              handleBotAction(currentPlayerIndex, 'fold');
            }
            return 7; // Сброс таймера
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentPlayerIndex, isPlayerTurn, gameData]);

  // Функция для определения следующего активного игрока
  const getNextActivePlayer = (currentIndex) => {
    if (!gameData?.players) return null;
    
    let nextIndex = (currentIndex + 1) % gameData.players.length;
    let attempts = 0;
    
    // Ищем следующего активного игрока (не fold и не all-in)
    while (attempts < gameData.players.length) {
      const nextPlayer = gameData.players[nextIndex];
      if (!nextPlayer.folded && !nextPlayer.isAllIn) {
        return nextIndex;
      }
      nextIndex = (nextIndex + 1) % gameData.players.length;
      attempts++;
    }
    
    return null; // Все игроки fold или all-in
  };

  // Функция для обработки действий игрока
  const handlePlayerAction = async (action, amount = 0) => {
    if (!isPlayerTurn) return;
    
    try {
      const response = await axios.post(`${API_URL}/api/poker/${gameId}/action`, {
        userId: user._id,
        action,
        amount
      });
      
      setGameData(response.data);
      setTurnTimer(7); // Сброс таймера после действия
      
      // Обновляем текущего игрока
      if (response.data.currentTurn !== undefined) {
        setCurrentPlayerIndex(response.data.currentTurn);
        const nextPlayer = response.data.players[response.data.currentTurn];
        setIsPlayerTurn(nextPlayer && nextPlayer.user && nextPlayer.user.toString() === user._id);
      }
      
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
      toast.error('Ошибка при выполнении действия');
    }
  };

  // Функция для действий ботов (заглушка)
  const handleBotAction = async (playerIndex, action) => {
    console.log(`Бот ${playerIndex} делает ${action}`);
    // Здесь можно добавить логику для ботов
  };

  // Получение позиции игрока
  const getPlayerPosition = (playerIndex) => {
    if (!positions) return '';
    
    if (playerIndex === positions.dealer) return 'D';
    if (playerIndex === positions.sb) return 'SB';
    if (playerIndex === positions.bb) return 'BB';
    if (playerIndex === positions.utg) return 'UTG';
    return '';
  };

  // Добавляем функцию для расчета позиции ставок
  const getBetPosition = (playerPosition, tableDimensions) => {
    const { width, height } = tableDimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const positions = {
      player: { x: centerX, y: height - 160 },
      leftBot: { x: 200, y: centerY },
      topBot: { x: centerX, y: 160 },
      rightBot: { x: width - 200, y: centerY }
    };
    
    return positions[playerPosition];
  };

  // Вычисление позиций игроков на столе
  const getPlayerPositions = () => {
    const { width, height } = getTableDimensions();
    const centerX = width / 2;
    const centerY = height / 2;

    // Базовые позиции
    const positions = {
      player: {
        x: centerX,
        y: height - 80,
        rotation: 0,
        name: user?.username || 'Вы',
        avatar: defaultAvatar,
        isBot: false,
        position: getPlayerPosition(0),
        index: 0,
        betPosition: { x: centerX, y: height - 160 },
        chips: 1000,
        currentBet: 0
      },
      leftBot: {
        x: 100,
        y: centerY,
        rotation: 90,
        name: 'Bot 1',
        avatar: defaultAvatar,
        isBot: true,
        position: getPlayerPosition(1),
        index: 1,
        betPosition: { x: 200, y: centerY },
        chips: 1000,
        currentBet: 0
      },
      topBot: {
        x: centerX,
        y: 80,
        rotation: 180,
        name: 'Bot 2',
        avatar: defaultAvatar,
        isBot: true,
        position: getPlayerPosition(2),
        index: 2,
        betPosition: { x: centerX, y: 160 },
        chips: 1000,
        currentBet: 0
      },
      rightBot: {
        x: width - 100,
        y: centerY,
        rotation: 270,
        name: 'Bot 3',
        avatar: defaultAvatar,
        isBot: true,
        position: getPlayerPosition(3),
        index: 3,
        betPosition: { x: width - 200, y: centerY },
        chips: 1000,
        currentBet: 0
      }
    };

    // Обновляем данные из gameData
    if (gameData?.players) {
      Object.values(positions).forEach(pos => {
        const player = gameData.players.find(p => p && p.position === pos.index);
        if (player) {
          pos.name = player.username || pos.name;
          pos.chips = player.chips || 1000; // Защита от undefined
          pos.currentBet = player.currentBet || 0;
          pos.folded = player.folded || false;
          pos.isAllIn = player.isAllIn || false;
          pos.position = getPlayerPosition(player.position);
          pos.hasActed = player.hasActed || false;
          pos.isCurrentTurn = gameData.currentTurn === player.position;
        }
      });
    }

    return positions;
  };

  // Функция для определения цвета маркера позиции
  const getPositionColor = (position, isCurrentTurn) => {
    if (isCurrentTurn) {
      return 'bg-purple-500 border-purple-300 animate-pulse';
    }
    
    switch (position) {
      case 'D':
        return 'bg-yellow-500 border-yellow-300';
      case 'SB':
        return 'bg-blue-500 border-blue-300';
      case 'BB':
        return 'bg-red-500 border-red-300';
      case 'UTG':
        return 'bg-green-500 border-green-300';
      default:
        return 'bg-gray-500 border-gray-300';
    }
  };

  // Инициализация сокета
  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      withCredentials: true,
      forceNew: true,
      path: '/socket.io/',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      secure: window.location.protocol === 'https:',
      rejectUnauthorized: false,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO');
      if (gameId) {
        newSocket.emit('joinGame', gameId);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'websocket error') {
        console.log('Switching to polling transport...');
        newSocket.io.opts.transports = ['polling'];
      }
      toast.error('Ошибка подключения к серверу. Пробуем переподключиться...', {
        position: "top-right",
        autoClose: 3000
      });
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [gameId]);

  // Socket.IO обработчики
  useEffect(() => {
    if (!socket) return;

    socket.on('gameUpdate', (data) => {
      console.log('Получено обновление игры:', data);
      setGameData(data);
      
      // Обновляем позиции при обновлении игры
      const dealerIndex = data.players.findIndex(p => p.isDealer);
      if (dealerIndex !== -1) {
        setPositions({
          dealer: dealerIndex,
          sb: (dealerIndex + 1) % 4,
          bb: (dealerIndex + 2) % 4,
          utg: (dealerIndex + 3) % 4
        });
      }

      // Обновляем данные игроков
      const updatedPositions = { ...getPlayerPositions() };
      data.players.forEach(player => {
        const position = Object.values(updatedPositions).find(pos => pos.index === player.position);
        if (position) {
          position.chips = player.chips;
          position.currentBet = player.currentBet || 0;
          position.folded = player.folded || false;
          position.isAllIn = player.isAllIn || false;
          position.hasActed = player.hasActed || false;
        }
      });
    });

    return () => {
      socket.off('gameUpdate');
    };
  }, [socket, gameData]);

  // Обработчик выхода из игры
  const handleExit = async () => {
    try {
      await axios.post(`${API_URL}/api/poker/${gameId}/exit`, {
        userId: user._id
      });
      navigate('/');
    } catch (error) {
      console.error('Ошибка при выходе из игры:', error);
      navigate('/');
    }
  };

  // Обработчики действий (пока без функционала)
  const handleCheck = () => {
    console.log('Check');
  };

  const handleCall = () => {
    console.log('Call');
  };

  const handleFold = () => {
    console.log('Fold');
  };

  const handleBet = () => {
    console.log('Bet:', betAmount);
  };

  // Функция для вычисления угла игрока на столе
  const getPlayerAngle = (index) => {
    const angles = {
      0: 0,    // Игрок внизу
      1: 180,  // Бот сверху
      2: 90,   // Бот слева
      3: 270   // Бот справа
    };
    return angles[index] || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          Загрузка игры...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-red-900 text-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2">Ошибка:</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 bg-white text-red-900 px-4 py-2 rounded hover:bg-red-100"
          >
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  const tableDimensions = getTableDimensions();
  const playerPositions = getPlayerPositions();

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden flex items-center justify-center">
      <ToastContainer />
      
      {/* Покерный стол */}
      <div 
        className="relative rounded-[100px] shadow-2xl"
        style={{
          width: tableDimensions.width,
          height: tableDimensions.height,
          backgroundImage: 'url(/BG/poker-table_no_fone.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          border: '12px solid #2D2D2D'
        }}
      >
        {/* Статистика игры в рамке слева сверху */}
        <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-95 border-2 border-gray-600 rounded-lg p-4 text-white text-sm backdrop-blur-sm shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span className="font-medium">Банк:</span>
              <span className="text-yellow-400 font-bold">
                {gameData?.status === 'finished' ? (gameData?.pot || 0) : (gameData?.pot || 50)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎯</span>
              <span className="font-medium">Раунд:</span>
              <span className="text-blue-400">{gameData?.currentRound || 'preflop'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📊</span>
              <span className="font-medium">Статус:</span>
              <span className={gameData?.status === 'finished' ? 'text-red-400' : 'text-green-400'}>
                {gameData?.status === 'finished' ? 'завершено' : 'грає'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">SB:</span>
              <span className="text-blue-300">10</span>
              <span className="mx-1">/</span>
              <span className="font-medium">BB:</span>
              <span className="text-red-300">20</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Дилер:</span>
              <span className="text-yellow-300">{positions?.dealer || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Поточний хід:</span>
              <span className="text-purple-300">{currentPlayerIndex !== null ? currentPlayerIndex : 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Мій хід:</span>
              <span className={isPlayerTurn ? "text-green-400 font-bold" : "text-red-400"}>{isPlayerTurn ? 'ТАК' : 'НІ'}</span>
            </div>
            {/* Показываем победителя если игра завершена */}
            {gameData?.status === 'finished' && gameData?.winner && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-600">
                <span>🏆</span>
                <span className="font-medium">Переможець:</span>
                <span className="text-yellow-400 font-bold">{gameData.winner}</span>
              </div>
            )}
          </div>
        </div>

        {/* Позиции игроков */}
        {playerPositions && Object.entries(playerPositions).map(([position, player]) => (
          <div
            key={position}
            className={`absolute transition-all duration-300 ${player?.isCurrentTurn ? 'scale-110 z-50' : 'scale-100 z-10'}`}
            style={{
              left: player?.x || 0,
              top: player?.y || 0,
              transform: `translate(-50%, -50%) rotate(${player?.rotation || 0}deg)`,
              width: '120px',
              height: '160px'
            }}
          >
            <div className="relative w-full h-full flex flex-col items-center"
                 style={{ transform: `rotate(-${player?.rotation || 0}deg)` }}>
              {/* Маркер позиции */}
              <div 
                className={`absolute -top-6 left-1/2 transform -translate-x-1/2 
                  ${getPositionColor(player?.position, player?.isCurrentTurn)} 
                  px-2 py-1 rounded-full text-white text-xs font-bold 
                  border-2 shadow-lg z-10`}
              >
                {player?.position}
              </div>

              {/* Индикатор текущего хода */}
              {player?.isCurrentTurn && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm animate-bounce shadow-lg">
                    Ваш хід!
                  </div>
                </div>
              )}

              {/* Аватар с подсветкой текущего хода */}
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                player?.isCurrentTurn ? 'border-purple-400 shadow-lg shadow-purple-500/50' : 'border-gray-300'
              }`}>
                <img 
                  src={player?.avatar} 
                  alt={player?.name}
                  className={`w-full h-full object-cover ${player?.isCurrentTurn ? 'scale-110' : ''} transition-transform duration-300`}
                />
              </div>
              
              {/* Информация об игроке */}
              <div className="mt-2 flex flex-col items-center">
                {/* Имя игрока */}
                <span className={`text-white text-sm font-medium ${
                  player?.isCurrentTurn ? 'text-purple-300' : ''
                }`}>
                  {player?.name}
                </span>
                
                {/* Баланс игрока */}
                <div className={`mt-1 bg-black bg-opacity-80 px-3 py-1 rounded-md ${
                  player?.isCurrentTurn ? 'ring-2 ring-purple-500' : ''
                }`}>
                  <span className={`text-sm font-bold ${
                    (player?.chips || 1000) < 1000 ? 'text-red-400' : 
                    player?.isCurrentTurn ? 'text-purple-400' :
                    'text-yellow-400'
                  }`}>
                    {player?.chips || 1000}
                  </span>
                </div>
              </div>

              {/* Таймер хода */}
              {player?.isCurrentTurn && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-full">
                  <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 animate-timer" style={{ width: '100%' }}></div>
                  </div>
                </div>
              )}

              {/* Место для карт */}
              <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 flex gap-1">
                {/* Здесь будут карты */}
              </div>

              {/* Ставки и блайнды */}
              {(player?.currentBet > 0 || player?.position === 'SB' || player?.position === 'BB') && (
                <div 
                  className="absolute"
                  style={{
                    left: player?.betPosition.x - player?.x,
                    top: player?.betPosition.y - player?.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="flex flex-col items-center">
                    <img 
                      src={smallChips} 
                      alt="chips" 
                      className="w-12 h-12 object-contain"
                    />
                    <span className="text-white text-sm font-bold bg-black bg-opacity-80 px-2 py-1 rounded mt-1">
                      {player?.currentBet > 0 ? player?.currentBet : 
                       player?.position === 'SB' ? 10 :
                       player?.position === 'BB' ? 20 : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Банк */}
        {(gameData?.pot > 0 || gameData?.status === 'finished') && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center">
              <img 
                src={smallChips} 
                alt="pot" 
                className="w-16 h-16 object-contain"
              />
              <span className="text-white text-lg font-bold bg-black bg-opacity-60 px-3 py-1 rounded mt-2">
                POT: {gameData?.pot || 0}
              </span>
            </div>
          </div>
        )}

        {/* Панель управления игрока - смещаем левее */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4">
          {/* Контроль ставки */}
          <div className="flex items-center gap-4">
            {/* Процентные кнопки */}
            <div className="flex gap-2">
              <button
                onClick={() => setBetAmount(Math.floor(gameData?.pot * 0.33) || 100)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                33%
              </button>
              <button
                onClick={() => setBetAmount(Math.floor(gameData?.pot * 0.5) || 200)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => setBetAmount(Math.floor(gameData?.pot * 0.75) || 300)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                75%
              </button>
              <button
                onClick={() => setBetAmount(gameData?.pot || 400)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                100%
              </button>
            </div>

            {/* Слайдер ставки */}
            <div className="flex items-center gap-3">
              <span className="text-white text-sm">{betAmount}</span>
              <input
                type="range"
                min="40"
                max="1000"
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-white text-sm">1000</span>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3">
            <button
              onClick={handleFold}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              Fold
            </button>

            <button
              onClick={handleCall}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              Call 20
            </button>

            <button
              onClick={handleBet}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              Raise {betAmount}
            </button>
          </div>
        </div>
      </div>
      
      {/* Кнопка выхода */}
      <button
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg"
        onClick={handleExit}
      >
        Вийти
      </button>
    </div>
  );
}

export default PokerGame; 