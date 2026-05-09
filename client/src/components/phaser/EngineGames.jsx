import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { gamesAPI } from '../../api/endpoints';

function useRecordGameResultOnce(gameId) {
  const lastKeyRef = useRef(null);

  return useCallback(async ({ score = 0, outcome = 'draw' } = {}) => {
    if (!gameId) return;
    const key = `${gameId}:${score}:${outcome}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    try {
      await gamesAPI.recordResult(gameId, { score, outcome });
    } catch {
      // ignore transient failures
    }
  }, [gameId]);
}

function buildLudoTrack(width, height) {
  const cells = [];
  const cx = width / 2;
  const cy = height / 2;
  const radiusX = 220;
  const radiusY = 140;

  for (let i = 0; i < 20; i += 1) {
    const angle = (Math.PI * 2 * i) / 20 - Math.PI / 2;
    cells.push({
      x: cx + Math.cos(angle) * radiusX,
      y: cy + Math.sin(angle) * radiusY,
    });
  }

  return cells;
}

export function PhaserLudoBoard({ state, mode, myColor }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    if (sceneRef.current?.renderBoard) {
      sceneRef.current.renderBoard(state);
    }
  }, [state]);

  useEffect(() => {
    if (!containerRef.current) return;

    const SceneClass = class extends Phaser.Scene {
      constructor() {
        super('LudoBoardScene');
        this.track = [];
        this.boardGraphics = null;
        this.tokenGraphics = null;
        this.textObjects = [];
      }

      create() {
        sceneRef.current = this;
        const { width, height } = this.scale;
        this.track = buildLudoTrack(width, height);

        this.boardGraphics = this.add.graphics();
        this.tokenGraphics = this.add.graphics();
        this.statusText = this.add.text(18, 16, '', {
          fontSize: '16px',
          color: '#e5e7eb',
          fontFamily: 'Arial, sans-serif',
        }).setDepth(10);

        this.renderBoard(stateRef.current);
      }

      renderBoard(currentState) {
        if (!this.boardGraphics || !this.tokenGraphics) return;
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.boardGraphics.clear();
        this.tokenGraphics.clear();

        // board background
        this.boardGraphics.fillStyle(0x111827, 1);
        this.boardGraphics.fillRoundedRect(0, 0, width, height, 18);

        // center area
        this.boardGraphics.fillStyle(0x1f2937, 1);
        this.boardGraphics.fillRoundedRect(centerX - 85, centerY - 85, 170, 170, 20);
        this.boardGraphics.lineStyle(4, 0x6b7280, 1);
        this.boardGraphics.strokeRoundedRect(centerX - 85, centerY - 85, 170, 170, 20);

        // quadrants
        const quadrants = [
          { x: 24, y: 24, c: 0xef4444 },
          { x: width - 164, y: 24, c: 0x22c55e },
          { x: 24, y: height - 164, c: 0x3b82f6 },
          { x: width - 164, y: height - 164, c: 0xa855f7 },
        ];
        quadrants.forEach((q) => {
          this.boardGraphics.fillStyle(q.c, 0.16);
          this.boardGraphics.fillRoundedRect(q.x, q.y, 140, 140, 22);
        });

        // track cells
        this.track.forEach((cell, index) => {
          this.boardGraphics.fillStyle(0xf8fafc, 1);
          this.boardGraphics.fillCircle(cell.x, cell.y, 18);
          this.boardGraphics.lineStyle(3, 0x334155, 1);
          this.boardGraphics.strokeCircle(cell.x, cell.y, 18);
        });

        // home circles
        const homes = [
          { x: 110, y: 110, c: 0xef4444 },
          { x: width - 110, y: 110, c: 0x22c55e },
          { x: 110, y: height - 110, c: 0x3b82f6 },
          { x: width - 110, y: height - 110, c: 0xa855f7 },
        ];
        homes.forEach((home) => {
          this.boardGraphics.fillStyle(home.c, 1);
          this.boardGraphics.fillCircle(home.x, home.y, 22);
        });

        // tokens
        const redPos = currentState?.positions?.red ?? -1;
        const bluePos = currentState?.positions?.blue ?? -1;
        const redCell = redPos >= 0 ? this.track[redPos % this.track.length] : homes[0];
        const blueCell = bluePos >= 0 ? this.track[bluePos % this.track.length] : homes[1];

        this.tokenGraphics.fillStyle(0xef4444, 1);
        this.tokenGraphics.fillCircle(redCell.x - 8, redCell.y - 8, 14);
        this.tokenGraphics.lineStyle(3, 0xffffff, 0.7);
        this.tokenGraphics.strokeCircle(redCell.x - 8, redCell.y - 8, 14);

        this.tokenGraphics.fillStyle(0x3b82f6, 1);
        this.tokenGraphics.fillCircle(blueCell.x + 8, blueCell.y + 8, 14);
        this.tokenGraphics.lineStyle(3, 0xffffff, 0.7);
        this.tokenGraphics.strokeCircle(blueCell.x + 8, blueCell.y + 8, 14);

        // turn label
        if (this.statusText) {
          this.statusText.setText(`Turn: ${currentState?.currentTurn || 'red'}  |  ${mode || 'computer'}${myColor ? `  |  You: ${myColor}` : ''}`);
        }
      }
    };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 720,
      height: 460,
      backgroundColor: '#111827',
      scene: SceneClass,
    });

    gameRef.current = game;

    return () => {
      sceneRef.current = null;
      game.destroy(true);
      gameRef.current = null;
    };
  }, [mode, myColor]);

  return <div ref={containerRef} className="w-full max-w-4xl rounded-xl overflow-hidden border border-gray-700" />;
}

function createMiniRacingScene({ onScore, onGameOver }) {
  return class MiniRacingScene extends Phaser.Scene {
    constructor() {
      super('MiniRacingScene');
      this.lanes = [150, 310, 470];
      this.playerLane = 1;
      this.started = false;
      this.dead = false;
      this.distance = 0;
      this.speed = 4;
      this.obstacles = [];
    }

    create() {
      this.graphics = this.add.graphics();
      this.player = this.add.rectangle(this.lanes[this.playerLane], 360, 44, 76, 0x3b82f6);
      this.distanceText = this.add.text(18, 14, 'Distance: 0', {
        color: '#f8fafc',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
      });
      this.infoText = this.add.text(18, 36, 'Use Left/Right arrows to switch lanes', {
        color: '#9ca3af',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
      });
      this.gameOverText = this.add.text(330, 190, '', {
        color: '#f87171',
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('A,D');
      this.input.keyboard.on('keydown', () => {
        this.started = true;
      });

      this.spawnEvent = this.time.addEvent({ delay: 650, loop: true, callback: () => this.spawnObstacle() });
      this.updateEvent = this.time.addEvent({ delay: 60, loop: true, callback: () => this.stepGame() });
      this.renderRoad();
    }

    renderRoad() {
      this.graphics.clear();
      this.graphics.fillStyle(0x0f172a, 1);
      this.graphics.fillRect(0, 0, 620, 420);
      this.graphics.lineStyle(2, 0x334155, 1);
      this.graphics.strokeRect(0, 0, 620, 420);
      [210, 410].forEach((x) => {
        this.graphics.lineStyle(2, 0x475569, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(x, 0);
        this.graphics.lineTo(x, 420);
        this.graphics.strokePath();
      });
      this.graphics.lineStyle(2, 0xf8fafc, 0.4);
      for (let y = 0; y < 420; y += 48) {
        this.graphics.beginPath();
        this.graphics.moveTo(308, y);
        this.graphics.lineTo(308, y + 24);
        this.graphics.strokePath();
      }
    }

    spawnObstacle() {
      if (this.dead || !this.started) return;
      const lane = Math.floor(Math.random() * this.lanes.length);
      const obstacle = this.add.rectangle(this.lanes[lane], -30, 38, 38, 0xef4444);
      this.obstacles.push({ lane, y: -30, sprite: obstacle });
    }

    stepGame() {
      if (this.dead) return;
      this.distance += 1;
      this.speed = Math.min(11, this.speed + 0.01);
      this.distanceText.setText(`Distance: ${this.distance}`);

      if (this.cursors.left.isDown || this.keys.A.isDown) {
        this.playerLane = Math.max(0, this.playerLane - 1);
        this.started = true;
      }
      if (this.cursors.right.isDown || this.keys.D.isDown) {
        this.playerLane = Math.min(2, this.playerLane + 1);
        this.started = true;
      }

      this.player.x = this.lanes[this.playerLane];

      this.obstacles = this.obstacles.filter((obstacle) => {
        obstacle.y += this.speed;
        obstacle.sprite.y = obstacle.y;
        if (obstacle.y > 450) {
          obstacle.sprite.destroy();
          return false;
        }
        if (Math.abs(obstacle.y - this.player.y) < 28 && obstacle.lane === this.playerLane) {
          this.dead = true;
          this.gameOverText.setText('Crash!');
          onGameOver?.(this.distance);
        }
        return true;
      });

      if (this.dead) {
        this.spawnEvent.paused = true;
        this.updateEvent.paused = true;
        onScore?.(this.distance);
      }
    }
  };
}

export function PhaserMiniRacingGame({ gameId }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const submitResult = useRecordGameResultOnce(gameId);

  useEffect(() => {
    if (!containerRef.current) return;
    const SceneClass = createMiniRacingScene({
      onScore: (score) => {
        submitResult({ score, outcome: 'loss' });
      },
      onGameOver: (score) => {
        submitResult({ score, outcome: 'loss' });
      },
    });

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 620,
      height: 420,
      backgroundColor: '#111827',
      scene: SceneClass,
    });

    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [submitResult]);

  return <div ref={containerRef} className="w-full max-w-3xl rounded-xl overflow-hidden border border-gray-700" />;
}

function createBomberScene({ onGameOver, onScore }) {
  return class BomberArenaScene extends Phaser.Scene {
    constructor() {
      super('BomberArenaScene');
      this.grid = 9;
      this.tile = 48;
      this.player = { x: 1, y: 1 };
      this.enemies = [{ x: 7, y: 7 }];
      this.blocks = [];
      this.bombs = [];
      this.dead = false;
      this.score = 0;
    }

    create() {
      this.board = this.add.graphics();
      this.playerSprite = this.add.rectangle(0, 0, 34, 34, 0x3b82f6);
      this.info = this.add.text(12, 12, 'WASD/Arrows move • Space bombs', {
        color: '#e5e7eb',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
      });
      this.scoreText = this.add.text(12, 32, 'Score: 0', {
        color: '#fbbf24',
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
      });
      this.message = this.add.text(180, 220, '', {
        color: '#f87171',
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
      }).setOrigin(0.5);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      this.blocks = this.generateBlocks();
      this.renderBoard();
      this.time.addEvent({ delay: 450, loop: true, callback: () => this.tick() });
    }

    generateBlocks() {
      const blocks = [];
      for (let y = 1; y < this.grid - 1; y += 1) {
        for (let x = 1; x < this.grid - 1; x += 1) {
          if (x === 1 && y === 1) continue;
          if ((x + y) % 2 === 0 && Math.random() < 0.45) blocks.push({ x, y });
        }
      }
      return blocks;
    }

    isBlocked(x, y) {
      return this.blocks.some((b) => b.x === x && b.y === y);
    }

    renderBoard() {
      this.board.clear();
      for (let y = 0; y < this.grid; y += 1) {
        for (let x = 0; x < this.grid; x += 1) {
          const px = x * this.tile;
          const py = y * this.tile;
          const wall = x === 0 || y === 0 || x === this.grid - 1 || y === this.grid - 1;
          this.board.fillStyle(wall ? 0x020617 : 0x1f2937, 1);
          this.board.fillRect(px, py, this.tile, this.tile);
          this.board.lineStyle(1, 0x374151, 1);
          this.board.strokeRect(px, py, this.tile, this.tile);
        }
      }

      this.blocks.forEach((b) => {
        this.board.fillStyle(0xb45309, 1);
        this.board.fillRoundedRect(b.x * this.tile + 6, b.y * this.tile + 6, 36, 36, 8);
      });

      this.enemies.forEach((e) => {
        this.board.fillStyle(0xef4444, 1);
        this.board.fillCircle(e.x * this.tile + 24, e.y * this.tile + 24, 14);
      });

      this.bombs.forEach((b) => {
        this.board.fillStyle(0xf59e0b, 1);
        this.board.fillCircle(b.x * this.tile + 24, b.y * this.tile + 24, 11);
        this.board.fillStyle(0x111827, 1);
        this.board.fillText?.(String(b.timer), b.x * this.tile + 20, b.y * this.tile + 15);
      });

      this.playerSprite.x = this.player.x * this.tile + 24;
      this.playerSprite.y = this.player.y * this.tile + 24;
    }

    movePlayer(dx, dy) {
      const next = {
        x: Math.max(1, Math.min(this.grid - 2, this.player.x + dx)),
        y: Math.max(1, Math.min(this.grid - 2, this.player.y + dy)),
      };
      if (!this.isBlocked(next.x, next.y)) {
        this.player = next;
      }
    }

    placeBomb() {
      if (this.dead) return;
      if (this.bombs.some((b) => b.x === this.player.x && b.y === this.player.y)) return;
      this.bombs.push({ x: this.player.x, y: this.player.y, timer: 3 });
    }

    explodeBomb(bomb) {
      const blast = new Set([
        `${bomb.x},${bomb.y}`,
        `${bomb.x + 1},${bomb.y}`,
        `${bomb.x - 1},${bomb.y}`,
        `${bomb.x},${bomb.y + 1}`,
        `${bomb.x},${bomb.y - 1}`,
      ]);
      this.blocks = this.blocks.filter((b) => {
        const hit = blast.has(`${b.x},${b.y}`);
        if (hit) this.score += 5;
        return !hit;
      });
      this.enemies = this.enemies.filter((e) => {
        const hit = blast.has(`${e.x},${e.y}`);
        if (hit) this.score += 20;
        return !hit;
      });
      if (blast.has(`${this.player.x},${this.player.y}`)) {
        this.dead = true;
        this.message.setText('Boom!');
        onGameOver?.(this.score);
      }
    }

    tick() {
      if (this.dead) return;

      const left = this.cursors.left.isDown || this.keys.A.isDown;
      const right = this.cursors.right.isDown || this.keys.D.isDown;
      const up = this.cursors.up.isDown || this.keys.W.isDown;
      const down = this.cursors.down.isDown || this.keys.S.isDown;

      if (left) this.movePlayer(-1, 0);
      if (right) this.movePlayer(1, 0);
      if (up) this.movePlayer(0, -1);
      if (down) this.movePlayer(0, 1);
      if (this.spaceKey.isDown) this.placeBomb();

      this.bombs = this.bombs.map((b) => ({ ...b, timer: b.timer - 1 }));
      const exploding = this.bombs.filter((b) => b.timer <= 0);
      this.bombs = this.bombs.filter((b) => b.timer > 0);
      exploding.forEach((b) => this.explodeBomb(b));

      this.enemies = this.enemies.map((e) => {
        const choices = [
          { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        ];
        const dir = choices[Math.floor(Math.random() * choices.length)];
        const next = {
          x: Math.max(1, Math.min(this.grid - 2, e.x + dir.x)),
          y: Math.max(1, Math.min(this.grid - 2, e.y + dir.y)),
        };
        return this.isBlocked(next.x, next.y) ? e : next;
      });

      if (this.enemies.some((e) => e.x === this.player.x && e.y === this.player.y)) {
        this.dead = true;
        this.message.setText('Caught!');
        onGameOver?.(this.score);
      }

      if (this.enemies.length === 0) {
        this.dead = true;
        this.message.setText('Winner!');
        onScore?.(this.score + 100);
      }

      this.scoreText.setText(`Score: ${this.score}`);
      this.renderBoard();
    }
  };
}

export function PhaserBomberArenaGame({ gameId }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const submitResult = useRecordGameResultOnce(gameId);

  useEffect(() => {
    if (!containerRef.current) return;
    const SceneClass = createBomberScene({
      onScore: (score) => submitResult({ score, outcome: 'win' }),
      onGameOver: (score) => submitResult({ score, outcome: 'loss' }),
    });

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 432,
      height: 432,
      backgroundColor: '#111827',
      scene: SceneClass,
    });

    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [submitResult]);

  return <div ref={containerRef} className="w-full max-w-xl rounded-xl overflow-hidden border border-gray-700" />;
}
