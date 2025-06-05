const http = require('http');
const { createDeck, shuffleDeck, dealCards, validateGameCards } = require('./server/utils/pokerUtils');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve(jsonData);
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}, body: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testRandomCards() {
  console.log('🃏 ТЕСТ СЛУЧАЙНОСТИ КАРТ');
  
  try {
    // Создаем несколько игр подряд для проверки различных карт
    for (let i = 1; i <= 3; i++) {
      console.log(`\n=== Игра ${i} ===`);
      
      console.log('Отправляем запрос на создание игры...');
      const createData = await makeRequest('/api/poker/create', 'POST', {
        userId: 10,
        gameType: 'texas-holdem'
      });
      
      console.log('Ответ создания игры:', createData);
      const gameId = createData.gameId;
      console.log(`Создана игра: ${gameId}`);
      
      if (!gameId) {
        console.error('Не получен gameId!');
        continue;
      }
      
      // Получаем данные игры
      console.log('Запрашиваем данные игры...');
      const gameData = await makeRequest(`/api/poker/${gameId}`);
      console.log('Получены данные игры:', Object.keys(gameData));
      
      if (!gameData.players) {
        console.error('Нет данных об игроках!');
        continue;
      }
      
      // Показываем карты всех игроков
      console.log('Карты игроков:');
      gameData.players.forEach((player, index) => {
        if (player.cards && player.cards.length >= 2) {
          const card1 = `${player.cards[0].value} ${player.cards[0].suit}`;
          const card2 = `${player.cards[1].value} ${player.cards[1].suit}`;
          console.log(`  ${index}: ${player.username} - ${card1}, ${card2}`);
        } else {
          console.log(`  ${index}: ${player.username} - НЕТ КАРТ`);
        }
      });
      
      // Небольшая пауза между играми
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Тест завершен - проверьте различаются ли карты между играми');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error.message, error.stack);
  }
}

async function testRounds() {
  console.log('\n🎯 ТЕСТ ФЛОПА/ТЕРНА/РИВЕРА');
  
  try {
    // Создаем игру
    const createData = await makeRequest('/api/poker/create', 'POST', {
      userId: 10,
      gameType: 'texas-holdem'
    });
    
    const gameId = createData.gameId;
    console.log(`🎮 Создана игра для тестирования раундов: ${gameId}`);
    
    // Проверяем начальное состояние
    let gameData = await makeRequest(`/api/poker/${gameId}`);
    console.log(`📊 Начальный раунд: ${gameData.currentRound || gameData.settings?.currentRound}`);
    console.log(`🃏 Общие карты: ${gameData.settings?.communityCards?.length || 0}`);
    
    // Симулируем несколько ходов игрока для перехода к флопу
    let attempts = 0;
    while (attempts < 10) {
      gameData = await makeRequest(`/api/poker/${gameId}`);
      
      const currentRound = gameData.currentRound || gameData.settings?.currentRound;
      const communityCards = gameData.settings?.communityCards?.length || 0;
      
      console.log(`🔄 Попытка ${attempts + 1}: Раунд=${currentRound}, Общие карты=${communityCards}, Статус=${gameData.status}`);
      
      if (gameData.status === 'finished') {
        console.log('✅ Игра завершена!');
        break;
      }
      
      if (currentRound === 'flop' && communityCards >= 3) {
        console.log('🎉 ФЛОП достигнут! Общие карты:', gameData.settings.communityCards);
        break;
      }
      
      if (currentRound === 'turn' && communityCards >= 4) {
        console.log('🎉 ТЕРН достигнут! Общие карты:', gameData.settings.communityCards);
        break;
      }
      
      if (currentRound === 'river' && communityCards >= 5) {
        console.log('🎉 РИВЕР достигнут! Общие карты:', gameData.settings.communityCards);
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем боты сыграют
    }
    
  } catch (error) {
    console.error('❌ Ошибка в тесте раундов:', error.message);
  }
}

async function runTests() {
  await testRandomCards();
  await testRounds();
}

runTests();

console.log('🃏 Тестируем систему карт...\n');

// 1. Тестируем создание колоды
console.log('1. Тестируем создание колоды:');
const deck = createDeck();
console.log(`   - Создана колода из ${deck.length} карт`);

// 2. Проверяем уникальность карт в колоде
console.log('\n2. Проверяем уникальность карт в колоде:');
const cardKeys = new Set();
const duplicatesInDeck = [];

deck.forEach((card, index) => {
  const key = `${card.value}-${card.suit}`;
  if (cardKeys.has(key)) {
    duplicatesInDeck.push(`Индекс ${index}: ${key}`);
  } else {
    cardKeys.add(key);
  }
});

if (duplicatesInDeck.length === 0) {
  console.log('   ✅ Все карты в колоде уникальны');
} else {
  console.log('   ❌ Найдены дубликаты в колоде:', duplicatesInDeck);
}

// 3. Тестируем игру с 4 игроками
console.log('\n3. Тестируем симуляцию игры:');
const mockGame = {
  players: [
    { username: 'Игрок 1', chips: 1000, cards: [], isBot: false },
    { username: 'Бот 1', chips: 1000, cards: [], isBot: true },
    { username: 'Бот 2', chips: 1000, cards: [], isBot: true },
    { username: 'Бот 3', chips: 1000, cards: [], isBot: true }
  ],
  deck: [],
  settings: {
    communityCards: []
  }
};

// Раздаем карты
dealCards(mockGame);

console.log(`   - Роздано ${mockGame.players.length * 2} карт игрокам`);
console.log(`   - Осталось карт в колоде: ${mockGame.deck.length}`);

// Проверяем уникальность 
const validation = validateGameCards(mockGame);
if (validation.isValid) {
  console.log('   ✅ Все карты уникальны после раздачи');
} else {
  console.log('   ❌ Найдены дубликаты:', validation.errors);
}

// 4. Симулируем выдачу общих карт
console.log('\n4. Симулируем выдачу общих карт:');
const { dealCommunityCards } = require('./server/utils/pokerUtils');

// Флоп - 3 карты
const flopCards = dealCommunityCards(mockGame.deck, 3, mockGame);
mockGame.settings.communityCards.push(...flopCards);
console.log(`   - Флоп: ${flopCards.map(c => `${c.value} ${c.suit}`).join(', ')}`);

// Терн - 1 карта  
const turnCard = dealCommunityCards(mockGame.deck, 1, mockGame);
mockGame.settings.communityCards.push(...turnCard);
console.log(`   - Терн: ${turnCard.map(c => `${c.value} ${c.suit}`).join(', ')}`);

// Ривер - 1 карта
const riverCard = dealCommunityCards(mockGame.deck, 1, mockGame);
mockGame.settings.communityCards.push(...riverCard);
console.log(`   - Ривер: ${riverCard.map(c => `${c.value} ${c.suit}`).join(', ')}`);

// 5. Финальная проверка
console.log('\n5. Финальная проверка всех карт:');
const finalValidation = validateGameCards(mockGame);
if (finalValidation.isValid) {
  console.log(`   ✅ Все ${finalValidation.totalCards} карт уникальны в финальной игре`);
  console.log('   🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!');
} else {
  console.log('   ❌ Найдены дубликаты в финальной игре:', finalValidation.errors);
  console.log('   💥 ТЕСТ ПРОВАЛЕН!');
}

console.log(`\n📊 Итого использовано карт: ${finalValidation.totalCards}/52`);
console.log(`📦 Осталось в колоде: ${mockGame.deck.length} карт\n`); 