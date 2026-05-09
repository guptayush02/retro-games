import TicTacToe from './TicTacToe.js';

const games = new Map();

export const initTicTacToeRoom = (io, roomName) => {
  const game = new TicTacToe(io, roomName);
  games.set(roomName, game);

  io.to(roomName).emit('game_initialized', {
    game: 'tic-tac-toe',
    state: game.getGameState(),
  });
};

export const handleTicTacToeMove = (io, roomName, socketId, position) => {
  const game = games.get(roomName);
  if (!game) return;

  const result = game.makeMove(socketId, position);

  if (result.success) {
    io.to(roomName).emit('board_updated', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameOver: game.gameOver,
      winner: game.winner,
    });
  }

  return result;
};

export const getGameState = (roomName) => {
  const game = games.get(roomName);
  return game ? game.getGameState() : null;
};
