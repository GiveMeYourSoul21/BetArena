import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PokerPlayer from '../components/PokerPlayer';
import { ToastContainer } from 'react-toastify';
import { getCardImage } from '../utils/DeckUtils';
import { API_URL } from '../config/api';

// CSS стилі для повзунка
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
  
  // Стани для логіки ходів та таймера
  const [turnTimer, setTurnTimer] = useState(10);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [betAmount, setBetAmount] = useState(20); // Розмір ставки
  const [currentBet, setCurrentBet] = useState(0); // Поточна максимальна ставка в грі
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  
  // Стани для анімації роздачі карт
  const [isDealing, setIsDealing] = useState(false);
  const [dealingCards, setDealingCards] = useState([]);
  const [dealingStep, setDealingStep] = useState(0);
  const [dealtCardsPerPlayer, setDealtCardsPerPlayer] = useState([0, 0, 0, 0]); // Кількість карт у кожного гравця

  // Стани для завершення гри
  const [gameFinished, setGameFinished] = useState(false);

  // Створюємо унікальний ID сесії для стабільного відображення карт
  const sessionId = React.useMemo(() => gameId || Date.now().toString(), [gameId]);

  // Додаємо розміри столу
  const tableDimensions = {
    width: 1200,
    height: 700
  };

  // Стани для управління грою
  const [showCards, setShowCards] = useState({});

  // ДОДАНО: Ref для таймера
  const timerIntervalRef = useRef(null);

  // Ефект для управління таймером ходу
  useEffect(() => {
    // ІСПРАВЛЕНО: Повністю переписана логіка таймера
    
    // Очищаємо попередній таймер
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Перевіряємо чи потрібно запускати таймер
    if (gameData && gameData.status === 'playing' && gameData.settings?.currentTurn !== undefined && !isActionInProgress) {
      const currentPlayer = gameData.players[gameData.settings.currentTurn];
      const isRealPlayerTurn = currentPlayer && 
        currentPlayer.username === user?.username && 
        !currentPlayer.folded && 
        !currentPlayer.hasActed &&
        !currentPlayer.isBot;
      
      // ІСПРАВЛЕНО: запускаємо таймер ТІЛЬКИ для реального гравця і тільки раз
      if (isRealPlayerTurn && !timerIntervalRef.current) {
        console.log(`[CLIENT] 🕐 Запускаємо таймер для гравця ${currentPlayer.username} на 10 секунд`);
        setTurnTimer(10); // Встановлюємо час
        
        timerIntervalRef.current = setInterval(() => {
          setTurnTimer(prev => {
            if (prev <= 1) {
              console.log(`[CLIENT] ⏰ Час вийшов для гравця ${currentPlayer.username}, автоматичний fold`);
              // Зупиняємо таймер перед дією
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
              
              // Автоматичний fold
              handlePlayerAction('fold');
              
              return 10; // Скидання таймера
            }
            return prev - 1;
          });
        }, 1000);
      } else if (!isRealPlayerTurn && timerIntervalRef.current) {
        // Якщо хід НЕ реального гравця - зупиняємо таймер
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        setTurnTimer(10);
      }
    } else if (timerIntervalRef.current) {
      // Гра не активна або виконується дія - зупиняємо таймер
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setTurnTimer(10);
    }

    // Очистка при розмонтуванні компонента
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameData?.settings?.currentTurn, gameData?.status, user?.username, isActionInProgress]); // ПРИБРАЛИ turnTimer з залежностей!

  // Обробка виходу з гри
  const handleExit = async () => {
    if (gameData && user) {
      try {
        const response = await axios.post(`${API_URL}/api/poker/${gameId}/leave`, {
          userId: user.username
        });
        
        if (response.data.success) {
          navigate('/');
        }
      } catch (error) {
        console.error('Помилка при виході з гри:', error);
      }
    }
  };

  // Функція для запуску наступної гри
  const handleNextGame = async () => {
    try {
      console.log(`[CLIENT] ================ ЗАПИТ НАСТУПНОЇ ГРИ ================`);
      console.log(`[CLIENT] Поточна гра: ${gameId}, статус: ${gameData?.status}`);
      
      const response = await axios.post(`${API_URL}/api/poker/${gameId}/next-game`);
      
      console.log(`[CLIENT] ================ ВІДПОВІДЬ ОТРИМАНА ================`);
      console.log(`[CLIENT] Success:`, response.data.success);
      console.log(`[CLIENT] Нова гра ID:`, response.data.gameId);
      
      if (response.data.success && response.data.gameId) {
        // Перенаправляємо на нову гру
        console.log(`[CLIENT] 🔄 Перенаправлення на нову гру: ${response.data.gameId}`);
        navigate(`/game/${response.data.gameId}`);
      } else {
        console.error('[CLIENT] ❌ Не вдалося отримати ID нової гри');
        // ІСПРАВЛЕНО: Обробка випадку коли гра не може продовжитися
        if (response.data.canContinue === false) {
          console.log('[CLIENT] 🏆 Гра завершена - недостатньо гравців для продовження');
          setError('Гра завершена. Недостатньо гравців для продовження.');
        } else {
          setError('Не вдалося створити нову гру');
        }
      }
    } catch (error) {
      console.error('[CLIENT] ❌ Помилка при створенні наступної гри:', error);
      
      // Обробка різних типів помилок
      if (error.response?.status === 400) {
        setError(error.response.data.message || 'Неможливо створити нову гру');
      } else if (error.response?.status === 404) {
        setError('Гру не знайдено');
      } else {
        setError('Помилка сервера при створенні нової гри');
      }
    }
  };

  // Завантаження даних гри
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        console.log(`[CLIENT] Завантаження даних гри: ${gameId}`);
        
        const response = await axios.get(`${API_URL}/api/poker/${gameId}`);
        
        if (response.data) {
          setGameData(response.data);
          
          // Перевіряємо статус гри
          if (response.data.status === 'finished' || response.data.status === 'eliminated') {
            console.log(`[CLIENT] Первинне завантаження: гра завершена зі статусом: ${response.data.status}`);
            setGameFinished(true);
          }
          
          // Оновлюємо поточну ставку
          if (response.data.players && response.data.players.length > 0) {
            const maxBet = Math.max(...response.data.players.map(p => p.currentBet || 0));
            setCurrentBet(maxBet);
            
            // Встановлюємо розмір ставки як мінімальний рейз
            const minRaise = maxBet + (response.data.settings?.bigBlind || 20);
            setBetAmount(minRaise);
          }
          
          // Оновлюємо поточного гравця і перевіряємо чий хід
          if (response.data.currentTurn !== undefined) {
            setCurrentPlayerIndex(response.data.currentTurn);
            const currentPlayer = response.data.players[response.data.currentTurn];
            const newIsPlayerTurn = currentPlayer && 
              currentPlayer.username === user?.username && 
              !currentPlayer.folded && 
              !currentPlayer.hasActed;
            setIsPlayerTurn(newIsPlayerTurn);
            
            // Скидаємо таймер при зміні ходу
            setTurnTimer(10);
            
            // Автоматично запускаємо бота якщо зараз його хід
            if (currentPlayer && currentPlayer.isBot && !currentPlayer.folded && !currentPlayer.hasActed && response.data.status === 'playing') {
              console.log(`[CLIENT] Запускаємо першого бота ${currentPlayer.username}`);
              setTimeout(async () => {
                try {
                  await axios.post(`${API_URL}/api/poker/${gameId}/bot-action`);
                  console.log(`[CLIENT] Перший бот ${currentPlayer.username} запущений`);
                } catch (error) {
                  console.error('[CLIENT] Помилка при запуску першого бота:', error);
                }
              }, 2000); // Затримка 2 секунди при першому завантаженні
            }
          }
          
          // Запускаємо анімацію роздачі карт для нової гри
          if (response.data.currentRound === 'preflop' && 
              response.data.players.some(p => p.cards && p.cards.length > 0) &&
              !isDealing) {
            console.log('[CLIENT] Запускаємо анімацію роздачі карт');
            startDealingAnimation(response.data);
          }
        } else {
          setError('Дані гри не знайдено');
        }
      } catch (error) {
        console.error('Помилка завантаження гри:', error);
        setError('Помилка завантаження гри');
      } finally {
        setLoading(false);
      }
    };

    if (gameId && user) {
      fetchGameData();
    }
  }, [gameId, user]);

  // Автоматичне оновлення гри для синхронізації з ходами ботів
  useEffect(() => {
    if (!gameId || !user?.username) return;

    const interval = setInterval(async () => {
      // Автооновлюємо дані, тільки якщо гра активна і не йде дія
      if (gameData && gameData.status === 'playing' && !isActionInProgress) {
        console.log(`[CLIENT] Автооновлення: запит до гри ${gameId}`);
        try {
          const response = await axios.get(`${API_URL}/api/poker/${gameId}`);
          const newGameData = response.data;
          
          console.log(`[CLIENT] Автооновлення: отримано дані`, {
            status: newGameData.status,
            currentTurn: newGameData.settings?.currentTurn,
            currentRound: newGameData.settings?.currentRound
          });
          
          // ІСПРАВЛЕНО: перевіряємо що нові дані коректні перед оновленням
          if (newGameData.players && newGameData.players.length > 0 && newGameData.settings) {
            setGameData(newGameData);
            
            // Перевіряємо чи змінився раунд
            if (gameData.settings?.currentRound !== newGameData.settings?.currentRound) {
              console.log(`[CLIENT] Зміна раунду: ${gameData.settings?.currentRound} → ${newGameData.settings?.currentRound}`);
            }
          }
          
          // ІСПРАВЛЕНО: Перевіряємо статус гри і зупиняємо автооновлення для завершених ігор
          if (newGameData.status === 'finished' || newGameData.status === 'eliminated') {
            if (!gameFinished) {
              console.log(`[CLIENT] Автооновлення: гра завершена зі статусом: ${newGameData.status}`);
              setGameFinished(true);
            }
            clearInterval(interval);
            return;
          }
          
          // Оновлюємо поточну ставку
          if (newGameData.players && newGameData.players.length > 0) {
            const maxBet = Math.max(...newGameData.players.map(p => p.currentBet || 0));
            setCurrentBet(maxBet);
            
            // Встановлюємо розмір ставки як мінімальний рейз
            const minRaise = maxBet + (newGameData.settings?.bigBlind || 20);
            setBetAmount(minRaise);
          }
          
          // Оновлюємо стан ходу
          if (newGameData.currentTurn !== undefined) {
            setCurrentPlayerIndex(newGameData.currentTurn);
            const currentPlayer = newGameData.players[newGameData.currentTurn];
            const newIsPlayerTurn = currentPlayer && 
              currentPlayer.username === user?.username && 
              !currentPlayer.folded && 
              !currentPlayer.hasActed;
            setIsPlayerTurn(newIsPlayerTurn);
            
            // Скидаємо таймер при зміні ходу
            if (newIsPlayerTurn && gameData.currentTurn !== newGameData.currentTurn) {
              setTurnTimer(10);
            }
            
            // Автоматично запускаємо бота якщо зараз його хід
            if (currentPlayer && currentPlayer.isBot && !currentPlayer.folded && !currentPlayer.hasActed && newGameData.status === 'playing') {
              console.log(`[CLIENT] Запускаємо бота ${currentPlayer.username}`);
              setTimeout(async () => {
                // ІСПРАВЛЕНО: Додаткова перевірка статусу гри перед запуском бота
                const gameStatus = await axios.get(`${API_URL}/api/poker/${gameId}`);
                if (gameStatus.data.status !== 'playing') {
                  console.log('[CLIENT] Гра більше не активна, скасовуємо запуск бота');
                  return;
                }
                
                await axios.post(`${API_URL}/api/poker/${gameId}/bot-action`);
                console.log(`[CLIENT] Бот ${currentPlayer.username} запущений`);
              }, 2000); // Затримка 2 секунда
            }
          }
        } catch (error) {
          console.error('[CLIENT] Помилка автооновлення:', error);
        }
      }
    }, 2000); // затримка 2 секунди

    return () => clearInterval(interval);
  }, [gameData?.status, gameId, user?.username, gameFinished]);

  // Обробка дій гравця
  const handlePlayerAction = useCallback(async (action, amount = 0) => {
    console.log(`[CLIENT] ================ ВІДПРАВКА ДІЇ ================`);
    
    // ПОСИЛЕНА ЗАХИСТ ВІД ДУБЛЮЮЧИХ ЗАПИТІВ
    
    // 1. Перевіряємо що гравець не зробив fold
    if (gameData?.players) {
      const currentPlayer = gameData.players.find(p => p.username === user?.username);
      if (currentPlayer?.folded) {
        console.warn('[CLIENT] ⚠️ Гравець вже зробив fold');
        return;
      }
      
      // Перевіряємо що це хід цього гравця
      const activePlayer = gameData.players[gameData.settings?.currentTurn];
      if (!activePlayer || activePlayer.username !== user?.username) {
        console.warn('[CLIENT] ⚠️ Зараз не хід цього гравця');
        return;
      }
      
      // Перевіряємо що гравець ще не зробив дію в цьому раунді
      if (activePlayer.hasActed) {
        console.warn('[CLIENT] ⚠️ Гравець вже зробив дію в цьому раунді');
        return;
      }
    }
    
    // 2. Перевіряємо загальне блокування дій
    if (isActionInProgress) {
      console.warn('[CLIENT] ⚠️ Інша дія вже виконується');
      return;
    }
    
    // 3. Більш строга часова захист - 2 секунди між діями
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;
    if (timeSinceLastAction < 2000) {
      console.warn(`[CLIENT] ⚠️ Дія заблокована. Останнє дія була ${timeSinceLastAction}мс тому`);
      return;
    }

    try {
      // ВСТАНОВЛЮЄМО БЛОКУВАННЯ
      setIsActionInProgress(true);
      setLastActionTime(now);
      
      console.log(`[CLIENT] Відправляємо дію: ${action}, сума: ${amount}`);
      console.log(`[CLIENT] URL: ${API_URL}/api/poker/${gameId}/action`);
      console.log(`[CLIENT] Дані запиту:`, {
        action,
        amount,
        userId: user?.username
      });

      const response = await axios.post(`${API_URL}/api/poker/${gameId}/action`, {
        action,
        amount,
        userId: user?.username
      });

      console.log(`[CLIENT] ================ ВІДПОВІДЬ ОТРИМАНА ================`);
      console.log(`[CLIENT] Статус відповіді:`, response.status);
      console.log(`[CLIENT] Повні дані відповіді:`, response.data);

      // ДОДАНО: перевіряємо перенаправлення на нову гру
      if (response.data.redirectToNewGame && response.data.newGameId) {
        console.log(`[CLIENT] Гра була замінена новою ${response.data.newGameId}`);
        
        // Оновлюємо URL на нову гру
        window.history.replaceState(null, '', `/poker/${response.data.newGameId}`);
        
        // Одразу робимо запит до нової гри з тією ж дією
        try {
          const newResponse = await axios.post(`${API_URL}/api/poker/${response.data.newGameId}/action`, {
            action,
            amount,
            userId: user?.username
          });
          
          // Оновлюємо дані гри
          setGameData(newResponse.data);
          console.log(`[CLIENT] Дія ${action} виконана в новій грі`);
          
        } catch (newError) {
          console.error('[CLIENT] Помилка при виконанні дії в новій грі:', newError);
        }
        
        return;
      }
      
      // ІСПРАВЛЕНО: перевіряємо що отримали коректні дані
      if (response.data && response.data.players && response.data.settings) {
        setGameData(response.data);
        console.log(`[CLIENT] Дані гри оновлені після дії`);
      } else {
        console.warn('[CLIENT] ⚠️ Отримано неповні дані після дії');
      }
      
      // Негайно робимо GET запит для отримання актуальних даних
      try {
        const freshData = await axios.get(`${API_URL}/api/poker/${gameId}`);
        if (freshData.data && freshData.data.players && freshData.data.settings) {
          setGameData(freshData.data);
          console.log(`[CLIENT] Свіжі дані гри отримані`);
        }
      } catch (fetchError) {
        console.error('[CLIENT] Помилка при отриманні свіжих даних:', fetchError);
      }
      
      // Оновлюємо поточну ставку
      if (response.data.players && response.data.players.length > 0) {
        const maxBet = Math.max(...response.data.players.map(p => p.currentBet || 0));
        setCurrentBet(maxBet);
        
        // Встановлюємо розмір ставки як мінімальний рейз
        const minRaise = maxBet + (response.data.settings?.bigBlind || 20);
        setBetAmount(minRaise);
      }
      
      // Оновлюємо стан ходу
      if (response.data.currentTurn !== undefined) {
        setCurrentPlayerIndex(response.data.currentTurn);
        const currentPlayer = response.data.players[response.data.currentTurn];
        const newIsPlayerTurn = currentPlayer && 
          currentPlayer.username === user?.username && 
          !currentPlayer.folded && 
          !currentPlayer.hasActed;
        setIsPlayerTurn(newIsPlayerTurn);
      }
      
      // Скидаємо таймер
      setTurnTimer(10);
      
      console.log(`[CLIENT] ================ ДІЯ ЗАВЕРШЕНА ================`);
      console.log(`Гравець зробив ${action}`, response.data);
      
      console.log(`[CLIENT] Дія "${action}" успішно виконана`);
    } catch (error) {
      console.error('[CLIENT] ⚠️ ПОМИЛКА при виконанні дії:', error);
      
      if (error.response?.status === 429) {
        console.warn('[CLIENT] ⚠️ Занадто багато запитів - блокування');
      } else if (error.response?.status === 400) {
        console.warn('[CLIENT] ⚠️ Некоректна дія:', error.response.data?.message);
      } else {
        console.error('[CLIENT] ⚠️ Серверна помилка:', error.message);
      }
    } finally {
      // Розблокуємо через 1.5 секунди
      setTimeout(() => {
        setIsActionInProgress(false);
      }, 1500);
    }
  }, [gameData, user, gameId, isActionInProgress, lastActionTime]);

  // ПРИБРАНО: Дублюючий хук автооновлення - основне автооновлення вже є в useEffect вище

  // Функція для показу/приховування карт
  const handleShowdownToggle = (playerId) => {
    setShowCards(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  // Функція присоединения до гри
  const handleJoinGame = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/poker/${gameId}/join`, {
        userId: user.username
      });
      
      if (response.data.success) {
        setGameData(response.data.game);
      }
    } catch (error) {
      console.error('Помилка при приєднанні до гри:', error);
      setError('Не вдалося приєднатися до гри');
    } finally {
      setLoading(false);
    }
  };

  // Функція для розрахунку позицій гравців - тепер беремо з БД
  const getPlayerPositions = () => {
    if (!gameData?.players) return {};
    
    const positions = {};
    const dealerPosition = gameData.players.findIndex(p => p.isDealer);
    const playersCount = gameData.players.length;
    
    // Розраховуємо позиції на основі дилера
    gameData.players.forEach((player, index) => {
      const isDealer = index === dealerPosition;
      const isSmallBlind = (dealerPosition + 1) % playersCount === index;
      const isBigBlind = (dealerPosition + 2) % playersCount === index;
      
      positions[player.username] = {
        ...player,
        position: isDealer ? 'D' : isSmallBlind ? 'SB' : isBigBlind ? 'BB' : '',
        positionColor: isDealer ? 'white' : isSmallBlind ? 'blue' : isBigBlind ? 'red' : 'gray'
      };
    });
    
    return positions;
  };

  // Функція для отримання фіксованих позицій гравців на столі
  const getFixedPlayerPosition = (playerId) => {
    if (!gameData?.players || !user?.username) return null;
    
    // Знаходимо індекс реального гравця
    const realPlayerIndex = gameData.players.findIndex(p => p.username === user.username);
    if (realPlayerIndex === -1) return null;
    
    // Знаходимо індекс поточного гравця
    const currentPlayerIndex = gameData.players.findIndex(p => p._id === playerId || p.username === playerId);
    if (currentPlayerIndex === -1) return null;
    
    // Вираховуємо відносну позицію
    let relativePosition = (currentPlayerIndex - realPlayerIndex + gameData.players.length) % gameData.players.length;
    
    // Фіксовані позиції: 0 = знизу (гравець), 1 = зліва, 2 = зверху, 3 = справа
    const positionMap = {
      0: 'player',    // знизу - завжди реальний гравець
      1: 'leftBot',   // зліва
      2: 'topBot',    // зверху
      3: 'rightBot'   // справа
    };
    
    return positionMap[relativePosition] || 'player';
  };

  // Отримуємо гравців для кожної фіксованої позиції
  const getPlayerAtPosition = (positionName) => {
    if (!gameData?.players || !user?.username) return null;
    
    // Шукаємо реального гравця по username замість user._id
    const realPlayerIndex = gameData.players.findIndex(p => p.username === user.username);
    if (realPlayerIndex === -1) return null;
    
    const positionMap = {
      'player': 0,    // знизу
      'leftBot': 1,   // зліва  
      'topBot': 2,    // зверху
      'rightBot': 3   // справа
    };
    
    const relativeIndex = positionMap[positionName];
    if (relativeIndex === undefined) return null;
    
    const actualIndex = (realPlayerIndex + relativeIndex) % gameData.players.length;
    return gameData.players[actualIndex];
  };

  // Отримуємо позиції для всіх гравців
  const playerPositions = getPlayerPositions();

  // Функція анімації роздачі карт
  const startDealingAnimation = (gameData) => {
    if (!gameData || !gameData.players) return;
    
    setIsDealing(true);
    setDealtCardsPerPlayer([0, 0, 0, 0]); // Скидаємо лічильник карт
    
    // Знайдемо позицію дилера
    const dealerIndex = gameData.players.findIndex(p => p.isDealer);
    if (dealerIndex === -1) return;
    
    // Створюємо масив карт для роздачі (по 2 карти кожному гравцю)
    const cardsToAnimate = [];
    for (let round = 0; round < 2; round++) {
      gameData.players.forEach((player, playerIndex) => {
        cardsToAnimate.push({
          playerId: player._id,
          playerIndex,
          round,
          delay: (round * gameData.players.length + playerIndex) * 200 // 200мс між картами
        });
      });
    }
    
    // Запускаємо анімацію з затримками
    cardsToAnimate.forEach((card, index) => {
      setTimeout(() => {
        // Оновлюємо кількість карт у гравця
        setDealtCardsPerPlayer(prev => {
          const newCounts = [...prev];
          newCounts[card.playerIndex] = Math.min(newCounts[card.playerIndex] + 1, 2);
          return newCounts;
        });
        
        // Коли всі карти роздані - завершуємо анімацію
        if (index === cardsToAnimate.length - 1) {
          setTimeout(() => {
            setIsDealing(false);
            // НЕ скидаємо dealtCardsPerPlayer - залишаємо [2,2,2,2]
          }, 500); // Затримка перед приховуванням анімації
        }
      }, card.delay);
    });
  };

  // ІСПРАВЛЕНО: Повертаємо реальні карти гравців з сервера
  const getCardsForPlayer = (player, isBot) => {
    // Якщо картини є в даних гравця, використовуємо їх
    if (player.cards && Array.isArray(player.cards)) {
      // ІСПРАВЛЕНО: Прибираємо властивість hidden, щоб картини не втрачали прозорість
      // Логіка показу обкладинки карт ботів обробляється в компоненті PokerPlayer
      return player.cards.map(card => ({
        ...card,
        // Прибрали hidden щоб уникнути проблем з прозорістю
      }));
    }
    return [];
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
      {/* CSS стилі для повзунка */}
      <style>{sliderStyles}</style>
      
      {/* Динамічні стилі для столу */}
      <style>{`
        .table-container {
          width: ${tableDimensions.width}px;
          height: ${tableDimensions.height}px;
          max-width: 90vw;
          max-height: 80vh;
        }
      `}</style>
      
      <ToastContainer />
      
      {/* Кнопка приєднання до гри */}
      {gameData?.status === 'waiting' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={handleJoinGame}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg disabled:opacity-50"
          >
            {loading ? 'Приєднання...' : 'Приєднатися до гри'}
          </button>
        </div>
      )}

      {/* Інформація про гру - перенесена в лівий верхній кут */}
      {gameData && (
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-black bg-opacity-70 rounded-lg p-3 text-white text-sm">
          <div>🎯 Раунд: {gameData.currentRound || 'preflop'}</div>
          
          {/* Інформація про переможця */}
          {gameFinished && gameData.winner && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="text-yellow-400 font-bold">🏆 Переможець: {gameData.winner}</div>
              {gameData.winningHand && (
                <div className="text-xs text-gray-300">{gameData.winningHand}</div>
              )}
            </div>
          )}

          </div>
      </div>
      )}

      {/* Кнопки управління - правий верхній кут */}
      <div className="absolute top-4 right-4 xl:top-4 xl:right-4 2xl:top-4 2xl:right-4 flex gap-2 z-50">
        {gameFinished && (
          <button
            onClick={handleNextGame}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
          >
            Наступна гра
          </button>
        )}
        <button
          onClick={handleExit}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
        >
          Вийти
        </button>
      </div>

      {/* Головний стіл */}
      <div className="table-container relative">
        {/* Фонове зображення столу */}
        <div 
          className="absolute inset-0 bg-cover bg-center rounded-3xl"
          style={{
            backgroundImage: 'url(/BG/poker-table.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat'
          }}
        />

        {/* Гравці */}
        {gameData?.players && (
          <>
            {/* Гравець знизу */}
            {getPlayerAtPosition('player') && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <PokerPlayer
                  key={`${getPlayerAtPosition('player')._id}-${sessionId}`}
                  player={getPlayerAtPosition('player')}
                  position={0}
                  isCurrentTurn={gameData.settings?.currentTurn === gameData.players.findIndex(p => p._id === getPlayerAtPosition('player')._id)}
                  gameStatus={gameData.status}
                  showCards={showCards}
                  onToggleCards={handleShowdownToggle}
                  cards={getCardsForPlayer(getPlayerAtPosition('player'), false)}
                  gameFinished={gameFinished}
                  winningCards={gameData.winningCards}
                  sessionId={sessionId}
                  turnTimer={isPlayerTurn ? turnTimer : null}
                />
              </div>
            )}

            {/* Бот зліва */}
            {getPlayerAtPosition('leftBot') && (
              <div className="absolute left-8 top-1/2 transform -translate-y-1/2">
                <PokerPlayer
                  key={`${getPlayerAtPosition('leftBot')._id}-${sessionId}`}
                  player={getPlayerAtPosition('leftBot')}
                  position={90}
                  isCurrentTurn={gameData.settings?.currentTurn === gameData.players.findIndex(p => p._id === getPlayerAtPosition('leftBot')._id)}
                  gameStatus={gameData.status}
                  showCards={showCards}
                  onToggleCards={handleShowdownToggle}
                  cards={getCardsForPlayer(getPlayerAtPosition('leftBot'), true)}
                  gameFinished={gameFinished}
                  winningCards={gameData.winningCards}
                  sessionId={sessionId}
                  dealtCards={dealtCardsPerPlayer[1] || 0}
                />
              </div>
            )}

            {/* Бот зверху */}
            {getPlayerAtPosition('topBot') && (
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                <PokerPlayer
                  key={`${getPlayerAtPosition('topBot')._id}-${sessionId}`}
                  player={getPlayerAtPosition('topBot')}
                  position={180}
                  isCurrentTurn={gameData.settings?.currentTurn === gameData.players.findIndex(p => p._id === getPlayerAtPosition('topBot')._id)}
                  gameStatus={gameData.status}
                  showCards={showCards}
                  onToggleCards={handleShowdownToggle}
                  cards={getCardsForPlayer(getPlayerAtPosition('topBot'), true)}
                  gameFinished={gameFinished}
                  winningCards={gameData.winningCards}
                  sessionId={sessionId}
                  dealtCards={dealtCardsPerPlayer[2] || 0}
                />
              </div>
            )}

            {/* Бот справа */}
            {getPlayerAtPosition('rightBot') && (
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                <PokerPlayer
                  key={`${getPlayerAtPosition('rightBot')._id}-${sessionId}`}
                  player={getPlayerAtPosition('rightBot')}
                  position={270}
                  isCurrentTurn={gameData.settings?.currentTurn === gameData.players.findIndex(p => p._id === getPlayerAtPosition('rightBot')._id)}
                  gameStatus={gameData.status}
                  showCards={showCards}
                  onToggleCards={handleShowdownToggle}
                  cards={getCardsForPlayer(getPlayerAtPosition('rightBot'), true)}
                  gameFinished={gameFinished}
                  winningCards={gameData.winningCards}
                  sessionId={sessionId}
                  dealtCards={dealtCardsPerPlayer[3] || 0}
                />
              </div>
            )}
          </>
        )}

        {/* Загальні карти */}
        {gameData?.settings?.communityCards && gameData.settings.communityCards.length > 0 && (
          <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 flex gap-2">
            {gameData.settings.communityCards.map((card, index) => (
              <img
                key={`community-${card.suit}-${card.value}-${index}-${gameData.settings.currentRound}`}
                src={getCardImage(card)}
                alt={`${card.value}${card.suit}`}
                className="w-16 h-24 rounded shadow-lg border border-gray-300 transition-all duration-300 cursor-pointer hover:scale-110 hover:z-50"
                style={{
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  transform: 'scale(1)',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.4)';
                  e.target.style.transform = 'scale(1.15)';
                  e.target.style.zIndex = '100';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                  e.target.style.transform = 'scale(1)';
                  e.target.style.zIndex = '10';
                }}
              />
            ))}
          </div>
        )}

        {/* Банк */}
        {gameData?.pot > 0 && (
          <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2">
            <div className="bg-black bg-opacity-70 rounded-lg px-4 py-2">
              <div className="text-yellow-400 font-bold text-center">
                💰 Банк: {gameData.pot}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Панель управління - знизу справа */}
      {gameData?.status === 'playing' && (
        <div className="absolute bottom-32 right-6 xl:bottom-32 xl:right-6 2xl:bottom-32 2xl:right-6 flex flex-col items-end gap-3 z-40">
          {/* Кнопки швидких ставок у відсотках */}
          <div className="grid grid-cols-4 gap-2">
            {[33, 50, 75, 100].map(percent => {
              const ourPlayer = gameData.players.find(p => p.username === user?.username) || {}; // Знаходимо нашого гравця
              const playerChips = ourPlayer.chips || 1000;
              const maxPossibleBet = (ourPlayer.currentBet || 0) + playerChips; // Максимум = поточна ставка + фішки гравця
              const betValue = Math.floor((maxPossibleBet * percent) / 100);
              
              return (
                <button
                  key={percent}
                  onClick={() => setBetAmount(betValue)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                >
                  {percent}%
                </button>
              );
            })}
          </div>

          {/* Повзунок ставки без фону і тексту */}
          <div className="flex items-center gap-3 min-w-80">
            <span className="text-white text-sm">{currentBet + 20}</span>
            <input
              type="range"
              min={currentBet + 20}
              max={(() => {
                const ourPlayer = gameData.players.find(p => p.username === user?.username) || {};
                return (ourPlayer.currentBet || 0) + (ourPlayer.chips || 1000);
              })()}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
              className="slider flex-1"
            />
            <span className="text-white text-sm">{betAmount}</span>
          </div>

          {/* Кнопки дій */}
          <div className="flex gap-2">
            <button 
              onClick={() => handlePlayerAction('fold')}
              disabled={isActionInProgress || !isPlayerTurn}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-bold"
            >
              Fold
            </button>
            
            <button 
              onClick={() => handlePlayerAction('call')}
              disabled={isActionInProgress || !isPlayerTurn}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-bold"
            >
              Call {currentBet > 0 ? currentBet : ''}
            </button>
            
            <button 
              onClick={() => handlePlayerAction('raise', betAmount)}
              disabled={isActionInProgress || !isPlayerTurn || betAmount <= currentBet}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-bold"
            >
              Raise {betAmount}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white p-4 rounded-lg z-50">
          {error}
        </div>
      )}

      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-lg z-50">
          Завантаження...
        </div>
      )}
    </div>
  );
}

export default PokerGame; 
