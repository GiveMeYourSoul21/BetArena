const { PokerGame, User } = require('./server/models');

async function testSave() {
  try {
    console.log('🔍 Тестуємо збереження JSON полів...');
    
    // Знаходимо першу доступну гру
    const game = await PokerGame.findOne({ where: { status: 'playing' } });
    if (!game) {
      console.log('❌ Активна гра не знайдена');
      return;
    }
    
    console.log('📊 Знайдена гра:', game.id);
    console.log('📊 Гравці до зміни:');
    game.players.forEach((p, i) => {
      console.log(`  ${i}: hasActed=${p.hasActed}, bet=${p.currentBet}`);
    });
    
    // Змінюємо стан першого гравця
    game.players[0].hasActed = true;
    game.players[0].currentBet = 100;
    
    console.log('💾 Зберігаємо БЕЗ markAsChanged...');
    await game.save();
    
    console.log('🔄 Перезавантажуємо з бази...');
    const reloaded1 = await PokerGame.findByPk(game.id);
    console.log('📊 Гравці після збереження БЕЗ markAsChanged:');
    reloaded1.players.forEach((p, i) => {
      console.log(`  ${i}: hasActed=${p.hasActed}, bet=${p.currentBet}`);
    });
    
    // Тепер змінюємо ще раз З markAsChanged
    reloaded1.players[0].hasActed = false;
    reloaded1.players[0].currentBet = 200;
    
    console.log('💾 Зберігаємо З markAsChanged...');
    reloaded1.changed('players', true);
    await reloaded1.save();
    
    console.log('🔄 Перезавантажуємо з бази...');
    const reloaded2 = await PokerGame.findByPk(game.id);
    console.log('📊 Гравці після збереження З markAsChanged:');
    reloaded2.players.forEach((p, i) => {
      console.log(`  ${i}: hasActed=${p.hasActed}, bet=${p.currentBet}`);
    });
    
    console.log('✅ Тест завершений');
    
  } catch (error) {
    console.error('❌ Помилка тесту:', error);
  }
  
  process.exit(0);
}

testSave(); 