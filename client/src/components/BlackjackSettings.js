import React, { useState } from 'react';

function BlackjackSettings({ onStart, onClose }) {
  const [decks, setDecks] = useState(4);
  const [initialBet, setInitialBet] = useState(10);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({ decks, initialBet });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white p-6 rounded-lg w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          ✕
        </button>
        
        <h2 className="text-xl font-bold mb-4">Налаштування гри в Блекджек</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">Кількість колод</label>
            <select
              value={decks}
              onChange={(e) => setDecks(Number(e.target.value))}
              className="w-full p-2 bg-gray-800 rounded"
            >
              <option value={4}>4 колоди</option>
              <option value={5}>5 колод</option>
              <option value={6}>6 колод</option>
              <option value={7}>7 колод</option>
              <option value={8}>8 колод</option>
            </select>
            <p className="text-sm text-gray-400 mt-1">
              Чим більше колод, тим складніше рахувати карти
            </p>
          </div>

          <div className="mb-4">
            <label className="block mb-2">Початкова ставка</label>
            <select
              value={initialBet}
              onChange={(e) => setInitialBet(Number(e.target.value))}
              className="w-full p-2 bg-gray-800 rounded"
            >
              <option value={10}>10 фішок</option>
              <option value={25}>25 фішок</option>
              <option value={50}>50 фішок</option>
              <option value={100}>100 фішок</option>
            </select>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded transition-colors"
            >
              Почати гру
            </button>
          </div>
        </form>

        <div className="mt-6 text-sm text-gray-400">
          <h3 className="font-bold mb-2">Базові правила:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Блекджек (21 очко) оплачується 3 до 2</li>
            <li>Дилер зобов'язаний брати карти до 17 очок</li>
            <li>Дилер зобов'язаний зупинитися на 17 і вище</li>
            <li>Дозволено подвоювати ставку після отримання перших двох карт</li>
            <li>Дозволено розділяти пари</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BlackjackSettings; 