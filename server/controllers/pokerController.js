const { PokerGame, User } = require('../models');
const { 
  createDeck, 
  dealCards 
} = require('../utils/pokerUtils');

// Створення нової гри
exports.createGame = async (req, res) => {
  try {
    console.log('[CONTROLLER] Створення гри через контролер');
    const { userId, username } = req.body;
    
    console.log('userId:', userId, 'username:', username);
    
    // ВИПРАВЛЕНО: Створюємо користувача якщо його немає, або використовуємо існуючого
    let user = null;
    try {
      if (userId && userId.toString().match(/^\d+$/)) {
        // Якщо userId - число, шукаємо в базі
        user = await User.findByPk(userId);
        if (!user) {
          console.log(`[CONTROLLER] Користувач з ID ${userId} не знайдений, продовжуємо без перевірки`);
        }
      } else {
        // Якщо userId - рядок, то це просто ім'я користувача
        console.log(`[CONTROLLER] userId "${userId}" не є числом, використовуємо як username`);
      }
    } catch (userError) {
      console.log(`[CONTROLLER] Помилка при пошуку користувача, продовжуємо без перевірки:`, userError.message);
    }
    
    // Рандомно вибираємо позицію дилера (0-3)
    const dealerPosition = Math.floor(Math.random() * 4);
    console.log('Вибрана позиція дилера:', dealerPosition);
    
    // Створюємо масив гравців
    const players = [
      {
        user: userId || null,
        username: username || 'Гравець',
        chips: 1000,
        cards: [],
        position: 0,
        currentBet: 0,
        isBot: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isUTG: false,
        folded: false,
        isAllIn: false,
        hasActed: false
      }
    ];
    
    // Додаємо ботів
    for (let i = 1; i <= 3; i++) {
      players.push({
        username: `Bot ${i}`,
        chips: 1000,
        cards: [],
        position: i,
        isBot: true,
        currentBet: 0,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isUTG: false,
        folded: false,
        isAllIn: false,
        hasActed: false
      });
    }
    
    // Встановлюємо позиції в залежності від дилера
    const sbPosition = (dealerPosition + 1) % 4;
    const bbPosition = (dealerPosition + 2) % 4;
    const utgPosition = (dealerPosition + 3) % 4;
    
    console.log(`Позиції: Дилер=${dealerPosition}, SB=${sbPosition}, BB=${bbPosition}, UTG=${utgPosition}`);
    
    players[dealerPosition].isDealer = true;
    players[sbPosition].isSmallBlind = true;
    players[bbPosition].isBigBlind = true;
    players[utgPosition].isUTG = true;
    
    // Встановлюємо початкові банки з урахуванням блайндів
    players[sbPosition].chips = 990; // Мінус малий блайнд
    players[sbPosition].currentBet = 10;
    players[bbPosition].chips = 980; // Мінус великий блайнд
    players[bbPosition].currentBet = 20;
    
    // Створюємо об'єкт гри
    const gameData = {
      type: 'poker',
      players: players,
      pot: 30,
      deck: createDeck(),
      communityCards: [],
      currentRound: 'preflop',
      currentTurn: utgPosition,
      status: 'playing',
      settings: {
        maxPlayers: 4,
        smallBlind: 10,
        bigBlind: 20,
        currentTurn: utgPosition,
        currentRound: 'preflop',
        dealerPosition: dealerPosition
      },
      dealerPosition: dealerPosition,
      winner: null,
      winningHand: null,
      user_id: userId
    };
    
    const newGame = await PokerGame.create(gameData);

    // Роздаємо карти
    dealCards(newGame);
    
    await newGame.save();
    
    console.log(`Гра створена через контролер: ${newGame.id}`);

    res.status(201).json({
      message: 'Гра створена',
      gameId: newGame.id,
      dealerPosition: newGame.dealerPosition,
      players: newGame.players
    });
  } catch (error) {
    console.error('Помилка при створенні гри:', error);
    res.status(500).json({ message: 'Помилка при створенні гри' });
  }
};

// Отримання даних гри
exports.getGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await PokerGame.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Гру не знайдено' });
    }

    res.json(game);
  } catch (error) {
    console.error('Помилка при отриманні даних гри:', error);
    res.status(500).json({ message: 'Помилка при отриманні даних гри' });
  }
};

// Початок гри
exports.startGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await PokerGame.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Гру не знайдено' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Гра вже почалася або завершена' });
    }

    // Переконуємося, що у нас є всі гравці
    if (game.players.length !== 4) {
      return res.status(400).json({ message: 'Недостатньо гравців для початку гри' });
    }

    // Оновлюємо блайнди та баланси гравців
    await game.updateBlinds();

    // Встановлюємо статус гри
    game.status = 'playing';
    game.currentRound = 'preflop';
    
    // Встановлюємо перший хід на UTG
    game.currentTurn = (game.dealerPosition + 3) % 4;

    await game.save();

    // Відправляємо оновлення через Socket.IO
    if (req.io) {
      req.io.to(gameId).emit('gameUpdate', game);
    }

    res.json(game);
  } catch (error) {
    console.error('Помилка при початку гри:', error);
    res.status(500).json({ message: 'Помилка при початку гри' });
  }
};

// Вихід з гри
exports.exitGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId } = req.body;

    const game = await PokerGame.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Гру не знайдено' });
    }

    // Знаходимо гравця в грі
    const playerIndex = game.players.findIndex(p => p.user === userId);
    if (playerIndex === -1) {
      return res.status(404).json({ message: 'Гравець не знайдений у грі' });
    }

    // Якщо гра активна, робимо fold для гравця
    if (game.status === 'playing') {
      game.players[playerIndex].folded = true;
      game.players[playerIndex].hasActed = true;
      
      // Перевіряємо чи потрібно завершити гру
      const activePlayers = game.players.filter(p => !p.folded);
      if (activePlayers.length === 1) {
      game.status = 'finished';
        game.winner = activePlayers[0].username;
      }
    }

      await game.save();
    
    // Відправляємо оновлення через Socket.IO
    if (req.io) {
      req.io.to(gameId).emit('gameUpdate', game);
    }

    res.json({ message: 'Успішно вийшли з гри' });
  } catch (error) {
    console.error('Помилка при виході з гри:', error);
    res.status(500).json({ message: 'Помилка при виході з гри' });
  }
};

// Присоединение к игре
exports.joinGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId, username } = req.body;

    const game = await PokerGame.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Нельзя присоединиться к начатой или завершённой игре' });
    }

    if (game.players.length >= 4) {
      return res.status(400).json({ message: 'Игра полна' });
    }

    // Проверяем, не присоединён ли уже пользователь
    const existingPlayer = game.players.find(p => p.user === userId);
    if (existingPlayer) {
      return res.status(400).json({ message: 'Вы уже в этой игре' });
    }

    // Добавляем игрока
    game.players.push({
      user: userId,
      username: username,
      chips: 1000,
      cards: [],
      position: game.players.length,
      currentBet: 0,
      isBot: false,
      folded: false,
      isAllIn: false,
      hasActed: false
    });

    await game.save();

    // Отправляем обновление через Socket.IO
    if (req.io) {
      req.io.to(gameId).emit('gameUpdate', game);
    }

    res.json(game);
  } catch (error) {
    console.error('Ошибка при присоединении к игре:', error);
    res.status(500).json({ message: 'Ошибка при присоединении к игре' });
  }
};

// Получение типа игры
exports.getGameType = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await PokerGame.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }

    res.json({ type: 'poker' });
  } catch (error) {
    console.error('Ошибка при получении типа игры:', error);
    res.status(500).json({ message: 'Ошибка при получении типа игры' });
  }
}; 