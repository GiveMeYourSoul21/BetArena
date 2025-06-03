// Константы для карт
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Карта sessionId -> колода и выданные карты
const sessionDeckMap = new Map();

// Карта sessionId -> массивы мастей для стабильности
const sessionCardMap = new Map();

// Создаем случайные карты для каждой сессии игры
// Эти массивы будут использоваться для обеспечения разнообразия карт
let sessionCommunityValues = [];
let sessionPlayerValues = [];
// Фиксированные масти для текущей сессии
let sessionPlayerSuits = [];
let sessionCommunitySuits = [];

// Загружаем сохраненные колоды из localStorage при загрузке
function loadSavedDecks() {
  try {
    const savedDecks = localStorage.getItem('pokerDecks');
    if (savedDecks) {
      const decksData = JSON.parse(savedDecks);
      
      // Восстанавливаем данные для каждой сохраненной колоды
      Object.keys(decksData).forEach(sessionId => {
        const deckData = decksData[sessionId];
        
        // Преобразуем обратно Set для использованных карт
        const usedSet = new Set(deckData.used);
        
        sessionDeckMap.set(sessionId, {
          deck: deckData.deck,
          used: usedSet,
          playerCards: deckData.playerCards || [],
          communityCards: deckData.communityCards || [],
          botCards: deckData.botCards || {}  // Восстанавливаем карты ботов
        });
        
      });
    }
  } catch (error) {
    console.error('Ошибка при загрузке сохраненных колод:', error);
  }
}

// Сохраняем состояние колод в localStorage
function saveDecksState() {
  try {
    const decksData = {};
    
    // Сохраняем данные каждой колоды
    sessionDeckMap.forEach((value, key) => {
      decksData[key] = {
        deck: value.deck,
        used: Array.from(value.used), // Преобразуем Set в массив для JSON
        playerCards: value.playerCards,
        communityCards: value.communityCards,
        botCards: value.botCards || {}  // Сохраняем карты ботов
      };
    });
    
    localStorage.setItem('pokerDecks', JSON.stringify(decksData));
    
  } catch (error) {
    console.error('Ошибка при сохранении колод:', error);
  }
}

// Загружаем сохраненные колоды при инициализации
loadSavedDecks();

// Периодически сохраняем состояние колод
setInterval(saveDecksState, 3000);

// Функция для очистки данных о картах для конкретной игры
export function clearGameDeck(gameId) {
  if (sessionDeckMap.has(gameId)) {
    sessionDeckMap.delete(gameId);
    saveDecksState();
    console.log(`Очищена колода для игры ${gameId}`);
    return true;
  }
  return false;
}

// Инициализация полной колоды для сессии
function initSessionDeck(sessionId) {
  // Если колода уже существует для этой сессии, используем ее
  if (sessionDeckMap.has(sessionId)) {
    console.log(`Колода для сессии ${sessionId} уже существует, используем ее`);
    return sessionDeckMap.get(sessionId);
  }

  // Создаем полную колоду карт
  const deck = [];
  
  // Заполняем колоду всеми возможными картами
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  
  // Перемешиваем колоду
  const shuffledDeck = shuffleDeck(deck);
  
  // Сохраняем колоду для этой сессии
  sessionDeckMap.set(sessionId, {
    deck: shuffledDeck,     // Колода
    used: new Set(),        // Использованные карты
    playerCards: [],        // Карты игрока
    communityCards: [],     // Общие карты
    botCards: {}            // Карты ботов в формате {ключ: карта}
  });
  
  console.log(`Инициализирована новая колода для сессии ${sessionId}`);
  saveDecksState(); // Сохраняем сразу после инициализации
  
  return sessionDeckMap.get(sessionId);
}

// Функция для проверки существующих карт в сессии
export function getExistingCards(sessionId) {
  const sessionDeck = sessionDeckMap.get(sessionId);
  if (!sessionDeck) return { playerCards: [], communityCards: [] };
  
  return {
    playerCards: sessionDeck.playerCards,
    communityCards: sessionDeck.communityCards
  };
}

// Функция для получения следующей карты из колоды
function getNextCardFromDeck(sessionId, cardType, cardIndex) {
  let sessionDeck = sessionDeckMap.get(sessionId);
  
  // Если для этой сессии нет колоды, создаем новую
  if (!sessionDeck) {
    sessionDeck = initSessionDeck(sessionId);
  }

  // Если у нас уже есть карта с таким индексом, используем ее
  if (cardType === 'player' && sessionDeck.playerCards[cardIndex]) {
    return sessionDeck.playerCards[cardIndex];
  } else if (cardType === 'community' && sessionDeck.communityCards[cardIndex]) {
    return sessionDeck.communityCards[cardIndex];
  } else if (cardType === 'bot') {
    // Для карт ботов создаем специальную мапу, если её еще нет
    if (!sessionDeck.botCards) {
      sessionDeck.botCards = {};
    }
    
    // Если у бота уже есть карта с таким ключом, возвращаем её
    if (sessionDeck.botCards[cardIndex]) {
      return sessionDeck.botCards[cardIndex];
    }
  }
  
  // Находим карту, которая еще не была использована
  for (let i = 0; i < sessionDeck.deck.length; i++) {
    const cardKey = `${sessionDeck.deck[i].value}-${sessionDeck.deck[i].suit}`;
    
    // Если карта еще не использовалась, берем ее
    if (!sessionDeck.used.has(cardKey)) {
      // Отмечаем карту как использованную
      sessionDeck.used.add(cardKey);
      
      // Определяем тип карты и сохраняем её
      if (cardType === 'player') {
        // Если нужно, расширяем массив
        while (sessionDeck.playerCards.length <= cardIndex) {
          sessionDeck.playerCards.push(null);
        }
        sessionDeck.playerCards[cardIndex] = sessionDeck.deck[i];
      } else if (cardType === 'community') {
        // Если нужно, расширяем массив
        while (sessionDeck.communityCards.length <= cardIndex) {
          sessionDeck.communityCards.push(null);
        }
        sessionDeck.communityCards[cardIndex] = sessionDeck.deck[i];
      } else if (cardType === 'bot') {
        // Сохраняем карту бота по ключу
        sessionDeck.botCards[cardIndex] = sessionDeck.deck[i];
      }
      
      saveDecksState(); // Сохраняем состояние после изменения
      return sessionDeck.deck[i];
    }
  }
  
  // Если все карты уже использованы (что маловероятно), возвращаем случайную
  console.warn('Все карты в колоде уже использованы! Создаем новую колоду.');
  sessionDeck = initSessionDeck(sessionId);
  return getNextCardFromDeck(sessionId, cardType, cardIndex);
}

// Инициализация случайных значений для текущей сессии
function initSessionCards() {
  // Перемешиваем значения для общих карт
  sessionCommunityValues = [...VALUES].sort(() => Math.random() - 0.5);
  
  // Перемешиваем значения для карт игрока
  sessionPlayerValues = [...VALUES].sort(() => Math.random() - 0.5);
  
  // Фиксируем масти для карт игрока
  sessionPlayerSuits = [];
  for (let i = 0; i < 5; i++) {
    // Выбираем случайную масть для каждой позиции карты
    sessionPlayerSuits.push(SUITS[Math.floor(Math.random() * SUITS.length)]);
  }
  
  // Фиксируем масти для карт на столе
  sessionCommunitySuits = [];
  for (let i = 0; i < 5; i++) {
    // Перемешиваем масти для каждой позиции
    const shuffledSuits = [...SUITS].sort(() => Math.random() - 0.5);
    sessionCommunitySuits.push(shuffledSuits[0]);
  }
  
  console.log("Инициализированы новые случайные карты для сессии", {
    playerSuits: sessionPlayerSuits,
    communitySuits: sessionCommunitySuits
  });
}

// Функция для получения уникальных мастей для конкретной игровой сессии
function getSessionSuits(sessionId) {
  // Если для этой сессии еще нет данных, создаем их
  if (!sessionCardMap.has(sessionId)) {
    const playerSuits = [];
    const communitySuits = [];
    
    // Создаем стабильные масти для карт игрока
    for (let i = 0; i < 5; i++) {
      playerSuits.push(SUITS[Math.floor(Math.random() * SUITS.length)]);
    }
    
    // Создаем стабильные масти для общих карт
    for (let i = 0; i < 5; i++) {
      // Обеспечиваем разнообразие мастей для карт на столе
      communitySuits.push(SUITS[i % SUITS.length]);
    }
    
    // Сохраняем в карту для этой сессии
    sessionCardMap.set(sessionId, { playerSuits, communitySuits });
    
    console.log(`Созданы новые масти для сессии ${sessionId}:`, { playerSuits, communitySuits });
  }
  
  return sessionCardMap.get(sessionId);
}

// Инициализируем при загрузке модуля
initSessionCards();

// Каждые 10 минут обновляем случайные карты
setInterval(initSessionCards, 10 * 60 * 1000);

// Создание новой колоды
export const createDeck = (numberOfDecks = 1) => {
  const deck = [];
  
  for (let d = 0; d < numberOfDecks; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({
          suit,
          value,
          hidden: false,
          id: `${value}-${suit}-${d}` // Уникальный идентификатор для анимации
        });
      }
    }
  }
  
  return deck;
};

// Перемешивание колоды (алгоритм Фишера-Йетса)
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Функция для получения URL изображения карты
export function getCardImage(card) {
  // Если карта скрыта или не существует, возвращаем рубашку
  if (!card || card.hidden) {
    return '/cards/Back.png';
  }
  
  // Получаем исходное значение карты
  let value = card.value;
  let suit = card.suit;
  
  // Преобразуем полные названия мастей в сокращенные (S, H, C, D)
  const suitMap = {
    'hearts': 'H',
    'diamonds': 'D',
    'clubs': 'C',
    'spades': 'S'
  };
  
  // Используем систему гарантии уникальности карт
  if (card.sessionId) {
    // Получаем или инициализируем колоду для этой сессии
    let sessionData = sessionDeckMap.get(card.sessionId);
    if (!sessionData) {
      sessionData = initSessionDeck(card.sessionId);
    }
    
    // Для карт игрока берем из сохраненных или генерируем новую
    if (card.isPlayerCard && card.playerCardIndex !== undefined) {
      // Генерируем новую карту, если нужно
      const newCard = getNextCardFromDeck(card.sessionId, 'player', card.playerCardIndex);
      value = newCard.value;
      suit = newCard.suit;
      
      // Логирование для отладки
      console.log(`Карта игрока ${value}-${suit} получена из колоды`);
    }
    // Для карт ботов - генерируем уникальные карты с использованием botIndex
    else if (!card.isPlayerCard && card.playerCardIndex !== undefined && card.botIndex !== undefined) {
      // Формируем уникальный ключ для карты бота
      const botCardKey = `bot-${card.botIndex}-${card.playerCardIndex}`;
      
      // Генерируем новую карту для бота
      const newCard = getNextCardFromDeck(card.sessionId, 'bot', botCardKey);
      value = newCard.value;
      suit = newCard.suit;
      
      // Логирование для отладки
      console.log(`Карта бота ${card.botIndex} (индекс ${card.playerCardIndex}): ${value}-${suit}`);
    }
    // Для общих карт берем из сохраненных или генерируем новую
    else if (!card.isPlayerCard && card.communityIndex !== undefined) {
      // Генерируем новую карту, если нужно
      const newCard = getNextCardFromDeck(card.sessionId, 'community', card.communityIndex);
      value = newCard.value;
      suit = newCard.suit;
      
      // Логирование для отладки
      console.log(`Общая карта ${value}-${suit} получена из колоды`);
    }
  }
  
  // Получаем сокращение масти
  const suitCode = suitMap[suit];
  
  // Проверка на некорректную масть
  if (!suitCode) {
    console.warn(`Неизвестная масть: ${suit}, заменяем на H`);
    return `/cards/${value}-H.png`;
  }
  
  // Формат имен файлов: <value>-<suit>.png (например: A-S.png, 10-H.png)
  return `/cards/${value}-${suitCode}.png`;
}

// Подсчет очков руки
export const calculateHandValue = (cards) => {
  let value = 0;
  let aces = 0;

  cards.forEach(card => {
    if (card.value === 'A') {
      aces += 1;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      value += 10;
    } else {
      value += parseInt(card.value);
    }
  });

  // Подсчет тузов
  for (let i = 0; i < aces; i++) {
    if (value + 11 <= 21) {
      value += 11;
    } else {
      value += 1;
    }
  }

  return value;
}; 