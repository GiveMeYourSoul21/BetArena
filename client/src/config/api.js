// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_URL = (() => {
  // Проверяем переменную окружения
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  
  // Если localhost - используем локальный сервер
  if (isLocalhost) {
    return 'http://localhost:3002';
  }
  
  // Для production всегда используем Render
  return 'https://bet-arenaback.onrender.com';
})();

console.log('🔧 API Configuration:');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('🔧 hostname:', window.location.hostname);
console.log('🔧 Final API_URL:', API_URL); 