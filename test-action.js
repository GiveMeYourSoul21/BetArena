async function testPokerAction() {
  try {
    console.log('🎯 Создаем покерную игру...');
    
    // Сначала создаем игру
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
      console.error('❌ Ошибка создания игры:', createData);
      return;
    }
    
    console.log('✅ Игра создана:', createData);
    const gameId = createData.gameId;
    
    // Получаем состояние игры
    console.log('🔍 Получаем информацию об игре...');
    const gameResponse = await fetch(`http://localhost:3002/api/poker/${gameId}`);
    const gameData = await gameResponse.json();
    
    if (gameResponse.ok) {
      console.log('📊 Состояние игры:');
      console.log('- currentTurn:', gameData.currentTurn);
      console.log('- Игроки:');
      gameData.players.forEach((p, i) => {
        console.log(`  ${i}: user=${p.user}, username=${p.username}, isBot=${p.isBot}`);
      });
      
      // Проверяем кто сейчас ходит
      const currentPlayer = gameData.players[gameData.currentTurn];
      if (currentPlayer && currentPlayer.isBot) {
        console.log('⚠️ Сейчас ход у бота, попробуем подождать...');
        
        // Подождем 5 секунд и попробуем еще раз
        console.log('⏳ Ждем 5 секунд...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const gameResponse2 = await fetch(`http://localhost:3002/api/poker/${gameId}`);
        const gameData2 = await gameResponse2.json();
        
        if (gameResponse2.ok) {
          console.log('📊 Новое состояние игры:');
          console.log('- currentTurn:', gameData2.currentTurn);
          const newCurrentPlayer = gameData2.players[gameData2.currentTurn];
          console.log(`- Текущий игрок: ${newCurrentPlayer.username} (бот: ${newCurrentPlayer.isBot})`);
          
          if (!newCurrentPlayer.isBot && newCurrentPlayer.user == 8) {
            console.log('✅ Теперь ход у реального игрока!');
            // Обновляем gameData для дальнейшего использования
            Object.assign(gameData, gameData2);
          } else {
            console.log('❌ Ход все еще не у реального игрока, пропускаем тест действия');
            return;
          }
        }
      } else if (currentPlayer && currentPlayer.user != 8) {
        console.log('❌ Ход не у нашего пользователя (ID 8), пропускаем тест');
        return;
      }
    } else {
      console.error('❌ Не удалось получить игру:', gameData);
    }
    
    console.log('🎯 Делаем действие call...');
    
    // Теперь делаем действие
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
      console.log('✅ Действие выполнено успешно!');
      console.log('📊 Ответ сервера:', JSON.stringify(actionData, null, 2));
    } else {
      console.error('❌ Ошибка при выполнении действия:');
      console.error('Статус:', actionResponse.status);
      console.error('Данные:', actionData);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

testPokerAction(); 