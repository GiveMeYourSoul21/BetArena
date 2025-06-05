async function testWaitTurn() {
  try {
    console.log('🎯 Створюємо гру і чекаємо ход реального гравця...');
    
    // Створюємо гру
    const createResponse = await fetch('http://localhost:3002/api/poker/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 8
      })
    });
    
    const createData = await createResponse.json();
    if (!createResponse.ok) {
      console.error('❌ Помилка створення гри:', createData);
      return;
    }
    
    console.log('✅ Гра створена, ID:', createData.gameId);
    const gameId = createData.gameId;
    
    // Чекаємо поки дійде ход до реального гравця (userId=8)
    let attempts = 0;
    const maxAttempts = 30; // 30 секунд максимум
    
    while (attempts < maxAttempts) {
      console.log(`⏳ Спроба ${attempts + 1}/${maxAttempts} - перевіряємо стан гри...`);
      
      const gameResponse = await fetch(`http://localhost:3002/api/poker/${gameId}`);
      const gameData = await gameResponse.json();
      
      if (!gameResponse.ok) {
        console.error('❌ Помилка отримання гри:', gameData);
        return;
      }
      
      const currentPlayer = gameData.players[gameData.currentTurn];
      console.log(`👤 Зараз ход у: ${currentPlayer?.username} (позиція ${gameData.currentTurn}), бот: ${currentPlayer?.isBot}`);
      
      // Перевіряємо чи ход у реального гравця
      if (currentPlayer && !currentPlayer.isBot && currentPlayer.user == 8) {
        console.log('🎉 ХОД У РЕАЛЬНОГО ГРАВЦЯ! Робимо дію call...');
        
        const actionResponse = await fetch(`http://localhost:3002/api/poker/${gameId}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: 8,
            action: 'call',
            amount: 0
          })
        });
        
        const actionData = await actionResponse.json();
        
        if (actionResponse.ok) {
          console.log('✅ Дія виконана успішно!');
          console.log('📊 Результат:', JSON.stringify(actionData, null, 2));
          return;
        } else {
          console.error('❌ Помилка при виконанні дії:', actionData);
          return;
        }
      }
      
      // Перевіряємо статус гри
      if (gameData.status !== 'playing') {
        console.log(`❌ Гра завершена зі статусом: ${gameData.status}`);
        return;
      }
      
      // Чекаємо 1 секунду і пробуємо знову
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    console.log('❌ Тайм-аут очікування ходу реального гравця');
    
  } catch (error) {
    console.error('❌ Загальна помилка:', error.message);
  }
}

testWaitTurn(); 