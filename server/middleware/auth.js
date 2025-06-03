const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware для перевірки аутентифікації
 */
module.exports = async (req, res, next) => {
  try {
    // Отримуємо токен з заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Доступ заборонено, необхідна аутентифікація' });
    }
    
    // Верифікуємо токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Знаходимо користувача
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Користувач не знайдений' });
    }
    
    // Додаємо дані користувача до запиту
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Помилка аутентифікації:', error);
    
    // Різні помилки JWT
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Недійсний токен' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Термін дії токена закінчився' });
    }
    
    res.status(500).json({ message: 'Помилка сервера' });
  }
}; 