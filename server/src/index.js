import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO connection
const rooms = new Map();
const waitingPlayerByGame = new Map(); // gameKey -> player
const createMultiplayerRoomName = (gameKey) => `${gameKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Shared random matchmaking for multiplayer board games (tic-tac-toe, chess, ...)
  socket.on('mp_queue_join', (data = {}) => {
    const { gameKey } = data;
    if (!gameKey) return;

    const player = {
      socketId: socket.id,
      userId: data.userId || socket.id,
      username: data.username || 'Guest',
    };

    const waitingPlayer = waitingPlayerByGame.get(gameKey);

    // If someone is waiting for this game, create a match.
    if (waitingPlayer && waitingPlayer.socketId !== socket.id) {
      const roomName = createMultiplayerRoomName(gameKey);
      const waitingSocket = io.sockets.sockets.get(waitingPlayer.socketId);

      if (waitingSocket) {
        waitingSocket.join(roomName);
        socket.join(roomName);

        if (!waitingSocket.data.mpRooms) waitingSocket.data.mpRooms = {};
        if (!socket.data.mpRooms) socket.data.mpRooms = {};
        waitingSocket.data.mpRooms[gameKey] = roomName;
        socket.data.mpRooms[gameKey] = roomName;

        const symbols = gameKey === 'chess'
          ? ['w', 'b']
          : gameKey === 'ludo' || gameKey === 'scribble-battle'
            ? ['red', 'blue']
            : ['X', 'O'];

        waitingSocket.emit('mp_match_found', {
          gameKey,
          roomName,
          mySymbol: symbols[0],
          opponent: { userId: player.userId, username: player.username },
        });

        socket.emit('mp_match_found', {
          gameKey,
          roomName,
          mySymbol: symbols[1],
          opponent: { userId: waitingPlayer.userId, username: waitingPlayer.username },
        });

        waitingPlayerByGame.delete(gameKey);
        return;
      }
    }

    waitingPlayerByGame.set(gameKey, player);
    socket.emit('mp_queue_waiting', { gameKey });
  });

  socket.on('mp_queue_leave', ({ gameKey } = {}) => {
    if (!gameKey) return;
    const waitingPlayer = waitingPlayerByGame.get(gameKey);
    if (waitingPlayer?.socketId === socket.id) {
      waitingPlayerByGame.delete(gameKey);
    }
  });

  socket.on('mp_move', (data = {}) => {
    const { gameKey, roomName, payload } = data;
    if (!gameKey || !roomName || !payload) return;
    socket.to(roomName).emit('mp_move', { gameKey, payload });
  });

  socket.on('mp_room_leave', ({ gameKey, roomName } = {}) => {
    if (!gameKey || !roomName) return;
    socket.leave(roomName);
    socket.to(roomName).emit('mp_opponent_left', { gameKey });
    if (socket.data.mpRooms?.[gameKey] === roomName) {
      delete socket.data.mpRooms[gameKey];
    }
  });

  // Join game room
  socket.on('join_room', (data) => {
    const { roomName, userId, username } = data;
    socket.join(roomName);

    if (!rooms.has(roomName)) {
      rooms.set(roomName, []);
    }

    const roomUsers = rooms.get(roomName);
    roomUsers.push({ socketId: socket.id, userId, username });

    io.to(roomName).emit('room_updated', {
      users: roomUsers,
      message: `${username} joined the room`,
    });
  });

  // Game move/action
  socket.on('game_action', (data) => {
    const { roomName, action, payload } = data;
    socket.to(roomName).emit('game_action', { action, payload });
  });

  // Leave room
  socket.on('leave_room', (roomName) => {
    socket.leave(roomName);
    const roomUsers = rooms.get(roomName);
    if (roomUsers) {
      const index = roomUsers.findIndex((u) => u.socketId === socket.id);
      if (index > -1) {
        roomUsers.splice(index, 1);
      }
      io.to(roomName).emit('room_updated', {
        users: roomUsers,
        message: 'Player left the room',
      });
    }
  });

  socket.on('disconnect', () => {
    // remove from all matchmaking queues
    for (const [gameKey, waitingPlayer] of waitingPlayerByGame.entries()) {
      if (waitingPlayer.socketId === socket.id) {
        waitingPlayerByGame.delete(gameKey);
      }
    }

    // notify opponents in active multiplayer rooms
    if (socket.data.mpRooms) {
      Object.entries(socket.data.mpRooms).forEach(([gameKey, roomName]) => {
        socket.to(roomName).emit('mp_opponent_left', { gameKey });
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Initialize database and start server
const PORT = process.env.BACKEND_PORT || 5001;

async function start() {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export { httpServer, io };
