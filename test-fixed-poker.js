async function testFixedPoker() {
  const API_URL = 'http://localhost:3002';
  
  try {
    console.log('🚀 Начинаем тест исправленной покерной игры...\n');
    
    // 1. Создаем игру
    console.log('1️⃣ Создание игры...');
    const createResponse = await fetch(`${API_URL}/api/poker/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 8 })
    });
    
    if (!createResponse.ok) {
      throw new Error(`HTTP ${createResponse.status}: ${await createResponse.text()}`);
    }
    
    const createData = await createResponse.json();
    const gameId = createData.gameId;
    console.log(`✅ Игра создана: ID=${gameId}`);
    
    // Небольшая задержка
    console.log('⏳ Ждем 2 секунды...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Получаем состояние игры
    console.log('\n2️⃣ Получение состояния игры...');
    const gameResponse = await fetch(`${API_URL}/api/poker/${gameId}`);
    
    if (!gameResponse.ok) {
      throw new Error(`HTTP ${gameResponse.status}: ${await gameResponse.text()}`);
    }
    
    const gameData = await gameResponse.json();
    
    console.log(`✅ Статус игры: ${gameData.status}`);
    console.log(`✅ Текущий раунд: ${gameData.settings.currentRound}`);
    console.log(`✅ Ход игрока: ${gameData.settings.currentTurn}`);
    console.log(`✅ Банк: ${gameData.pot}`);
    console.log(`✅ Активных игроков: ${gameData.players.filter(p => !p.folded).length}`);
    
    // 3. Делаем действие игрока
    console.log('\n3️⃣ Игрок делает действие call...');
    const actionResponse = await fetch(`${API_URL}/api/poker/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '123',
        action: 'call',
        amount: 0
      })
    });
    
    if (!actionResponse.ok) {
      const errorText = await actionResponse.text();
      console.log(`❌ Ошибка действия: HTTP ${actionResponse.status}: ${errorText}`);
    } else {
      const actionData = await actionResponse.json();
      console.log(`✅ Действие выполнено. Новый банк: ${actionData.pot}`);
      console.log(`✅ Следующий ход: ${actionData.settings.currentTurn}`);
    }
    
    // 4. Проверяем автоматическую работу ботов
    console.log('\n4️⃣ Ждем работы ботов...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalResponse = await fetch(`${API_URL}/api/poker/${gameId}`);
    
    if (!finalResponse.ok) {
      throw new Error(`HTTP ${finalResponse.status}: ${await finalResponse.text()}`);
    }
    
    const finalData = await finalResponse.json();
    
    console.log(`✅ Финальный статус: ${finalData.status}`);
    console.log(`✅ Финальный раунд: ${finalData.settings.currentRound}`);
    console.log(`✅ Финальный банк: ${finalData.pot}`);
    console.log(`✅ Ход игрока: ${finalData.settings.currentTurn}`);
    
    // Показываем состояние всех игроков
    console.log('\n📊 Состояние игроков:');
    finalData.players.forEach((player, i) => {
      console.log(`${i}: ${player.username} - 💰${player.chips} фишек, ставка: ${player.currentBet}, сброшен: ${player.folded}, ходил: ${player.hasActed}`);
    });
    
    console.log('\n🎉 Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Запускаем тест
console.log('Запуск теста...');
testFixedPoker().then(() => {
  console.log('Тест завершен');
}).catch(err => {
  console.error('Критическая ошибка:', err);
}); 