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

async function quickTest() {
  console.log('🚀 БЫСТРЫЙ ТЕСТ РАУНДОВ');
  
  try {
    // Создаем игру
    const createData = await makeRequest('/api/poker/create', 'POST', {
      userId: 10,
      gameType: 'texas-holdem'
    });
    
    const gameId = createData.gameId;
    console.log(`🎮 Создана игра: ${gameId}`);
    
    // Проверяем начальное состояние
    let gameData = await makeRequest(`/api/poker/${gameId}`);
    console.log(`📊 Раунд: ${gameData.settings?.currentRound}, Общие карты: ${gameData.settings?.communityCards?.length || 0}, Ход: ${gameData.settings?.currentTurn}`);
    
    // Ждем 15 секунд чтобы боты сыграли
    console.log('⏳ Ждем 15 секунд чтобы боты сыграли...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Проверяем состояние после ботов
    gameData = await makeRequest(`/api/poker/${gameId}`);
    console.log(`📊 После ботов - Раунд: ${gameData.settings?.currentRound}, Общие карты: ${gameData.settings?.communityCards?.length || 0}, Статус: ${gameData.status}`);
    
    if (gameData.settings?.communityCards?.length > 0) {
      console.log(`🃏 Общие карты: ${gameData.settings.communityCards.map(c => `${c.value} ${c.suit}`).join(', ')}`);
    }
    
    if (gameData.status === 'finished') {
      console.log(`🏆 Игра завершена! Победитель: ${gameData.winner}`);
    } else {
      console.log(`🎮 Игра продолжается на ходе игрока ${gameData.settings?.currentTurn}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

quickTest(); 