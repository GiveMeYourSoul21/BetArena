async function testFinalPoker() {
  const API_URL = 'http://localhost:3002';
  
  try {
    console.log('🎯 ФИНАЛЬНЫЙ ТЕСТ ПОКЕРНОЙ ИГРЫ\n');
    
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
    console.log(`✅ Первый ход: игрок ${createData.currentTurn}`);
    
    // 2. Ждем пока боты сыграют
    console.log('\n2️⃣ Ждем пока боты сыграют...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Проверяем состояние после ботов
    let gameResponse = await fetch(`${API_URL}/api/poker/${gameId}`);
    let gameData = await gameResponse.json();
    
    console.log(`✅ После ботов - Банк: ${gameData.pot}, Ход: ${gameData.settings.currentTurn}`);
    console.log(`✅ Игрок на ходе: ${gameData.players[gameData.settings.currentTurn]?.username}`);
    
    // 4. Если ход у нашего игрока - делаем действие
    const currentPlayer = gameData.players[gameData.settings.currentTurn];
    if (currentPlayer && !currentPlayer.isBot) {
      console.log('\n3️⃣ Наш ход! Делаем call...');
      
      const actionResponse = await fetch(`${API_URL}/api/poker/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '123', // username
          action: 'call',
          amount: 0
        })
      });
      
      if (actionResponse.ok) {
        const actionData = await actionResponse.json();
        console.log(`✅ Call выполнен! Банк: ${actionData.pot}`);
      } else {
        const errorText = await actionResponse.text();
        console.log(`❌ Ошибка: ${errorText}`);
      }
    } else {
      console.log('3️⃣ Сейчас ход бота, ждем...');
    }
    
    // 5. Ждем завершения раунда
    console.log('\n4️⃣ Ждем завершения раунда...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 6. Финальная проверка
    const finalResponse = await fetch(`${API_URL}/api/poker/${gameId}`);
    const finalData = await finalResponse.json();
    
    console.log('\n📊 ФИНАЛЬНОЕ СОСТОЯНИЕ:');
    console.log(`✅ Статус: ${finalData.status}`);
    console.log(`✅ Раунд: ${finalData.settings.currentRound}`);
    console.log(`✅ Банк: ${finalData.pot}`);
    console.log(`✅ Ход: ${finalData.settings.currentTurn} (${finalData.players[finalData.settings.currentTurn]?.username || 'N/A'})`);
    
    if (finalData.settings.communityCards && finalData.settings.communityCards.length > 0) {
      console.log(`✅ Общие карты: ${finalData.settings.communityCards.length}`);
    }
    
    console.log('\n👥 Состояние игроков:');
    finalData.players.forEach((player, i) => {
      const status = player.folded ? '❌ FOLD' : player.hasActed ? '✅ ACTED' : '⏳ WAITING';
      console.log(`${i}: ${player.username} - 💰${player.chips} фишек, ставка: ${player.currentBet} ${status}`);
    });
    
    if (finalData.status === 'finished') {
      console.log(`\n🏆 ИГРА ЗАВЕРШЕНА! Победитель: ${finalData.winner}`);
    }
    
    console.log('\n🎉 ТЕСТ УСПЕШНО ЗАВЕРШЕН!');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error.message);
  }
}

// Запускаем тест
console.log('Запуск финального теста...');
testFinalPoker().then(() => {
  console.log('Финальный тест завершен');
}).catch(err => {
  console.error('Критическая ошибка:', err);
}); 