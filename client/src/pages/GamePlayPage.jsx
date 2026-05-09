import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { gamesAPI } from '../api/endpoints';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { Chess } from 'chess.js';
import { PhaserLudoBoard, PhaserMiniRacingGame, PhaserBomberArenaGame } from '../components/phaser/EngineGames';
import HostedGameFrame from '../components/HostedGameFrame';

function useGameResultRecorder(gameId) {
  const lastResultKeyRef = useRef(null);

  return useCallback(
    async ({ score = 0, outcome = 'draw' } = {}) => {
      if (!gameId) return;
      const key = `${gameId}:${score}:${outcome}`;
      if (lastResultKeyRef.current === key) return;
      lastResultKeyRef.current = key;
      try {
        await gamesAPI.recordResult(gameId, { score, outcome });
      } catch (err) {
        // ignore transient score submission failures
      }
    },
    [gameId]
  );
}

function useRandomOnlineMatch({ gameKey, user, onMatchFound, onMove, onOpponentLeft }) {
  const socketRef = useRef(null);
  const roomNameRef = useRef(null);
  const timeoutRef = useRef(null);
  const onMatchFoundRef = useRef(onMatchFound);
  const onMoveRef = useRef(onMove);
  const onOpponentLeftRef = useRef(onOpponentLeft);

  const wsUrl = import.meta.env.VITE_WS_URL
    ? import.meta.env.VITE_WS_URL.replace(/^ws/, 'http')
    : (import.meta.env.VITE_API_URL || 'http://localhost:5001');

  useEffect(() => {
    onMatchFoundRef.current = onMatchFound;
  }, [onMatchFound]);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    onOpponentLeftRef.current = onOpponentLeft;
  }, [onOpponentLeft]);

  const leaveQueueAndRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('mp_queue_leave', { gameKey });
    if (roomNameRef.current) {
      socketRef.current.emit('mp_room_leave', { gameKey, roomName: roomNameRef.current });
      roomNameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [gameKey]);

  const joinRandom = useCallback((options = {}) => {
    const { fallbackMs = 8000, onFallback } = options;
    if (!socketRef.current) return;

    leaveQueueAndRoom();

    socketRef.current.emit('mp_queue_join', {
      gameKey,
      userId: user?.id || user?._id || socketRef.current.id,
      username: user?.username || 'Guest',
    });

    timeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('mp_queue_leave', { gameKey });
      if (typeof onFallback === 'function') onFallback();
    }, fallbackMs);
  }, [gameKey, leaveQueueAndRoom, user]);

  const sendMove = useCallback((payload) => {
    if (!socketRef.current || !roomNameRef.current) return;
    socketRef.current.emit('mp_move', {
      gameKey,
      roomName: roomNameRef.current,
      payload,
    });
  }, [gameKey]);

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('mp_match_found', ({ gameKey: incomingGameKey, roomName, mySymbol, opponent }) => {
      if (incomingGameKey !== gameKey) return;
      roomNameRef.current = roomName;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onMatchFoundRef.current?.({ roomName, mySymbol, opponent });
    });

    socket.on('mp_move', ({ gameKey: incomingGameKey, payload }) => {
      if (incomingGameKey !== gameKey) return;
      onMoveRef.current?.(payload);
    });

    socket.on('mp_opponent_left', ({ gameKey: incomingGameKey }) => {
      if (incomingGameKey !== gameKey) return;
      roomNameRef.current = null;
      onOpponentLeftRef.current?.();
    });

    return () => {
      leaveQueueAndRoom();
      socket.disconnect();
    };
  }, [gameKey, leaveQueueAndRoom, wsUrl]);

  return {
    joinRandom,
    leaveQueueAndRoom,
    sendMove,
  };
}

// ─── Tic-Tac-Toe ────────────────────────────────────────────────────────────
function TicTacToe({ gameId }) {
  const user = useAuthStore((state) => state.user);
  const [mode, setMode] = useState('local'); // local | searching | online | computer
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState('X');
  const [mySymbol, setMySymbol] = useState('X');
  const [info, setInfo] = useState('');
  const submitResult = useGameResultRecorder(gameId);

  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winner = lines.reduce((w, [a,b,c]) =>
    w || (board[a] && board[a] === board[b] && board[a] === board[c] ? board[a] : null), null);
  const isDraw = !winner && board.every(Boolean);

  const { joinRandom, leaveQueueAndRoom, sendMove } = useRandomOnlineMatch({
    gameKey: 'tic-tac-toe',
    user,
    onMatchFound: ({ mySymbol: assignedSymbol }) => {
      setMode('online');
      setBoard(Array(9).fill(null));
      setCurrentTurn('X');
      setMySymbol(assignedSymbol);
      setInfo(`Matched online! You are ${assignedSymbol}.`);
    },
    onMove: ({ index, symbol }) => {
      setBoard((prev) => {
        if (prev[index]) return prev;
        const next = prev.slice();
        next[index] = symbol;
        return next;
      });
      setCurrentTurn(symbol === 'X' ? 'O' : 'X');
    },
    onOpponentLeft: () => {
      setInfo('Opponent left. You are now playing vs computer.');
      setMode('computer');
      setMySymbol('X');
      setBoard(Array(9).fill(null));
      setCurrentTurn('X');
    },
  });

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
  }, []);

  const startLocal = () => {
    leaveQueueAndRoom();
    setMode('local');
    setMySymbol('X');
    setInfo('');
    reset();
  };

  const startOnlineRandom = () => {
    setMode('searching');
    setInfo('Searching for a random online player...');
    reset();
    joinRandom({
      fallbackMs: 8000,
      onFallback: () => {
      setMode('computer');
      setMySymbol('X');
      setInfo('No online player found. Switched to computer mode.');
      reset();
      },
    });
  };

  const handleClick = (i) => {
    if (board[i] || winner || isDraw || mode === 'searching') return;

    // Online mode
    if (mode === 'online') {
      if (currentTurn !== mySymbol) return;
      const next = board.slice();
      next[i] = mySymbol;
      setBoard(next);
      setCurrentTurn(mySymbol === 'X' ? 'O' : 'X');
      sendMove({ index: i, symbol: mySymbol });
      return;
    }

    // Computer mode (human is X)
    if (mode === 'computer') {
      if (currentTurn !== 'X') return;
      const next = board.slice();
      next[i] = 'X';
      setBoard(next);
      setCurrentTurn('O');
      return;
    }

    // Local mode (current logic)
    const next = board.slice();
    next[i] = currentTurn;
    setBoard(next);
    setCurrentTurn(currentTurn === 'X' ? 'O' : 'X');
  };

  // Computer move
  useEffect(() => {
    if (mode !== 'computer' || winner || isDraw || currentTurn !== 'O') return;
    const empty = board
      .map((cell, idx) => (cell ? null : idx))
      .filter((idx) => idx !== null);
    if (empty.length === 0) return;

    const id = setTimeout(() => {
      const randomIdx = empty[Math.floor(Math.random() * empty.length)];
      setBoard((prev) => {
        if (prev[randomIdx] || winner) return prev;
        const next = prev.slice();
        next[randomIdx] = 'O';
        return next;
      });
      setCurrentTurn('X');
    }, 450);

    return () => clearTimeout(id);
  }, [mode, board, currentTurn, winner, isDraw]);

  const status = winner ? `🎉 Player ${winner} wins!`
    : isDraw ? "It's a draw!"
    : mode === 'searching' ? 'Searching for opponent...'
    : mode === 'online' ? `${currentTurn === mySymbol ? 'Your' : 'Opponent'} turn (${currentTurn})`
    : mode === 'computer' ? `${currentTurn === 'X' ? 'Your' : 'Computer'} turn (${currentTurn})`
    : `Player ${currentTurn}'s turn`;

  useEffect(() => {
    if (!winner && !isDraw) return;
    const outcome = winner
      ? (mode === 'online' ? (winner === mySymbol ? 'win' : 'loss') : winner === 'X' ? 'win' : 'loss')
      : 'draw';
    const score = winner ? 100 : isDraw ? 50 : 0;
    submitResult({ score, outcome });
  }, [winner, isDraw, mode, mySymbol, submitResult]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={startLocal}
          className={`px-4 py-2 rounded font-semibold ${mode === 'local' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Local (Current)
        </button>
        <button
          onClick={startOnlineRandom}
          className={`px-4 py-2 rounded font-semibold ${mode === 'online' || mode === 'searching' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Play Online (Random)
        </button>
      </div>
      {info && <p className="text-sm text-blue-300">{info}</p>}
      <p className="text-xl font-semibold text-yellow-400">{status}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-24 h-24 text-4xl font-bold rounded-lg border-2 border-gray-600 transition-colors
              ${cell === 'X' ? 'text-blue-400' : 'text-red-400'}
              ${!cell && !winner ? 'hover:bg-gray-700 cursor-pointer' : 'cursor-default'}
              bg-gray-800`}
          >
            {cell}
          </button>
        ))}
      </div>
      <button onClick={reset} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold">
        New Game
      </button>
    </div>
  );
}

// ─── Snake ──────────────────────────────────────────────────────────────────
function SnakeGame({ gameId }) {
  const COLS = 20, ROWS = 20, CELL = 24;
  const initSnake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  const randomFood = (snake) => {
    let f;
    do { f = {x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS)}; }
    while (snake.some(s => s.x===f.x && s.y===f.y));
    return f;
  };

  const [snake, setSnake] = useState(initSnake);
  const [food, setFood] = useState({x:15,y:10});
  const [dir, setDir] = useState({x:1,y:0});
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const dirRef = useRef({x:1,y:0});
  const submitResult = useGameResultRecorder(gameId);

  const reset = () => {
    const s = initSnake;
    setSnake(s); setFood(randomFood(s));
    setDir({x:1,y:0}); dirRef.current={x:1,y:0};
    setScore(0); setDead(false); setStarted(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      const map = {
        ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
        ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
        w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0},
      };
      const d = map[e.key];
      if (d && !(d.x === -dirRef.current.x && d.y === -dirRef.current.y)) {
        dirRef.current = d; setDir(d); setStarted(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (dead || !started) return;
    const id = setInterval(() => {
      setSnake(prev => {
        const head = {x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y};
        if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||prev.some(s=>s.x===head.x&&s.y===head.y)) {
          setDead(true); return prev;
        }
        setFood(f => {
          if (head.x===f.x && head.y===f.y) {
            setScore(sc => sc+10);
            const newSnake = [head, ...prev];
            setTimeout(() => setFood(randomFood(newSnake)), 0);
            return f;
          }
          return f;
        });
        return [head, ...prev.slice(0, head.x===food.x&&head.y===food.y ? prev.length : prev.length-1)];
      });
    }, 120);
    return () => clearInterval(id);
  }, [dead, started, food]);

  useEffect(() => {
    if (dead) {
      submitResult({ score, outcome: 'loss' });
    }
  }, [dead, score, submitResult]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <p className="text-lg font-semibold">Score: <span className="text-yellow-400">{score}</span></p>
        {!started && !dead && <p className="text-gray-400 text-sm">Press arrow keys or WASD to start</p>}
        {dead && <p className="text-red-400 font-bold">Game Over!</p>}
        <button onClick={reset} className="px-4 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold">
          {dead ? 'Play Again' : 'Reset'}
        </button>
      </div>
      <div
        className="relative border-2 border-gray-600 rounded bg-gray-900"
        style={{width: COLS*CELL, height: ROWS*CELL}}
      >
        {snake.map((s,i) => (
          <div key={i} className={`absolute rounded-sm ${i===0?'bg-green-400':'bg-green-600'}`}
            style={{left:s.x*CELL, top:s.y*CELL, width:CELL-2, height:CELL-2}} />
        ))}
        <div className="absolute bg-red-500 rounded-full"
          style={{left:food.x*CELL+2, top:food.y*CELL+2, width:CELL-6, height:CELL-6}} />
      </div>
      <p className="text-gray-500 text-xs">Use Arrow Keys or WASD to control</p>
    </div>
  );
}

// ─── Chess ──────────────────────────────────────────────────────────────────
function ChessGame({ gameId }) {
  const user = useAuthStore((state) => state.user);
  const [mode, setMode] = useState('computer'); // computer | searching | online
  const [info, setInfo] = useState('');
  const [myColor, setMyColor] = useState('w');
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const submitResult = useGameResultRecorder(gameId);

  const pieceMap = {
    pw: '♙', rw: '♖', nw: '♘', bw: '♗', qw: '♕', kw: '♔',
    pb: '♟', rb: '♜', nb: '♞', bb: '♝', qb: '♛', kb: '♚',
  };

  const { joinRandom, leaveQueueAndRoom, sendMove } = useRandomOnlineMatch({
    gameKey: 'chess',
    user,
    onMatchFound: ({ mySymbol }) => {
      setMode('online');
      setMyColor(mySymbol === 'b' ? 'b' : 'w');
      setInfo(`Matched online! You are ${mySymbol === 'w' ? 'White' : 'Black'}.`);
      setGame(new Chess());
      setSelectedSquare(null);
      setLegalTargets([]);
    },
    onMove: ({ from, to, promotion }) => {
      setGame((prevGame) => {
        const clone = new Chess(prevGame.fen());
        clone.move({ from, to, promotion: promotion || 'q' });
        return clone;
      });
      setSelectedSquare(null);
      setLegalTargets([]);
    },
    onOpponentLeft: () => {
      setInfo('Opponent left. Switched to computer mode.');
      setMode('computer');
      setMyColor('w');
      setGame(new Chess());
      setSelectedSquare(null);
      setLegalTargets([]);
    },
  });

  const reset = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalTargets([]);
  };

  const startComputer = () => {
    leaveQueueAndRoom();
    setMode('computer');
    setMyColor('w');
    setInfo('');
    reset();
  };

  const startOnlineRandom = () => {
    setMode('searching');
    setInfo('Searching for a random online player...');
    reset();
    joinRandom({
      fallbackMs: 8000,
      onFallback: () => {
        setMode('computer');
        setMyColor('w');
        setInfo('No online player found. Switched to computer mode.');
        reset();
      },
    });
  };

  const makeMove = (from, to) => {
    const clone = new Chess(game.fen());
    const move = clone.move({ from, to, promotion: 'q' });
    if (!move) return false;
    setGame(clone);
    return true;
  };

  const onSquareClick = (square) => {
    if (game.isGameOver() || mode === 'searching') return;

    // In computer mode you play White. In online mode you play your assigned color.
    const myTurnColor = mode === 'online' ? myColor : 'w';
    if (game.turn() !== myTurnColor) return;

    const piece = game.get(square);

    if (selectedSquare && legalTargets.includes(square)) {
      const moved = makeMove(selectedSquare, square);
      if (moved) {
        if (mode === 'online') {
          sendMove({ from: selectedSquare, to: square, promotion: 'q' });
        }
        setSelectedSquare(null);
        setLegalTargets([]);
      }
      return;
    }

    if (piece && piece.color === myTurnColor) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }).map((m) => m.to);
      setLegalTargets(moves);
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  };

  // Computer (black) move
  useEffect(() => {
    if (mode !== 'computer') return;
    if (game.isGameOver() || game.turn() !== 'b') return;
    const id = setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (!moves.length) return;
      const pick = moves[Math.floor(Math.random() * moves.length)];
      const clone = new Chess(game.fen());
      clone.move(pick);
      setGame(clone);
    }, 500);
    return () => clearTimeout(id);
  }, [game, mode]);

  useEffect(() => {
    if (!game.isGameOver()) return;
    const outcome = game.isDraw()
      ? 'draw'
      : game.isCheckmate()
        ? (mode === 'online' ? (game.turn() === myColor ? 'loss' : 'win') : game.turn() === 'w' ? 'loss' : 'win')
        : 'draw';
    const score = outcome === 'win' ? 100 : outcome === 'draw' ? 50 : 0;
    submitResult({ score, outcome });
  }, [game, mode, myColor, submitResult]);

  const status = game.isCheckmate()
    ? `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`
    : game.isDraw()
      ? 'Draw.'
      : game.isCheck()
        ? `${game.turn() === 'w' ? 'White' : 'Black'} is in check`
        : mode === 'searching'
          ? 'Searching for opponent...'
          : mode === 'online'
            ? `${game.turn() === myColor ? 'Your' : 'Opponent'} turn (${game.turn() === 'w' ? 'White' : 'Black'})`
            : `${game.turn() === 'w' ? 'Your' : 'Computer'} turn (${game.turn() === 'w' ? 'White' : 'Black'})`;

  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={startComputer}
          className={`px-4 py-2 rounded font-semibold ${mode === 'computer' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Play vs Computer (Current)
        </button>
        <button
          onClick={startOnlineRandom}
          className={`px-4 py-2 rounded font-semibold ${mode === 'online' || mode === 'searching' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Play Online (Random)
        </button>
      </div>
      {info && <p className="text-sm text-blue-300">{info}</p>}
      <p className="text-lg font-semibold text-yellow-400">{status}</p>
      <div className="grid grid-cols-8 border-2 border-gray-600 rounded overflow-hidden">
        {ranks.map((rank) =>
          files.map((file, idx) => {
            const square = `${file}${rank}`;
            const piece = game.get(square);
            const isDark = (rank + idx) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isTarget = legalTargets.includes(square);
            const isBlackPiece = piece?.color === 'b';

            return (
              <button
                key={square}
                onClick={() => onSquareClick(square)}
                className={`w-14 h-14 md:w-16 md:h-16 text-3xl flex items-center justify-center transition-colors
                  ${isDark ? 'bg-emerald-700' : 'bg-emerald-100'}
                  ${isSelected ? 'ring-4 ring-yellow-400' : ''}
                  ${isTarget ? 'outline outline-4 outline-blue-400' : ''}`}
              >
                <span className={piece ? (isBlackPiece ? 'text-gray-900 drop-shadow-[0_0_2px_rgba(255,255,255,0.95)]' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]') : ''}>
                  {piece ? pieceMap[`${piece.type}${piece.color}`] : ''}
                </span>
              </button>
            );
          })
        )}
      </div>
      <button onClick={reset} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold">
        New Game
      </button>
      <p className="text-xs text-gray-400">
        {mode === 'online'
          ? `You are ${myColor === 'w' ? 'White' : 'Black'} in this match.`
          : 'You play White. Computer plays Black.'}
      </p>
    </div>
  );
}

// ─── Quiz Battle ────────────────────────────────────────────────────────────
function QuizBattleGame({ gameId }) {
  const QUESTIONS = [
    { q: 'Which game uses a 3x3 grid?', options: ['Snake', 'Tic-Tac-Toe', 'Chess', 'Quiz Battle'], answer: 1 },
    { q: 'How many squares are on a chess board?', options: ['36', '49', '64', '81'], answer: 2 },
    { q: 'Which game grows in length as you score?', options: ['Snake', 'Chess', 'Tic-Tac-Toe', 'Quiz'], answer: 0 },
    { q: 'In Tic-Tac-Toe, how many in a row to win?', options: ['2', '3', '4', '5'], answer: 1 },
    { q: 'Which is usually turn-based strategy?', options: ['Chess', 'Snake', 'Quiz Battle', 'Runner'], answer: 0 },
    { q: 'Which symbol pair is used in Tic-Tac-Toe?', options: ['A/B', 'X/O', '1/0', '+/-'], answer: 1 },
    { q: 'What color often moves first in chess?', options: ['Black', 'White', 'Random', 'Red'], answer: 1 },
    { q: 'Snake game ends when...', options: ['You eat food', 'You hit wall/body', 'You pause', 'Time runs out'], answer: 1 },
  ];

  const [index, setIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const submitResult = useGameResultRecorder(gameId);

  const current = QUESTIONS[index];
  const finished = index >= QUESTIONS.length;

  const reset = () => {
    setIndex(0);
    setPlayerScore(0);
    setBotScore(0);
    setPicked(null);
    setShowResult(false);
  };

  const handlePick = (optionIndex) => {
    if (showResult) return;
    setPicked(optionIndex);

    const playerCorrect = optionIndex === current.answer;
    if (playerCorrect) setPlayerScore((s) => s + 10);

    // Bot answers correctly with 65% chance
    const botCorrect = Math.random() < 0.65;
    if (botCorrect) setBotScore((s) => s + 10);

    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
      setPicked(null);
      setIndex((i) => i + 1);
    }, 1000);
  };

  useEffect(() => {
    if (!finished) return;
    const outcome = playerScore === botScore ? 'draw' : playerScore > botScore ? 'win' : 'loss';
    submitResult({ score: playerScore, outcome });
  }, [finished, playerScore, botScore, submitResult]);

  if (finished) {
    const resultText =
      playerScore === botScore
        ? "It's a draw!"
        : playerScore > botScore
          ? '🎉 You win the quiz battle!'
          : '🤖 Bot wins this round!';

    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className="text-2xl font-bold">Quiz Battle Finished</h3>
        <p className="text-yellow-400 font-semibold text-lg">{resultText}</p>
        <p className="text-gray-300">You: <span className="font-bold">{playerScore}</span> • Bot: <span className="font-bold">{botScore}</span></p>
        <button onClick={reset} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold">
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <div className="flex justify-between text-sm text-gray-300">
        <span>Question {index + 1}/{QUESTIONS.length}</span>
        <span>You: {playerScore} • Bot: {botScore}</span>
      </div>

      <div className="bg-gray-700 rounded-lg p-5">
        <h3 className="text-xl font-semibold mb-4">{current.q}</h3>
        <div className="grid gap-3">
          {current.options.map((opt, i) => {
            const isCorrect = showResult && i === current.answer;
            const isWrongPick = showResult && picked === i && i !== current.answer;

            return (
              <button
                key={opt}
                onClick={() => handlePick(i)}
                className={`text-left px-4 py-3 rounded border transition-colors
                  ${isCorrect ? 'bg-green-700 border-green-400' : ''}
                  ${isWrongPick ? 'bg-red-700 border-red-400' : ''}
                  ${!isCorrect && !isWrongPick ? 'bg-gray-800 border-gray-600 hover:bg-gray-750' : ''}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400">Answer quickly and beat the bot score.</p>
    </div>
  );
}

// ─── Ludo ───────────────────────────────────────────────────────────────────
function LudoGame({ gameId }) {
  const user = useAuthStore((state) => state.user);
  const [mode, setMode] = useState('computer'); // computer | searching | online
  const [info, setInfo] = useState('Roll a 6 to enter the board.');
  const [myColor, setMyColor] = useState('red');
  const [state, setState] = useState(() => ({
    positions: { red: -1, blue: -1 },
    currentTurn: 'red',
    lastRoll: null,
    winner: null,
    phase: 'idle',
  }));
  const submitResult = useGameResultRecorder(gameId);

  const { joinRandom, leaveQueueAndRoom, sendMove } = useRandomOnlineMatch({
    gameKey: 'ludo',
    user,
    onMatchFound: ({ mySymbol }) => {
      setMode('online');
      setMyColor(mySymbol === 'blue' ? 'blue' : 'red');
      setState({ positions: { red: -1, blue: -1 }, currentTurn: 'red', lastRoll: null, winner: null, phase: 'idle' });
      setInfo(`Matched online! You are ${mySymbol === 'red' ? 'Red' : 'Blue'}.`);
    },
    onMove: (payload) => {
      setState(payload);
    },
    onOpponentLeft: () => {
      setMode('computer');
      setMyColor('red');
      setState({ positions: { red: -1, blue: -1 }, currentTurn: 'red', lastRoll: null, winner: null, phase: 'idle' });
      setInfo('Opponent left. Switched to computer mode.');
    },
  });

  const trackLength = 20;

  const snapshot = useCallback((nextState) => {
    if (mode === 'online') sendMove(nextState);
    setState(nextState);
  }, [mode, sendMove]);

  const reset = () => {
    setState({ positions: { red: -1, blue: -1 }, currentTurn: 'red', lastRoll: null, winner: null, phase: 'idle' });
    setInfo('Roll a 6 to enter the board.');
  };

  const startOnline = () => {
    setMode('searching');
    setInfo('Searching for a random online opponent...');
    reset();
    joinRandom({ fallbackMs: 8000, onFallback: () => { setMode('computer'); setMyColor('red'); setInfo('No online opponent found. Playing vs computer.'); reset(); } });
  };

  const startComputer = () => {
    leaveQueueAndRoom();
    setMode('computer');
    setMyColor('red');
    setInfo('');
    reset();
  };

  const moveToken = (player, roll, currentState) => {
    const positions = { ...currentState.positions };
    let nextPos = positions[player];
    if (nextPos === -1) {
      if (roll !== 6) return currentState;
      nextPos = 0;
    } else {
      nextPos += roll;
    }
    if (nextPos >= trackLength) {
      const finishedState = { ...currentState, positions: { ...positions, [player]: trackLength }, winner: player, phase: 'finished' };
      return finishedState;
    }
    positions[player] = nextPos;
    return { ...currentState, positions, phase: 'moving' };
  };

  const rollDice = () => Math.floor(Math.random() * 6) + 1;

  const takeTurn = () => {
    if (state.winner) return;
    const player = state.currentTurn;
    const roll = rollDice();
    let nextState = moveToken(player, roll, { ...state, lastRoll: roll });

    if (nextState === state) {
      nextState = { ...state, lastRoll: roll, currentTurn: player === 'red' ? 'blue' : 'red', phase: 'idle' };
    } else {
      const extraTurn = roll === 6;
      nextState = {
        ...nextState,
        lastRoll: roll,
        currentTurn: nextState.winner ? player : (extraTurn ? player : (player === 'red' ? 'blue' : 'red')),
        phase: nextState.winner ? 'finished' : 'idle',
      };
    }

    snapshot(nextState);
  };

  useEffect(() => {
    if (mode !== 'computer') return;
    if (state.winner) return;
    if (state.currentTurn !== 'blue') return;
    const id = setTimeout(() => {
      const roll = rollDice();
      let nextState = moveToken('blue', roll, { ...state, lastRoll: roll });
      if (nextState === state) {
        nextState = { ...state, lastRoll: roll, currentTurn: 'red', phase: 'idle' };
      } else {
        nextState = {
          ...nextState,
          lastRoll: roll,
          currentTurn: nextState.winner ? 'blue' : (roll === 6 ? 'blue' : 'red'),
          phase: nextState.winner ? 'finished' : 'idle',
        };
      }
      setState(nextState);
    }, 700);
    return () => clearTimeout(id);
  }, [mode, state]);

  useEffect(() => {
    if (!state.winner) return;
    const outcome = state.winner === myColor ? 'win' : 'loss';
    submitResult({ score: state.winner === myColor ? 100 : 0, outcome });
  }, [state.winner, myColor, submitResult]);

  const status = state.winner
    ? `${state.winner === myColor ? 'You win!' : 'Opponent wins!'}`
    : mode === 'searching'
      ? 'Searching for opponent...'
      : `${state.currentTurn === myColor ? 'Your' : 'Opponent'} turn`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button onClick={startComputer} className={`px-4 py-2 rounded font-semibold ${mode === 'computer' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Play vs Computer</button>
        <button onClick={startOnline} className={`px-4 py-2 rounded font-semibold ${mode === 'online' || mode === 'searching' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Play Online (Random)</button>
      </div>
      {info && <p className="text-sm text-blue-300">{info}</p>}
      <p className="text-lg font-semibold text-yellow-400">{status}</p>
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-300">Dice: <span className="font-bold text-white">{state.lastRoll ?? '-'}</span></div>
        <button onClick={takeTurn} disabled={state.winner || (mode === 'online' && state.currentTurn !== myColor)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded font-semibold">
          Roll Dice
        </button>
      </div>
      <PhaserLudoBoard state={state} mode={mode} myColor={myColor} />
      <p className="text-xs text-gray-400">Move your token from start to finish. Roll a 6 to enter the board.</p>
    </div>
  );
}

// ─── Scribble Battle ────────────────────────────────────────────────────────
function ScribbleBattleGame({ gameId }) {
  const user = useAuthStore((state) => state.user);
  const [mode, setMode] = useState('computer'); // computer | searching | online
  const [info, setInfo] = useState('Draw as much as you can during your turn.');
  const [myColor, setMyColor] = useState('red');
  const [turn, setTurn] = useState('red');
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ red: 0, blue: 0 });
  const [points, setPoints] = useState([]);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const submittedRef = useRef(false);
  const submitResult = useGameResultRecorder(gameId);

  const { joinRandom, leaveQueueAndRoom, sendMove } = useRandomOnlineMatch({
    gameKey: 'scribble-battle',
    user,
    onMatchFound: ({ mySymbol }) => {
      setMode('online');
      setMyColor(mySymbol === 'blue' ? 'blue' : 'red');
      setTurn('red');
      setSecondsLeft(20);
      setRound(1);
      setScores({ red: 0, blue: 0 });
      setPoints([]);
      setInfo(`Matched online! You are ${mySymbol === 'red' ? 'Red' : 'Blue'}.`);
    },
    onMove: (payload) => {
      if (payload.type === 'point') {
        setPoints((prev) => [...prev, payload.point]);
      }
      if (payload.type === 'sync') {
        setPoints(payload.points || []);
        setScores(payload.scores || { red: 0, blue: 0 });
        setTurn(payload.turn || 'red');
        setSecondsLeft(payload.secondsLeft ?? 20);
        setRound(payload.round ?? 1);
      }
    },
    onOpponentLeft: () => {
      setMode('computer');
      setMyColor('red');
      setInfo('Opponent left. Switched to computer mode.');
    },
  });

  const reset = () => {
    setTurn('red');
    setSecondsLeft(20);
    setRound(1);
    setScores({ red: 0, blue: 0 });
    setPoints([]);
    clearCanvas();
  };

  const startComputer = () => {
    leaveQueueAndRoom();
    setMode('computer');
    setMyColor('red');
    setInfo('');
    reset();
  };

  const startOnline = () => {
    setMode('searching');
    setInfo('Searching for a random online opponent...');
    reset();
    joinRandom({ fallbackMs: 8000, onFallback: () => { setMode('computer'); setMyColor('red'); setInfo('No online opponent found. Playing vs computer.'); reset(); } });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    clearCanvas();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((left) => {
        if (left > 1) return left - 1;

        setScores((prev) => ({ ...prev, [turn]: prev[turn] + points.length }));
        const nextTurn = turn === 'red' ? 'blue' : 'red';
        const nextRound = round + 1;
        const nextSeconds = 20;
        const nextPoints = [];

        if (mode === 'online') {
          sendMove({
            type: 'sync',
            points: nextPoints,
            scores: { ...scores, [turn]: scores[turn] + points.length },
            turn: nextTurn,
            secondsLeft: nextSeconds,
            round: nextRound,
          });
        }

        setPoints(nextPoints);
        setTurn(nextTurn);
        setRound(nextRound);
        return nextSeconds;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, round, scores, sendMove, turn, points.length]);

  useEffect(() => {
    if (mode !== 'computer') return;
    if (turn !== 'blue') return;
    const id = setInterval(() => {
      setPoints((prev) => {
        const point = { x: Math.random() * 560 + 20, y: Math.random() * 300 + 20, color: '#60a5fa' };
        drawPoint(point);
        return [...prev, point];
      });
      setScores((prev) => ({ ...prev, blue: prev.blue + 1 }));
    }, 350);
    return () => clearInterval(id);
  }, [mode, turn]);

  const drawPoint = (point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    points.forEach(drawPoint);
  }, [points]);

  useEffect(() => {
    if (round > 2) {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const outcome = scores[myColor] === Math.max(scores.red, scores.blue) ? 'win' : scores.red === scores.blue ? 'draw' : 'loss';
      submitResult({ score: scores[myColor], outcome });
    }
  }, [round, scores, myColor, submitResult]);

  const startDrawing = (e) => {
    if (mode === 'searching') return;
    if (mode === 'online' && turn !== myColor) return;
    if (mode !== 'online' && turn !== 'red') return;
    drawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    lastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const nextPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const prevPoint = lastPointRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = turn === 'red' ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(nextPoint.x, nextPoint.y);
    ctx.stroke();
    lastPointRef.current = nextPoint;
    setPoints((prev) => [...prev, { ...nextPoint, color: turn === 'red' ? '#ef4444' : '#3b82f6' }]);
    setScores((prev) => ({ ...prev, [turn]: prev[turn] + 1 }));
    if (mode === 'online') {
      sendMove({ type: 'point', point: { ...nextPoint, color: turn === 'red' ? '#ef4444' : '#3b82f6' } });
    }
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button onClick={startComputer} className={`px-4 py-2 rounded font-semibold ${mode === 'computer' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Play vs Computer</button>
        <button onClick={startOnline} className={`px-4 py-2 rounded font-semibold ${mode === 'online' || mode === 'searching' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Play Online (Random)</button>
      </div>
      {info && <p className="text-sm text-blue-300">{info}</p>}
      <p className="text-lg font-semibold text-yellow-400">{mode === 'searching' ? 'Searching for opponent...' : `Round ${round} • ${turn === myColor ? 'Your' : 'Opponent'} turn • ${secondsLeft}s left`}</p>
      <div className="flex items-center gap-4 text-sm text-gray-300">
        <span>Red: {scores.red}</span>
        <span>Blue: {scores.blue}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="border border-gray-700 rounded-xl bg-gray-900 w-full max-w-4xl touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <p className="text-xs text-gray-400">Draw quickly. Higher stroke score wins the battle.</p>
    </div>
  );
}

// ─── Mini Racing ───────────────────────────────────────────────────────────
function MiniRacingGame({ gameId }) {
  const [lane, setLane] = useState(1);
  const [obstacles, setObstacles] = useState([]);
  const [speed, setSpeed] = useState(4);
  const [distance, setDistance] = useState(0);
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);
  const submitResult = useGameResultRecorder(gameId);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setLane((l) => Math.max(0, l - 1));
      if (e.key === 'ArrowRight' || e.key === 'd') setLane((l) => Math.min(2, l + 1));
      if (!started) setStarted(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  useEffect(() => {
    if (dead || !started) return;
    const id = setInterval(() => {
      setDistance((d) => d + 1);
      setSpeed((s) => Math.min(10, s + 0.01));
      setObstacles((prev) => {
        const next = prev.map((o) => ({ ...o, y: o.y + speed }));
        if (Math.random() < 0.25) {
          next.push({ lane: Math.floor(Math.random() * 3), y: -40 });
        }
        const playerY = 280;
        if (next.some((o) => o.lane === lane && o.y > playerY - 20 && o.y < playerY + 20)) {
          setDead(true);
          submitResult({ score: distance, outcome: 'loss' });
        }
        return next.filter((o) => o.y < 420);
      });
    }, 60);
    return () => clearInterval(id);
  }, [dead, started, lane, speed, distance, submitResult]);

  const reset = () => {
    setLane(1);
    setObstacles([]);
    setSpeed(4);
    setDistance(0);
    setDead(false);
    setStarted(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <p className="text-lg font-semibold">Distance: <span className="text-yellow-400">{distance}</span></p>
        {dead && <p className="text-red-400 font-bold">Crash!</p>}
        <button onClick={reset} className="px-4 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold">{dead ? 'Play Again' : 'Reset'}</button>
      </div>
      <div className="relative w-full max-w-md h-[420px] bg-gray-950 border border-gray-700 rounded-xl overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-3">
          <div className="border-r border-dashed border-gray-700" />
          <div className="border-r border-dashed border-gray-700" />
          <div />
        </div>
        {obstacles.map((o, i) => (
          <div key={i} className="absolute w-12 h-12 bg-red-500 rounded-md" style={{ left: `${o.lane * 33.33 + 10}%`, top: `${o.y}px` }} />
        ))}
        <div className="absolute bottom-6 w-12 h-20 bg-blue-500 rounded-lg" style={{ left: `${lane * 33.33 + 10}%` }} />
      </div>
      <p className="text-xs text-gray-400">Use Left/Right arrows or A/D to change lanes.</p>
    </div>
  );
}

// ─── Bomber Arena ───────────────────────────────────────────────────────────
function BomberArenaGame({ gameId }) {
  const width = 9;
  const height = 9;
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [bombs, setBombs] = useState([]);
  const [blocks, setBlocks] = useState(() => {
    const arr = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) continue;
        if (Math.random() < 0.35 && !(x === 1 && y === 1)) arr.push({ x, y });
      }
    }
    return arr;
  });
  const [enemies, setEnemies] = useState([{ x: 7, y: 7 }]);
  const [status, setStatus] = useState('');
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const submitResult = useGameResultRecorder(gameId);

  const hasBlock = (x, y) => blocks.some((b) => b.x === x && b.y === y);
  const hasBomb = (x, y) => bombs.some((b) => b.x === x && b.y === y);

  const movePlayer = (dx, dy) => {
    if (dead) return;
    const next = { x: Math.max(1, Math.min(width - 2, player.x + dx)), y: Math.max(1, Math.min(height - 2, player.y + dy)) };
    if (!hasBlock(next.x, next.y) && !hasBomb(next.x, next.y)) {
      setPlayer(next);
    }
  };

  const placeBomb = () => {
    if (dead) return;
    if (hasBomb(player.x, player.y)) return;
    setBombs((prev) => [...prev, { x: player.x, y: player.y, timer: 2 }]);
    setStatus('Bomb placed!');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1, 0);
      if (e.code === 'Space') placeBomb();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (dead) return;
    const tick = setInterval(() => {
      setBombs((prevBombs) => {
        const nextBombs = prevBombs.map((b) => ({ ...b, timer: b.timer - 1 }));
        const exploding = nextBombs.filter((b) => b.timer <= 0);
        const live = nextBombs.filter((b) => b.timer > 0);

        if (exploding.length) {
          const blastCells = new Set();
          exploding.forEach((b) => {
            [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => blastCells.add(`${b.x + dx},${b.y + dy}`));
          });
          setBlocks((prev) => prev.filter((b) => {
            const hit = blastCells.has(`${b.x},${b.y}`);
            if (hit) setScore((s) => s + 5);
            return !hit;
          }));
          setEnemies((prev) => prev.filter((e) => {
            const hit = blastCells.has(`${e.x},${e.y}`);
            if (hit) setScore((s) => s + 15);
            return !hit;
          }));
          if (blastCells.has(`${player.x},${player.y}`)) {
            setDead(true);
            submitResult({ score, outcome: 'loss' });
          }
        }
        return live;
      });

      setEnemies((prev) => prev.map((e) => {
        const dirOptions = [
          { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        ];
        const dir = dirOptions[Math.floor(Math.random() * dirOptions.length)];
        const next = { x: Math.max(1, Math.min(width - 2, e.x + dir.x)), y: Math.max(1, Math.min(height - 2, e.y + dir.y)) };
        if (!hasBlock(next.x, next.y)) return next;
        return e;
      }));
    }, 500);
    return () => clearInterval(tick);
  }, [dead, player, score, submitResult]);

  const reset = () => {
    setPlayer({ x: 1, y: 1 });
    setBombs([]);
    setBlocks(() => {
      const arr = [];
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (x === 0 || y === 0 || x === width - 1 || y === height - 1) continue;
          if (Math.random() < 0.35 && !(x === 1 && y === 1)) arr.push({ x, y });
        }
      }
      return arr;
    });
    setEnemies([{ x: 7, y: 7 }]);
    setDead(false);
    setScore(0);
    setStatus('');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <p className="text-lg font-semibold">Score: <span className="text-yellow-400">{score}</span></p>
        {dead && <p className="text-red-400 font-bold">You lost!</p>}
        <button onClick={reset} className="px-4 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold">{dead ? 'Play Again' : 'Reset'}</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${width}, 2.8rem)` }}>
        {Array.from({ length: width * height }).map((_, idx) => {
          const x = idx % width;
          const y = Math.floor(idx / width);
          const isWall = x === 0 || y === 0 || x === width - 1 || y === height - 1;
          const isPlayer = player.x === x && player.y === y;
          const isEnemy = enemies.some((e) => e.x === x && e.y === y);
          const bomb = bombs.find((b) => b.x === x && b.y === y);
          const block = blocks.some((b) => b.x === x && b.y === y);

          return (
            <div key={idx} className={`w-11 h-11 border border-gray-800 flex items-center justify-center ${isWall ? 'bg-gray-950' : 'bg-gray-800'}`}>
              {block && <div className="w-8 h-8 bg-amber-700 rounded-sm" />}
              {bomb && <div className="w-6 h-6 rounded-full bg-yellow-500 text-black text-[10px] flex items-center justify-center font-bold">{bomb.timer}</div>}
              {isEnemy && <div className="w-7 h-7 rounded-full bg-red-500" />}
              {isPlayer && <div className="w-7 h-7 rounded-full bg-blue-500" />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400">Use WASD/Arrow keys to move. Press Space to place bombs.</p>
    </div>
  );
}

// ─── Coming Soon ────────────────────────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
      <div className="text-6xl">🚧</div>
      <p className="text-xl font-semibold">{title} — Coming Soon</p>
      <p className="text-sm">This game is under development. Check back later!</p>
    </div>
  );
}

// ─── Game Router ─────────────────────────────────────────────────────────────
function GameComponent({ title, gameId, sourceType, launchUrl, provider }) {
  const t = title?.toLowerCase() || '';
  const hostedUrls = {
    ludo: import.meta.env.VITE_HOSTED_LUDO_URL || 'https://www.crazygames.com/embed/ludo-hero',
    scribble: import.meta.env.VITE_HOSTED_SCRIBBLE_URL || 'https://skribbl.io/',
    racing: import.meta.env.VITE_HOSTED_RACING_URL || 'https://www.crazygames.com/embed/madalin-stunt-cars-2',
    bomber: import.meta.env.VITE_HOSTED_BOMBER_URL || 'https://www.crazygames.com/embed/bomb-it-7',
  };

  if (sourceType === 'embed' || sourceType === 'external-link') {
    return <HostedGameFrame title={title} url={launchUrl} provider={provider} />;
  }

  if (t.includes('tic')) return <TicTacToe gameId={gameId} />;
  if (t.includes('snake')) return <SnakeGame gameId={gameId} />;
  if (t.includes('chess')) return <ChessGame gameId={gameId} />;
  if (t.includes('quiz')) return <QuizBattleGame gameId={gameId} />;
  if (t.includes('ludo')) return <HostedGameFrame title="Ludo" url={hostedUrls.ludo} />;
  if (t.includes('scribble')) return <HostedGameFrame title="Scribble Battle" url={hostedUrls.scribble} />;
  if (t.includes('racing')) return <HostedGameFrame title="Mini Racing" url={hostedUrls.racing} />;
  if (t.includes('bomber')) return <HostedGameFrame title="Bomber Arena" url={hostedUrls.bomber} />;
  return <ComingSoon title={title} />;
}

// ─── Page ────────────────────────────────────────────────────────────────────
function GamePlayPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gamesAPI.getGameById(gameId);
        setGame(res.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId]);

  // Track play once on page open (guard strict-mode duplicate call)
  useEffect(() => {
    if (!gameId) return;
    const key = `play_record_${gameId}`;
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last < 3000) return;
    sessionStorage.setItem(key, String(now));
    gamesAPI.recordPlay(gameId).catch(() => {});
  }, [gameId]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      {loading && <p className="text-gray-300">Loading game...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && game && (
        <>
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-1">{game.title}</h1>
            <p className="text-gray-400 text-sm">
              {game.genre || 'Arcade'} • {game.gameType || 'single-player'} • Up to {game.maxPlayers || 1} player(s)
            </p>
            <p className="text-gray-300 mt-2">{game.description}</p>
            {(game.provider || game.licenseStatus) && (
              <p className="text-xs text-gray-400 mt-2">
                Source: {game.provider || 'unknown'} • License: {game.licenseStatus || 'unknown'}
              </p>
            )}
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <GameComponent
              title={game.title}
              gameId={game._id}
              sourceType={game.sourceType}
              launchUrl={game.launchUrl}
              provider={game.provider}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default GamePlayPage;
