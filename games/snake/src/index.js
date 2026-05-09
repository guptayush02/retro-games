import Snake from './Snake.js';

const games = new Map();

export const initSnakeRoom = (io, roomName) => {
  const game = new Snake(io, roomName);
  games.set(roomName, game);

  io.to(roomName).emit('game_initialized', {
    game: 'snake',
    state: game.getGameState(),
  });
};

export const handleSnakeDirection = (io, roomName, socketId, direction) => {
  const game = games.get(roomName);
  if (!game) return;

  game.setDirection(direction.x, direction.y);
};

export const updateSnakeGame = (io, roomName) => {
  const game = games.get(roomName);
  if (!game) return;

  game.update();

  io.to(roomName).emit('board_updated', game.getGameState());

  if (game.gameOver) {
    io.to(roomName).emit('game_over', {
      score: game.score,
      message: 'Game Over!',
    });
  }
};

export const startSnakeGame = (io, roomName) => {
  const game = games.get(roomName);
  if (!game) return;

  game.gameRunning = true;

  const interval = setInterval(() => {
    if (!game.gameRunning) {
      clearInterval(interval);
      return;
    }

    updateSnakeGame(io, roomName);
  }, 100);
};

export const getGameState = (roomName) => {
  const game = games.get(roomName);
  return game ? game.getGameState() : null;
};
