const { sequelize } = require('./server/config/database');
const { User } = require('./server/models');

async function testConnection() {
  try {
    console.log('Проверяем соединение с базой данных...');
    await sequelize.authenticate();
    console.log('✅ Соединение с базой данных успешно!');
    
    console.log('Проверяем модель User...');
    const user = await User.findByPk(10);
    console.log('✅ Пользователь найден:', user ? user.username : 'Не найден');
    
    console.log('Проверяем создание блэкджека...');
    const BlackjackGame = require('./server/models/BlackjackGame');
    
    const gameData = {
      type: 'blackjack',
      status: 'playing',
      players: [{
        user: 10,
        username: 'Test',
        chips: 1000,
        cards: [],
        bet: 10
      }],
      dealer: { cards: [], score: 0 },
      deck: [],
      settings: { numDecks: 6 },
      pot: 10,
      userId: 10
    };
    
    const newGame = await BlackjackGame.create(gameData);
    console.log('✅ Игра в блэкджек создана:', newGame.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Детали:', error);
    process.exit(1);
  }
}

testConnection(); 