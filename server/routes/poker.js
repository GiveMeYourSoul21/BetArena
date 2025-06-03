const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PokerGame = require('../models/PokerGame');
const User = require('../models/User');
const { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  dealCommunityCards, 
  nextRound, 
  nextTurn,
  determineWinner
} = require('../utils/pokerUtils');
const crypto = require('crypto');

// ДОБАВЛЕНО: защита от множественных запусков ботов для одной игры
const processingGames = new Set();
// ДОБАВЛЕНО: защита от множественных запусков следующих игр
const startingNextGames = new Set();

/**
 * @route   GET /api/poker/test
 * @desc    Тестовый эндпоинт
 * @access  Public
 */
router.get('/test', (req, res) => {
  console.log('[TEST] Тестовый эндпоинт вызван');
  res.json({ message: 'Poker router работает!', timestamp: new Date() });
});

/**
 * @route   POST /api/poker/debug
 * @desc    Отладочный эндпоинт для проверки POST-запросов
 * @access  Public
 */
router.post('/debug', (req, res) => {
  console.log('[DEBUG] Отладочный POST эндпоинт вызван');
  console.log('Параметры:', req.params);
  console.log('Тело запроса:', req.body);
  res.json({ 
    message: 'POST route работает!', 
    params: req.params,
    body: req.body,
    timestamp: new Date() 
  });
});

/**
 * @route   POST /api/poker/create
 * @desc    Создание новой покерной игры с установкой блайндов
 * @access  Public
 */
router.post('/create', async (req, res) => {
  try {
    console.log('[CREATE] ================ СОЗДАНИЕ ИГРЫ НАЧАТО ================');
    const { userId, username } = req.body;
    
    console.log('=== Создание новой игры ===');
    console.log('req.body:', req.body);
    console.log('userId:', userId, 'username:', username);
    
    // Рандомно выбираем позицию дилера (0-3)
    const dealerPosition = Math.floor(Math.random() * 4);
    console.log('Выбрана позиция дилера:', dealerPosition);
    
    // Создаем массив игроков
    const players = [
      {
        user: userId,
        username: username,
      chips: 1000,
      cards: [],
        position: 0,
      currentBet: 0,
        isBot: false,
      isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isUTG: false
      }
    ];
    
    // Добавляем ботов 
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
        isUTG: false
      });
    }
    
    // Устанавливаем позиции в зависимости от дилера
    const sbPosition = (dealerPosition + 1) % 4;
    const bbPosition = (dealerPosition + 2) % 4;
    const utgPosition = (dealerPosition + 3) % 4;
    
    console.log(`Позиции: Дилер=${dealerPosition}, SB=${sbPosition}, BB=${bbPosition}, UTG=${utgPosition}`);
    
    players[dealerPosition].isDealer = true;
    players[sbPosition].isSmallBlind = true;
    players[bbPosition].isBigBlind = true;
    players[utgPosition].isUTG = true;
    
    // Устанавливаем начальные банки с учетом блайндов
    players[sbPosition].chips = 990; // Минус малый блайнд
    players[sbPosition].currentBet = 10;
    players[bbPosition].chips = 980; // Минус большой блайнд
    players[bbPosition].currentBet = 20;
    
    console.log('Игроки после установки позиций:');
    players.forEach((player, index) => {
      console.log(`Игрок ${index}: chips=${player.chips}, bet=${player.currentBet}, isDealer=${player.isDealer}, isSB=${player.isSmallBlind}, isBB=${player.isBigBlind}, isUTG=${player.isUTG}`);
    });
    
    // Создаем объект игры с явным указанием всех полей
    const gameData = {
      type: 'poker',
      players: players.map(player => ({
        user: player.user || null,
        username: player.username,
        chips: player.chips,
        cards: player.cards || [],
        position: player.position,
        currentBet: player.currentBet,
        isBot: player.isBot,
        isDealer: player.isDealer,
        isSmallBlind: player.isSmallBlind,
        isBigBlind: player.isBigBlind,
        isUTG: player.isUTG,
        folded: false,
        isAllIn: false,
        hasActed: false
      })),
      pot: 30,
      deck: createDeck(),
      communityCards: [],
      currentRound: 'preflop',
      currentTurn: utgPosition,
      status: 'playing',
      settings: {
        maxPlayers: 4,
        smallBlind: 10,
        bigBlind: 20
      },
      dealerPosition: dealerPosition,
      winner: null,
      winningHand: null,
      createdAt: new Date()
    };
    
    console.log('Создаем игру с данными:', JSON.stringify(gameData, null, 2));
    
    const newGame = new PokerGame(gameData);
    
    // Раздаем карты
    dealCards(newGame);
    
    // ОТЛАДКА: проверяем что данные не потерялись после dealCards
    console.log('=== ПОСЛЕ dealCards ===');
    newGame.players.forEach((player, index) => {
      console.log(`Игрок ${index}: username=${player.username}, chips=${player.chips}, bet=${player.currentBet}, isDealer=${player.isDealer}, isSB=${player.isSmallBlind}, isBB=${player.isBigBlind}, isUTG=${player.isUTG}, cards=${player.cards?.length || 0}`);
    });
    
    await newGame.save();
    
    console.log(`Игра создана: Дилер=${dealerPosition}, SB=${sbPosition}, BB=${bbPosition}, UTG=${utgPosition}`);
    console.log('Банк игры:', newGame.pot);
    console.log('ID созданной игры:', newGame._id);
    
    // Отладка: проверяем все условия для запуска бота
    console.log('=== ОТЛАДКА ЗАПУСКА БОТОВ ПРИ СОЗДАНИИ ===');
    console.log('newGame.status:', newGame.status);
    console.log('newGame.currentTurn:', newGame.currentTurn);
    console.log('Игрок на ходе:', newGame.players[newGame.currentTurn]);
    if (newGame.players[newGame.currentTurn]) {
      console.log('Это бот?:', newGame.players[newGame.currentTurn].isBot);
      console.log('Не сбросил карты?:', !newGame.players[newGame.currentTurn].folded);
      console.log('Еще не ходил?:', !newGame.players[newGame.currentTurn].hasActed);
    }
    
    // ИСПРАВЛЕНО: более надежный запуск ботов если первый ход у бота
    if (newGame.players[newGame.currentTurn].isBot && !newGame.players[newGame.currentTurn].folded) {
      console.log(`[CREATE] Запускаем первого бота ${newGame.players[newGame.currentTurn].username}`);
      
      const gameId = newGame._id.toString();
      setTimeout(async () => {
        try {
          console.log(`[CREATE] ⚡ ВЫПОЛНЯЕМ processBotAction для созданной игры ${gameId}`);
          
          // Проверяем что первый игрок действительно бот и должен ходить
          const freshGame = await PokerGame.findById(gameId);
          if (freshGame && 
              freshGame.status === 'playing' && 
              freshGame.players[freshGame.currentTurn] && 
              freshGame.players[freshGame.currentTurn].isBot &&
              !freshGame.players[freshGame.currentTurn].folded &&
              !freshGame.players[freshGame.currentTurn].hasActed) {
            
            console.log(`[CREATE] ✅ Все условия выполнены, запускаем бота ${freshGame.players[freshGame.currentTurn].username}`);
            await processBotAction(gameId);
          } else {
            console.log(`[CREATE] ❌ Условия для запуска бота не выполнены`);
          }
        } catch (error) {
          console.error('[CREATE] ❌ Ошибка при запуске бота в созданной игре:', error);
        }
      }, 4000); // ИЗМЕНЕНО: увеличил с 1000 до 4000ms (4 секунды)
    }
    
    res.json({ gameId: newGame._id });
  } catch (error) {
    console.error('Ошибка при создании игры:', error);
    res.status(500).json({ message: 'Ошибка при создании игры' });
  }
});

/**
 * @route   GET /api/poker/:gameId
 * @desc    Получение информации о конкретной игре
 * @access  Public
 */
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Получаем игру из базы данных
    let game = await PokerGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }
    
    // ДОБАВЛЕНО: проверяем если игра была заменена новой
    if (game.status === 'replaced' && game.nextGameId) {
      console.log(`[GET] Игра ${gameId} была заменена новой ${game.nextGameId}`);
      
      // Получаем новую игру
      const newGame = await PokerGame.findById(game.nextGameId);
      if (newGame) {
        console.log(`[GET] Перенаправляем на новую игру ${game.nextGameId}`);
        
        // Возвращаем новую игру с указанием что это новая игра
        return res.status(200).json({
          ...newGame.toObject(),
          isNewGame: true,
          newGameId: game.nextGameId,
          oldGameId: gameId
        });
      } else {
        console.log(`[GET] Новая игра ${game.nextGameId} не найдена`);
      }
    }
    
    // Применяем middleware для обеспечения корректных значений фишек
    ensureMinimumChips(game);
    
    // Явно устанавливаем карты как видимые для реального игрока (non-bot)
    if (game.players && game.players.length > 0) {
      for (let i = 0; i < game.players.length; i++) {
        if (!game.players[i].isBot && game.players[i].cards && game.players[i].cards.length > 0) {
          // Делаем карты видимыми для реального игрока
          game.players[i].cards.forEach(card => {
            card.hidden = false;
          });
        }
      }
    }
    
    // ДОБАВЛЕНО: принудительная проверка ботов только если текущий игрок - бот который еще не ходил
    if (game.status === 'playing' && 
        game.currentTurn !== undefined &&
        game.players[game.currentTurn] && 
        game.players[game.currentTurn].isBot && 
        !game.players[game.currentTurn].folded &&
        !game.players[game.currentTurn].hasActed) {
      
      console.log(`[GET] 🤖 ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА БОТА в GET-запросе`);
      console.log(`[GET] Бот ${game.players[game.currentTurn].username} (позиция ${game.currentTurn}) должен сделать ход`);
      console.log(`[GET] folded: ${game.players[game.currentTurn].folded}, hasActed: ${game.players[game.currentTurn].hasActed}`);
      
      // Запускаем бота с задержкой чтобы сначала вернуть ответ клиенту
      setImmediate(async () => {
        try {
          console.log(`[GET] Запускаем processBotAction для бота ${game.players[game.currentTurn].username}`);
          await processBotAction(gameId);
        } catch (error) {
          console.error('[GET] Ошибка при принудительном запуске бота:', error);
        }
      });
    }
    
    // Возвращаем данные игры
    res.status(200).json(game);
  } catch (error) {
    console.error('Ошибка при получении данных игры:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Добавляем middleware для обеспечения минимального значения фишек
const ensureMinimumChips = (game) => {
  game.players.forEach(player => {
    if (player.chips < 0) {
      player.chips = 0;
    }
    if (!player.currentBet) {
        player.currentBet = 0;
      }
    });
  return game;
};

/**
 * @route   POST /api/poker/:gameId/action
 * @desc    Обработка действий игрока в покере
 * @access  Public
 */
router.post('/:gameId/action', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId, action, amount = 0 } = req.body;
    
    console.log(`Получено действие: ${action}, игрок: ${userId}, сумма: ${amount}`);
    
    // Получаем игру из базы данных
    let game = await PokerGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }
    
    // ДОБАВЛЕНО: проверяем если игра была заменена новой
    if (game.status === 'replaced' && game.nextGameId) {
      console.log(`[ACTION] Игра ${gameId} была заменена новой ${game.nextGameId}, перенаправляем действие`);
      
      // Получаем новую игру
      const newGame = await PokerGame.findById(game.nextGameId);
      if (newGame) {
        console.log(`[ACTION] Перенаправляем действие на новую игру ${game.nextGameId}`);
        
        // Возвращаем ответ с указанием новой игры
        return res.status(200).json({
          redirectToNewGame: true,
          newGameId: game.nextGameId,
          oldGameId: gameId,
          message: 'Игра была заменена новой. Используйте новый ID.'
        });
      } else {
        console.log(`[ACTION] Новая игра ${game.nextGameId} не найдена`);
        return res.status(404).json({ message: 'Новая игра не найдена' });
      }
    }
    
    // Находим игрока
    const playerIndex = game.players.findIndex(p => 
      p.user && p.user.toString() === userId
    );
    
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'Игрок не найден в игре' });
    }
    
    // Проверяем что сейчас ход этого игрока
    if (game.currentTurn !== playerIndex) {
      return res.status(400).json({ message: 'Сейчас не ваш ход' });
    }
    
    const player = game.players[playerIndex];
    
    // Проверяем что игрок не сбросил карты
    if (player.folded) {
      return res.status(400).json({ message: 'Вы уже сбросили карты в этом раунде' });
    }
    
    // ИСПРАВЛЕНО: убираем проверку hasActed для fold, так как fold можно делать всегда
    if (player.hasActed && action !== 'fold') {
      console.log(`[ACTION] Игрок ${player.username} уже делал ход в этом раунде`);
      // Но разрешаем если это рейз и игрок должен ответить на новую ставку
      const currentBet = Math.max(...game.players.map(p => p.currentBet));
      if (player.currentBet < currentBet) {
        console.log(`[ACTION] Но есть новая ставка для ответа: ${currentBet} vs ${player.currentBet}`);
        player.hasActed = false; // Сбрасываем флаг чтобы игрок мог ответить
      } else {
        return res.status(400).json({ message: 'Вы уже сделали ход в этом раунде' });
      }
    }
    
    const currentBet = Math.max(...game.players.map(p => p.currentBet));
    
    // Обрабатываем действие
    switch (action) {
      case 'fold':
        player.folded = true;
        player.hasActed = true;
        console.log(`Игрок ${player.username} сбросил карты`);
        break;
        
      case 'call':
        const callAmount = currentBet - player.currentBet;
        if (player.chips >= callAmount) {
          player.chips -= callAmount;
          player.currentBet += callAmount;
          game.pot += callAmount;
        player.hasActed = true;
          console.log(`Игрок ${player.username} уравнял ставку: ${callAmount}`);
        } else {
          return res.status(400).json({ message: 'Недостаточно фишек для колла' });
        }
        break;
        
      case 'check':
        if (player.currentBet === currentBet) {
      player.hasActed = true;
          console.log(`Игрок ${player.username} чекнул`);
        } else {
          return res.status(400).json({ message: 'Нельзя чекнуть, есть ставка для уравнения' });
        }
        break;
        
      case 'bet':
      case 'raise':
      const betAmount = parseInt(amount);
        const minRaise = currentBet + 20; // Минимальный рейз = текущая ставка + размер большого блайнда
        
        if (betAmount < minRaise) {
          return res.status(400).json({ message: `Минимальная ставка: ${minRaise}` });
        }
        
        const totalBetNeeded = betAmount - player.currentBet;
        if (player.chips >= totalBetNeeded) {
          player.chips -= totalBetNeeded;
          game.pot += totalBetNeeded;
          player.currentBet = betAmount;
        player.hasActed = true;
        
          // ИСПРАВЛЕНО: сбрасываем hasActed только у НЕ сфолженных игроков при рейзе
          game.players.forEach((p, idx) => {
            if (idx !== playerIndex && !p.folded) {
              p.hasActed = false;
            }
          });
      
          console.log(`Игрок ${player.username} поставил: ${betAmount}`);
          } else {
          return res.status(400).json({ message: 'Недостаточно фишек для ставки' });
        }
        break;
        
      default:
      return res.status(400).json({ message: 'Неизвестное действие' });
    }
    
    // ИСПРАВЛЕНО: улучшенная логика переходов ходов
    const activePlayers = game.players.filter(p => !p.folded);
    console.log(`[ACTION] Активных игроков: ${activePlayers.length}`);
    
    // ДОБАВЛЕНО: детальное логирование состояния всех игроков после действия
    console.log(`[ACTION] ===== СОСТОЯНИЕ ВСЕХ ИГРОКОВ ПОСЛЕ ДЕЙСТВИЯ =====`);
    game.players.forEach((p, idx) => {
      console.log(`[ACTION] Игрок ${idx}: ${p.username}, folded: ${p.folded}, hasActed: ${p.hasActed}, bet: ${p.currentBet}`);
    });
    console.log(`[ACTION] ===================================================`);
    
    if (activePlayers.length === 1) {
      // Только один игрок остался - он победитель и получает банк (НЕ шоудаун)
      const winner = activePlayers[0];
      winner.chips += game.pot;
      game.winner = winner.username;
      game.status = 'finished';
      game.showdown = false; // ДОБАВЛЕНО: НЕ шоудаун - карты не показываем
      console.log(`Игра завершена БЕЗ шоудауна. Победитель: ${game.winner}, получил ${game.pot} фишек`);
    } else {
      // ИСПРАВЛЕНО: правильная проверка игроков которые еще должны сделать ход
      // Игрок должен быть активным (не folded) И не делал ход в этом раунде
      const playersToAct = activePlayers.filter(p => !p.hasActed);
      
      // ДОБАВЛЕНО: проверяем также что все активные игроки имеют одинаковую ставку (кроме all-in)
      const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
      const playersNeedToMatchBet = activePlayers.filter(p => p.currentBet < maxBet && !p.isAllIn);
      
      console.log(`[ACTION] Игроков ожидают хода: ${playersToAct.length}`);
      console.log(`[ACTION] Игроков нужно доставить ставку: ${playersNeedToMatchBet.length}`);
      
      // ДОБАВЛЕНО: детальное логирование для отладки перехода к раундам
      console.log(`[ACTION] ===== АНАЛИЗ ПЕРЕХОДА К РАУНДУ =====`);
      console.log(`[ACTION] maxBet: ${maxBet}`);
      console.log(`[ACTION] Все активные игроки:`);
      activePlayers.forEach((p, idx) => {
        console.log(`[ACTION] - ${p.username}: hasActed=${p.hasActed}, bet=${p.currentBet}, needsBet=${p.currentBet < maxBet}`);
      });
      console.log(`[ACTION] Условие для перехода: playersToAct=${playersToAct.length} == 0 && playersNeedToMatchBet=${playersNeedToMatchBet.length} == 0`);
      console.log(`[ACTION] =======================================`);

      playersToAct.forEach((p, idx) => {
        console.log(`[ACTION] Ожидает хода ${idx}: ${p.username}, currentBet: ${p.currentBet}, folded: ${p.folded}`);
      });

      // ИСПРАВЛЕНО: переходим к следующему раунду только если все сделали ход И все ставки равны
      if (playersToAct.length === 0 && playersNeedToMatchBet.length === 0) {
        console.log(`[ACTION] 🎯 ВСЕ ИГРОКИ ЗАВЕРШИЛИ ТОРГИ - ПЕРЕХОД К СЛЕДУЮЩЕМУ РАУНДУ!`);
        await advanceToNextRound(game);
        
        // ВАЖНО: сохраняем игру после перехода к следующему раунду
        const updatedGame = await PokerGame.findByIdAndUpdate(
          gameId,
          { 
            $set: { 
              currentRound: game.currentRound,
              communityCards: game.communityCards,
              players: game.players,
              currentTurn: game.currentTurn,
              pot: game.pot,
              status: game.status,
              winner: game.winner,
              winningHand: game.winningHand,
              showdown: game.showdown // ДОБАВЛЕНО: сохраняем флаг шоудауна
            }
          },
          { new: true, runValidators: true }
        );
        
        console.log(`[ACTION] 🃏 Раунд изменен на: ${updatedGame.currentRound}`);
        console.log(`[ACTION] 🂡 Общие карты: ${updatedGame.communityCards.length}`);
        
        return res.json({
          success: true,
          game: updatedGame,
          message: `Переход к раунду ${updatedGame.currentRound}`
        });
      }

      // Найти следующего игрока который должен делать ход
      let nextPlayerIndex = playerIndex;
      let attempts = 0;
      
      do {
        nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
        attempts++;
        if (attempts > game.players.length) {
          console.log(`[ACTION] ⚠️ ОШИБКА: Не удалось найти следующего игрока`);
          return res.status(500).json({ message: 'Ошибка определения следующего игрока' });
        }
      } while (game.players[nextPlayerIndex].folded || game.players[nextPlayerIndex].hasActed);

      const nextPlayer = game.players[nextPlayerIndex];
      console.log(`[ACTION] Найден следующий игрок: ${nextPlayer.username} (позиция ${nextPlayerIndex})`);
      console.log(`[ACTION] - hasActed: ${nextPlayer.hasActed}, currentBet: ${nextPlayer.currentBet}, needsBet: ${maxBet}`);
      console.log(`[ACTION] Ход переходит к игроку ${nextPlayerIndex} (${nextPlayer.username})`);

      game.currentTurn = nextPlayerIndex;
    }
    
    // Сохраняем игру
    // ИСПРАВЛЕНО: используем прямое обновление конкретных полей вместо всего массива players
    const updateData = {
      currentTurn: game.currentTurn,
      pot: game.pot,
      currentRound: game.currentRound,
      communityCards: game.communityCards,
      status: game.status,
      winner: game.winner,
      winningHand: game.winningHand,
      showdown: game.showdown // ДОБАВЛЕНО: сохраняем флаг шоудауна
    };
    
    // Обновляем конкретного игрока который сделал ход
    if (playerIndex !== -1) {
      const player = game.players[playerIndex];
      updateData[`players.${playerIndex}.folded`] = player.folded;
      updateData[`players.${playerIndex}.hasActed`] = player.hasActed;
      updateData[`players.${playerIndex}.chips`] = player.chips;
      updateData[`players.${playerIndex}.currentBet`] = player.currentBet;
      updateData[`players.${playerIndex}.isAllIn`] = player.isAllIn;
    }
    
    // ВАЖНО: если это рейз, сбрасываем hasActed для других НЕ сфолженных игроков
    if ((action === 'bet' || action === 'raise') && amount) {
      game.players.forEach((p, idx) => {
        if (idx !== playerIndex && !p.folded) {
          updateData[`players.${idx}.hasActed`] = false;
        }
      });
    }
    
    const updatedGame = await PokerGame.findByIdAndUpdate(
      gameId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    // Обновляем локальную переменную game
    game = updatedGame;
    
    // ДОБАВЛЕНО: детальное логирование сохранения игры
    console.log(`[ACTION] ===== ИГРА СОХРАНЕНА =====`);
    console.log(`[ACTION] ID сохраненной игры: ${game._id}`);
    console.log(`[ACTION] gameId из параметров: ${gameId}`);
    console.log(`[ACTION] currentTurn после сохранения: ${game.currentTurn}`);
    
    // Если игра завершена - автоматически запускаем следующую через 3 секунды
    if (game.status === 'finished') {
      console.log('==================== ИГРА ЗАВЕРШЕНА ПОСЛЕ ДЕЙСТВИЯ ИГРОКА ====================');
      console.log(`Победитель: ${game.winner}`);
      console.log(`Банк: ${game.pot}`);
      console.log('Запускаем следующую игру через 3 секунды...');
      
      // ДОБАВЛЕНО: защита от дублирующихся запусков
      const gameIdStr = game._id.toString();
      if (!startingNextGames.has(gameIdStr)) {
        startingNextGames.add(gameIdStr);
        
        setTimeout(async () => {
          try {
            console.log('==================== ЗАПУСК СЛЕДУЮЩЕЙ ИГРЫ ====================');
            const newGame = await startNextGame(game);
            console.log('==================== СЛЕДУЮЩАЯ ИГРА ЗАПУЩЕНА ====================');
            
            // Удаляем из защитного множества после успешного запуска
            startingNextGames.delete(gameIdStr);
          } catch (error) {
            console.error('Ошибка при автозапуске следующей игры после действия игрока:', error);
            startingNextGames.delete(gameIdStr);
          }
        }, 3000);
      } else {
        console.log('Следующая игра уже запускается для', gameIdStr);
      }
    }
    
    console.log(`Следующий ход: игрок ${game.currentTurn}, раунд: ${game.currentRound}`);
    console.log(`Текущий игрок: ${game.players[game.currentTurn]?.username}, isBot: ${game.players[game.currentTurn]?.isBot}, folded: ${game.players[game.currentTurn]?.folded}`);
    
    // ДОБАВЛЕНО: детальное логирование перед запуском бота
    console.log(`[ACTION] ============ ДЕТАЛЬНАЯ ПРОВЕРКА ПЕРЕД ЗАПУСКОМ БОТА ============`);
    console.log(`[ACTION] game.currentTurn: ${game.currentTurn}`);
    console.log(`[ACTION] game.status: ${game.status}`);
    if (game.players[game.currentTurn]) {
      console.log(`[ACTION] Игрок на позиции ${game.currentTurn}: ${game.players[game.currentTurn].username}`);
      console.log(`[ACTION] isBot: ${game.players[game.currentTurn].isBot}`);
      console.log(`[ACTION] folded: ${game.players[game.currentTurn].folded}`);
      console.log(`[ACTION] hasActed: ${game.players[game.currentTurn].hasActed}`);
    }
    
    // ИСПРАВЛЕНО: улучшенная цепочка автозапуска ботов с защитой от бесконечного цикла
    if (game.status === 'playing' && 
        game.currentTurn !== undefined &&
        game.players[game.currentTurn] && 
        game.players[game.currentTurn].isBot && 
        !game.players[game.currentTurn].folded &&
        !game.players[game.currentTurn].hasActed) {
      
      console.log(`[ACTION] Запускаем следующего бота: ${game.players[game.currentTurn].username} (позиция ${game.currentTurn})`);
      
      // ДОБАВЛЕНО: логирование перед запуском следующего бота
      console.log(`[ACTION] ===== ЗАПУСК СЛЕДУЮЩЕГО БОТА =====`);
      console.log(`[ACTION] Передаем gameId: ${gameId}`);
      console.log(`[ACTION] ID текущей игры: ${game._id}`);
      console.log(`[ACTION] currentTurn для следующего бота: ${game.currentTurn}`);
      
      // Добавляем ЗНАЧИТЕЛЬНУЮ задержку чтобы избежать бесконечного цикла
      setTimeout(() => {
        processBotAction(gameId);
      }, 5000); // ИЗМЕНЕНО: увеличил с 2000 до 5000ms (5 секунд) для более медленной игры
    } else {
      console.log('[ACTION] Цепочка ботов остановлена');
      if (game.status !== 'playing') {
        console.log('- игра завершена, статус:', game.status);
      } else if (!game.players[game.currentTurn]?.isBot) {
        console.log('- следующий ход человека:', game.players[game.currentTurn]?.username);
      } else if (game.players[game.currentTurn]?.folded) {
        console.log('- следующий игрок уже сбросил карты');
      } else if (game.players[game.currentTurn]?.hasActed) {
        console.log('- следующий игрок уже сделал ход');
      }
    }
    
    res.json(game);
    
  } catch (error) {
    console.error('Ошибка при обработке действия:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/**
 * @route   POST /api/poker/:gameId/force-bot
 * @desc    Принудительный запуск застрявшего бота
 * @access  Public
 */
router.post('/:gameId/force-bot', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { botIndex } = req.body;
    
    console.log(`[FORCE-BOT] Получен запрос на принудительный запуск бота ${botIndex} для игры ${gameId}`);
    
    let game = await PokerGame.findById(gameId);
    if (!game) {
      console.log(`[FORCE-BOT] Игра ${gameId} не найдена`);
      return res.status(404).json({ message: 'Игра не найдена' });
    }
    
    console.log(`[FORCE-BOT] Игра найдена. Статус: ${game.status}, currentTurn: ${game.currentTurn}`);
    console.log(`[FORCE-BOT] Запрашиваемый бот: ${botIndex}, текущий игрок: ${game.players[game.currentTurn]?.username}`);
    
    // Запускаем бота независимо от проверок (для отладки)
    console.log(`[FORCE-BOT] Запускаем processBotAction для игры ${gameId}`);
    
    // Немедленный запуск без проверок
    setImmediate(async () => {
      try {
        await processBotAction(gameId);
  } catch (error) {
        console.error('[FORCE-BOT] Ошибка при принудительном запуске бота:', error);
      }
    });
    
    res.json({ message: 'Принудительный запуск бота выполнен', gameId, botIndex });
    
  } catch (error) {
    console.error('[FORCE-BOT] Ошибка:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

/**
 * @route   POST /api/poker/:gameId/status
 * @desc    Изменение статуса игры (например, выход игрока)
 * @access  Public
 */
router.post('/:gameId/status', async (req, res) => {
  console.log('==================== ВХОД В STATUS ROUTE ====================');
  console.log('Параметры:', req.params);
  console.log('Тело запроса:', req.body);
  try {
    const { gameId } = req.params;
    const { userId, status } = req.body;
    
    console.log(`[STATUS] Изменение статуса игры ${gameId} пользователем ${userId} на ${status}`);
    
    let game = await PokerGame.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Игра не найдена' });
    }
    
    // Находим игрока
    const playerIndex = game.players.findIndex(p => 
      p.user && p.user.toString() === userId
    );
    
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'Игрок не найден в игре' });
    }
    
    // Обрабатываем различные статусы
    switch (status) {
      case 'finished':
        // Игрок покидает игру
        game.players[playerIndex].folded = true;
        
        // Если остался только один активный игрок - завершаем игру
        const activePlayers = game.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
          const winner = activePlayers[0];
          winner.chips += game.pot;
          game.winner = winner.username;
          game.status = 'finished';
          console.log(`[STATUS] Игра завершена, победитель: ${game.winner}`);
        }
        
        await game.save();
        console.log(`[STATUS] Игрок ${game.players[playerIndex].username} покинул игру`);
        break;
        
      default:
        return res.status(400).json({ message: 'Неизвестный статус' });
    }
    
    res.json({ message: 'Статус обновлен', game });
    
  } catch (error) {
    console.error('Ошибка при изменении статуса игры:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/**
 * @route   POST /api/poker/:gameId/next-game
 * @desc    Запуск следующей игры с новой раздачей
 * @access  Public
 */
router.post('/:gameId/next-game', async (req, res) => {
  console.log('==================== ВХОД В NEXT-GAME ROUTE ====================');
  console.log('Параметры:', req.params);
  console.log('Тело запроса:', req.body);
  try {
    const { gameId } = req.params;
    
    console.log(`[NEXT-GAME] Запуск следующей игры для ${gameId}`);
    
    let game = await PokerGame.findById(gameId);
    if (!game) {
      console.log(`[NEXT-GAME] Игра не найдена: ${gameId}`);
      return res.status(404).json({ message: 'Игра не найдена' });
    }
    
    console.log(`[NEXT-GAME] Текущий статус игры: ${game.status}`);
    console.log(`[NEXT-GAME] Победитель: ${game.winner}`);
    
    if (game.status !== 'finished') {
      console.log(`[NEXT-GAME] Игра не завершена, статус: ${game.status}`);
      return res.status(400).json({ message: `Текущая игра еще не завершена. Статус: ${game.status}` });
    }
    
    // Переходим к следующей игре
    console.log(`[NEXT-GAME] Запускаем startNextGame...`);
    const newGame = await startNextGame(game);
    
    console.log(`[NEXT-GAME] Новый статус игры: ${newGame.status}`);
    console.log(`[NEXT-GAME] ID новой игры: ${newGame._id}`);
    
    // Возвращаем новую игру с ее ID
    res.json({ 
      message: 'Следующая игра запущена',
      newGameId: newGame._id,
      game: newGame
    });
    
  } catch (error) {
    console.error('Ошибка при запуске следующей игры:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});

// Функция для автоматического запуска следующей игры
async function startNextGame(game) {
  try {
    console.log('[NEXT-GAME] ============= НАЧАЛО СЛЕДУЮЩЕЙ ИГРЫ =============');
    console.log(`[NEXT-GAME] Game ID: ${game._id}`);
    console.log(`[NEXT-GAME] Текущий статус игры: ${game.status}`);
    
    // Проверяем, что у всех игроков есть фишки для продолжения
    const playersWithChips = game.players.filter(player => player.chips >= 20); // Минимум для большого блайнда
    
    console.log(`[NEXT-GAME] Игроки с достаточными фишками: ${playersWithChips.length}`);
    playersWithChips.forEach((player, index) => {
      console.log(`[NEXT-GAME] Игрок ${index}: ${player.username} - ${player.chips} фишек`);
    });
    
    if (playersWithChips.length < 2) {
      console.log('[NEXT-GAME] Недостаточно игроков с фишками для продолжения');
      
      // Обновляем только статус старой игры
      await PokerGame.findByIdAndUpdate(
        game._id,
        { 
          $set: { 
            status: 'eliminated',
            winner: playersWithChips.length > 0 ? playersWithChips[0].username : 'Никто'
          }
        }
      );
      return;
    }
    
    // Сдвигаем дилера на следующую позицию (по часовой стрелке)
    let newDealerPosition = (game.dealerPosition + 1) % game.players.length;
    
    // Пропускаем игроков без фишек
    let attempts = 0;
    while (game.players[newDealerPosition].chips < 20 && attempts < game.players.length) {
      newDealerPosition = (newDealerPosition + 1) % game.players.length;
      attempts++;
    }
    
    console.log(`[NEXT-GAME] Новый дилер: позиция ${newDealerPosition}`);
    
    // Создаем массив игроков для новой игры на основе текущих
    const newPlayers = game.players.map((player, index) => ({
      user: player.user || null,
      username: player.username,
      chips: player.chips,
      cards: [],
      position: index,
      currentBet: 0,
      isBot: player.isBot,
      isDealer: index === newDealerPosition,
      isSmallBlind: index === ((newDealerPosition + 1) % game.players.length),
      isBigBlind: index === ((newDealerPosition + 2) % game.players.length),
      isUTG: index === ((newDealerPosition + 3) % game.players.length),
      folded: false,
      isAllIn: false,
      hasActed: false
    }));
    
    const sbPosition = (newDealerPosition + 1) % game.players.length;
    const bbPosition = (newDealerPosition + 2) % game.players.length;
    const utgPosition = (newDealerPosition + 3) % game.players.length;
    
    console.log(`[NEXT-GAME] Позиции: Дилер=${newDealerPosition}, SB=${sbPosition}, BB=${bbPosition}, UTG=${utgPosition}`);
    
    // Снимаем блайнды
    const smallBlind = game.settings.smallBlind || 10;
    const bigBlind = game.settings.bigBlind || 20;
    
    // Проверяем, что у игроков достаточно фишек для блайндов
    if (newPlayers[sbPosition].chips >= smallBlind) {
      newPlayers[sbPosition].chips -= smallBlind;
      newPlayers[sbPosition].currentBet = smallBlind;
    } else {
      // All-in на оставшиеся фишки
      newPlayers[sbPosition].currentBet = newPlayers[sbPosition].chips;
      newPlayers[sbPosition].chips = 0;
      newPlayers[sbPosition].isAllIn = true;
    }
    
    if (newPlayers[bbPosition].chips >= bigBlind) {
      newPlayers[bbPosition].chips -= bigBlind;
      newPlayers[bbPosition].currentBet = bigBlind;
    } else {
      // All-in на оставшиеся фишки
      newPlayers[bbPosition].currentBet = newPlayers[bbPosition].chips;
      newPlayers[bbPosition].chips = 0;
      newPlayers[bbPosition].isAllIn = true;
    }
    
    // ИСПРАВЛЕНО: Создаем НОВУЮ игру вместо изменения старой
    const newGameData = {
      type: 'poker',
      players: newPlayers,
      pot: newPlayers[sbPosition].currentBet + newPlayers[bbPosition].currentBet,
      deck: createDeck(),
      communityCards: [],
      currentRound: 'preflop',
      currentTurn: utgPosition,
      status: 'playing',
      settings: game.settings,
      dealerPosition: newDealerPosition,
      winner: null,
      winningHand: null,
      createdAt: new Date()
    };
    
    console.log(`[NEXT-GAME] Банк после блайндов: ${newGameData.pot}`);
    
    // Создаем новую игру
    const newGame = new PokerGame(newGameData);
    
    // Раздаем новые карты
    dealCards(newGame);
    
    console.log('[NEXT-GAME] Карты розданы, игра началась');
    console.log(`[NEXT-GAME] Первый ход: игрок ${newGame.currentTurn} (${newGame.players[newGame.currentTurn].username})`);
    
    // Сохраняем новую игру
    await newGame.save();
    
    // ИСПРАВЛЕНО: Обновляем старую игру ссылкой на новую
    await PokerGame.findByIdAndUpdate(
      game._id,
      { 
        $set: { 
          status: 'replaced',
          nextGameId: newGame._id
        }
      }
    );
    
    console.log(`[NEXT-GAME] Новая игра создана с ID: ${newGame._id}`);
    
    // ИСПРАВЛЕНО: более надежный запуск ботов если первый ход у бота
    if (newGame.players[newGame.currentTurn].isBot && !newGame.players[newGame.currentTurn].folded) {
      console.log(`[NEXT-GAME] Запускаем первого бота ${newGame.players[newGame.currentTurn].username}`);
      
      const gameId = newGame._id.toString();
      setTimeout(async () => {
        try {
          console.log(`[NEXT-GAME] ⚡ ВЫПОЛНЯЕМ processBotAction для следующей игры ${gameId}`);
          
          // Проверяем что первый игрок действительно бот и должен ходить
          const freshGame = await PokerGame.findById(gameId);
          if (freshGame && 
              freshGame.status === 'playing' && 
              freshGame.players[freshGame.currentTurn] && 
              freshGame.players[freshGame.currentTurn].isBot &&
              !freshGame.players[freshGame.currentTurn].folded &&
              !freshGame.players[freshGame.currentTurn].hasActed) {
            
            console.log(`[NEXT-GAME] ✅ Все условия выполнены, запускаем бота ${freshGame.players[freshGame.currentTurn].username}`);
            await processBotAction(gameId);
          } else {
            console.log(`[NEXT-GAME] ❌ Условия для запуска бота не выполнены`);
          }
        } catch (error) {
          console.error('[NEXT-GAME] ❌ Ошибка при запуске бота в следующей игре:', error);
        }
      }, 4000); // ИЗМЕНЕНО: увеличил с 1000 до 4000ms (4 секунды)
    }
    
    console.log('[NEXT-GAME] ============= СЛЕДУЮЩАЯ ИГРА ЗАПУЩЕНА =============');
    
    // Возвращаем новую игру
    return newGame;
    
  } catch (error) {
    console.error('[NEXT-GAME] Ошибка при запуске следующей игры:', error);
    throw error;
  }
}

// Обновляем логику завершения игры в processBotAction
async function processBotAction(gameId) {
  try {
    console.log(`[BOT-ACTION] ================ ЗАПУСК БОТА для ${gameId} ================`);
    
    // ДОБАВЛЕНО: защита от дублирующих вызовов
    if (processingGames.has(gameId.toString())) {
      console.log(`[BOT-ACTION] Игра ${gameId} уже обрабатывается, пропускаем`);
      return;
    }
    
    processingGames.add(gameId.toString());
    
    // ИСПРАВЛЕНО: принудительная перезагрузка из базы для актуального состояния
    console.log(`[BOT-ACTION] ===== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ОБ ИГРЕ =====`);
    console.log(`[BOT-ACTION] Загруженная игра ID: ${gameId}`);
    console.log(`[BOT-ACTION] Запрошенная игра ID: ${gameId}`);
    console.log(`[BOT-ACTION] ID совпадают: ${gameId.toString() === gameId.toString()}`);
    
    const game = await PokerGame.findById(gameId);
    console.log(`[BOT-ACTION] *** ПОСЛЕ ПРИНУДИТЕЛЬНОЙ ПЕРЕЗАГРУЗКИ currentTurn: ${game.currentTurn} ***`);
    console.log(`[BOT-ACTION] game.currentTurn из базы: ${game.currentTurn}`);
    
    if (!game || game.status !== 'playing') {
      console.log(`[BOT-ACTION] Игра не найдена или уже завершена: статус ${game?.status}`);
      processingGames.delete(gameId.toString());
      return;
    }

    const currentPlayerIndex = game.currentTurn;
    const currentPlayer = game.players[currentPlayerIndex];
    console.log(`[BOT-ACTION] currentPlayerIndex: ${currentPlayerIndex}`);
    console.log(`[BOT-ACTION] Проверяем игрока на позиции ${currentPlayerIndex}: ${currentPlayer.username}`);
    console.log(`[BOT-ACTION] isBot: ${currentPlayer.isBot}, folded: ${currentPlayer.folded}, hasActed: ${currentPlayer.hasActed}`);

    if (!currentPlayer.isBot || currentPlayer.folded || currentPlayer.hasActed) {
      console.log(`[BOT-ACTION] Игрок ${currentPlayer.username} не подходит для бота или уже действовал`);
      processingGames.delete(gameId.toString());
      return;
    }

    // Определяем действие бота
    const botAction = getBotAction(game, currentPlayerIndex);
    console.log(`[BOT-ACTION] Бот ${currentPlayer.username} (позиция ${currentPlayerIndex}) делает ход`);
    console.log(`[BOT-ACTION] Фишки: ${currentPlayer.chips}, ставка: ${currentPlayer.currentBet}`);
    console.log(`[BOT-ACTION] Бот ${currentPlayer.username} выбрал: ${botAction.action}${botAction.amount ? ' ' + botAction.amount : ''}`);

    // Применяем действие
    const currentBet = Math.max(...game.players.map(p => p.currentBet));
    const botPlayer = game.players[currentPlayerIndex];

    console.log(`[BOT-ACTION] ===== ПРИМЕНЕНИЕ ДЕЙСТВИЯ БОТА =====`);
    console.log(`[BOT-ACTION] ДО изменения: folded=${botPlayer.folded}, hasActed=${botPlayer.hasActed}, bet=${botPlayer.currentBet}`);

    switch (botAction.action) {
      case 'fold':
        botPlayer.folded = true;
        botPlayer.hasActed = true;
        console.log(`[BOT-ACTION] Применил fold: folded=${botPlayer.folded}, hasActed=${botPlayer.hasActed}`);
        break;
      
      case 'call':
        const callAmount = currentBet - botPlayer.currentBet;
        if (botPlayer.chips >= callAmount) {
          botPlayer.chips -= callAmount;
          botPlayer.currentBet += callAmount;
          game.pot += callAmount;
          botPlayer.hasActed = true;
          console.log(`[BOT-ACTION] Применил call: chips=${botPlayer.chips}, bet=${botPlayer.currentBet}, hasActed=${botPlayer.hasActed}`);
        }
        break;
      
      case 'bet':
      case 'raise':
        const betAmount = botAction.amount;
        if (botPlayer.chips >= betAmount) {
          const totalBetAmount = betAmount - botPlayer.currentBet;
          botPlayer.chips -= totalBetAmount;
          game.pot += totalBetAmount;
          botPlayer.currentBet = betAmount;
          botPlayer.hasActed = true;
          
          // ИСПРАВЛЕНО: сбрасываем hasActed только у НЕ сфолженных игроков при рейзе
          game.players.forEach((p, idx) => {
            if (idx !== currentPlayerIndex && !p.folded) {
            p.hasActed = false;
          }
        });
          console.log(`[BOT-ACTION] Применил bet/raise: chips=${botPlayer.chips}, bet=${botPlayer.currentBet}, hasActed=${botPlayer.hasActed}`);
        }
        break;
        
      case 'check':
        if (botPlayer.currentBet === currentBet) {
          botPlayer.hasActed = true;
          console.log(`[BOT-ACTION] Применил check: hasActed=${botPlayer.hasActed}`);
        }
        break;
    }

    console.log(`[BOT-ACTION] ПОСЛЕ изменения: folded=${botPlayer.folded}, hasActed=${botPlayer.hasActed}, bet=${botPlayer.currentBet}`);
    console.log(`[BOT-ACTION] ==========================================`);

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем состояние в базу СРАЗУ после действия
    console.log(`[BOT-ACTION] 💾 СОХРАНЕНИЕ ИЗМЕНЕНИЙ В БАЗУ...`);
    console.log(`[BOT-ACTION] Игрок ${currentPlayerIndex} (${botPlayer.username}): folded=${botPlayer.folded}, hasActed=${botPlayer.hasActed}, bet=${botPlayer.currentBet}`);
    
    // ИСПРАВЛЕНО: используем прямое обновление конкретного игрока и общих данных
    const updateData = {
      [`players.${currentPlayerIndex}.folded`]: botPlayer.folded,
      [`players.${currentPlayerIndex}.hasActed`]: botPlayer.hasActed,
      [`players.${currentPlayerIndex}.chips`]: botPlayer.chips,
      [`players.${currentPlayerIndex}.currentBet`]: botPlayer.currentBet,
      pot: game.pot,
      currentRound: game.currentRound,
      communityCards: game.communityCards,
      status: game.status,
      winner: game.winner,
      winningHand: game.winningHand
    };
    
    // ВАЖНО: если это рейз, сбрасываем hasActed для других НЕ сфолженных игроков
    if ((botAction.action === 'bet' || botAction.action === 'raise') && botAction.amount) {
      game.players.forEach((p, idx) => {
        if (idx !== currentPlayerIndex && !p.folded) {
          updateData[`players.${idx}.hasActed`] = false;
            }
          });
        }
        
    const savedGame = await PokerGame.findByIdAndUpdate(
      gameId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    // НОВОЕ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительно перезагружаем из базы ДЛЯ АКТУАЛЬНЫХ ДАННЫХ
    console.log(`[BOT-ACTION] 🔄 ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА ПОСЛЕ СОХРАНЕНИЯ...`);
    const freshGame = await PokerGame.findById(gameId);
    console.log(`[BOT-ACTION] ✅ Перезагружено из базы. ID игры: ${freshGame._id}`);
    
    // ДОБАВЛЕНО: проверяем что сохранение прошло успешно
    console.log(`[BOT-ACTION] 🔍 ПРОВЕРКА СОХРАНЕНИЯ: игрок ${currentPlayerIndex} hasActed=${freshGame.players[currentPlayerIndex].hasActed}, folded=${freshGame.players[currentPlayerIndex].folded}, bet=${freshGame.players[currentPlayerIndex].currentBet}`);

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем СВЕЖИЕ данные из базы для расчетов
    const activePlayers = freshGame.players.filter(p => !p.folded);
    console.log(`[BOT-ACTION] Активных игроков ПОСЛЕ действия: ${activePlayers.length}`);
    activePlayers.forEach((p, idx) => {
      console.log(`[BOT-ACTION] Активный игрок ${idx}: ${p.username}, folded: ${p.folded}, hasActed: ${p.hasActed}`);
    });
    
    // ДОБАВЛЕНО: детальное логирование состояния всех игроков после действия бота
    console.log(`[BOT-ACTION] ===== СОСТОЯНИЕ ВСЕХ ИГРОКОВ ПОСЛЕ ДЕЙСТВИЯ БОТА =====`);
    freshGame.players.forEach((p, idx) => {
      console.log(`[BOT-ACTION] Игрок ${idx}: ${p.username}, folded: ${p.folded}, hasActed: ${p.hasActed}, bet: ${p.currentBet}`);
    });
    console.log(`[BOT-ACTION] ========================================================`);

    // ИСПРАВЛЕНО: правильная проверка игроков ожидающих хода
    const playersToAct = activePlayers.filter(p => !p.hasActed);
    
    // ДОБАВЛЕНО: проверяем также что все активные игроки имеют одинаковую ставку (кроме all-in)
    const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
    const playersNeedToMatchBet = activePlayers.filter(p => p.currentBet < maxBet && !p.isAllIn);
    
    console.log(`[BOT-ACTION] Игроков ожидают хода: ${playersToAct.length}`);
    console.log(`[BOT-ACTION] Игроков нужно доставить ставку: ${playersNeedToMatchBet.length}`);
    
    // ДОБАВЛЕНО: детальное логирование для отладки перехода к раундам
    console.log(`[BOT-ACTION] ===== АНАЛИЗ ПЕРЕХОДА К РАУНДУ =====`);
    console.log(`[BOT-ACTION] maxBet: ${maxBet}`);
    console.log(`[BOT-ACTION] Все активные игроки:`);
    activePlayers.forEach((p, idx) => {
      console.log(`[BOT-ACTION] - ${p.username}: hasActed=${p.hasActed}, bet=${p.currentBet}, needsBet=${p.currentBet < maxBet}`);
    });
    console.log(`[BOT-ACTION] Условие для перехода: playersToAct=${playersToAct.length} == 0 && playersNeedToMatchBet=${playersNeedToMatchBet.length} == 0`);
    console.log(`[BOT-ACTION] =======================================`);

    playersToAct.forEach((p, idx) => {
      console.log(`[BOT-ACTION] Ожидает хода ${idx}: ${p.username}, currentBet: ${p.currentBet}, folded: ${p.folded}`);
    });

    // ДОБАВЛЕНО: проверяем если остался только один активный игрок
    if (activePlayers.length === 1) {
      // Только один игрок остался - он победитель и получает банк (НЕ шоудаун)
      const winner = activePlayers[0];
      const winnerIndex = freshGame.players.findIndex(p => p.username === winner.username);
      
      const gameEndData = {
        [`players.${winnerIndex}.chips`]: winner.chips + freshGame.pot,
        pot: 0,
        status: 'finished',
        winner: winner.username,
        winningHand: 'Все остальные сбросили карты',
        showdown: false // ДОБАВЛЕНО: НЕ шоудаун - карты не показываем
      };
      
      await PokerGame.findByIdAndUpdate(
        gameId,
        { $set: gameEndData },
        { new: true, runValidators: true }
      );
      
      console.log(`[BOT-ACTION] 🏆 Игра завершена БЕЗ шоудауна. Победитель: ${winner.username}, получил ${freshGame.pot} фишек`);
      processingGames.delete(gameId.toString());
      return;
    }

    // ИСПРАВЛЕНО: переходим к следующему раунду только если все сделали ход И все ставки равны
    if (playersToAct.length === 0 && playersNeedToMatchBet.length === 0) {
      console.log(`[BOT-ACTION] 🎯 ВСЕ ИГРОКИ ЗАВЕРШИЛИ ТОРГИ - ПЕРЕХОД К СЛЕДУЮЩЕМУ РАУНДУ!`);
      await advanceToNextRound(freshGame);
      
      // ВАЖНО: сохраняем игру после перехода к следующему раунду
      const roundUpdateData = {
        currentRound: freshGame.currentRound,
        communityCards: freshGame.communityCards,
        currentTurn: freshGame.currentTurn,
        pot: freshGame.pot,
        status: freshGame.status,
        winner: freshGame.winner,
        winningHand: freshGame.winningHand,
        showdown: freshGame.showdown // ДОБАВЛЕНО: сохраняем флаг шоудауна
      };
      
      // ИСПРАВЛЕНО: сбрасываем hasActed для всех активных игроков при переходе к новому раунду
      freshGame.players.forEach((p, idx) => {
        if (!p.folded) {
          roundUpdateData[`players.${idx}.hasActed`] = false;
        }
      });
      
      const updatedGame = await PokerGame.findByIdAndUpdate(
        gameId,
        { $set: roundUpdateData },
        { new: true, runValidators: true }
      );
      
      console.log(`[BOT-ACTION] 🃏 Раунд изменен на: ${updatedGame.currentRound}`);
      console.log(`[BOT-ACTION] 🂡 Общие карты: ${updatedGame.communityCards.length}`);
      console.log(`[BOT-ACTION] 🎲 Следующий ход у игрока: ${updatedGame.currentTurn} (${updatedGame.players[updatedGame.currentTurn]?.username})`);
      
      processingGames.delete(gameId.toString());
      
      // Если следующий игрок - бот, запускаем его
      if (updatedGame.players[updatedGame.currentTurn]?.isBot && 
          !updatedGame.players[updatedGame.currentTurn]?.folded) {
        console.log(`[BOT-ACTION] 🤖 Запускаем бота для нового раунда: ${updatedGame.players[updatedGame.currentTurn].username}`);
        setTimeout(() => {
          processBotAction(gameId);
        }, 4000); // ИЗМЕНЕНО: увеличил с 1000 до 4000ms (4 секунды)
      }
      
      return;
    }

    // Найти следующего игрока который должен делать ход
    let nextPlayerIndex = currentPlayerIndex;
    let attempts = 0;
    
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % freshGame.players.length;
      attempts++;
      if (attempts > freshGame.players.length) {
        console.log(`[BOT-ACTION] ⚠️ ОШИБКА: Не удалось найти следующего игрока`);
        processingGames.delete(gameId.toString());
        return;
      }
    } while (freshGame.players[nextPlayerIndex].folded || freshGame.players[nextPlayerIndex].hasActed);

    const nextPlayer = freshGame.players[nextPlayerIndex];
    console.log(`[BOT-ACTION] Найден следующий игрок: ${nextPlayer.username} (позиция ${nextPlayerIndex})`);
    console.log(`[BOT-ACTION] - hasActed: ${nextPlayer.hasActed}, currentBet: ${nextPlayer.currentBet}, needsBet: ${maxBet}`);
    console.log(`[BOT-ACTION] Ход переходит к игроку ${nextPlayerIndex} (${nextPlayer.username})`);

    // ИСПРАВЛЕНО: сохраняем игру с новым currentTurn
    console.log(`[BOT-ACTION] ===== ФИНАЛЬНАЯ ПРОВЕРКА ПЕРЕД ОБНОВЛЕНИЕМ =====`);
    console.log(`[BOT-ACTION] currentTurn в памяти: ${currentPlayerIndex}`);
    
    const checkGame = await PokerGame.findById(gameId);
    console.log(`[BOT-ACTION] currentTurn в базе (перед обновлением): ${checkGame.currentTurn}`);
    
    const finalUpdatedGame = await PokerGame.findByIdAndUpdate(
      gameId,
      { 
        $set: { 
          currentTurn: nextPlayerIndex
        }
      },
      { new: true, runValidators: true }
    );
    
    console.log(`[BOT-ACTION] Игра обновлена через findByIdAndUpdate. currentTurn теперь: ${finalUpdatedGame.currentTurn}`);
    
    // Продолжить с ботом или передать ход человеку
    if (nextPlayer.isBot && !nextPlayer.folded && !nextPlayer.hasActed) {
      console.log(`[BOT-ACTION] Запускаем следующего бота: ${nextPlayer.username} (позиция ${nextPlayerIndex})`);
      console.log(`[BOT-ACTION] ===== ЗАПУСК СЛЕДУЮЩЕГО БОТА =====`);
      console.log(`[BOT-ACTION] Передаем gameId: ${gameId}`);
      console.log(`[BOT-ACTION] ID текущей игры: ${gameId}`);
      console.log(`[BOT-ACTION] currentTurn для следующего бота: ${nextPlayerIndex}`);
      
      processingGames.delete(gameId.toString());
      
      setTimeout(() => {
        processBotAction(gameId);
      }, 5000); // ИЗМЕНЕНО: увеличил с 2000 до 5000ms (5 секунд) для более медленной игры
    } else {
      console.log(`[BOT-ACTION] Цепочка ботов остановлена\n- следующий ход человека: ${nextPlayer.username}`);
      processingGames.delete(gameId.toString());
    }

  } catch (error) {
    console.error(`[BOT-ACTION] Ошибка при обработке бота ${gameId}:`, error);
    processingGames.delete(gameId.toString());
  }
  
  // ДОБАВЛЕНО: дополнительная проверка статуса игры после сохранения
  try {
    const finalCheckGame = await PokerGame.findById(gameId);
    if (finalCheckGame && finalCheckGame.status === 'finished') {
      console.log(`[BOT-ACTION] 🏁 ИГРА ЗАВЕРШЕНА - ОСТАНОВКА ВСЕХ БОТОВ`);
      console.log(`[BOT-ACTION] Победитель: ${finalCheckGame.winner}`);
      processingGames.delete(gameId.toString());
      return;
    }
  } catch (error) {
    console.error(`[BOT-ACTION] Ошибка при финальной проверке:`, error);
  }
}

// ДОБАВЛЕНО: функция для определения действия бота
function getBotAction(game, playerIndex) {
  const player = game.players[playerIndex];
  const currentBet = Math.max(...game.players.map(p => p.currentBet));
  const callAmount = currentBet - player.currentBet;
  
  const random = Math.random();
  
  // Улучшенная логика бота - более агрессивная игра
  if (callAmount === 0) {
    // Можно чекнуть - боты стали более агрессивными
    if (random < 0.4) {
      return { action: 'check' };
    } else if (random < 0.8 && player.chips >= 20) {
      return { action: 'bet', amount: currentBet + 20 };
    } else if (random < 0.95 && player.chips >= 40) {
      // Большой рейз для разнообразия
      return { action: 'bet', amount: currentBet + 40 };
    } else {
      return { action: 'check' }; // Вместо fold делаем check
    }
  } else {
    // Есть ставка для уравнения - значительно снижаем вероятность fold
    if (random < 0.15) { // УМЕНЬШЕНО с 0.4 до 0.15 - fold только в 15% случаев
      return { action: 'fold' };
    } else if (random < 0.65 && player.chips >= callAmount) { // УВЕЛИЧЕНО с 0.8 до 0.65
      return { action: 'call' };
    } else if (random < 0.85 && player.chips >= (callAmount + 20)) { // УВЕЛИЧЕНО с 0.9 до 0.85
      return { action: 'raise', amount: currentBet + 20 };
    } else if (random < 0.95 && player.chips >= (callAmount + 40)) {
      // Агрессивный рейз
      return { action: 'raise', amount: currentBet + 40 };
    } else if (player.chips >= callAmount) {
      return { action: 'call' }; // Если не можем рейзить - хотя бы коллируем
    } else {
      return { action: 'fold' };
    }
  }
}

// ДОБАВЛЕНО: функция для перехода к следующему раунду
async function advanceToNextRound(game) {
  console.log(`[ROUND] ====== ПЕРЕХОД К СЛЕДУЮЩЕМУ РАУНДУ ======`);
  console.log(`[ROUND] Текущий раунд: ${game.currentRound}`);
  
  // Проверяем есть ли больше одного активного игрока
  const activePlayers = game.players.filter(p => !p.folded);
  if (activePlayers.length === 1) {
    // Только один игрок остался - он победитель (НЕ шоудаун)
    const winner = activePlayers[0];
    winner.chips += game.pot;
    game.winner = winner.username;
    game.status = 'finished';
    game.showdown = false; // ДОБАВЛЕНО: НЕ шоудаун - карты не показываем
    console.log(`[ROUND] Игра завершена БЕЗ шоудауна! Победитель: ${game.winner}, получил ${game.pot} фишек`);
    
    // ДОБАВЛЕНО: сохраняем изменения в базу данных
    await game.save();
    console.log(`[ROUND] 🏁 ИГРА ЗАВЕРШЕНА И СОХРАНЕНА В БАЗУ`);
    return;
  }
  
  // Переходим к следующему раунду
  if (game.currentRound === 'preflop') {
    game.currentRound = 'flop';
    dealCommunityCards(game, 3);
    console.log(`[ROUND] Переход к флопу, выложено ${game.communityCards.length} карт`);
  } else if (game.currentRound === 'flop') {
    game.currentRound = 'turn';
    dealCommunityCards(game, 1);
    console.log(`[ROUND] Переход к тёрну, выложено ${game.communityCards.length} карт`);
  } else if (game.currentRound === 'turn') {
    game.currentRound = 'river';
    dealCommunityCards(game, 1);
    console.log(`[ROUND] Переход к риверу, выложено ${game.communityCards.length} карт`);
  } else {
    // Шоудаун - все раунды пройдены, несколько игроков дошли до конца
    game.status = 'finished';
    game.showdown = true; // ДОБАВЛЕНО: ЭТО шоудаун - карты показываем
    const result = determineWinner(game);
    
    const winnerPlayer = game.players.find(p => p.username === result.winner);
    if (winnerPlayer) {
      winnerPlayer.chips += game.pot;
    }
    
    game.winner = result.winner;
    game.winningHand = result.winningHand;
    console.log(`[ROUND] ШОУДАУН! Победитель: ${game.winner}, получил ${game.pot} фишек`);
    console.log(`[ROUND] 🃏 ПОКАЗЫВАЕМ КАРТЫ ВСЕХ ИГРОКОВ`);
    
    // ДОБАВЛЕНО: открываем карты всех активных игроков при шоудауне
    game.players.forEach((player, index) => {
      if (!player.folded && player.cards && player.cards.length > 0) {
        player.cards.forEach(card => {
          card.hidden = false; // Открываем карты
        });
        console.log(`[ROUND] 🎴 Открыты карты игрока ${player.username}: ${player.cards.map(c => c.value + c.suit).join(', ')}`);
      }
    });
    
    // ДОБАВЛЕНО: сохраняем изменения в базу данных
    await game.save();
    console.log(`[ROUND] 🏁 ШОУДАУН ЗАВЕРШЕН И СОХРАНЕН В БАЗУ`);
    return;
  }
  
  // ИСПРАВЛЕНО: сбрасываем hasActed только для активных (не folded) игроков
  game.players.forEach(p => {
    if (!p.folded) {
      p.hasActed = false;
    }
  });
  
  // Начинаем новый раунд с позиции после дилера
  let nextPlayerIndex = (game.dealerPosition + 1) % game.players.length;
  let attempts = 0;
  while (game.players[nextPlayerIndex].folded && attempts < game.players.length) {
    nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
    attempts++;
  }
  
  game.currentTurn = nextPlayerIndex;
  console.log(`[ROUND] Новый раунд ${game.currentRound}, ход игрока ${nextPlayerIndex} (${game.players[nextPlayerIndex].username})`);
}

console.log('Poker API loaded');
module.exports = router; 