import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-white text-lg font-bold mb-4">Про проєкт</h3>
          <p className="text-sm">
            BetArena — це онлайн-платформа для гри в покер і блекджек проти ботів.
          </p>
        </div>

        <div>
          <h3 className="text-white text-lg font-bold mb-4">Корисні посилання</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/rules" className="hover:text-white transition-colors">
                Правила гри
              </Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-white transition-colors">
                Профіль
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                Головна
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm">
          © 2025 BetArena. Всі права захищені.
        </div>
      </div>
    </footer>
  );
}

export default Footer; 