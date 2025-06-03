import React from 'react';
import defaultAvatar from '../assets/default_avatar.png';
import userAvatar from '../assets/avatar.png';
import smallChips from '../assets/small_ships.png';
import { getCardImage } from '../utils/DeckUtils';

const PokerPlayer = ({ 
  player,
  username, 
  chips, 
  isSelf, 
  cards, 
  angle = 0,
  isDealer = false,
  isSmallBlind = false,
  isBigBlind = false,
  isUTG = false,
  isCurrentTurn = false,
  turnTimer = 10,
  gameStatus = 'playing',
  isWinner = false,
  winningCards = [],
  dealtCardsCount = 2,
  showdown = false
}) => {
  const displayName = player?.username || username || 'Player';
  const displayChips = Math.max(0, player?.chips || chips || 0);
  const currentBet = player?.currentBet || 0;
  const hasFolded = player?.folded || false;

  // Выбираем правильный аватар
  const avatarSrc = isSelf ? userAvatar : defaultAvatar;
  
  // Стили для аватара с учетом fold
  const avatarStyle = `w-28 h-28 rounded-full overflow-hidden border-3 shadow-lg transition-all duration-300
    ${hasFolded ? 'opacity-30 grayscale border-gray-600' : 
      player?.isBot ? 'border-gray-500 opacity-70' : 'border-blue-400'}
    ${isSelf && !hasFolded ? 'border-yellow-400 shadow-yellow-500/30' : ''}
    ${isCurrentTurn && !hasFolded ? 'border-4 border-green-400 shadow-green-500/80 animate-pulse ring-4 ring-green-300' : ''}`;

  // Функция для получения позиции и цвета
  const getPositionInfo = () => {
    if (isDealer) return { text: 'D', bgColor: 'bg-yellow-500', borderColor: 'border-yellow-300' };
    if (isSmallBlind) return { text: 'SB', bgColor: 'bg-blue-500', borderColor: 'border-blue-300' };
    if (isBigBlind) return { text: 'BB', bgColor: 'bg-red-500', borderColor: 'border-red-300' };
    if (isUTG) return { text: 'UTG', bgColor: 'bg-green-500', borderColor: 'border-green-300' };
    return null;
  };

  const positionInfo = getPositionInfo();
  
  // Функция для расчета позиции ставки относительно игрока
  const getBetPosition = () => {
    switch (angle) {
      case 0: // Снизу (игрок)
        return { transform: 'translate(-50%, -130px)' };
      case 90: // Слева (Bot 1)
        return { transform: 'translate(110px, 0%)' };
      case 180: // Сверху (Bot 2)
        return { transform: 'translate(-50%, 110px)' };
      case 270: // Справа (Bot 3)
        return { transform: 'translate(-130px, 0%)' };
      default:
        return { transform: 'translate(-50%, -100px)' };
    }
  };
  
  // Функция для проверки, является ли карта частью выигрышной комбинации
  const isWinningCard = (card) => {
    if (!winningCards || winningCards.length === 0 || gameStatus !== 'finished' || !isWinner) {
      return false;
    }
    
    return winningCards.some(winCard => 
      winCard.suit === card.suit && 
      (winCard.value === card.value || winCard.original === card.value)
    );
  };
  
  return (
    <div className="flex flex-col items-center relative select-none transition-all duration-300">
      <div className="flex items-center justify-center w-full relative">
        {/* Аватар */}
        <img 
          src={avatarSrc} 
          alt={displayName} 
          className={avatarStyle} 
        />

        {/* Карты для реального игрока - НА аватаре под углом */}
        {!player?.isBot && cards && cards.length > 0 && !hasFolded && (
          <div className="absolute inset-0 flex items-center justify-center">
            {cards.map((card, i) => {
              const isWinning = isWinningCard(card);
              const rotation = i === 0 ? '-rotate-12' : 'rotate-12';
              const zIndex = i === 0 ? 'z-10' : 'z-20';
              const offset = i === 0 ? '-translate-x-3' : 'translate-x-3';
              return (
                <img
                  key={i}
                  src={getCardImage(card)}
                  alt={`${card.value}${card.suit}`}
                  className={`w-16 h-22 rounded shadow-lg border transition-all duration-300 cursor-pointer absolute ${rotation} ${zIndex} ${offset} ${
                    isWinning
                      ? 'border-2 border-yellow-400 animate-pulse shadow-xl' 
                      : 'border border-gray-300'
                  }`}
                  style={{
                    boxShadow: isWinning
                      ? '0 4px 12px rgba(255, 215, 0, 0.6)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.2)',
                    filter: isWinning
                      ? 'brightness(1.2) saturate(1.2)' 
                      : 'none'
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Карты для ботов - ВСЕГДА показываем обложки, открываем только при шоудауне */}
        {player?.isBot && !hasFolded && dealtCardsCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Показываем либо настоящие карты при шоудауне, либо обложки */}
            {(gameStatus === 'finished' && showdown && cards && cards.length > 0) ? (
              // Показываем настоящие карты при шоудауне
              cards.map((card, i) => {
                const isWinning = isWinningCard(card);
                const rotation = i === 0 ? '-rotate-12' : 'rotate-12';
                const zIndex = i === 0 ? 'z-10' : 'z-20';
                const offset = i === 0 ? '-translate-x-3' : 'translate-x-3';
                return (
                  <img
                    key={i}
                    src={getCardImage(card)}
                    alt={`${card.value}${card.suit}`}
                    className={`w-16 h-22 rounded shadow-lg border transition-all duration-300 absolute ${rotation} ${zIndex} ${offset} ${
                      isWinning
                        ? 'border-2 border-yellow-400 animate-pulse shadow-xl' 
                        : 'border border-gray-300'
                    }`}
                    style={{
                      boxShadow: isWinning
                        ? '0 4px 12px rgba(255, 215, 0, 0.6)' 
                        : '0 2px 4px rgba(0, 0, 0, 0.2)',
                      filter: isWinning
                        ? 'brightness(1.2) saturate(1.2)' 
                        : 'none'
                    }}
                  />
                );
              })
            ) : (
              // Показываем обложки карт - только столько, сколько уже роздано
              Array.from({ length: Math.min(dealtCardsCount, 2) }, (_, i) => {
                const rotation = i === 0 ? '-rotate-12' : 'rotate-12';
                const zIndex = i === 0 ? 'z-10' : 'z-20';
                const offset = i === 0 ? '-translate-x-3' : 'translate-x-3';
                return (
                  <img
                    key={i}
                    src="/cards/back.png"
                    alt="Обложка карты"
                    className={`w-16 h-22 rounded shadow-lg border border-gray-300 transition-all duration-300 absolute ${rotation} ${zIndex} ${offset}`}
                    style={{
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                );
              })
            )}
          </div>
        )}
        
        {/* Маркер позиции */}
        {positionInfo && (
          <div className={`absolute -top-2 -right-2 ${positionInfo.bgColor} text-white text-xs font-bold rounded-full flex items-center justify-center border-2 ${positionInfo.borderColor} shadow-lg ${
            positionInfo.text === 'UTG' ? 'w-8 h-6 px-1' : 'w-6 h-6'
          } ${hasFolded ? 'opacity-50' : ''} z-30`}>
            {positionInfo.text}
          </div>
        )}

        {/* Расширенный блок имени и банка игрока - налегающий на нижнюю часть аватара */}
        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 transition-all duration-300 ${hasFolded ? 'opacity-50' : ''} z-30`}>
          <div
            className={`bg-black text-white shadow-lg transition-all duration-300 ${
              hasFolded ? 'bg-gray-800 text-gray-500' : 'bg-black'
            }`}
            style={{
              clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)',
              borderRadius: '4px 4px 8px 8px',
              minWidth: '120px',
              padding: '8px 14px'
            }}
          >
            {/* Имя игрока */}
            <div className={`text-sm font-semibold text-center mb-1 ${
              isSelf ? 'text-orange-400' : 'text-white'
            }`}>
              {isWinner && gameStatus === 'finished' ? '👑 ' : ''}{displayName}{hasFolded ? ' (FOLD)' : ''}{isWinner && gameStatus === 'finished' ? ' 👑' : ''}
            </div>
            
            {/* Серая полоска-разделитель */}
            <div className="h-px bg-gray-500 mx-1 mb-1"></div>
            
            {/* Банк игрока */}
            <div className={`text-sm font-bold text-center ${
              displayChips === 0 
                ? 'text-red-400' 
                : displayChips < 500 
                  ? 'text-green-400' 
                  : 'text-blue-300'
            }`}>
              {displayChips.toLocaleString()}
            </div>

            {/* Таймер-полоска прямо под балансом - внутри панели */}
            {isCurrentTurn && !hasFolded && (
              <div className="w-full mt-2">
                <div className={`h-2 bg-black rounded-full overflow-hidden border border-white shadow-lg`} style={{
                  boxShadow: '0 0 10px rgba(255,255,255,0.4), inset 0 0 5px rgba(0,0,0,0.5)'
                }}>
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      turnTimer <= 3 
                        ? 'bg-red-500 shadow-red-500/80 animate-pulse' 
                        : turnTimer <= 6 
                          ? 'bg-yellow-500 shadow-yellow-500/80' 
                          : 'bg-green-500 shadow-green-500/80'
                    }`}
                    style={{
                      width: `${(turnTimer / 10) * 100}%`,
                      transition: 'width 1s linear',
                      boxShadow: '0 0 8px currentColor, inset 0 0 3px rgba(255,255,255,0.3)'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ставка игрока (блайнды и др.) - ЗДЕСЬ МОЖНО ИЗМЕНИТЬ ПОЗИЦИЮ */}
        {currentBet > 0 && (
          <div
            className="absolute z-50"
            style={{
              left: '50%',
              top: '50%',
              ...getBetPosition()
            }}
          >
            <div className="flex flex-col items-center animate-fadeIn">
              {/* Картинка фишек */}
              <img 
                src={smallChips} 
                alt="chips" 
                className="w-10 h-10 object-contain drop-shadow-lg"
              />
              {/* Сумма ставки - впритык к картинке */}
              <div className="bg-gray-800 bg-opacity-70 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg border border-gray-600">
                {currentBet}
              </div>
            </div>
          </div>
        )}

        {/* ТЕСТОВАЯ ставка - если currentBet = 0, но это SB или BB */}
        {currentBet === 0 && (isSmallBlind || isBigBlind) && (
          <div 
            className="absolute z-50"
              style={{ 
              left: '50%',
              top: '50%',
              ...getBetPosition()
            }}
          >
            <div className="flex flex-col items-center">
              <img 
                src={smallChips} 
                alt="chips" 
                className="w-12 h-12 object-contain drop-shadow-lg"
              />
              <div className="bg-gray-800 bg-opacity-70 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg border border-gray-600">
                {isSmallBlind ? '10' : '20'} 
              </div>
            </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PokerPlayer; 