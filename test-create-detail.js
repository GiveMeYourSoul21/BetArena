async function testCreateDetail() {
  try {
    console.log('🎯 Детальний тест створення гри...');
    
    const response = await fetch('http://localhost:3002/api/poker/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 8
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Гра створена успішно!');
      console.log('📊 Відповідь сервера:', JSON.stringify(data, null, 2));
      
      // Отримуємо деталі гри
      const gameResponse = await fetch(`http://localhost:3002/api/poker/${data.gameId}`);
      const gameData = await gameResponse.json();
      
      if (gameResponse.ok) {
        console.log('📊 Повні дані гри:');
        console.log('- ID:', gameData.id);
        console.log('- Статус:', gameData.status);
        console.log('- CurrentTurn:', gameData.currentTurn);
        console.log('- Кількість гравців:', gameData.players.length);
        console.log('- Гравці:');
        gameData.players.forEach((p, i) => {
          console.log(`  ${i}: user=${p.user}, username="${p.username}", isBot=${p.isBot}, position=${p.position}`);
        });
      } else {
        console.error('❌ Не вдалося отримати деталі гри:', gameData);
      }
    } else {
      console.error('❌ Помилка створення гри:', data);
    }
    
  } catch (error) {
    console.error('❌ Загальна помилка:', error.message);
  }
}

testCreateDetail(); 