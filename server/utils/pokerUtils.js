/**
 * Утилиты для покерной игры
 */

// Создание новой колоды карт
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck = [];
  
  // Создаем колоду из всех комбинаций масти и значения
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  // Перемешиваем колоду
  return shuffleDeck(deck);
}

// Перемешивание колоды (алгоритм Фишера-Йейтса)
function shuffleDeck(deck) {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Раздача карт игрокам
function dealCards(game) {
  // Создаем или обновляем колоду, если нужно
  if (!game.deck || game.deck.length < game.players.length * 2) {
    game.deck = createDeck();
  }
  
  // Раздаем карты игрокам
  for (let i = 0; i < game.players.length; i++) {
    const isBot = !!game.players[i].isBot;
    const card1 = game.deck.pop();
    const card2 = game.deck.pop();
    
    // Явно устанавливаем видимость карт
    game.players[i].cards = [
      { 
        suit: card1.suit, 
        value: card1.value, 
        hidden: isBot // true для ботов, false для реального игрока
      },
      { 
        suit: card2.suit, 
        value: card2.value, 
        hidden: isBot // true для ботов, false для реального игрока
      }
    ];
  }
  
  return game;
}

// Раздача общих карт на стол
function dealCommunityCards(game, count = 0) {
  if (!game.communityCards) {
    game.communityCards = [];
  }
  
  // Определяем, сколько карт нужно раздать
  // В зависимости от раунда: флоп (3), тёрн (1), ривер (1)
  let cardsToAdd = 0;
  
  if (count > 0) {
    cardsToAdd = count;
  } else {
    switch (game.currentRound) {
      case 'flop':
        cardsToAdd = 3 - game.communityCards.length;
        break;
      case 'turn':
      case 'river':
        cardsToAdd = 1;
        break;
      default:
        cardsToAdd = 0;
    }
  }
  
  // Принудительно создаем новую колоду для каждой раздачи
  game.deck = createDeck();
  
  // Если это флоп (3 карты), принудительно разные масти
  if (game.currentRound === 'flop' && cardsToAdd === 3) {
    // Создаем карты разных мастей принудительно
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Перемешиваем масти и значения
    const shuffledSuits = shuffleArray([...suits]);
    const shuffledValues = shuffleArray([...values]);
    
    // Берем первые 3 масти и 3 значения
    for (let i = 0; i < 3; i++) {
      game.communityCards.push({
        suit: shuffledSuits[i % 4],
        value: shuffledValues[i % 13],
        hidden: false
      });
    }
  } else {
    // Для других раундов (терн, ривер) - стандартная логика
  for (let i = 0; i < cardsToAdd; i++) {
      const card = game.deck.pop();
      card.hidden = false;
      game.communityCards.push(card);
    }
  }
  
  return game;
}

// Вспомогательная функция для перемешивания массива
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Переход к следующему раунду
function nextRound(game) {
  // Сбрасываем флаги действий игроков
  game.players.forEach(player => {
    player.hasActed = false;
  });
  
  // Переходим к следующему раунду
  switch (game.currentRound) {
    case 'preflop':
      game.currentRound = 'flop';
      dealCommunityCards(game);
      break;
    case 'flop':
      game.currentRound = 'turn';
      dealCommunityCards(game);
      break;
    case 'turn':
      game.currentRound = 'river';
      dealCommunityCards(game);
      break;
    case 'river':
      game.currentRound = 'showdown';
      // Определяем победителя
      break;
    default:
      // Уже на showdown, завершаем игру
      game.status = 'finished';
  }

  // На новом раунде первый ход делает первый активный игрок после дилера
  const dealerIndex = game.players.findIndex(p => p.isDealer);
  const playersCount = game.players.length;
  
  let nextPlayerIndex = (dealerIndex + 1) % playersCount;
  
  // Ищем первого активного игрока после дилера
  for (let i = 0; i < playersCount; i++) {
    if (!game.players[nextPlayerIndex]?.folded) {
      break;
    }
    nextPlayerIndex = (nextPlayerIndex + 1) % playersCount;
  }
  
  game.currentTurn = nextPlayerIndex;
  return game;
}

// Переход хода к следующему игроку
function nextTurn(game) {
  const playersCount = game.players.length;
  let nextPlayerIndex = (game.currentTurn + 1) % playersCount;
  
  // Если все игроки сделали ход, переходим к следующему раунду
  let allPlayersActed = true;
  let activePlayers = 0;
  
  for (let i = 0; i < playersCount; i++) {
    if (!game.players[i].folded) {
      activePlayers++;
      
      // Максимальная ставка в текущем раунде
      const maxBet = Math.max(...game.players.map(p => p.currentBet || 0));
      
      // Если игрок не сделал ставку, равную максимальной, и не выбыл, значит, не все игроки сделали ход
      if (!game.players[i].hasActed || game.players[i].currentBet < maxBet) {
        allPlayersActed = false;
      }
    }
  }
  
  // Если остался только один активный игрок, определяем победителя и завершаем игру
  if (activePlayers <= 1) {
    return determineWinner(game);
  }
  
  // Если все сделали ход, переходим к следующему раунду
  if (allPlayersActed) {
    return nextRound(game);
  }
  
  // Ищем следующего активного игрока
  for (let i = 0; i < playersCount; i++) {
    if (!game.players[nextPlayerIndex].folded) {
      break;
    }
    nextPlayerIndex = (nextPlayerIndex + 1) % playersCount;
  }
  
  game.currentTurn = nextPlayerIndex;
  return game;
}

// Определение комбинации карт и её силы
function evaluateHand(cards) {
  // Приводим карты к единому формату для вычисления
  const formattedCards = cards.map(card => {
    let value = card.value;
    // Приводим буквенные значения к числовым для сравнения
    if (value === 'J') value = '11';
    if (value === 'Q') value = '12';
    if (value === 'K') value = '13';
    if (value === 'A') value = '14'; // Туз - самая старшая карта
    
    return {
      suit: card.suit,
      value: parseInt(value, 10),
      original: card.value
    };
  });
  
  // Сортируем карты по значению (от большего к меньшему)
  formattedCards.sort((a, b) => b.value - a.value);
  
  // Проверка комбинаций от самой сильной к самой слабой
  
  // 1. Роял-флеш (Royal Flush)
  const royalFlush = isRoyalFlush(formattedCards);
  if (royalFlush.found) {
    return { rank: 10, name: 'Роял-флеш', cards: royalFlush.cards };
  }
  
  // 2. Стрит-флеш (Straight Flush)
  const straightFlush = isStraightFlush(formattedCards);
  if (straightFlush.found) {
    return { rank: 9, name: 'Стрит-флеш', cards: straightFlush.cards };
  }
  
  // 3. Каре (Four of a Kind)
  const fourOfAKind = isFourOfAKind(formattedCards);
  if (fourOfAKind.found) {
    return { rank: 8, name: 'Каре', cards: fourOfAKind.cards };
  }
  
  // 4. Фулл-хаус (Full House)
  const fullHouse = isFullHouse(formattedCards);
  if (fullHouse.found) {
    return { rank: 7, name: 'Фулл-хаус', cards: fullHouse.cards };
  }
  
  // 5. Флеш (Flush)
  const flush = isFlush(formattedCards);
  if (flush.found) {
    return { rank: 6, name: 'Флеш', cards: flush.cards };
  }
  
  // 6. Стрит (Straight)
  const straight = isStraight(formattedCards);
  if (straight.found) {
    return { rank: 5, name: 'Стрит', cards: straight.cards };
  }
  
  // 7. Тройка (Three of a Kind)
  const threeOfAKind = isThreeOfAKind(formattedCards);
  if (threeOfAKind.found) {
    return { rank: 4, name: 'Тройка', cards: threeOfAKind.cards };
  }
  
  // 8. Две пары (Two Pairs)
  const twoPairs = isTwoPairs(formattedCards);
  if (twoPairs.found) {
    return { rank: 3, name: 'Две пары', cards: twoPairs.cards };
  }
  
  // 9. Пара (One Pair)
  const onePair = isOnePair(formattedCards);
  if (onePair.found) {
    return { rank: 2, name: 'Пара', cards: onePair.cards };
  }
  
  // 10. Старшая карта (High Card)
  return { rank: 1, name: 'Старшая карта', cards: [formattedCards[0]] };
}

// Определение победителя
function determineWinner(game) {
  // Определяем активных игроков (не сбросивших карты)
  const activePlayers = game.players.filter(p => !p.folded);
  
  // Если остался только один активный игрок, он побеждает
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    
    // Добавляем банк к фишкам победителя
    const winnerIndex = game.players.findIndex(p => p === winner);
    game.players[winnerIndex].chips += game.pot;
    
    // Обновляем данные игры
    game.pot = 0;
    game.status = 'finished';
    game.winner = winner.username || 'Игрок ' + winnerIndex;
    game.winningHand = 'Все остальные игроки сбросили карты';
    
    return game;
  }
  
  // Если игра дошла до вскрытия, определяем сильнейшую комбинацию
  const playersWithHandRanks = activePlayers.map(player => {
    // Объединяем карты игрока с общими картами
    const hand = [...player.cards, ...game.communityCards];
    
    // Оцениваем комбинацию
    const { rank, name, cards } = evaluateHand(hand);
    
    // Возвращаем игрока с данными о его комбинации
    return {
      player,
      playerIndex: game.players.findIndex(p => p === player),
      handRank: rank,
      handName: name,
      bestCards: cards
    };
  });
  
  // Сортируем по рангу комбинации (от высшего к низшему)
  playersWithHandRanks.sort((a, b) => b.handRank - a.handRank);
  
  // Определяем победителя(ей) - находим всех игроков с высшим рангом
  const winners = [playersWithHandRanks[0]];
  for (let i = 1; i < playersWithHandRanks.length; i++) {
    if (playersWithHandRanks[i].handRank === winners[0].handRank) {
      // Если равные комбинации, сравниваем по старшей карте
      if (winners[0].bestCards[0].value === playersWithHandRanks[i].bestCards[0].value) {
        winners.push(playersWithHandRanks[i]);
      }
    } else {
      // Остальные игроки имеют более слабые комбинации
      break;
    }
  }
  
  // Если несколько победителей, делим банк поровну
  const winnerShare = Math.floor(game.pot / winners.length);
  
  winners.forEach(winner => {
    game.players[winner.playerIndex].chips += winnerShare;
  });
  
  // Добавляем информацию о выигрышных картах каждому игроку
  playersWithHandRanks.forEach(playerData => {
    const playerIndex = playerData.playerIndex;
    game.players[playerIndex].winningCards = playerData.bestCards;
    game.players[playerIndex].handRank = playerData.handRank;
    game.players[playerIndex].handName = playerData.handName;
  });
  
  // Обновляем данные игры
  game.pot = 0;
  game.status = 'finished';
  
  // Формируем строку с именами победителей
  game.winner = winners.map(w => w.player.username || 'Игрок ' + w.playerIndex).join(', ');
  game.winningHand = winners[0].handName;
  game.winningCombination = getCardDescriptions(winners[0].bestCards);
  
  return game;
}

// Вспомогательные функции для определения комбинаций

// Роял-флеш (10, J, Q, K, A одной масти)
function isRoyalFlush(cards) {
  const flush = isFlush(cards);
  if (!flush.found) return { found: false };
  
  const straightFlush = isStraightFlush(cards);
  if (!straightFlush.found) return { found: false };
  
  // Проверяем, что старшая карта - туз
  if (straightFlush.cards[0].value === 14) {
    return { found: true, cards: straightFlush.cards };
  }
  
  return { found: false };
}

// Стрит-флеш (5 последовательных карт одной масти)
function isStraightFlush(cards) {
  const flush = isFlush(cards);
  if (!flush.found) return { found: false };
  
  const flushCards = flush.cards;
  const straight = isStraight(flushCards);
  
  if (straight.found) {
    return { found: true, cards: straight.cards };
  }
  
  return { found: false };
}

// Каре (4 карты одного достоинства)
function isFourOfAKind(cards) {
  // Группируем карты по значению
  const groups = {};
  cards.forEach(card => {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  });
  
  // Ищем группу из 4 карт
  for (const value in groups) {
    if (groups[value].length === 4) {
      // Находим лучшую пятую карту (кикер)
      const kickers = cards.filter(card => card.value != value);
      return { found: true, cards: [...groups[value], kickers[0]] };
    }
  }
  
  return { found: false };
}

// Фулл-хаус (3 карты одного достоинства + 2 карты другого достоинства)
function isFullHouse(cards) {
  // Группируем карты по значению
  const groups = {};
  cards.forEach(card => {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  });
  
  let threeOfAKind = null;
  let pair = null;
  
  // Ищем тройку и пару
  for (const value in groups) {
    if (groups[value].length >= 3 && !threeOfAKind) {
      threeOfAKind = groups[value].slice(0, 3);
    } else if (groups[value].length >= 2 && !pair) {
      pair = groups[value].slice(0, 2);
    }
  }
  
  if (threeOfAKind && pair) {
    return { found: true, cards: [...threeOfAKind, ...pair] };
  }
  
  return { found: false };
}

// Флеш (5 карт одной масти)
function isFlush(cards) {
  // Группируем карты по масти
  const suits = {};
  cards.forEach(card => {
    if (!suits[card.suit]) suits[card.suit] = [];
    suits[card.suit].push(card);
  });
  
  // Ищем группу из 5+ карт одной масти
  for (const suit in suits) {
    if (suits[suit].length >= 5) {
      return { found: true, cards: suits[suit].slice(0, 5) };
    }
  }
  
  return { found: false };
}

// Стрит (5 последовательных карт)
function isStraight(cards) {
  // Удаляем дубликаты по значению
  const uniqueValues = [];
  const seen = {};
  
  cards.forEach(card => {
    if (!seen[card.value]) {
      seen[card.value] = true;
      uniqueValues.push(card);
    }
  });
  
  // Сортируем уникальные значения
  uniqueValues.sort((a, b) => b.value - a.value);
  
  // Проверяем каждую возможную начальную позицию для стрита
  for (let i = 0; i < uniqueValues.length - 4; i++) {
    if (uniqueValues[i].value - uniqueValues[i + 4].value === 4) {
      return { found: true, cards: uniqueValues.slice(i, i + 5) };
    }
  }
  
  // Проверка на стрит от 5 до туза (A-5-4-3-2)
  if (
    uniqueValues.some(card => card.value === 14) && // Есть туз
    uniqueValues.some(card => card.value === 2) && 
    uniqueValues.some(card => card.value === 3) && 
    uniqueValues.some(card => card.value === 4) && 
    uniqueValues.some(card => card.value === 5)
  ) {
    // Собираем карты для A-5-4-3-2
    const aceToFive = [
      uniqueValues.find(card => card.value === 14),
      uniqueValues.find(card => card.value === 5),
      uniqueValues.find(card => card.value === 4),
      uniqueValues.find(card => card.value === 3),
      uniqueValues.find(card => card.value === 2)
    ];
    
    return { found: true, cards: aceToFive };
  }
  
  return { found: false };
}

// Тройка (3 карты одного достоинства)
function isThreeOfAKind(cards) {
  // Группируем карты по значению
  const groups = {};
  cards.forEach(card => {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  });
  
  // Ищем группу из 3 карт
  for (const value in groups) {
    if (groups[value].length === 3) {
      // Находим лучшие две другие карты (кикеры)
      const kickers = cards
        .filter(card => card.value != value)
        .slice(0, 2);
      
      return { found: true, cards: [...groups[value], ...kickers] };
    }
  }
  
  return { found: false };
}

// Две пары
function isTwoPairs(cards) {
  // Группируем карты по значению
  const groups = {};
  cards.forEach(card => {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  });
  
  const pairs = [];
  
  // Ищем пары
  for (const value in groups) {
    if (groups[value].length >= 2) {
      pairs.push(groups[value].slice(0, 2));
    }
  }
  
  if (pairs.length >= 2) {
    // Сортируем пары от самой высокой к самой низкой
    pairs.sort((a, b) => b[0].value - a[0].value);
    
    // Выбираем две старшие пары
    const topPairs = [].concat(pairs[0], pairs[1]);
    
    // Находим лучшую пятую карту (кикер)
    const usedValues = [pairs[0][0].value, pairs[1][0].value];
    const kicker = cards.find(card => !usedValues.includes(card.value));
    
    return { found: true, cards: [...topPairs, kicker] };
  }
  
  return { found: false };
}

// Одна пара
function isOnePair(cards) {
  // Группируем карты по значению
  const groups = {};
  cards.forEach(card => {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  });
  
  // Ищем пару
  for (const value in groups) {
    if (groups[value].length === 2) {
      // Находим лучшие три другие карты (кикеры)
      const kickers = cards
        .filter(card => card.value != value)
        .slice(0, 3);
      
      return { found: true, cards: [...groups[value], ...kickers] };
    }
  }
  
  return { found: false };
}

// Функция для красивого описания карт
function getCardDescriptions(cards) {
  const valueMap = {
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    '11': 'Валет',
    '12': 'Дама',
    '13': 'Король',
    '14': 'Туз'
  };
  
  const suitMap = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };
  
  return cards.map(card => {
    const valueName = card.original ? card.original : valueMap[card.value.toString()];
    const suitSymbol = suitMap[card.suit];
    return `${valueName}${suitSymbol}`;
  }).join(', ');
}

module.exports = {
  createDeck,
  shuffleDeck,
  dealCards,
  dealCommunityCards,
  nextRound,
  nextTurn,
  evaluateHand,
  determineWinner
}; 