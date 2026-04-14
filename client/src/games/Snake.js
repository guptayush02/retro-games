import React, { useRef, useEffect, useState } from 'react';

const SIZE = 20;
const WIDTH = 20;
const HEIGHT = 20;
const INIT_SNAKE = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 }
];
const INIT_DIR = { x: 1, y: 0 };

function getRandomFood(snake) {
  let food;
  do {
    food = {
      x: Math.floor(Math.random() * WIDTH),
      y: Math.floor(Math.random() * HEIGHT)
    };
  } while (snake.some(seg => seg.x === food.x && seg.y === food.y));
  return food;
}

export default function Snake() {
  const [snake, setSnake] = useState(INIT_SNAKE);
  const [dir, setDir] = useState(INIT_DIR);
  const [food, setFood] = useState(getRandomFood(INIT_SNAKE));
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const moveRef = useRef(dir);

  useEffect(() => { moveRef.current = dir; }, [dir]);

  useEffect(() => {
    if (gameOver) return;
    const handleKey = e => {
      if (e.key === 'ArrowUp' && moveRef.current.y !== 1) setDir({ x: 0, y: -1 });
      if (e.key === 'ArrowDown' && moveRef.current.y !== -1) setDir({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft' && moveRef.current.x !== 1) setDir({ x: -1, y: 0 });
      if (e.key === 'ArrowRight' && moveRef.current.x !== -1) setDir({ x: 1, y: 0 });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setSnake(snake => {
        const head = { x: snake[0].x + moveRef.current.x, y: snake[0].y + moveRef.current.y };
        if (
          head.x < 0 || head.x >= WIDTH ||
          head.y < 0 || head.y >= HEIGHT ||
          snake.some(seg => seg.x === head.x && seg.y === head.y)
        ) {
          setGameOver(true);
          return snake;
        }
        let newSnake = [head, ...snake];
        if (head.x === food.x && head.y === food.y) {
          setFood(getRandomFood(newSnake));
          setScore(s => s + 1);
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [food, gameOver]);

  function reset() {
    setSnake(INIT_SNAKE);
    setDir(INIT_DIR);
    setFood(getRandomFood(INIT_SNAKE));
    setGameOver(false);
    setScore(0);
  }

  return (
    <div>
      <h2>Snake</h2>
      <div style={{
        display: 'grid',
        gridTemplateRows: `repeat(${HEIGHT}, ${SIZE}px)`,
        gridTemplateColumns: `repeat(${WIDTH}, ${SIZE}px)`,
        border: '2px solid #0ff',
        margin: '0 auto',
        background: '#222',
        width: WIDTH * SIZE,
        height: HEIGHT * SIZE
      }}>
        {[...Array(WIDTH * HEIGHT)].map((_, i) => {
          const x = i % WIDTH, y = Math.floor(i / WIDTH);
          const isSnake = snake.some(seg => seg.x === x && seg.y === y);
          const isHead = snake[0].x === x && snake[0].y === y;
          const isFood = food.x === x && food.y === y;
          return <div key={i} style={{
            width: SIZE, height: SIZE,
            background: isHead ? '#0ff' : isSnake ? '#0aa' : isFood ? '#ff0' : 'transparent',
            border: '1px solid #333',
            boxSizing: 'border-box'
          }} />;
        })}
      </div>
      <div style={{marginTop: 10}}>
        <span>Score: {score}</span>
        {gameOver && <><br /><b>Game Over!</b> <button onClick={reset}>Restart</button></>}
      </div>
    </div>
  );
}
