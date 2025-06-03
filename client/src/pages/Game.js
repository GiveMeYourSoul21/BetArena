import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PokerPlayer from '../components/PokerPlayer';
import { ToastContainer } from 'react-toastify';
import { getCardImage } from '../utils/DeckUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

// CSS стили для ползунка
const sliderStyles = `
  .slider {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: #374151;
    border-radius: 4px;
    outline: none;
  }
  
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: #ffd700;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  
  .slider::-webkit-slider-thumb:hover {
    background: #ffed4a;
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
  }
  
  .slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background: #ffd700;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  
  .slider::-moz-range-thumb:hover {
    background: #ffed4a;
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
  }
`;

function PokerGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Состояния для логики ходов и таймера
  const [turnTimer, setTurnTimer] = useState(10);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [betAmount, setBetAmount] = useState(20); // Размер ставки
  const [currentBet, setCurrentBet] = useState(0); // Текущая максимальная ставка в игре
  const [isActionInProgress, setIsActionInProgress] = useState(false); // Блокировка множественных кликов
  
  // Состояния для анимации раздачи карт
  const [isDealing, setIsDealing] = useState(false);
  const [dealingCards, setDealingCards] = useState([]);
  const [dealingStep, setDealingStep] = useState(0);
  const [dealtCardsPerPlayer, setDealtCardsPerPlayer] = useState([0, 0, 0, 0]); // Количество карт у каждого игрока

  // Состояния для завершения игры
  const [gameFinished, setGameFinished] = useState(false);

  // Создаем уникальный ID сессии для стабильного отображения карт
  const sessionId = React.useMemo(() => gameId || Date.now().toString(), [gameId]);

  // Добавляем размеры стола
  const tableDimensions = {
    width: 1200,
    height: 700
  };

  // Обработка выхода из игры
  const handleExit = async () => {
    if (gameData && user) {
      try {
        await axios.post(`${API_URL}/api/poker/${gameId}/status`, {
          userId: user._id,
          status: "finished"
        });
        navigate('/');
      } catch (err) {
        console.error('Ошибка при виході з ігри:', err);
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  // Функция для запуска следующей игры
  const handleNextGame = async () => {
    try {
      await axios.post(`${API_URL}/api/poker/${gameId}/next-game`);
      setGameFinished(false);
    } catch (error) {
      console.error('Ошибка при запускі наступної гри:', error);
    }
  };

  // Загрузка данных игры
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/poker/${gameId}`);
        console.log('Дані ігри отримані:', response.data);
                  setGameData(response.data);
        
        // Проверяем статус игры
        if (response.data.status === 'finished' || response.data.status === 'eliminated') {
          console.log(`[CLIENT] Первоначальная загрузка: игра завершена со статусом: ${response.data.status}`);
          setGameFinished(true);
        } else {
          setGameFinished(false);
        }
        
        // Обновляем текущую ставку
        if (response.data.players && response.data.players.length > 0) {
          const maxBet = Math.max(...response.data.players.map(p => p.currentBet || 0));
          setCurrentBet(maxBet);
          
          // Устанавливаем размер ставки как минимальный рейз
          const minRaise = maxBet + (response.data.settings?.bigBlind || 20);
          setBetAmount(minRaise);
        }
        
        // Обновляем текущего игрока и проверяем чей ход
        if (response.data.currentTurn !== undefined) {
          setCurrentPlayerIndex(response.data.currentTurn);
          const currentPlayer = response.data.players[response.data.currentTurn];
          const newIsPlayerTurn = currentPlayer && 
            currentPlayer.user && 
            currentPlayer.user.toString() === user?._id && 
            !currentPlayer.folded;
          setIsPlayerTurn(newIsPlayerTurn);
          
          // Сбрасываем таймер при смене хода
          setTurnTimer(10);
        }
        
        // Запускаем анимацию раздачи карт для новой игры
        if (response.data.currentRound === 'preflop' && 
            response.data.players.some(p => p.cards && p.cards.length > 0) &&
            !isDealing) {
          startDealingAnimation(response.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузці ігри:', err);
        setError('Не вдалося загрузити ігру');
        setLoading(false);
      }
    };

    if (gameId && user) {
      fetchGameData();
    }
  }, [gameId, user]);

  // Автоматическое обновление игры для синхронизации с ходами ботов
  useEffect(() => {
    let interval;
    
    if (gameData) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/api/poker/${gameId}`);
          const newGameData = response.data;
          
          console.log('[CLIENT] Автообновление: получены данные:', {
            status: newGameData.status,
            currentRound: newGameData.currentRound,
            pot: newGameData.pot,
            currentTurn: newGameData.currentTurn,
            communityCards: newGameData.communityCards?.length || 0
          });
          
          setGameData(newGameData);
          
          // Проверяем статус игры
          if (newGameData.status === 'finished' || newGameData.status === 'eliminated') {
            if (!gameFinished) {
              console.log(`[CLIENT] Игра завершена со статусом: ${newGameData.status}`);
              setGameFinished(true);
            }
          } else if (newGameData.status === 'playing') {
            if (gameFinished) {
              console.log('[CLIENT] Игра перезапущена, переходим к новой игре');
              setGameFinished(false);
            }
          }
          
          // Обновляем текущую ставку
          if (newGameData.players && newGameData.players.length > 0) {
            const maxBet = Math.max(...newGameData.players.map(p => p.currentBet || 0));
            setCurrentBet(maxBet);
            
            // Устанавливаем размер ставки как минимальный рейз
            const minRaise = maxBet + (newGameData.settings?.bigBlind || 20);
            setBetAmount(minRaise);
          }
          
          // Обновляем состояние хода
          if (newGameData.currentTurn !== undefined) {
            setCurrentPlayerIndex(newGameData.currentTurn);
            const currentPlayer = newGameData.players[newGameData.currentTurn];
            const newIsPlayerTurn = currentPlayer && 
              currentPlayer.user && 
              currentPlayer.user.toString() === user?._id && 
              !currentPlayer.folded;
            setIsPlayerTurn(newIsPlayerTurn);
            
            // Сбрасываем таймер при смене хода
            if (newIsPlayerTurn && gameData.currentTurn !== newGameData.currentTurn) {
              setTurnTimer(10);
            }
          }
        } catch (error) {
          console.error('Ошибка при автообновленні:', error);
        }
      }, 2000); // Интервал 2 секунды
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameData?.status, gameId, user._id, gameFinished]);

  // Функция для обработки действий игрока
  const handlePlayerAction = useCallback(async (action, amount = 0) => {
    if (!isPlayerTurn) return;
    
    // ДОБАВЛЕНО: защита от множественных кликов
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/poker/${gameId}/action`, {
        userId: user._id,
        action,
        amount
      });
      
      // ДОБАВЛЕНО: проверяем перенаправление на новую игру
      if (response.data.redirectToNewGame && response.data.newGameId) {
        console.log(`[CLIENT] Игра была заменена новой ${response.data.newGameId}`);
        
        // Обновляем URL на новую игру
        window.history.replaceState(null, '', `/poker/${response.data.newGameId}`);
        
        // Сразу делаем запрос к новой игре с тем же действием
        try {
          const newResponse = await axios.post(`${API_URL}/api/poker/${response.data.newGameId}/action`, {
            userId: user._id,
            action,
            amount
          });
          
          // Обновляем данные игры
          setGameData(newResponse.data);
          console.log(`[CLIENT] Действие ${action} выполнено в новой игре`);
          
        } catch (newError) {
          console.error('[CLIENT] Ошибка при выполнении действия в новой игре:', newError);
        }
        
        return;
      }
      
      // Обновляем данные игры
      setGameData(response.data);
      
      // Обновляем текущую ставку
      if (response.data.players && response.data.players.length > 0) {
        const maxBet = Math.max(...response.data.players.map(p => p.currentBet || 0));
        setCurrentBet(maxBet);
        
        // Устанавливаем размер ставки как минимальный рейз
        const minRaise = maxBet + (response.data.settings?.bigBlind || 20);
        setBetAmount(minRaise);
      }
      
      // Обновляем состояние хода
      if (response.data.currentTurn !== undefined) {
        setCurrentPlayerIndex(response.data.currentTurn);
        const currentPlayer = response.data.players[response.data.currentTurn];
        const newIsPlayerTurn = currentPlayer && 
          currentPlayer.user && 
          currentPlayer.user.toString() === user?._id && 
          !currentPlayer.folded;
        setIsPlayerTurn(newIsPlayerTurn);
      }
      
      // Сбрасываем таймер
      setTurnTimer(10);
      
      console.log(`Ігрок зробив ${action}`, response.data);
      
    } catch (error) {
      console.error('Ошибка при виконанні дії:', error);
      
      // Показываем сообщение об ошибке пользователю
      if (error.response?.data?.message) {
        console.warn('Сервер вернул ошибку:', error.response.data.message);
      }
    } finally {
      // ДОБАВЛЕНО: сбрасываем флаг блокировки через небольшую задержку
      setTimeout(() => {
        setIsActionInProgress(false);
      }, 1000);
    }
  }, [isPlayerTurn, gameId, user._id]);

  // Таймер для хода игрока
  useEffect(() => {
    let interval;
    
    // ИСПРАВЛЕНО: таймер работает для ВСЕХ игроков, не только для человека
    if (gameData && gameData.status === 'playing' && gameData.currentTurn !== undefined) {
      const currentPlayer = gameData.players[gameData.currentTurn];
      const isCurrentPlayerTurn = currentPlayer && !currentPlayer.folded;
      
      if (isCurrentPlayerTurn) {
        interval = setInterval(() => {
          setTurnTimer(prev => {
            if (prev <= 1) {
              // Если это человек - автоматический fold
              if (currentPlayer.user && currentPlayer.user.toString() === user?._id) {
                handlePlayerAction('fold');
              }
              return 30; // Сброс таймера
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameData?.currentTurn, gameData?.status, user?._id]);

  // Функция присоединения к игре
  const handleJoinGame = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/poker/${gameId}/join`, {
        userId: user._id,
        username: user.username
      });
      
      if (response.data) {
        setGameData(response.data);
      }
    } catch (error) {
      console.error('Ошибка при приєднанні до гри:', error);
      setError('Не вдалося приєднатися до гри');
    }
  };

  // Функция для расчета позиций игроков - теперь берем из БД
  const getPlayerPositions = () => {
    if (!gameData?.players) return {};
    
    const positions = {};
    
    // Просто берем позиции из базы данных
    gameData.players.forEach((player, index) => {
      positions[index] = {
        isDealer: player.isDealer || false,
        isSmallBlind: player.isSmallBlind || false,
        isBigBlind: player.isBigBlind || false,
        isUTG: player.isUTG || false
      };
    });
    
    return positions;
  };

  // Функция для получения фиксированных позиций игроков на столе
  const getFixedPlayerPosition = (playerId) => {
    if (!gameData?.players || !user?._id) return null;
    
    // Находим индекс реального игрока
    const realPlayerIndex = gameData.players.findIndex(p => 
      p.user && p.user.toString() === user._id
    );
    
    if (realPlayerIndex === -1) return null;
    
    // Находим индекс текущего игрока
    const currentPlayerIndex = gameData.players.findIndex(p => 
      p._id === playerId || p.user?.toString() === playerId
    );
    
    if (currentPlayerIndex === -1) return null;
    
    // Вычисляем относительную позицию
    let relativePosition = (currentPlayerIndex - realPlayerIndex + gameData.players.length) % gameData.players.length;
    
    // Фиксированные позиции: 0 = снизу (игрок), 1 = слева, 2 = сверху, 3 = справа
    const positionMap = {
      0: 'player',    // снизу - всегда реальный игрок
      1: 'leftBot',   // слева
      2: 'topBot',    // сверху  
      3: 'rightBot'   // справа
    };
    
    return positionMap[relativePosition] || null;
  };

  // Получаем игроков для каждой фиксированной позиции
  const getPlayerAtPosition = (positionName) => {
    if (!gameData?.players || !user?._id) return null;
    
    const realPlayerIndex = gameData.players.findIndex(p => 
      p.user && p.user.toString() === user._id
    );
    
    if (realPlayerIndex === -1) return null;
    
    const positionOffset = {
      'player': 0,
      'leftBot': 1,
      'topBot': 2,
      'rightBot': 3
    };
    
    const targetIndex = (realPlayerIndex + positionOffset[positionName]) % gameData.players.length;
    return gameData.players[targetIndex] || null;
  };

  // Получаем позиции для всех игроков
  const playerPositions = getPlayerPositions();

  // Функция анимации раздачи карт
  const startDealingAnimation = (gameData) => {
    if (!gameData || !gameData.players) return;
    
    setIsDealing(true);
    setDealingStep(0);
    setDealtCardsPerPlayer([0, 0, 0, 0]); // Сбрасываем счетчик карт
    
    // Найдем позицию дилера
    const dealerIndex = gameData.players.findIndex(p => p.isDealer);
    if (dealerIndex === -1) return;
    
    // Создаем массив карт для раздачи (по 2 карты каждому игроку)
    const cardsToDeaL = [];
    for (let round = 0; round < 2; round++) {
      for (let playerIndex = 0; playerIndex < gameData.players.length; playerIndex++) {
        cardsToDeaL.push({
          targetPlayer: playerIndex,
          round: round,
          delay: (round * gameData.players.length + playerIndex) * 200 // 200мс между картами
        });
      }
    }
    
    setDealingCards(cardsToDeaL);
    
    // Запускаем анимацию с задержками
    cardsToDeaL.forEach((card, index) => {
            setTimeout(() => {
        setDealingStep(index + 1);
        
        // Обновляем количество карт у игрока
        setDealtCardsPerPlayer(prev => {
          const newCounts = [...prev];
          newCounts[card.targetPlayer] = Math.min(newCounts[card.targetPlayer] + 1, 2);
          return newCounts;
        });
        
        // Когда все карты розданы - завершаем анимацию
        if (index === cardsToDeaL.length - 1) {
          setTimeout(() => {
            setIsDealing(false);
            setDealingCards([]);
            setDealingStep(0);
            // НЕ сбрасываем dealtCardsPerPlayer - оставляем [2,2,2,2]
          }, 500); // Задержка перед скрытием анимации
        }
      }, card.delay);
    });
  };

  // Показываем загрузку
  if (loading) {
  return (
      <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка игры...</div>
          </div>
    );
  }

  // Показываем ошибку
  if (error) {
  return (
      <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
            <button 
          onClick={() => navigate('/')}
          className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
          На головну
            </button>
          </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden flex items-center justify-center">
      {/* CSS стили для ползунка */}
      <style>{sliderStyles}</style>
      
      <ToastContainer />
      
      {/* Кнопки управления - правый верхний угол */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        {/* Кнопка следующей игры - показываем только когда игра завершена */}
        {gameFinished && gameData && gameData.status === 'finished' && (
          <button 
            onClick={handleNextGame}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold"
          >
            Наступна гра
          </button>
        )}
        
        {/* Кнопка выхода */}
        <button 
          onClick={handleExit}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Вийти
        </button>
      </div>
      
      {/* Информация о игре - перенесена в левый верхний угол */}
        {gameData && (
        <div className="absolute top-4 left-4 z-50">
          <div className="bg-black bg-opacity-70 rounded-lg p-3 text-white text-sm">
            <div className="font-bold">💰 Банк: {gameData.pot || 0}</div>
            <div>🎯 Раунд: {gameData.currentRound || 'preflop'}</div>
            <div>📊 Статус: {gameData.status === 'finished' ? 'завершено' : gameData.status === 'playing' ? 'грає' : 'очікує'}</div>
            
            {/* Информация о победителе */}
            {gameFinished && gameData.winner && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-yellow-400 font-bold">🏆 Переможець: {gameData.winner}</div>
                {gameData.winningHand && (
                  <div className="text-xs text-gray-300">{gameData.winningHand}</div>
                )}
              </div>
            )}
            
            {gameData.settings && (
              <div className="text-xs mt-1">
                SB: {gameData.settings.smallBlind} / BB: {gameData.settings.bigBlind}
                </div>
              )}
            {/* Отладочная информация */}
            <div className="text-xs mt-2 text-yellow-300">
              Дилер: {gameData.dealerPosition !== undefined ? gameData.dealerPosition : 'не визначено'}
            </div>
            <div className="text-xs text-green-300">
              Поточний хід: {gameData.currentTurn !== undefined ? gameData.currentTurn : 'не визначено'}
            </div>
            <div className="text-xs text-blue-300">
              Мій хід: {isPlayerTurn ? 'ТАК' : 'НІ'}
            </div>

            </div>
          </div>
        )}

      {/* Покерный стол */}
        <div
        className="relative rounded-[100px] shadow-2xl"
                    style={{
          width: tableDimensions.width,
          height: tableDimensions.height,
            backgroundImage: 'url(/BG/poker-table_no_fone.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
          border: '6px solid #2D2D2D'
        }}
      >
        {/* Банк стола - в центре */}
        {gameData && (gameData.pot > 0 || gameData.status === 'finished') && (
          <div className="absolute top-[18%] left-[34%] transform -translate-x-1/2 z-40">
            <div className="bg-gray-800 bg-opacity-80 text-white text-lg font-bold px-4 py-2 rounded-full shadow-lg border border-gray-600">
              POT: {gameData.pot || 0}
              </div>
                </div>
              )}
        {/* Игрок (реальный игрок) - снизу */}
        {(() => {
          const player = getPlayerAtPosition('player');
          if (!player) return null;
          const playerIndex = gameData.players.findIndex(p => p._id === player._id || p.user?.toString() === player.user?.toString());
          return (
            <div className="absolute bottom-[15%] left-1/2 transform -translate-x-1/2">
                  <PokerPlayer 
                player={{
                  ...player,
                  username: user?.username || player.username || 'Player'
                }}
                isSelf={!player.isBot}
                cards={!player.isBot ? player.cards || [] : []}
                angle={0}
                isDealer={playerPositions[playerIndex]?.isDealer || false}
                isSmallBlind={playerPositions[playerIndex]?.isSmallBlind || false}
                isBigBlind={playerPositions[playerIndex]?.isBigBlind || false}
                isUTG={playerPositions[playerIndex]?.isUTG || false}
                isCurrentTurn={gameData?.currentTurn === playerIndex}
                turnTimer={gameData?.currentTurn === playerIndex ? turnTimer : 10}
                gameStatus={gameData?.status || 'playing'}
                isWinner={gameData?.winner === player.username}
                winningCards={player.winningCards || []}
                dealtCardsCount={dealtCardsPerPlayer[playerIndex] || 2}
                showdown={gameData?.showdown || false}
                  />
                </div>
          );
        })()}
              
        {/* Bot 1 - слева */}
        {(() => {
          const player = getPlayerAtPosition('leftBot');
          if (!player) return null;
          const playerIndex = gameData.players.findIndex(p => p._id === player._id);
          return (
            <div className="absolute left-[5%] top-1/2 transform -translate-y-1/2">
                  <PokerPlayer 
                player={player}
                    isSelf={false} 
                cards={player.cards || []}
                angle={90}
                isDealer={playerPositions[playerIndex]?.isDealer || false}
                isSmallBlind={playerPositions[playerIndex]?.isSmallBlind || false}
                isBigBlind={playerPositions[playerIndex]?.isBigBlind || false}
                isUTG={playerPositions[playerIndex]?.isUTG || false}
                isCurrentTurn={gameData?.currentTurn === playerIndex}
                turnTimer={gameData?.currentTurn === playerIndex ? turnTimer : 10}
                gameStatus={gameData?.status || 'playing'}
                isWinner={gameData?.winner === player.username}
                winningCards={player.winningCards || []}
                dealtCardsCount={dealtCardsPerPlayer[playerIndex] || 2}
                showdown={gameData?.showdown || false}
                  />
                </div>
          );
        })()}
              
        {/* Bot 2 - сверху */}
        {(() => {
          const player = getPlayerAtPosition('topBot');
          if (!player) return null;
          const playerIndex = gameData.players.findIndex(p => p._id === player._id);
          return (
            <div className="absolute top-[5%] left-1/2 transform -translate-x-1/2">
                  <PokerPlayer 
                player={player}
                    isSelf={false} 
                cards={player.cards || []}
                angle={180}
                isDealer={playerPositions[playerIndex]?.isDealer || false}
                isSmallBlind={playerPositions[playerIndex]?.isSmallBlind || false}
                isBigBlind={playerPositions[playerIndex]?.isBigBlind || false}
                isUTG={playerPositions[playerIndex]?.isUTG || false}
                isCurrentTurn={gameData?.currentTurn === playerIndex}
                turnTimer={gameData?.currentTurn === playerIndex ? turnTimer : 10}
                gameStatus={gameData?.status || 'playing'}
                isWinner={gameData?.winner === player.username}
                winningCards={player.winningCards || []}
                dealtCardsCount={dealtCardsPerPlayer[playerIndex] || 2}
                showdown={gameData?.showdown || false}
                  />
                </div>
          );
        })()}
              
        {/* Bot 3 - справа */}
        {(() => {
          const player = getPlayerAtPosition('rightBot');
          if (!player) return null;
          const playerIndex = gameData.players.findIndex(p => p._id === player._id);
          return (
            <div className="absolute right-[5%] top-1/2 transform -translate-y-1/2">
                  <PokerPlayer 
                player={player}
                    isSelf={false} 
                cards={player.cards || []}
                angle={270}
                isDealer={playerPositions[playerIndex]?.isDealer || false}
                isSmallBlind={playerPositions[playerIndex]?.isSmallBlind || false}
                isBigBlind={playerPositions[playerIndex]?.isBigBlind || false}
                isUTG={playerPositions[playerIndex]?.isUTG || false}
                isCurrentTurn={gameData?.currentTurn === playerIndex}
                turnTimer={gameData?.currentTurn === playerIndex ? turnTimer : 10}
                gameStatus={gameData?.status || 'playing'}
                isWinner={gameData?.winner === player.username}
                winningCards={player.winningCards || []}
                dealtCardsCount={dealtCardsPerPlayer[playerIndex] || 2}
                showdown={gameData?.showdown || false}
                  />
                </div>
          );
        })()}
              
        {/* Общие карты */}
        {gameData?.communityCards && gameData.communityCards.length > 0 && (
          <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 flex gap-2">
            {gameData.communityCards.map((card, index) => (
              <img
                key={index}
                src={getCardImage(card)}
                alt={`${card.value}${card.suit}`}
                className="w-16 h-24 rounded shadow-lg border border-gray-300 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                }}
              />
            ))}
                </div>
              )}
              
        {/* Анимация раздачи карт */}
        {isDealing && dealingCards.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-50">
            {dealingCards.slice(0, dealingStep).map((cardInfo, index) => {
              // Определяем позиции
              const dealerPosition = getPlayerAtPosition('player') ? { x: '50%', y: '85%' } : 
                                   getPlayerAtPosition('leftBot') ? { x: '15%', y: '50%' } :
                                   getPlayerAtPosition('topBot') ? { x: '50%', y: '15%' } :
                                   { x: '85%', y: '50%' }; // rightBot
              
              // Определяем целевую позицию
              const targetPositions = {
                0: { x: '50%', y: '85%' }, // player
                1: { x: '15%', y: '50%' }, // leftBot  
                2: { x: '50%', y: '15%' }, // topBot
                3: { x: '85%', y: '50%' }  // rightBot
              };
              
              const targetPos = targetPositions[cardInfo.targetPlayer] || { x: '50%', y: '50%' };
              
              return (
                <div
                  key={`dealing-${index}`}
                  className="absolute w-12 h-16 transition-all duration-500 ease-out"
                  style={{
                    left: dealerPosition.x,
                    top: dealerPosition.y,
                    transform: 'translate(-50%, -50%)',
                    animation: `dealCard-${cardInfo.targetPlayer} 0.5s ease-out forwards`,
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <img
                    src="/cards/back.png"
                    alt="Раздаваемая карта"
                    className="w-full h-full rounded shadow-lg border border-gray-300"
                    style={{
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                </div>
              );
            })}
            </div>
          )}
      </div>
      
      {/* CSS анимации для раздачи карт */}
      <style>{`
        @keyframes dealCard-0 {
          to {
            left: 50%;
            top: 85%;
          }
        }
        @keyframes dealCard-1 {
          to {
            left: 15%;
            top: 50%;
          }
        }
        @keyframes dealCard-2 {
          to {
            left: 50%;
            top: 15%;
          }
        }
        @keyframes dealCard-3 {
          to {
            left: 85%;
            top: 50%;
          }
        }
      `}</style>
      
      {/* Кнопка присоединения к игре */}
      {gameData?.status === 'waiting' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <button 
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            onClick={handleJoinGame}
                  >
            Приєднатися до ігри
                  </button>
                  </div>
          )}
          
      {/* Панель управления - снизу справа */}
      {gameData?.status === 'playing' && (
        <div className="absolute bottom-32 right-6 flex flex-col items-end gap-3 z-40">
          {/* Кнопки быстрых ставок в процентах */}
          <div className="grid grid-cols-4 gap-2">
            {[33, 50, 75, 100].map(percent => {
              const currentPlayer = gameData.players[gameData.currentTurn];
              const playerChips = currentPlayer.chips;
              const maxPossibleBet = Math.min(currentPlayer.currentBet + playerChips, 1000); // Ограничиваем 1000
              const potBet = Math.floor((percent / 100) * playerChips);
              const minRaise = currentBet + 20;
              const maxPlayerBet = Math.min(Math.max(potBet + currentPlayer.currentBet, minRaise), maxPossibleBet);
              const isDisabled = !isPlayerTurn || currentPlayer.folded || playerChips === 0 || maxPlayerBet < minRaise;
              return (
                  <button 
                  key={percent}
                  onClick={() => !isDisabled && setBetAmount(maxPlayerBet)}
                  disabled={isDisabled}
                  className={`text-white text-xs font-bold py-2 px-3 rounded-lg transition-all ${
                    isDisabled 
                      ? 'bg-gray-800 opacity-50 cursor-not-allowed' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {percent}%
                  </button>
              );
            })}
                </div>

          {/* Ползунок ставки без фона и текста */}
          <div className="flex items-center gap-3 min-w-80">
            <span className="text-white text-sm">{currentBet + 20}</span>
                      <input 
                        type="range" 
              min={currentBet + 20}
              max={Math.min(gameData.players[gameData.currentTurn].currentBet + gameData.players[gameData.currentTurn].chips, 1000)}
              step="10"
                        value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
              disabled={!isPlayerTurn || gameData.players[gameData.currentTurn].folded || gameData.players[gameData.currentTurn].chips === 0}
              className={`flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider ${
                (!isPlayerTurn || gameData.players[gameData.currentTurn].folded || gameData.players[gameData.currentTurn].chips === 0) ? 'opacity-50' : ''
              }`}
              style={{
                background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${((betAmount-(currentBet+20))/(Math.min(gameData.players[gameData.currentTurn].currentBet + gameData.players[gameData.currentTurn].chips, 1000)-(currentBet+20)))*100}%, #374151 ${((betAmount-(currentBet+20))/(Math.min(gameData.players[gameData.currentTurn].currentBet + gameData.players[gameData.currentTurn].chips, 1000)-(currentBet+20)))*100}%, #374151 100%)`
              }}
            />
            <span className="text-white text-sm">{Math.min(gameData.players[gameData.currentTurn].currentBet + gameData.players[gameData.currentTurn].chips, 1000)}</span>
                      </div>

          {/* Кнопки действий */}
          <div className="flex gap-2">
                      <button 
              onClick={() => handlePlayerAction('fold')}
              disabled={!isPlayerTurn || gameData.players[gameData.currentTurn].folded || isActionInProgress}
              className={`text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ${
                (!isPlayerTurn || gameData.players[gameData.currentTurn].folded || isActionInProgress)
                  ? 'bg-gray-800 opacity-50 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 hover:scale-105'
              }`}
            >
              {isActionInProgress ? '...' : 'Fold'}
                      </button>

            {/* Показываем Check только если текущая ставка игрока равна максимальной */}
            {gameData.players[gameData.currentTurn].currentBet === currentBet ? (
                      <button 
                onClick={() => handlePlayerAction('check')}
                disabled={!isPlayerTurn || gameData.players[gameData.currentTurn].folded || isActionInProgress}
                className={`text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ${
                  (!isPlayerTurn || gameData.players[gameData.currentTurn].folded || isActionInProgress)
                    ? 'bg-gray-800 opacity-50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                }`}
              >
                {isActionInProgress ? '...' : 'Check'}
                      </button>
                ) : (
            <button
                onClick={() => handlePlayerAction('call')}
                disabled={!isPlayerTurn || gameData.players[gameData.currentTurn].folded || gameData.players[gameData.currentTurn].chips < (currentBet - gameData.players[gameData.currentTurn].currentBet) || isActionInProgress}
                className={`text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ${
                  (!isPlayerTurn || gameData.players[gameData.currentTurn].folded || gameData.players[gameData.currentTurn].chips < (currentBet - gameData.players[gameData.currentTurn].currentBet) || isActionInProgress)
                    ? 'bg-gray-800 opacity-50 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                }`}
              >
                {isActionInProgress ? '...' : `Call ${currentBet - gameData.players[gameData.currentTurn].currentBet}`}
            </button>
            )}

            <button
              onClick={() => handlePlayerAction('bet', Math.min(betAmount, gameData.players[gameData.currentTurn].currentBet + gameData.players[gameData.currentTurn].chips))}
              disabled={!isPlayerTurn || gameData.players[gameData.currentTurn].folded || gameData.players[gameData.currentTurn].chips === 0 || isActionInProgress}
              className={`text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ${
                (!isPlayerTurn || gameData.players[gameData.currentTurn].folded || gameData.players[gameData.currentTurn].chips === 0 || isActionInProgress)
                  ? 'bg-gray-800 opacity-50 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 hover:scale-105'
              }`}
            >
              {isActionInProgress ? '...' : `${currentBet > 0 ? 'Raise' : 'Bet'} ${Math.min(betAmount, gameData.players[gameData.currentTurn].currentBet + gameData.players[gameData.currentTurn].chips)}`}
            </button>
            </div>
                  </div>
        )}
    </div>
  );
}

export default PokerGame; 
