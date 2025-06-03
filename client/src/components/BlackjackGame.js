import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import './BlackjackGame.css';
import bgTexture from '../assets/texture_black.png';
import backCardImage from '../assets/Back.png';
import defaultAvatar from '../assets/default_avatar.png';
import avatar from '../assets/avatar.png';
import { createDeck, shuffleDeck, getCardImage, calculateHandValue } from '../utils/DeckUtils';
import BetControls from './BetControls';
import { updateUserChips, fetchInitialChips } from '../redux/slices/userSlice';

function BlackjackGame({ gameId }) {
  const dispatch = useDispatch();
  const { chips, isLoading, error } = useSelector((state) => state.user);
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [currentBet, setCurrentBet] = useState(10);
  const [showInsurance, setShowInsurance] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [betPlaced, setBetPlaced] = useState(false);
  const [deck, setDeck] = useState([]);
  const [isDealing, setIsDealing] = useState(false);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, playing, dealer, finished

  // Загрузка начального количества фишек
  useEffect(() => {
    dispatch(fetchInitialChips());
  }, [dispatch]);

  // Инициализация игры
  useEffect(() => {
    try {
      const newDeck = createDeck(6);
      const shuffledDeck = shuffleDeck(newDeck);
      setDeck(shuffledDeck);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при инициализации игры:', err);
    }
  }, []);

  // Функция начальной раздачи
  const dealInitialCards = () => {
    setIsDealing(true);
    const newDeck = [...deck];
    const newPlayerHand = [newDeck.pop(), newDeck.pop()];
    const newDealerHand = [
      newDeck.pop(),
      { ...newDeck.pop(), hidden: true } // Вторая карта дилера скрыта
    ];

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setDeck(newDeck);
    setGamePhase('playing');

    setTimeout(() => {
      setIsDealing(false);
    }, 1000);
  };

  // Функция хода дилера
  const dealerPlay = () => {
    setGamePhase('dealer');
    
    const newDealerHand = dealerHand.map(card => ({ ...card, hidden: false }));
    setDealerHand(newDealerHand);

    setTimeout(() => {
      const dealerTurn = async () => {
        let currentDealerHand = [...newDealerHand];
        let currentDeck = [...deck];

        while (calculateHandValue(currentDealerHand) < 17) {
          const newCard = { ...currentDeck.pop(), isNew: true };
          currentDealerHand.push(newCard);
          setDealerHand(currentDealerHand);
          setDeck(currentDeck);
          await new Promise(resolve => setTimeout(resolve, 1000));
          currentDealerHand = currentDealerHand.map(card => ({ ...card, isNew: false }));
          setDealerHand(currentDealerHand);
        }

        setTimeout(() => {
          const dealerValue = calculateHandValue(currentDealerHand);
          const playerValue = calculateHandValue(playerHand);

          setGamePhase('finished');

          if (dealerValue > 21) {
            setGameResult('ДИЛЕР ПЕРЕБРАВ!\nВи виграли ' + (currentBet * 2) + ' фішок!');
            dispatch(updateUserChips(chips + currentBet * 2));
          } else if (dealerValue > playerValue) {
            setGameResult('ДИЛЕР ВИГРАВ!\nВи програли ' + currentBet + ' фішок');
          } else if (dealerValue < playerValue) {
            setGameResult('ВИ ВИГРАЛИ!\nВаш виграш: ' + (currentBet * 2) + ' фішок');
            dispatch(updateUserChips(chips + currentBet * 2));
          } else {
            setGameResult('НІЧИЯ!\nВашу ставку повернуто');
            dispatch(updateUserChips(chips + currentBet));
          }
        }, 1500);
      };

      dealerTurn();
    }, 1000);
  };

  // Обработчик размещения ставки
  const handlePlaceBet = () => {
    if (currentBet <= chips) {
      setBetPlaced(true);
      dispatch(updateUserChips(chips - currentBet));
      dealInitialCards();
    }
  };

  // Обработчик изменения ставки
  const handleBetChange = (value) => {
    setCurrentBet(value);
  };

  // Обработчик действий игрока
  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'hit':
          const newDeck = [...deck];
          const newCard = { ...newDeck.pop(), isNew: true };
          const newPlayerHand = [...playerHand, newCard];
          
          setPlayerHand(newPlayerHand);
          setDeck(newDeck);

          const handValue = calculateHandValue(newPlayerHand);
          if (handValue > 21) {
            setGamePhase('finished');
            // Добавляем задержку перед показом результата
            setTimeout(() => {
              setGameResult('ПЕРЕБОР!\nВи програли');
            }, 1500);
          }

          setTimeout(() => {
            setPlayerHand(newPlayerHand.map(card => ({ ...card, isNew: false })));
          }, 1000);
          break;

        case 'stand':
          dealerPlay();
          break;

        default:
          console.warn('Неизвестное действие:', action);
      }
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
    }
  };

  // Отображение карты
  const renderCard = (card, index, isNew = false) => {
    const cardImage = card.hidden ? backCardImage : getCardImage(card);
    return (
      <div
        key={card.id || `${card.value}-${card.suit}-${index}`}
        className={`card ${isNew ? 'dealing' : ''}`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <img
          src={cardImage}
          alt={card.hidden ? 'Hidden Card' : `${card.value} of ${card.suit}`}
          className={`card-image ${card.hidden && gamePhase === 'dealer' ? 'flipping' : ''}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  };

  // Отображение ошибки или загрузки
  if (loading || isLoading) {
    return <div className="loading">Загрузка игры...</div>;
  }

  if (error) {
    return <div className="error-message">Ошибка: {error}</div>;
  }

  return (
    <div 
      className="blackjack-table"
      style={{ 
        backgroundImage: `url(${bgTexture})`
      }}
    >
      {/* Дилер */}
      <div className="dealer-section">
        <div className="player-info">
          <img src={defaultAvatar} alt="Dealer" className="player-avatar" />
          <div className="player-name">Bot</div>
          {gamePhase !== 'betting' && (
            <div className="hand-value">
              {gamePhase === 'dealer' || gamePhase === 'finished'
                ? calculateHandValue(dealerHand)
                : dealerHand.length > 0 && !dealerHand[0]?.hidden
                ? calculateHandValue(dealerHand.filter(card => !card.hidden))
                : '?'}
            </div>
          )}
        </div>
        <div className="cards-container">
          {dealerHand.map((card, index) => renderCard(card, index, card.isNew))}
        </div>
      </div>

      {/* Игрок */}
      <div className="player-section">
        <div className="cards-container">
          {playerHand.map((card, index) => renderCard(card, index, card.isNew))}
        </div>
        <div className="player-info">
          <img src={avatar} alt={user?.username || 'Гість'} className="player-avatar" />
          <div className="player-name">{user?.username || 'Гість'}</div>
          {gamePhase !== 'betting' && (
            <div className="hand-value">
              {calculateHandValue(playerHand)}
            </div>
          )}
        </div>
      </div>

      {/* Управление ставками */}
      {gamePhase === 'betting' && (
        <BetControls
          currentBet={currentBet}
          chips={chips}
          onBetChange={handleBetChange}
          onPlaceBet={handlePlaceBet}
          minBet={10}
          maxBet={100}
        />
      )}

      {/* Счет и кнопки действий */}
      <div className="score-buttons-container">
        <div className="score-section">
          <div className="score-row">
            <span>Bot</span>
            <span className="score-value">
              {gamePhase === 'betting' ? '0' : 
                (gamePhase === 'dealer' || gamePhase === 'finished'
                  ? calculateHandValue(dealerHand)
                  : dealerHand.length > 0 && !dealerHand[0]?.hidden
                  ? calculateHandValue(dealerHand.filter(card => !card.hidden))
                  : '?')}
            </span>
          </div>
          <div className="score-divider"></div>
          <div className="score-row">
            <span>You</span>
            <span className="score-value">
              {gamePhase === 'betting' ? '0' : calculateHandValue(playerHand)}
            </span>
          </div>
        </div>
        {gamePhase === 'playing' && (
          <div className="action-buttons">
            <button
              onClick={() => handleAction('hit')}
              className="hit-button"
            >
              Hit
            </button>
            <button
              onClick={() => handleAction('stand')}
              className="stand-button"
            >
              Stand
            </button>
          </div>
        )}
      </div>

      {/* Банк и фишки */}
      <div className="bank-info">
        <div className="bank-content">
          <span className="bank-label">Bank:</span>
          <span className="bank-value">{chips} 🪙</span>
        </div>
      </div>

      {/* Сообщение о результате игры */}
      {gameResult && (
        <div className="game-result-overlay">
          <div className="game-result-message">
            {gameResult}
          </div>
          <button
            onClick={() => {
              setGamePhase('betting');
              setPlayerHand([]);
              setDealerHand([]);
              setGameResult('');
              setBetPlaced(false);
              if (deck.length < 52) {
                const newDeck = createDeck(6);
                setDeck(shuffleDeck(newDeck));
              }
            }}
            className="new-game-button"
          >
            Нова гра
          </button>
        </div>
      )}

      {/* Страховка */}
      {showInsurance && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl border-2 border-yellow-600 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-white text-center">Страхування від Блекджека?</h3>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => handleAction('insurance')}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 text-sm"
              >
                Так
              </button>
              <button
                onClick={() => setShowInsurance(false)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 text-sm"
              >
                Ні
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlackjackGame; 