import React, { useState } from 'react';

function Rules() {
  const [activeTab, setActiveTab] = useState('blackjack');

  const getCardImage = (value, suit) => {
    const suitMap = {
      '♠': 'S',
      '♣': 'C',
      '♥': 'H',
      '♦': 'D'
    };
    return `/cards/${value}-${suitMap[suit]}.png`;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-hidden border border-gray-700">
          {/* Вкладки */}
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('blackjack')}
                className={`${
                  activeTab === 'blackjack'
                    ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                    : 'border-transparent text-white hover:text-gray-300 hover:border-gray-600'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors`}
              >
                Blackjack
              </button>
              <button
                onClick={() => setActiveTab('poker')}
                className={`${
                  activeTab === 'poker'
                    ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                    : 'border-transparent text-white hover:text-gray-300 hover:border-gray-600'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors`}
              >
                Правила Покеру
              </button>
            </nav>
          </div>

          {/* Содержимое правил */}
          <div className="p-8 bg-gray-800">
            {activeTab === 'blackjack' ? (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Правила Блекджеку</h2>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Мета гри</h3>
                  <p className="text-gray-300">Набрати комбінацію карт, сума очок якої ближче до 21, ніж у дилера, але не перевищує 21. Якщо сума очок перевищує 21, це називається "перебір" (bust), і гравець автоматично програє.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Значення карт</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-[120px] h-[180px] mx-auto mb-2 shadow-lg" style={{
                        backgroundImage: `url(${getCardImage('A', '♠')})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                      <p className="font-medium text-white">Туз: 1 або 11</p>
                      <p className="text-sm text-gray-400">Може рахуватися як 1 або 11, залежно від того, що вигідніше для гравця</p>
                    </div>
                    <div className="text-center">
                      <div className="w-[120px] h-[180px] mx-auto mb-2 shadow-lg" style={{
                        backgroundImage: `url(${getCardImage('K', '♥')})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                      <p className="font-medium text-white">Картинки: 10</p>
                      <p className="text-sm text-gray-400">Король, Дама, Валет - всі рахуються як 10 очок</p>
                    </div>
                    <div className="text-center">
                      <div className="w-[120px] h-[180px] mx-auto mb-2 shadow-lg" style={{
                        backgroundImage: `url(${getCardImage('10', '♦')})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                      <p className="font-medium text-white">10: 10</p>
                      <p className="text-sm text-gray-400">Десятка також рахується як 10 очок</p>
                    </div>
                    <div className="text-center">
                      <div className="w-[120px] h-[180px] mx-auto mb-2 shadow-lg" style={{
                        backgroundImage: `url(${getCardImage('2', '♣')})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                      <p className="font-medium text-white">2-9: за номіналом</p>
                      <p className="text-sm text-gray-400">Двійка - 2 очки, трійка - 3 очки і так далі</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Приклади комбінацій</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Блекджек (21 очко)</h4>
                      <div className="flex justify-center space-x-2 mb-2">
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                      <p className="text-sm text-gray-300">Туз (11) + Король (10) = 21</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Хороша рука (20 очок)</h4>
                      <div className="flex justify-center space-x-2 mb-2">
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('Q', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♣')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                      <p className="text-sm text-gray-300">Дама (10) + Валет (10) = 20</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Перебір (23 очки)</h4>
                      <div className="flex justify-center space-x-2 mb-2">
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('8', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[80px] h-[120px]" style={{
                          backgroundImage: `url(${getCardImage('5', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                      <p className="text-sm text-gray-300">Король (10) + Вісімка (8) + П'ятірка (5) = 23</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Особливі правила</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-700 p-6 rounded-lg">
                      <h4 className="font-medium text-white mb-4 text-center">Блекджек (21 очко)</h4>
                      <p className="text-gray-300 mb-4">Якщо у вас блекджек (туз + картинка або 10), ви отримуєте виплату 3:2 від вашої ставки.</p>
                      <div className="flex justify-center space-x-3">
                        <div className="w-[100px] h-[150px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[100px] h-[150px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                      <p className="text-sm text-gray-300 text-center mt-3">Туз + Король = Блекджек!</p>
                    </div>
                    <div className="bg-gray-700 p-6 rounded-lg">
                      <h4 className="font-medium text-white mb-4 text-center">Альтернативний блекджек</h4>
                      <p className="text-gray-300 mb-4">Туз + будь-яка картинка з номіналом 10 також дає блекджек.</p>
                      <div className="flex justify-center space-x-3">
                        <div className="w-[100px] h-[150px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[100px] h-[150px]" style={{
                          backgroundImage: `url(${getCardImage('10', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                      <p className="text-sm text-gray-300 text-center mt-3">Туз + Десятка = Блекджек!</p>
                    </div>
                  </div>
                  
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>Дилер повинен брати картини до 17 очок</li>
                    <li>При переборі (більше 21) гравець автоматично програє</li>
                    <li>Якщо у дилера і гравця однакова кількість очок, це називається "пуш" (push) і ставки повертаються</li>
                    <li>Якщо у гравця блекджек, а у дилера ні, гравець отримує виплату 3:2</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Стратегія гри</h3>
                  <div className="bg-gray-700 p-6 rounded-lg">
                    <p className="text-gray-300 mb-4">У блекджеку є кілька базових стратегій, які можуть допомогти вам приймати правильні рішення:</p>
                    
                    <ul className="space-y-2 text-gray-300">
                      <li>• Завжди беріть карту, якщо у вас 12-16 очок, а у дилера 7 або вище</li>
                      <li>• Зупиняйтесь, якщо у вас 17 або більше очок</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Правила Покеру (Техаський Холдем)</h2>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Мета гри</h3>
                  <p className="text-gray-300">Зібрати найкращу комбінацію з 5 карт, використовуючи 2 власні карти та 5 спільних карт на столі. Переможець забирає весь банк.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Хід гри</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">1. Префлоп</h4>
                      <p className="text-gray-300">Кожен гравець отримує 2 закриті карти. Починається торгівля.</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">2. Флоп</h4>
                      <p className="text-gray-300">На стіл викладаються 3 спільні карти. Новий раунд торгівлі.</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">3. Терн</h4>
                      <p className="text-gray-300">Викладається 4-та спільна карта. Ще один раунд торгівлі.</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">4. Рівер</h4>
                      <p className="text-gray-300">Викладається 5-та (остання) спільна карта. Фінальний раунд торгівлі.</p>
                    </div>
                      </div>
                    </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Дії гравця</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Фолд</h4>
                      <p className="text-gray-300">Скинути картини і вийти з раздачі.</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Колл</h4>
                      <p className="text-gray-300">Зрівняти поточну ставку.</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Рейз</h4>
                      <p className="text-gray-300">Підвищити ставку.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Комбінації (від найсильнішої)</h3>
                  <div className="space-y-3">
                    {/* Роял Флеш */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">1. Роял Флеш</span>
                        <span className="text-gray-300">А-К-Q-J-10 однієї масті</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('Q', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('10', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Стрейт Флеш */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">2. Стрейт Флеш</span>
                        <span className="text-gray-300">5 карт поспіль однієї масті</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('9', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('8', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('7', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('6', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('5', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Каре */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">3. Каре</span>
                        <span className="text-gray-300">4 картини одного номіналу</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♣')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Фул Хаус */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">4. Фул Хаус</span>
                        <span className="text-gray-300">Тройка + пара</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('Q', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('Q', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Флеш */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">5. Флеш</span>
                        <span className="text-gray-300">5 карт однієї масті</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('9', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('7', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('4', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Стрейт */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">6. Стрейт</span>
                        <span className="text-gray-300">5 карт поспіль</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('10', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('9', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('8', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('7', '♣')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('6', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Тройка */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">7. Тройка</span>
                        <span className="text-gray-300">3 картини одного номіналу</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('K', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Дві пари */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">8. Дві пари</span>
                        <span className="text-gray-300">Дві пари різних номіналів</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('Q', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('Q', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('8', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('8', '♣')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Пара */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">9. Пара</span>
                        <span className="text-gray-300">2 картини одного номіналу</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('10', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('10', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('7', '♣')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('4', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>

                    {/* Стара карта */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">10. Стара карта</span>
                        <span className="text-gray-300">Найвища карта</span>
                      </div>
                      <div className="flex justify-center space-x-2 mt-3">
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('A', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('J', '♥')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('9', '♦')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('6', '♣')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                        <div className="w-[70px] h-[105px]" style={{
                          backgroundImage: `url(${getCardImage('3', '♠')})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Позиції за столом</h3>
                  <div className="bg-gray-700 p-6 rounded-lg">
                    <ul className="space-y-2 text-gray-300">
                      <li>• <strong>Дилер (Button)</strong> - найкраща позиція, ходить останнім</li>
                      <li>• <strong>Малий блайнд (SB)</strong> - обов'язкова ставка, менша за великий блайнд</li>
                      <li>• <strong>Великий блайнд (BB)</strong> - обов'язкова ставка, більша за малий блайнд</li>
                      <li>• <strong>UTG (Under The Gun)</strong> - позиція після великого блайнда, ходить першим</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rules; 