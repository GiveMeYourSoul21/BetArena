require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./server/routes/auth');
const gameRoutes = require('./server/routes/game');
const userRoutes = require('./server/routes/user');
const pokerRoutes = require('./server/routes/poker');

const app = express();

// Налаштування статичних файлів
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
  );
  next();
});

// Логування запитів
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/poker', pokerRoutes);
app.use('/api/game', gameRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Щось пішло не так!' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3002;

const server = app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Порт ${PORT} зайнятий, намагаємося звільнити...`);
    require('child_process').exec(`npx kill-port ${PORT}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Помилка при звільненні порту: ${error}`);
        return;
      }
      console.log(`Порт ${PORT} звільнено, перезапускаємо сервер...`);
      server.listen(PORT);
    });
  } else {
    console.error('Помилка сервера:', err);
  }
});

if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
}