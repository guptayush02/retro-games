class Snake {
  constructor(io, roomName, gridWidth = 20, gridHeight = 20) {
    this.io = io;
    this.roomName = roomName;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.snake = [{ x: 10, y: 10 }];
    this.food = this.generateFood();
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.gameRunning = false;
    this.players = {};
  }

  addPlayer(socketId, userId, username) {
    this.players[socketId] = { userId, username, score: 0 };
  }

  generateFood() {
    let food;
    let validPosition = false;

    while (!validPosition) {
      food = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight),
      };

      validPosition = !this.snake.some((segment) => segment.x === food.x && segment.y === food.y);
    }

    return food;
  }

  setDirection(x, y) {
    if (
      (this.direction.x === -x && this.direction.y === -y) ||
      (this.nextDirection.x === x && this.nextDirection.y === y)
    ) {
      return;
    }

    this.nextDirection = { x, y };
  }

  update() {
    if (this.gameOver) return;

    this.direction = this.nextDirection;

    const head = this.snake[0];
    const newHead = {
      x: (head.x + this.direction.x + this.gridWidth) % this.gridWidth,
      y: (head.y + this.direction.y + this.gridHeight) % this.gridHeight,
    };

    // Check collision with self
    if (this.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
      this.gameOver = true;
      return;
    }

    this.snake.unshift(newHead);

    // Check if food is eaten
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      this.food = this.generateFood();
    } else {
      this.snake.pop();
    }
  }

  getGameState() {
    return {
      snake: this.snake,
      food: this.food,
      score: this.score,
      gameOver: this.gameOver,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
    };
  }
}

export default Snake;
