import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Клиентская валидация
    if (password.length < 6) {
      setError('Пароль повинен містити не менше 6 символів');
      return;
    }
    
    if (username.length < 3) {
      setError('Ім\'я користувача повинно містити не менше 3 символів');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await register(username, email, password);
      navigate('/');
    } catch (error) {
      setError(error.message || 'Помилка при реєстрації');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-blue-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Реєстрація
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Почніть безкоштовно. Кредитна картка не потрібна.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Введіть email"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Ім'я користувача <span className="text-gray-500">(мінімум 3 символи)</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                minLength="3"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Введіть ім'я користувача"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-gray-500">(мінімум 6 символів)</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Введіть пароль (мін. 6 символів)"
              />
              {password.length > 0 && password.length < 6 && (
                <p className="mt-1 text-sm text-red-600">
                  Пароль повинен містити не менше 6 символів (зараз: {password.length})
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {loading ? 'Реєстрація...' : 'Зареєструватися'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <span className="text-gray-600">Вже є обліковий запис? </span>
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Увійти
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register; 