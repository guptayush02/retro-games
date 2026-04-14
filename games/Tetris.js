import React, { useEffect, useRef, useState } from 'react';

// Simple Tetris implementation (minimal, for demo)
const ROWS = 20, COLS = 10, BLOCK = 24;
const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,1],[0,1,0]],
  [[1,0,0],[1,1,1]]
];
const COLORS = ['#0ff','#ff0','#f0f','#0f0','#f00','#00f','#fa0'];

function randomShape() {
  const i = Math.floor(Math.random()*SHAPES.length);
  return { shape: SHAPES[i], color: COLORS[i], x: 3, y: 0 };
}

function rotate(shape) {
  return shape[0].map((_,i) => shape.map(row => row[i]).reverse());
}

export default function Tetris() {
  const [board, setBoard] = useState(Array.from({length:ROWS},()=>Array(COLS).fill(null)));
  const [piece, setPiece] = useState(randomShape());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const moveRef = useRef(piece);

  useEffect(() => { moveRef.current = piece; }, [piece]);

  useEffect(() => {
    if (gameOver) return;
    const handleKey = e => {
      if (!piece) return;
      if (e.key === 'ArrowLeft') move(-1,0);
      if (e.key === 'ArrowRight') move(1,0);
      if (e.key === 'ArrowDown') move(0,1);
      if (e.key === 'ArrowUp') rotatePiece();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [piece, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      move(0,1);
    }, 400);
    return () => clearInterval(interval);
  }, [piece, gameOver]);

  function valid(p, b=board) {
    return p.shape.every((row, dy) =>
      row.every((cell, dx) => {
        if (!cell) return true;
        const x = p.x+dx, y = p.y+dy;
        return x>=0 && x<COLS && y<ROWS && (!b[y] || !b[y][x]);
      })
    );
  }

  function merge(p, b=board) {
    const newB = b.map(row=>row.slice());
    p.shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell) {
          const x = p.x+dx, y = p.y+dy;
          if (y>=0 && y<ROWS && x>=0 && x<COLS) newB[y][x] = p.color;
        }
      })
    );
    return newB;
  }

  function move(dx,dy) {
    const np = { ...piece, x: piece.x+dx, y: piece.y+dy };
    if (valid(np)) setPiece(np);
    else if (dy) {
      const newB = merge(piece);
      const cleared = newB.filter(row => row.every(cell => cell));
      const lines = ROWS - cleared.length;
      const nextB = Array.from({length:lines},()=>Array(COLS).fill(null)).concat(cleared);
      setBoard(nextB);
      setScore(s=>s+lines*100);
      const next = randomShape();
      if (!valid(next, nextB)) setGameOver(true);
      setPiece(next);
    }
  }

  function rotatePiece() {
    const np = { ...piece, shape: rotate(piece.shape) };
    if (valid(np)) setPiece(np);
  }

  function reset() {
    setBoard(Array.from({length:ROWS},()=>Array(COLS).fill(null)));
    setPiece(randomShape());
    setScore(0);
    setGameOver(false);
  }

  return (
    <div>
      <h2>Tetris</h2>
      <div style={{
        display: 'grid',
        gridTemplateRows: `repeat(${ROWS}, ${BLOCK}px)`,
        gridTemplateColumns: `repeat(${COLS}, ${BLOCK}px)`,
        border: '2px solid #0ff',
        margin: '0 auto',
        background: '#222',
        width: COLS * BLOCK,
        height: ROWS * BLOCK
      }}>
        {board.map((row, y) => row.map((cell, x) => {
          let color = cell;
          if (piece && piece.shape.some((r, dy) => r.some((c, dx) => c && piece.x+dx===x && piece.y+dy===y)))
            color = piece.color;
          return <div key={x+','+y} style={{
            width: BLOCK, height: BLOCK,
            background: color || 'transparent',
            border: '1px solid #333',
            boxSizing: 'border-box'
          }} />;
        }))}
      </div>
      <div style={{marginTop: 10}}>
        <span>Score: {score}</span>
        {gameOver && <><br /><b>Game Over!</b> <button onClick={reset}>Restart</button></>}
      </div>
    </div>
  );
}
