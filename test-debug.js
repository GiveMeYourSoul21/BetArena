const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve(jsonData);
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}, body: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function debugTest() {
  console.log('🐛 ОТЛАДОЧНЫЙ ТЕСТ');
  
  try {
    // Создаем игру
    const createData = await makeRequest('/api/poker/create', 'POST', {
      userId: 10,
      gameType: 'texas-holdem'
    });
    
    const gameId = createData.gameId;
    console.log(`🎮 Создана игра: ${gameId}`);
    
    // Многократно проверяем состояние игры
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем 3 секунды
      
      const gameData = await makeRequest(`/api/poker/${gameId}`);
      console.log(`\n===== ПРОВЕРКА ${i+1} =====`);
      console.log(`📊 Раунд: ${gameData.settings?.currentRound}, Банк: ${gameData.pot}, Ход: ${gameData.settings?.currentTurn}, Статус: ${gameData.status}`);
      
      if (gameData.players) {
        console.log('👥 Состояние игроков:');
        gameData.players.forEach((player, index) => {
          console.log(`  ${index}: ${player.username} - Фишки: ${player.chips}, Ставка: ${player.currentBet}, Сбросил: ${player.folded}, Ходил: ${player.hasActed}`);
        });
      }
      
      if (gameData.settings?.communityCards?.length > 0) {
        console.log(`🃏 Общие карты: ${gameData.settings.communityCards.map(c => `${c.value} ${c.suit}`).join(', ')}`);
      }
      
      // Прерываем если игра завершена
      if (gameData.status === 'finished') {
        console.log(`🏆 Игра завершена! Победитель: ${gameData.winner}`);
        break;
      }
      
      // Прерываем если перешли к флопу
      if (gameData.settings?.currentRound !== 'preflop') {
        console.log(`🎉 Перешли к раунду: ${gameData.settings.currentRound}!`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

debugTest(); 