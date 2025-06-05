async function testUsernameAction() {
  try {
    console.log('🎯 Тестуємо дію з username замість userId...');
    
    // Створюємо гру
    const createResponse = await fetch('http://localhost:3002/api/poker/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 8  // створюємо з правильним userId
      })
    });
    
    const createData = await createResponse.json();
    if (!createResponse.ok) {
      console.error('❌ Помилка створення гри:', createData);
      return;
    }
    
    console.log('✅ Гра створена, ID:', createData.gameId);
    const gameId = createData.gameId;
    
    // Отримуємо стан гри
    const gameResponse = await fetch(`http://localhost:3002/api/poker/${gameId}`);
    const gameData = await gameResponse.json();
    
    if (!gameResponse.ok) {
      console.error('❌ Помилка отримання гри:', gameData);
      return;
    }
    
    console.log('📊 CurrentTurn:', gameData.currentTurn);
    console.log('📊 Гравець на ході:', gameData.players[gameData.currentTurn]?.username);
    
    // Чекаємо поки дійде до реального гравця
    let attempts = 0;
    while (attempts < 20 && gameData.players[gameData.currentTurn]?.isBot) {
      console.log(`⏳ Чекаємо ход реального гравця... (${attempts}/20)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newGameResponse = await fetch(`http://localhost:3002/api/poker/${gameId}`);
      const newGameData = await newGameResponse.json();
      
      if (newGameResponse.ok) {
        Object.assign(gameData, newGameData);
        console.log('📊 CurrentTurn:', gameData.currentTurn, 'Гравець:', gameData.players[gameData.currentTurn]?.username);
      }
      
      attempts++;
    }
    
    if (gameData.players[gameData.currentTurn]?.isBot) {
      console.log('❌ Реальний гравець не дочекався ходу');
      return;
    }
    
    console.log('🎉 ХОД У РЕАЛЬНОГО ГРАВЦЯ!');
    
    // Тепер робимо запит з USERNAME замість userId (як робить клієнт)
    const realPlayer = gameData.players.find(p => !p.isBot);
    const username = realPlayer.username;
    
    console.log(`🔧 Відправляємо дію з username: "${username}" замість userId: ${realPlayer.user}`);
    
    const actionResponse = await fetch(`http://localhost:3002/api/poker/${gameId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: username,  // ⚠️ ВІДПРАВЛЯЄМО USERNAME!
        action: 'call',
        amount: 0
      })
    });
    
    const actionData = await actionResponse.json();
    
    if (actionResponse.ok) {
      console.log('✅ Дія з username виконана успішно!');
      console.log('📊 Результат:', actionData.pot, 'банк');
    } else {
      console.error('❌ Помилка при виконанні дії:', actionData);
    }
    
  } catch (error) {
    console.error('❌ Загальна помилка:', error.message);
  }
}

testUsernameAction(); 