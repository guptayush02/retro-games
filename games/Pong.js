import React, { useEffect, useRef, useState } from 'react';

const WIDTH = 480, HEIGHT = 320, PADDLE = 60, BALL = 12;

export default function Pong() {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef();
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let animation;
    let ball = { x: WIDTH/2, y: HEIGHT/2, dx: 3, dy: 2 };
    let paddle = WIDTH/2 - PADDLE/2;
    let ai = WIDTH/2 - PADDLE/2;
    let playerScore = 0;
    let over = false;

    function draw(ctx) {
      ctx.clearRect(0,0,WIDTH,HEIGHT);
      ctx.fillStyle = '#0ff';
      ctx.fillRect(paddle, HEIGHT-20, PADDLE, 10);
      ctx.fillRect(ai, 10, PADDLE, 10);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL/2, 0, 2*Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    function loop() {
      if (!running || over) return;
      const ctx = canvasRef.current.getContext('2d');
      draw(ctx);
      // Move ball
      ball.x += ball.dx;
      ball.y += ball.dy;
      // Wall bounce
      if (ball.x < BALL/2 || ball.x > WIDTH-BALL/2) ball.dx *= -1;
      // Paddle bounce
      if (ball.y > HEIGHT-30 && ball.x > paddle && ball.x < paddle+PADDLE) ball.dy *= -1;
      if (ball.y < 30 && ball.x > ai && ball.x < ai+PADDLE) ball.dy *= -1;
      // AI paddle
      ai += (ball.x - (ai+PADDLE/2)) * 0.1;
      // Score
      if (ball.y > HEIGHT) { over = true; setGameOver(true); }
      if (ball.y < 0) { playerScore++; setScore(s=>s+1); ball = { x: WIDTH/2, y: HEIGHT/2, dx: 3, dy: 2 }; }
      if (!over) animation = requestAnimationFrame(loop);
    }

    animation = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animation);
  }, [running]);

  useEffect(() => {
    function handleMouse(e) {
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      if (x < 0) x = 0;
      if (x > WIDTH-PADDLE) x = WIDTH-PADDLE;
      canvasRef.current.paddle = x;
    }
    function handleMove(e) {
      let x = e.touches[0].clientX - canvasRef.current.getBoundingClientRect().left;
      if (x < 0) x = 0;
      if (x > WIDTH-PADDLE) x = WIDTH-PADDLE;
      canvasRef.current.paddle = x;
    }
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('touchmove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  function reset() {
    setScore(0);
    setGameOver(false);
    setRunning(r=>!r);
    setTimeout(()=>setRunning(true), 100);
  }

  return (
    <div>
      <h2>Pong</h2>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{background:'#222',border:'2px solid #0ff'}} />
      <div style={{marginTop: 10}}>
        <span>Score: {score}</span>
        {gameOver && <><br /><b>Game Over!</b> <button onClick={reset}>Restart</button></>}
      </div>
    </div>
  );
}
