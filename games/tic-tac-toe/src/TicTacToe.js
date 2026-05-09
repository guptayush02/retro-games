class TicTacToe {
  constructor(io, roomName) {
    this.io = io;
    this.roomName = roomName;
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameOver = false;
    this.winner = null;
    this.players = {};
  }

  addPlayer(socketId, userId, username) {
    const symbol = Object.keys(this.players).length === 0 ? 'X' : 'O';
    this.players[socketId] = { userId, username, symbol };
  }

  makeMove(socketId, position) {
    if (this.gameOver || this.board[position] !== null) {
      return { success: false, message: 'Invalid move' };
    }

    const player = this.players[socketId];
    if (player.symbol !== this.currentPlayer) {
      return { success: false, message: 'Not your turn' };
    }

    this.board[position] = this.currentPlayer;

    const winner = this.checkWinner();
    if (winner) {
      this.gameOver = true;
      this.winner = winner;
      return { success: true, gameOver: true, winner };
    }

    if (this.board.every((cell) => cell !== null)) {
      this.gameOver = true;
      return { success: true, gameOver: true, draw: true };
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    return { success: true, board: this.board, currentPlayer: this.currentPlayer };
  }

  checkWinner() {
    const winningCombos = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const combo of winningCombos) {
      const [a, b, c] = combo;
      if (
        this.board[a] &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        return this.board[a];
      }
    }

    return null;
  }

  getGameState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      players: this.players,
    };
  }
}

export default TicTacToe;
