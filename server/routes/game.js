const express = require('express');
const router = express.Router();
const pokerController = require('../controllers/pokerController');

// Создание новой игры
router.post('/create', pokerController.createGame);

// Получение данных игры
router.get('/:gameId', pokerController.getGame);

// Начало игры
router.post('/:gameId/start', pokerController.startGame);

// Выход из игры
router.post('/:gameId/exit', pokerController.exitGame);

// Получение типа игры
router.get('/:gameId/type', pokerController.getGameType);

module.exports = router; 