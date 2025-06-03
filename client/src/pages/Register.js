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

        {/* Google Sign In Button */}
        <button
          className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Продовжити за допомогою Google
        </button>

        <div className="mt-6 text-center text-sm">
          <span className="px-4 bg-white text-gray-500">або</span>
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