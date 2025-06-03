const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const pokerHandler = require('./socket/pokerHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Подключаем обработчик покера
pokerHandler(io);

// Middleware для передачи io в req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const userRoutes = require('./routes/user');
const pokerRoutes = require('./routes/poker');

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/poker', pokerRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 